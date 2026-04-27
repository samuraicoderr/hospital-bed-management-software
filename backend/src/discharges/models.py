"""
Discharge models for BedFlow - Discharge and turnover per section 4.3
"""

from django.db import models, transaction
from django.conf import settings
from django.utils import timezone

from src.lib.utils.uuid7 import uuid7
from src.common.constants import DischargeStatus, DischargeDestination


class Discharge(models.Model):
    """
    Patient discharge record.
    Per requirements 4.3.1 - Discharge workflow.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    # Related admission
    admission = models.OneToOneField(
        "admissions.Admission",
        on_delete=models.CASCADE,
        related_name="discharge"
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="discharges"
    )

    # Discharge bed (snapshot)
    bed = models.ForeignKey(
        "beds.Bed",
        on_delete=models.SET_NULL,
        null=True,
        related_name="discharges"
    )
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="discharges"
    )

    # Discharge Details
    status = models.CharField(
        max_length=20,
        choices=DischargeStatus.choices,
        default=DischargeStatus.PENDING
    )

    # Initiation
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="initiated_discharges"
    )
    initiated_at = models.DateTimeField(default=timezone.now)
    reason = models.TextField()

    # Approval (if required by hospital setting)
    approval_required = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_discharges"
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    # Discharge Types
    discharge_type = models.CharField(
        max_length=50,
        choices=[
            ("routine", "Routine"),
            ("ama", "Against Medical Advice"),
            ("transfer", "Transfer"),
            ("deceased", "Deceased"),
            ("absconded", "Absconded"),
            ("left_ama", "Left Against Medical Advice"),
        ],
        default="routine"
    )

    # Destination
    destination = models.CharField(
        max_length=30,
        choices=DischargeDestination.choices,
        default=DischargeDestination.HOME
    )
    destination_details = models.TextField(blank=True)

    # Clinical Info
    discharge_diagnosis = models.TextField(blank=True)
    discharge_summary = models.TextField(blank=True)
    medications = models.TextField(blank=True)
    follow_up_instructions = models.TextField(blank=True)
    follow_up_appointment = models.DateTimeField(null=True, blank=True)

    # Completion
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="completed_discharges"
    )

    # Turnover tracking
    discharge_process_started_at = models.DateTimeField(null=True, blank=True)
    patient_left_at = models.DateTimeField(null=True, blank=True)
    bed_available_at = models.DateTimeField(null=True, blank=True)
    turnover_minutes = models.PositiveIntegerField(null=True, blank=True)

    # External tracking
    external_discharge_id = models.CharField(max_length=100, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-initiated_at"]
        indexes = [
            models.Index(fields=["patient", "status"]),
            models.Index(fields=["hospital", "status"]),
            models.Index(fields=["bed", "status"]),
            models.Index(fields=["status", "initiated_at"]),
        ]

    def __str__(self):
        return f"Discharge {self.id}: {self.patient.mrn} - {self.status}"

    def approve(self, user):
        """Approve discharge."""
        with transaction.atomic():
            self.approved_by = user
            self.approved_at = timezone.now()
            self.status = DischargeStatus.APPROVED
            self.save()

    def complete(self, user, trigger_cleaning=True):
        """
        Complete discharge process.
        Per requirements 4.3.1 - Bed marked as cleaning required, task created.
        """
        from src.audit.services import AuditService

        with transaction.atomic():
            now = timezone.now()

            # Update discharge record
            self.status = DischargeStatus.COMPLETED
            self.completed_by = user
            self.completed_at = now
            self.patient_left_at = now
            self.save()

            # Update admission
            admission = self.admission
            admission.status = "discharged"
            admission.discharged_at = now
            admission.discharged_by = user
            admission.save()

            # Update patient
            self.patient.is_currently_admitted = False
            self.patient.save()

            # Mark bed for cleaning
            if self.bed and trigger_cleaning:
                priority = "isolation_clean" if admission.is_isolation else "routine"
                self.bed.release_from_admission(
                    user=user,
                    reason=f"Discharged admission {admission.id}",
                    trigger_cleaning=True,
                    cleaning_priority=priority,
                )

            # Record turnover time if bed becomes available later
            self.discharge_process_started_at = self.initiated_at

            # Audit log
            AuditService.log_action(
                action="update",
                model_name="Discharge",
                object_id=str(self.id),
                user=user,
                details={
                    "action": "discharge_completed",
                    "bed_id": str(self.bed.id) if self.bed else None,
                    "turnover_start": str(self.discharge_process_started_at),
                }
            )

            return self

    def calculate_turnover_time(self):
        """Calculate turnover time in minutes."""
        if self.bed_available_at and self.patient_left_at:
            diff = self.bed_available_at - self.patient_left_at
            return int(diff.total_seconds() / 60)
        return None


class DischargePlanning(models.Model):
    """
    Pre-discharge planning.
    Supports predictive discharge modeling per future requirements.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    admission = models.ForeignKey(
        "admissions.Admission",
        on_delete=models.CASCADE,
        related_name="discharge_plans"
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="discharge_plans"
    )

    # Expected discharge
    expected_discharge_date = models.DateField()
    expected_discharge_time = models.TimeField(null=True, blank=True)
    confidence_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="AI-generated confidence score for prediction"
    )

    # Planning status
    status = models.CharField(
        max_length=20,
        choices=[
            ("planned", "Planned"),
            ("in_progress", "In Progress"),
            ("ready", "Ready for Discharge"),
            ("completed", "Completed"),
            ("cancelled", "Cancelled"),
        ],
        default="planned"
    )

    # Barriers
    barriers = models.JSONField(default=list, blank=True)
    barrier_notes = models.TextField(blank=True)

    # Disposition planning
    disposition_plan = models.TextField(blank=True)
    home_care_required = models.BooleanField(default=False)
    equipment_needs = models.JSONField(default=list, blank=True)

    # Transport
    transport_arranged = models.BooleanField(default=False)
    transport_details = models.CharField(max_length=200, blank=True)

    # Medications
    medications_reconciled = models.BooleanField(default=False)
    prescriptions_ready = models.BooleanField(default=False)

    # Team
    planned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_discharge_plans"
    )
    case_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_discharge_plans"
    )

    # Verification
    physician_approved = models.BooleanField(default=False)
    physician_approved_at = models.DateTimeField(null=True, blank=True)
    nurse_approved = models.BooleanField(default=False)
    nurse_approved_at = models.DateTimeField(null=True, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["expected_discharge_date"]
        indexes = [
            models.Index(fields=["admission", "status"]),
            models.Index(fields=["expected_discharge_date"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"Discharge Plan: {self.patient.mrn} on {self.expected_discharge_date}"
