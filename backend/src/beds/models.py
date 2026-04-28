"""
Bed domain models for BedFlow.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone

from src.common.constants import BedStatus, BedType, GenderRestriction
from src.lib.utils.uuid7 import uuid7


class EquipmentTag(models.Model):
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
        ],
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
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    ward = models.ForeignKey(
        "organizations.Ward",
        on_delete=models.CASCADE,
        related_name="beds",
    )

    bed_number = models.CharField(max_length=20)
    bed_code = models.CharField(max_length=100, unique=True)

    bed_type = models.CharField(
        max_length=20,
        choices=BedType.choices,
        default=BedType.GENERAL,
    )
    is_isolation = models.BooleanField(default=False)
    gender_restriction = models.CharField(
        max_length=20,
        choices=GenderRestriction.choices,
        default=GenderRestriction.NONE,
    )

    equipment_tags = models.ManyToManyField(
        EquipmentTag,
        blank=True,
        related_name="beds",
    )

    status = models.CharField(
        max_length=30,
        choices=BedStatus.choices,
        default=BedStatus.AVAILABLE,
    )
    status_changed_at = models.DateTimeField(default=timezone.now)
    status_changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bed_status_changes",
    )
    status_reason = models.TextField(blank=True)

    blocked_until = models.DateTimeField(null=True, blank=True)
    blocked_reason = models.TextField(blank=True)

    under_maintenance_since = models.DateTimeField(null=True, blank=True)
    maintenance_reason = models.TextField(blank=True)

    current_admission = models.ForeignKey(
        "admissions.Admission",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="occupied_bed",
    )
    occupied_since = models.DateTimeField(null=True, blank=True)

    reserved_for = models.ForeignKey(
        "admissions.AdmissionRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="currently_reserved_bed",
    )
    reserved_until = models.DateTimeField(null=True, blank=True)

    bed_size = models.CharField(
        max_length=20,
        choices=[
            ("standard", "Standard"),
            ("large", "Large"),
            ("bariatric", "Bariatric"),
            ("pediatric", "Pediatric"),
        ],
        default="standard",
    )
    max_patient_weight_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=150.00,
    )

    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_beds",
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
            models.Index(fields=["reserved_until"]),
        ]

    def __str__(self):
        return f"Bed {self.bed_code} - {self.get_status_display()}"

    @staticmethod
    def build_bed_code(ward, bed_number: str) -> str:
        return f"{ward.department.code}-{ward.code}-{bed_number}".upper()

    def save(self, *args, **kwargs):
        if self.ward_id and self.bed_number:
            self.bed_code = self.build_bed_code(self.ward, self.bed_number.strip())
        super().save(*args, **kwargs)

    def get_hospital(self):
        return self.ward.department.hospital

    def has_open_maintenance(self) -> bool:
        return self.maintenance_records.filter(
            status__in=["pending", "in_progress"]
        ).exists()

    def get_open_maintenance(self):
        return self.maintenance_records.filter(
            status__in=["pending", "in_progress"]
        ).order_by("-reported_at")

    def reservation_is_active(self) -> bool:
        return bool(
            self.reserved_for_id
            and self.reserved_until
            and self.reserved_until > timezone.now()
        )

    def expire_reservation(self):
        if self.status == BedStatus.RESERVED and self.reserved_until and self.reserved_until <= timezone.now():
            self.clear_reservation(
                user=None,
                reason="Reservation expired automatically",
            )

    def is_available(self):
        self.expire_reservation()
        return (
            self.status == BedStatus.AVAILABLE
            and self.is_active
            and not self.is_deleted
            and self.current_admission_id is None
            and not self.has_open_maintenance()
        )

    def eligibility_issues(
        self,
        *,
        patient_gender: str | None = None,
        requires_isolation: bool = False,
        equipment_codes: list[str] | None = None,
    ) -> list[str]:
        issues: list[str] = []
        self.expire_reservation()

        if self.is_deleted:
            issues.append("Bed has been deleted.")
        if not self.is_active:
            issues.append("Bed is inactive.")
        if self.current_admission_id:
            issues.append("Bed is already occupied.")
        if self.status != BedStatus.AVAILABLE:
            status_messages = {
                BedStatus.RESERVED: "Bed is reserved.",
                BedStatus.OCCUPIED: "Bed is occupied.",
                BedStatus.BLOCKED: "Bed is blocked.",
                BedStatus.CLEANING_REQUIRED: "Bed requires cleaning.",
                BedStatus.CLEANING_IN_PROGRESS: "Bed is being cleaned.",
                BedStatus.UNDER_MAINTENANCE: "Bed is under maintenance.",
            }
            issues.append(status_messages.get(self.status, "Bed is not available."))
        if self.has_open_maintenance():
            issues.append("Bed has open maintenance.")
        if requires_isolation and not self.is_isolation:
            issues.append("Bed does not meet isolation requirement.")
        if patient_gender and self.gender_restriction != GenderRestriction.NONE:
            gender_map = {
                "M": GenderRestriction.MALE_ONLY,
                "F": GenderRestriction.FEMALE_ONLY,
            }
            expected = gender_map.get(patient_gender.upper())
            if expected and self.gender_restriction != expected:
                issues.append("Bed gender restriction does not match patient.")
        if equipment_codes:
            current_codes = set(self.equipment_tags.values_list("code", flat=True))
            missing = [code for code in equipment_codes if code not in current_codes]
            if missing:
                issues.append(f"Bed is missing equipment: {', '.join(sorted(missing))}.")
        return issues

    def can_accept_patient(
        self,
        patient_gender: str | None = None,
        requires_isolation: bool = False,
        equipment_codes: list[str] | None = None,
    ) -> bool:
        return not self.eligibility_issues(
            patient_gender=patient_gender,
            requires_isolation=requires_isolation,
            equipment_codes=equipment_codes,
        )

    def change_status(self, new_status, user=None, reason=None, linked_admission=None):
        from src.audit.services import AuditService

        old_status = self.status
        if old_status == new_status:
            return self

        with transaction.atomic():
            self.status = new_status
            self.status_changed_at = timezone.now()
            self.status_changed_by = user
            self.status_reason = reason or ""

            if new_status == BedStatus.AVAILABLE:
                self.blocked_until = None
                self.blocked_reason = ""
                self.under_maintenance_since = None
                self.maintenance_reason = ""
                if not self.current_admission_id:
                    self.occupied_since = None
            elif new_status == BedStatus.OCCUPIED and not self.occupied_since:
                self.occupied_since = timezone.now()
            elif new_status == BedStatus.BLOCKED:
                self.current_admission = None
                self.occupied_since = None
            elif new_status == BedStatus.UNDER_MAINTENANCE:
                self.current_admission = None
                self.occupied_since = None

            self.save()

            BedStatusHistory.objects.create(
                bed=self,
                status=new_status,
                changed_by=user,
                reason=reason or "",
                admission=linked_admission or self.current_admission,
            )

            AuditService.log_status_change(
                model_name="Bed",
                object_id=str(self.id),
                old_status=old_status,
                new_status=new_status,
                user=user,
                hospital=self.get_hospital(),
                reason=reason,
            )
        return self

    def block(self, user=None, reason=None, until=None):
        self.blocked_until = until
        self.blocked_reason = reason or ""
        self.save(update_fields=["blocked_until", "blocked_reason", "updated_at"])
        return self.change_status(BedStatus.BLOCKED, user=user, reason=reason or "Bed blocked")

    def unblock(self, user=None, reason="Bed unblocked"):
        self.blocked_until = None
        self.blocked_reason = ""
        self.save(update_fields=["blocked_until", "blocked_reason", "updated_at"])
        return self.change_status(BedStatus.AVAILABLE, user=user, reason=reason)

    def reserve_for_request(self, admission_request, user=None, reason=None, until=None):
        with transaction.atomic():
            self.reserved_for = admission_request
            self.reserved_until = until
            self.save(update_fields=["reserved_for", "reserved_until", "updated_at"])
            return self.change_status(
                BedStatus.RESERVED,
                user=user,
                reason=reason or f"Reserved for admission request {admission_request.id}",
            )

    def clear_reservation(self, user=None, reason="Reservation cleared"):
        with transaction.atomic():
            self.reserved_for = None
            self.reserved_until = None
            self.save(update_fields=["reserved_for", "reserved_until", "updated_at"])
            target_status = BedStatus.AVAILABLE if not self.has_open_maintenance() else BedStatus.UNDER_MAINTENANCE
            return self.change_status(target_status, user=user, reason=reason)

    def assign_to_admission(self, admission, user=None, reason=None):
        with transaction.atomic():
            self.current_admission = admission
            self.occupied_since = timezone.now()
            self.reserved_for = None
            self.reserved_until = None
            self.save(
                update_fields=[
                    "current_admission",
                    "occupied_since",
                    "reserved_for",
                    "reserved_until",
                    "updated_at",
                ]
            )
            return self.change_status(
                BedStatus.OCCUPIED,
                user=user,
                reason=reason or "Bed assigned to admission",
                linked_admission=admission,
            )

    def release_from_admission(
        self,
        *,
        user=None,
        reason=None,
        trigger_cleaning=True,
        cleaning_priority="routine",
    ):
        with transaction.atomic():
            linked_admission = self.current_admission
            self.current_admission = None
            self.occupied_since = None
            self.save(update_fields=["current_admission", "occupied_since", "updated_at"])
            if trigger_cleaning:
                return self.mark_for_cleaning(
                    user=user,
                    priority=cleaning_priority,
                    reason=reason or "Bed released and queued for cleaning",
                    linked_admission=linked_admission,
                )
            return self.change_status(
                BedStatus.AVAILABLE,
                user=user,
                reason=reason or "Bed released",
                linked_admission=linked_admission,
            )

    def mark_for_cleaning(
        self,
        user=None,
        priority="routine",
        reason="Cleaning required",
        linked_admission=None,
    ):
        from src.housekeeping.models import CleaningTask

        with transaction.atomic():
            open_task = self.cleaning_tasks.filter(
                status__in=["pending", "assigned", "in_progress", "escalated"]
            ).order_by("-created_at").first()
            if not open_task:
                CleaningTask.objects.create(
                    bed=self,
                    priority=priority,
                    created_by=user,
                )
            return self.change_status(
                BedStatus.CLEANING_REQUIRED,
                user=user,
                reason=reason,
                linked_admission=linked_admission,
            )

    def mark_under_maintenance(self, user=None, reason=None):
        self.under_maintenance_since = timezone.now()
        self.maintenance_reason = reason or ""
        self.save(update_fields=["under_maintenance_since", "maintenance_reason", "updated_at"])
        return self.change_status(
            BedStatus.UNDER_MAINTENANCE,
            user=user,
            reason=reason or "Bed placed under maintenance",
        )

    def complete_maintenance(self, user=None, reason="Maintenance completed"):
        with transaction.atomic():
            self.under_maintenance_since = None
            self.maintenance_reason = ""
            self.save(update_fields=["under_maintenance_since", "maintenance_reason", "updated_at"])
            if self.current_admission_id:
                return self.change_status(BedStatus.OCCUPIED, user=user, reason=reason)
            if self.cleaning_tasks.filter(status__in=["pending", "assigned", "in_progress", "escalated"]).exists():
                return self.change_status(BedStatus.CLEANING_REQUIRED, user=user, reason=reason)
            if self.reservation_is_active():
                return self.change_status(BedStatus.RESERVED, user=user, reason=reason)
            return self.change_status(BedStatus.AVAILABLE, user=user, reason=reason)

    def unmark_for_cleaning(self, user=None, reason="Cleaning requirement cleared"):
        with transaction.atomic():
            from src.housekeeping.models import CleaningTask
            open_tasks = self.cleaning_tasks.filter(status__in=["pending", "assigned", "in_progress", "escalated"])
            open_tasks.update(status="cancelled")
            if self.current_admission_id:
                return self.change_status(BedStatus.OCCUPIED, user=user, reason=reason)
            if self.reservation_is_active():
                return self.change_status(BedStatus.RESERVED, user=user, reason=reason)
            if self.has_open_maintenance():
                return self.change_status(BedStatus.UNDER_MAINTENANCE, user=user, reason=reason)
            return self.change_status(BedStatus.AVAILABLE, user=user, reason=reason)

    def activate(self, user=None, reason="Bed activated"):
        self.is_active = True
        self.save(update_fields=["is_active", "updated_at"])
        return self

    def deactivate(self, user=None, reason="Bed deactivated"):
        self.is_active = False
        self.save(update_fields=["is_active", "updated_at"])
        return self

    def soft_delete(self, user=None, reason="Bed deleted"):
        self.is_deleted = True
        self.is_active = False
        self.save(update_fields=["is_deleted", "is_active", "updated_at"])
        return self


class BedStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    bed = models.ForeignKey(
        Bed,
        on_delete=models.CASCADE,
        related_name="status_history",
    )
    status = models.CharField(max_length=30, choices=BedStatus.choices)
    changed_at = models.DateTimeField(default=timezone.now)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    reason = models.TextField(blank=True)
    admission = models.ForeignKey(
        "admissions.Admission",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
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
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    bed = models.ForeignKey(
        Bed,
        on_delete=models.CASCADE,
        related_name="maintenance_records",
    )
    issue_description = models.TextField()
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="reported_maintenance",
    )
    reported_at = models.DateTimeField(auto_now_add=True)
    maintenance_type = models.CharField(
        max_length=50,
        choices=[
            ("repair", "Repair"),
            ("preventive", "Preventive Maintenance"),
            ("inspection", "Inspection"),
            ("replacement", "Part Replacement"),
        ],
    )
    severity = models.CharField(
        max_length=20,
        choices=[
            ("low", "Low"),
            ("medium", "Medium"),
            ("high", "High"),
            ("critical", "Critical"),
        ],
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_maintenance",
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
        default="pending",
    )

    class Meta:
        ordering = ["-reported_at"]
        indexes = [
            models.Index(fields=["bed", "status"]),
            models.Index(fields=["severity", "status"]),
        ]

    def __str__(self):
        return f"Maintenance for {self.bed.bed_code}: {self.maintenance_type}"
