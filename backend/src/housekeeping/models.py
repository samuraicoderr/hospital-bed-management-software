"""
Housekeeping models for BedFlow - Cleaning workflow per section 4.3.2
"""

from django.db import models, transaction
from django.conf import settings
from django.utils import timezone
from django.db.models import F

from src.lib.utils.uuid7 import uuid7
from src.common.constants import CleaningStatus, CleaningPriority, CLEANING_SLA_MINUTES


class CleaningTask(models.Model):
    """
    Housekeeping cleaning task.
    Per requirements 4.3.2 - Cleaning workflow with SLA tracking.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    # Related entities
    bed = models.ForeignKey(
        "beds.Bed",
        on_delete=models.CASCADE,
        related_name="cleaning_tasks"
    )
    discharge = models.ForeignKey(
        "discharges.Discharge",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cleaning_tasks"
    )

    # Task details
    priority = models.CharField(
        max_length=30,
        choices=CleaningPriority.choices,
        default=CleaningPriority.ROUTINE
    )

    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=CleaningStatus.choices,
        default=CleaningStatus.PENDING
    )

    # Assignment
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_cleaning_tasks"
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_cleaning_tasks_to_others"
    )
    assigned_at = models.DateTimeField(null=True, blank=True)

    # SLA Tracking
    sla_minutes = models.PositiveIntegerField(default=60)
    sla_deadline = models.DateTimeField()
    sla_breached = models.BooleanField(default=False)
    sla_breach_minutes = models.PositiveIntegerField(null=True, blank=True)

    # Timing
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Notes
    instructions = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    completion_notes = models.TextField(blank=True)

    # Quality check
    quality_check_required = models.BooleanField(default=True)
    quality_checked = models.BooleanField(default=False)
    quality_checked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quality_checked_cleaning"
    )
    quality_checked_at = models.DateTimeField(null=True, blank=True)
    quality_check_passed = models.BooleanField(default=False)
    quality_check_notes = models.TextField(blank=True)

    # Escalation
    escalated = models.BooleanField(default=False)
    escalated_at = models.DateTimeField(null=True, blank=True)
    escalated_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="escalated_cleaning_tasks"
    )
    escalation_reason = models.TextField(blank=True)

    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_cleaning_tasks"
    )

    class Meta:
        ordering = ["priority", "created_at"]
        indexes = [
            models.Index(fields=["bed", "status"]),
            models.Index(fields=["status", "priority"]),
            models.Index(fields=["assigned_to", "status"]),
            models.Index(fields=["sla_deadline"]),
            models.Index(fields=["sla_breached"]),
            models.Index(fields=["escalated"]),
        ]

    def __str__(self):
        return f"Cleaning Task {self.id}: {self.bed.bed_code} - {self.status}"

    def save(self, *args, **kwargs):
        # Set SLA deadline based on priority
        if not self.sla_deadline:
            sla_minutes = CLEANING_SLA_MINUTES.get(
                self.priority,
                CLEANING_SLA_MINUTES[CleaningPriority.ROUTINE]
            )
            self.sla_deadline = self.created_at + timezone.timedelta(minutes=sla_minutes)
            self.sla_minutes = sla_minutes
        super().save(*args, **kwargs)

    def assign(self, staff_user, assigned_by=None):
        """Assign cleaning task to housekeeping staff."""
        with transaction.atomic():
            self.assigned_to = staff_user
            self.assigned_by = assigned_by
            self.assigned_at = timezone.now()
            self.status = CleaningStatus.ASSIGNED
            self.save()

    def start(self, user):
        """Start cleaning."""
        with transaction.atomic():
            self.status = CleaningStatus.IN_PROGRESS
            self.started_at = timezone.now()
            self.save()

            # Update bed status
            self.bed.change_status(
                new_status="cleaning_in_progress",
                user=user,
                reason=f"Cleaning started by {user.get_name()}"
            )

    def complete(self, user, notes=""):
        """
        Complete cleaning task.
        Per requirements 4.3.2 - Bed marked as Available after completion.
        """
        from src.audit.services import AuditService
        from src.common.constants import BedStatus

        with transaction.atomic():
            now = timezone.now()
            self.status = CleaningStatus.COMPLETED
            self.completed_at = now
            self.completion_notes = notes

            # Check SLA
            if now > self.sla_deadline:
                self.sla_breached = True
                breach_delta = now - self.sla_deadline
                self.sla_breach_minutes = int(breach_delta.total_seconds() / 60)

            self.save()

            # Update bed status to available
            self.bed.change_status(
                new_status=BedStatus.AVAILABLE,
                user=user,
                reason="Cleaning completed"
            )

            # Update discharge turnover time if applicable
            if self.discharge and self.completed_at:
                self.discharge.bed_available_at = self.completed_at
                self.discharge.turnover_minutes = self.discharge.calculate_turnover_time()
                self.discharge.save()

            # Audit log
            AuditService.log_action(
                action="update",
                model_name="CleaningTask",
                object_id=str(self.id),
                user=user,
                details={
                    "action": "cleaning_completed",
                    "sla_breached": self.sla_breached,
                    "sla_breach_minutes": self.sla_breach_minutes,
                }
            )

    def escalate(self, user, reason=""):
        """Escalate overdue cleaning task."""
        with transaction.atomic():
            self.escalated = True
            self.escalated_at = timezone.now()
            self.escalated_to = user
            self.escalation_reason = reason
            self.status = CleaningStatus.ESCALATED
            self.save()

    def check_sla(self):
        """Check if SLA has been breached."""
        from src.alerts.services import AlertService

        now = timezone.now()
        if now > self.sla_deadline and not self.sla_breached:
            self.sla_breached = True
            breach_delta = now - self.sla_deadline
            self.sla_breach_minutes = int(breach_delta.total_seconds() / 60)
            self.save()

            # Trigger alert
            AlertService.create_alert(
                alert_type="cleaning_sla_breach",
                severity="critical",
                hospital=self.bed.get_hospital(),
                message=f"Cleaning SLA breached for bed {self.bed.bed_code}",
                related_object=self,
                notify_users=True
            )

            return True
        return False


class HousekeepingStaff(models.Model):
    """
    Housekeeping staff assignments and workload tracking.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="housekeeping_profile"
    )
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="housekeeping_staff"
    )

    # Staff details
    employee_id = models.CharField(max_length=50, blank=True)
    phone = models.CharField(max_length=20, blank=True)

    # Shift
    shift_start = models.TimeField()
    shift_end = models.TimeField()
    days_off = models.JSONField(default=list, blank=True)

    # Workload
    max_tasks_per_shift = models.PositiveIntegerField(default=10)
    current_task_count = models.PositiveIntegerField(default=0)
    is_available = models.BooleanField(default=True)

    # Status
    is_active = models.BooleanField(default=True)

    # Performance
    tasks_completed_today = models.PositiveIntegerField(default=0)
    average_cleaning_time_minutes = models.PositiveIntegerField(null=True, blank=True)
    sla_compliance_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=100.00
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user__last_name", "user__first_name"]
        indexes = [
            models.Index(fields=["hospital", "is_active"]),
            models.Index(fields=["is_available"]),
        ]
        verbose_name_plural = "Housekeeping Staff"

    def __str__(self):
        return f"Housekeeping: {self.user.get_name()}"

    def increment_task_count(self):
        """Increment current task count."""
        self.current_task_count = F("current_task_count") + 1
        self.save()
        self.refresh_from_db()

    def decrement_task_count(self):
        """Decrement current task count and increment completed."""
        self.current_task_count = F("current_task_count") - 1
        self.tasks_completed_today = F("tasks_completed_today") + 1
        self.save()
        self.refresh_from_db()

    def reset_daily_stats(self):
        """Reset daily statistics."""
        self.tasks_completed_today = 0
        self.current_task_count = 0
        self.save()

    def is_available_for_assignment(self):
        """Check if staff can accept new tasks."""
        return (
            self.is_active and
            self.is_available and
            self.current_task_count < self.max_tasks_per_shift
        )


class CleaningChecklistItem(models.Model):
    """
    Checklist items for cleaning quality verification.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    task = models.ForeignKey(
        CleaningTask,
        on_delete=models.CASCADE,
        related_name="checklist_items"
    )
    item_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Standard checklist items
    ITEM_CHOICES = [
        ("change_linen", "Change bed linen"),
        ("sanitize_surfaces", "Sanitize all surfaces"),
        ("clean_bathroom", "Clean bathroom"),
        ("restock_supplies", "Restock supplies"),
        ("remove_trash", "Remove trash"),
        ("check_equipment", "Check medical equipment"),
        ("terminal_clean", "Terminal clean (if isolation)"),
        ("floor_cleaning", "Floor cleaning"),
        ("window_cleaning", "Window cleaning"),
        ("air_freshen", "Air freshening"),
    ]

    class Meta:
        ordering = ["item_name"]

    def __str__(self):
        return f"{self.item_name} - {'Done' if self.is_completed else 'Pending'}"
