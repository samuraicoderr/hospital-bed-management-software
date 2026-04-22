"""
Admission models for BedFlow - Admission and allocation per section 4.2
"""

from django.db import models, transaction
from django.conf import settings
from django.utils import timezone

from src.lib.utils.uuid7 import uuid7
from src.common.constants import (
    AdmissionSource, AdmissionStatus, TransferType, TransferStatus
)


class AdmissionRequest(models.Model):
    """
    Request for patient admission.
    Per requirements 4.2.1 - Manual admission creation, EHR-triggered admission.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    # Patient
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="admission_requests"
    )

    # Request details
    admission_source = models.CharField(
        max_length=30,
        choices=AdmissionSource.choices,
        default=AdmissionSource.DIRECT_ADMISSION
    )
    request_date = models.DateTimeField(default=timezone.now)

    # Clinical requirements
    requires_isolation = models.BooleanField(default=False)
    requires_icu = models.BooleanField(default=False)
    required_bed_type = models.CharField(
        max_length=30,
        choices=[
            ("any", "Any Available"),
            ("general", "General"),
            ("icu", "ICU"),
            ("isolation", "Isolation"),
            ("emergency", "Emergency"),
            ("maternity", "Maternity"),
        ],
        default="any"
    )
    clinical_notes = models.TextField(blank=True)

    # Priority
    priority = models.CharField(
        max_length=20,
        choices=[
            ("routine", "Routine"),
            ("urgent", "Urgent"),
            ("emergency", "Emergency"),
            ("stat", "STAT"),
        ],
        default="routine"
    )

    # Preferred location
    preferred_hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admission_requests"
    )
    preferred_department = models.ForeignKey(
        "organizations.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admission_requests"
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=AdmissionStatus.choices,
        default=AdmissionStatus.PENDING
    )

    # Reservation
    reserved_bed = models.ForeignKey(
        "beds.Bed",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reservation_requests"
    )
    reserved_until = models.DateTimeField(null=True, blank=True)

    # Assignment
    assigned_bed = models.ForeignKey(
        "beds.Bed",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admission_request_assignments"
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_admission_requests"
    )
    assigned_at = models.DateTimeField(null=True, blank=True)

    # Status tracking
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_admission_requests"
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    # Queue position
    queue_position = models.PositiveIntegerField(null=True, blank=True)
    waiting_since = models.DateTimeField(default=timezone.now)

    # Cancellation
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_admission_requests"
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True)

    # EHR Integration
    external_request_id = models.CharField(max_length=100, blank=True)
    external_source = models.CharField(max_length=100, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_admission_requests"
    )

    class Meta:
        ordering = ["priority", "waiting_since"]
        indexes = [
            models.Index(fields=["patient", "status"]),
            models.Index(fields=["status", "priority"]),
            models.Index(fields=["preferred_hospital", "status"]),
            models.Index(fields=["waiting_since"]),
            models.Index(fields=["external_request_id"]),
        ]

    def __str__(self):
        return f"Admission Request {self.id}: {self.patient.mrn} - {self.status}"

    def approve(self, user):
        """Approve admission request."""
        with transaction.atomic():
            self.status = AdmissionStatus.APPROVED
            self.approved_by = user
            self.approved_at = timezone.now()
            self.save()

    def assign_bed(self, bed, user):
        """
        Assign a bed to this admission request.
        Prevents double assignment per requirements 4.2.2.
        """
        from src.audit.services import AuditService

        with transaction.atomic():
            # Lock the bed to prevent concurrent assignment
            bed = Bed.objects.select_for_update().get(pk=bed.pk)

            if not bed.is_available():
                raise ValueError("Bed is not available for assignment")

            # Check for existing active admission
            if Admission.objects.filter(
                bed=bed,
                status__in=["admitted", "assigned"]
            ).exists():
                raise ValueError("Bed is already assigned to another admission")

            self.assigned_bed = bed
            self.status = AdmissionStatus.ASSIGNED
            self.assigned_by = user
            self.assigned_at = timezone.now()
            self.save()

            # Update bed status
            bed.change_status(
                new_status="reserved",
                user=user,
                reason=f"Reserved for admission request {self.id}"
            )

            # Audit log
            AuditService.log_action(
                action="update",
                model_name="AdmissionRequest",
                object_id=str(self.id),
                user=user,
                details={
                    "action": "bed_assigned",
                    "bed_id": str(bed.id),
                    "bed_code": bed.bed_code,
                }
            )

            return self

    def convert_to_admission(self, user):
        """
        Convert approved admission request to actual admission.
        """
        with transaction.atomic():
            admission = Admission.objects.create(
                patient=self.patient,
                bed=self.assigned_bed,
                admission_request=self,
                hospital=self.preferred_hospital or self.assigned_bed.get_hospital(),
                department=self.preferred_department or self.assigned_bed.ward.department,
                admission_source=self.admission_source,
                admitted_by=user,
                status=AdmissionStatus.ADMITTED,
                clinical_notes=self.clinical_notes,
            )

            self.status = AdmissionStatus.ADMITTED
            self.save()

            # Update bed to occupied
            self.assigned_bed.change_status(
                new_status="occupied",
                user=user,
                reason=f"Patient admitted: {self.patient.get_full_name()}"
            )

            return admission


class Admission(models.Model):
    """
    Patient admission record.
    Per requirements 4.2 - Admission and bed assignment.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    # Relationships
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="admissions"
    )
    bed = models.ForeignKey(
        "beds.Bed",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admissions"
    )
    admission_request = models.ForeignKey(
        AdmissionRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admissions"
    )

    # Location
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="admissions"
    )
    department = models.ForeignKey(
        "organizations.Department",
        on_delete=models.CASCADE,
        related_name="admissions"
    )

    # Admission Details
    admission_source = models.CharField(
        max_length=30,
        choices=AdmissionSource.choices
    )
    admitted_at = models.DateTimeField(default=timezone.now)
    admitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="admissions_created"
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=AdmissionStatus.choices,
        default=AdmissionStatus.ADMITTED
    )

    # Clinical Information
    diagnosis_code = models.CharField(max_length=20, blank=True)
    diagnosis_description = models.TextField(blank=True)
    clinical_notes = models.TextField(blank=True)

    # Isolation
    is_isolation = models.BooleanField(default=False)
    isolation_reason = models.TextField(blank=True)
    isolation_started_at = models.DateTimeField(null=True, blank=True)
    isolation_ended_at = models.DateTimeField(null=True, blank=True)

    # Expected duration
    expected_discharge_date = models.DateField(null=True, blank=True)

    # Discharge information
    discharged_at = models.DateTimeField(null=True, blank=True)
    discharged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admissions_discharged"
    )

    # External IDs
    visit_number = models.CharField(max_length=50, blank=True, db_index=True)
    external_visit_id = models.CharField(max_length=100, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-admitted_at"]
        indexes = [
            models.Index(fields=["patient", "status"]),
            models.Index(fields=["bed", "status"]),
            models.Index(fields=["hospital", "status"]),
            models.Index(fields=["admitted_at"]),
            models.Index(fields=["visit_number"]),
        ]

    def __str__(self):
        return f"Admission {self.id}: {self.patient.mrn} at {self.bed}"

    def get_length_of_stay(self):
        """Calculate length of stay in days."""
        if self.discharged_at:
            return (self.discharged_at - self.admitted_at).days
        return (timezone.now() - self.admitted_at).days

    def get_length_of_stay_hours(self):
        """Calculate length of stay in hours."""
        end_time = self.discharged_at or timezone.now()
        return (end_time - self.admitted_at).total_seconds() / 3600


class Transfer(models.Model):
    """
    Patient transfer record.
    Per requirements 4.2.3 - Transfer types and tracking.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    # Original admission
    admission = models.ForeignKey(
        Admission,
        on_delete=models.CASCADE,
        related_name="transfers"
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="transfers"
    )

    # Transfer type and status
    transfer_type = models.CharField(
        max_length=30,
        choices=TransferType.choices
    )
    status = models.CharField(
        max_length=20,
        choices=TransferStatus.choices,
        default=TransferStatus.PENDING
    )

    # Origin
    from_hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="transfers_out"
    )
    from_department = models.ForeignKey(
        "organizations.Department",
        on_delete=models.CASCADE,
        related_name="transfers_out"
    )
    from_bed = models.ForeignKey(
        "beds.Bed",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transfers_out"
    )

    # Destination
    to_hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="transfers_in"
    )
    to_department = models.ForeignKey(
        "organizations.Department",
        on_delete=models.CASCADE,
        related_name="transfers_in"
    )
    to_bed = models.ForeignKey(
        "beds.Bed",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transfers_in"
    )

    # Requested by
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="requested_transfers"
    )
    requested_at = models.DateTimeField(default=timezone.now)
    reason = models.TextField()

    # Approval
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_transfers"
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    # Execution
    initiated_at = models.DateTimeField(null=True, blank=True)
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="initiated_transfers"
    )

    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="completed_transfers"
    )

    # Clinical info for transfer
    transport_mode = models.CharField(
        max_length=50,
        choices=[
            ("walking", "Walking"),
            ("wheelchair", "Wheelchair"),
            ("stretcher", "Stretcher"),
            ("bed", "Bed"),
            ("ambulance", "Ambulance"),
        ],
        blank=True
    )
    accompanying_personnel = models.CharField(max_length=200, blank=True)
    special_requirements = models.TextField(blank=True)

    # Rejection/Cancellation
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rejected_transfers"
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-requested_at"]
        indexes = [
            models.Index(fields=["patient", "status"]),
            models.Index(fields=["from_hospital", "status"]),
            models.Index(fields=["to_hospital", "status"]),
            models.Index(fields=["admission"]),
        ]

    def __str__(self):
        return f"Transfer {self.id}: {self.patient.mrn} {self.transfer_type}"

    def approve(self, user):
        """Approve the transfer request."""
        with transaction.atomic():
            self.status = TransferStatus.APPROVED
            self.approved_by = user
            self.approved_at = timezone.now()
            self.save()

    def initiate(self, user):
        """Start the transfer process."""
        with transaction.atomic():
            self.status = TransferStatus.IN_PROGRESS
            self.initiated_by = user
            self.initiated_at = timezone.now()
            self.save()

    def complete(self, user):
        """Complete the transfer."""
        from src.audit.services import AuditService

        with transaction.atomic():
            # Update original bed to cleaning required
            if self.from_bed:
                self.from_bed.mark_for_cleaning(
                    user=user,
                    priority="urgent" if self.transfer_type == TransferType.ISOLATION else "routine"
                )

            # Update admission
            self.admission.bed = self.to_bed
            self.admission.department = self.to_department
            if self.from_hospital != self.to_hospital:
                self.admission.hospital = self.to_hospital
            self.admission.save()

            # Complete transfer
            self.status = TransferStatus.COMPLETED
            self.completed_by = user
            self.completed_at = timezone.now()
            self.save()

            # Update destination bed
            if self.to_bed:
                self.to_bed.change_status(
                    new_status="occupied",
                    user=user,
                    reason=f"Transfer completed from {self.from_bed}"
                )

            # Audit log
            AuditService.log_action(
                action="update",
                model_name="Transfer",
                object_id=str(self.id),
                user=user,
                details={
                    "action": "transfer_completed",
                    "from_bed": str(self.from_bed.id) if self.from_bed else None,
                    "to_bed": str(self.to_bed.id) if self.to_bed else None,
                }
            )

