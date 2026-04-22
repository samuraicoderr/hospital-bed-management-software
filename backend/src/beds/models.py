"""
Bed models for BedFlow - Bed inventory and status management per section 4.1
"""

from django.db import models, transaction
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator

from src.lib.utils.uuid7 import uuid7
from src.common.constants import (
    BedStatus, BedType, GenderRestriction
)


class EquipmentTag(models.Model):
    """
    Equipment tags that can be associated with beds.
    Per requirements section 4.1.1 - Equipment tags for beds.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=50,
        choices=[
            ("life_support", "Life Support"),
            ("monitoring", "Monitoring"),
            ("mobility", "Mobility"),
            ("respiratory", "Respiratory"),
            ("infection_control", "Infection Control"),
            ("furniture", "Furniture"),
        ]
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["category"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Bed(models.Model):
    """
    Hospital Bed model.
    Per requirements section 4.1.1 - The base unit of bed management.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    # Hierarchy
    ward = models.ForeignKey(
        "organizations.Ward",
        on_delete=models.CASCADE,
        related_name="beds"
    )

    # Unique identifier
    bed_number = models.CharField(max_length=20)
    bed_code = models.CharField(max_length=100, unique=True)

    # Bed classification
    bed_type = models.CharField(
        max_length=20,
        choices=BedType.choices,
        default=BedType.GENERAL
    )

    # Bed features
    is_isolation = models.BooleanField(default=False)
    gender_restriction = models.CharField(
        max_length=20,
        choices=GenderRestriction.choices,
        default=GenderRestriction.NONE
    )

    # Equipment
    equipment_tags = models.ManyToManyField(
        EquipmentTag,
        blank=True,
        related_name="beds"
    )

    # Current Status
    status = models.CharField(
        max_length=30,
        choices=BedStatus.choices,
        default=BedStatus.AVAILABLE
    )

    # Status tracking
    status_changed_at = models.DateTimeField(default=timezone.now)
    status_changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bed_status_changes"
    )
    status_reason = models.TextField(blank=True)

    # Blocked status details
    blocked_until = models.DateTimeField(null=True, blank=True)
    blocked_reason = models.TextField(blank=True)

    # Maintenance
    under_maintenance_since = models.DateTimeField(null=True, blank=True)
    maintenance_reason = models.TextField(blank=True)

    # Current occupancy
    current_admission = models.ForeignKey(
        "admissions.Admission",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="occupied_bed"
    )
    occupied_since = models.DateTimeField(null=True, blank=True)

    # Reservation
    reserved_for = models.ForeignKey(
        "admissions.AdmissionRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="currently_reserved_bed"
    )
    reserved_until = models.DateTimeField(null=True, blank=True)

    # Physical details
    bed_size = models.CharField(
        max_length=20,
        choices=[
            ("standard", "Standard"),
            ("large", "Large"),
            ("bariatric", "Bariatric"),
            ("pediatric", "Pediatric"),
        ],
        default="standard"
    )
    max_patient_weight_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=150.00
    )

    # Status flags
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_beds"
    )

    class Meta:
        ordering = ["ward__department__hospital", "ward__name", "bed_number"]
        unique_together = [["ward", "bed_number"]]
        indexes = [
            models.Index(fields=["ward", "status"]),
            models.Index(fields=["ward", "is_active"]),
            models.Index(fields=["status", "bed_type"]),
            models.Index(fields=["status", "gender_restriction"]),
            models.Index(fields=["bed_type", "is_isolation"]),
            models.Index(fields=["status_changed_at"]),
            models.Index(fields=["current_admission"]),
        ]

    def __str__(self):
        return f"Bed {self.bed_code} - {self.get_status_display()}"

    def save(self, *args, **kwargs):
        # Generate bed_code if not set
        if not self.bed_code:
            dept_code = self.ward.department.code
            ward_code = self.ward.code
            self.bed_code = f"{dept_code}-{ward_code}-{self.bed_number}"
        super().save(*args, **kwargs)

    def change_status(self, new_status, user=None, reason=None):
        """
        Change bed status with audit trail.
        Per requirements 4.1.2 - Status changes must be timestamped and audited.
        """
        from src.audit.services import AuditService

        old_status = self.status

        with transaction.atomic():
            self.status = new_status
            self.status_changed_at = timezone.now()
            self.status_changed_by = user
            self.status_reason = reason or ""

            # Update related fields based on status
            if new_status == BedStatus.OCCUPIED:
                self.occupied_since = timezone.now()
            elif new_status == BedStatus.AVAILABLE:
                self.occupied_since = None
                self.blocked_until = None
                self.blocked_reason = ""
                self.current_admission = None

            self.save()

            # Create audit log
            if user:
                AuditService.log_action(
                    action="status_change",
                    model_name="Bed",
                    object_id=str(self.id),
                    user=user,
                    details={
                        "old_status": old_status,
                        "new_status": new_status,
                        "reason": reason,
                    }
                )

        return self

    def block(self, user=None, reason=None, until=None):
        """Block a bed from being allocated."""
        return self.change_status(
            BedStatus.BLOCKED,
            user=user,
            reason=reason
        )

    def unblock(self, user=None):
        """Unblock a bed."""
        return self.change_status(
            BedStatus.AVAILABLE,
            user=user,
            reason="Bed unblocked"
        )

    def mark_for_cleaning(self, user=None, priority="routine"):
        """Mark bed as requiring cleaning."""
        from src.housekeeping.models import CleaningTask

        # Create cleaning task
        CleaningTask.objects.create(
            bed=self,
            priority=priority,
            created_by=user
        )

        return self.change_status(
            BedStatus.CLEANING_REQUIRED,
            user=user,
            reason="Discharge - cleaning required"
        )

    def is_available(self):
        """Check if bed is available for assignment."""
        return self.status == BedStatus.AVAILABLE and self.is_active

    def can_accept_patient(self, patient_gender=None, requires_isolation=False):
        """
        Check if bed can accept a patient based on requirements.
        Per requirements 4.2.2 - Gender rules, isolation requirements, equipment needs
        """
        if not self.is_available():
            return False

        if requires_isolation and not self.is_isolation:
            return False

        if (patient_gender and
            self.gender_restriction != GenderRestriction.NONE):
            gender_map = {
                "M": "male_only",
                "F": "female_only",
                "O": None,
            }
            patient_restriction = gender_map.get(patient_gender)
            if (patient_restriction and
                self.gender_restriction != patient_restriction):
                return False

        return True

    def get_hospital(self):
        """Get the hospital this bed belongs to."""
        return self.ward.department.hospital


class BedStatusHistory(models.Model):
    """
    History of bed status changes.
    Per requirements 4.1.2 - Occupancy history tracking.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    bed = models.ForeignKey(
        Bed,
        on_delete=models.CASCADE,
        related_name="status_history"
    )
    status = models.CharField(max_length=30, choices=BedStatus.choices)
    changed_at = models.DateTimeField(default=timezone.now)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    reason = models.TextField(blank=True)

    # Admission info at time of change
    admission = models.ForeignKey(
        "admissions.Admission",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        ordering = ["-changed_at"]
        indexes = [
            models.Index(fields=["bed", "-changed_at"]),
            models.Index(fields=["status", "changed_at"]),
        ]

    def __str__(self):
        return f"{self.bed.bed_code}: {self.status} at {self.changed_at}"


class BedMaintenanceRecord(models.Model):
    """
    Records of bed maintenance activities.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    bed = models.ForeignKey(
        Bed,
        on_delete=models.CASCADE,
        related_name="maintenance_records"
    )
    issue_description = models.TextField()
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="reported_maintenance"
    )
    reported_at = models.DateTimeField(auto_now_add=True)

    # Maintenance details
    maintenance_type = models.CharField(
        max_length=50,
        choices=[
            ("repair", "Repair"),
            ("preventive", "Preventive Maintenance"),
            ("inspection", "Inspection"),
            ("replacement", "Part Replacement"),
        ]
    )
    severity = models.CharField(
        max_length=20,
        choices=[
            ("low", "Low"),
            ("medium", "Medium"),
            ("high", "High"),
            ("critical", "Critical"),
        ]
    )

    # Resolution
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_maintenance"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)

    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("in_progress", "In Progress"),
            ("completed", "Completed"),
            ("cancelled", "Cancelled"),
        ],
        default="pending"
    )

    class Meta:
        ordering = ["-reported_at"]
        indexes = [
            models.Index(fields=["bed", "status"]),
            models.Index(fields=["severity", "status"]),
        ]

    def __str__(self):
        return f"Maintenance for {self.bed.bed_code}: {self.maintenance_type}"
