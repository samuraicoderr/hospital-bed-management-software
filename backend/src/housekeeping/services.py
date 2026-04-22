"""
Housekeeping services for BedFlow.
Per requirements section 4.3.2 - Cleaning workflow with SLA tracking.
"""

from django.db import transaction
from django.utils import timezone

from src.housekeeping.models import CleaningTask, HousekeepingStaff
from src.common.constants import CleaningStatus, CLEANING_SLA_MINUTES
from src.audit.services import AuditService


class HousekeepingService:
    """Service for housekeeping operations."""

    @staticmethod
    def create_cleaning_task(bed, discharge=None, priority="routine", user=None):
        """Create a cleaning task for a bed."""
        with transaction.atomic():
            task = CleaningTask.objects.create(
                bed=bed,
                discharge=discharge,
                priority=priority,
                created_by=user
            )

            # Try to auto-assign if enabled
            hospital = bed.get_hospital()
            if hospital.auto_assign_cleaning:
                HousekeepingService.assign_task(task)

            return task

    @staticmethod
    def assign_task(task, staff=None):
        """Assign a cleaning task to staff."""
        with transaction.atomic():
            if not staff:
                # Find available staff
                hospital = task.bed.get_hospital()
                available_staff = HousekeepingStaff.objects.filter(
                    hospital=hospital,
                    is_active=True,
                    is_available=True,
                    current_task_count__lt=models.F("max_tasks_per_shift")
                ).order_by("current_task_count").first()

                if available_staff:
                    staff = available_staff.user

            if staff:
                task.assign(staff)
                task.save()

                # Update staff workload
                if hasattr(staff, 'housekeeping_profile'):
                    staff.housekeeping_profile.increment_task_count()

            return task

    @staticmethod
    def start_cleaning(task, user):
        """Start cleaning a bed."""
        with transaction.atomic():
            task.start(user)
            return task

    @staticmethod
    def complete_cleaning(task, user, notes=""):
        """Complete cleaning and make bed available."""
        with transaction.atomic():
            task.complete(user, notes)

            # Update staff workload
            if task.assigned_to and hasattr(task.assigned_to, 'housekeeping_profile'):
                task.assigned_to.housekeeping_profile.decrement_task_count()

            return task

    @staticmethod
    def check_overdue_tasks():
        """Check for and escalate overdue tasks."""
        from src.alerts.services import AlertService

        overdue_tasks = CleaningTask.objects.filter(
            status__in=["pending", "assigned", "in_progress"],
            sla_deadline__lt=timezone.now(),
            sla_breached=False
        )

        count = 0
        for task in overdue_tasks:
            task.check_sla()
            count += 1

        return count

    @staticmethod
    def get_staff_workload(hospital):
        """Get current workload for all housekeeping staff."""
        return HousekeepingStaff.objects.filter(
            hospital=hospital,
            is_active=True
        ).select_related("user")

    @staticmethod
    def get_cleaning_backlog(hospital):
        """Get cleaning tasks requiring attention."""
        return CleaningTask.objects.filter(
            bed__ward__department__hospital=hospital,
            status__in=["pending", "assigned", "overdue", "escalated"]
        ).select_related("bed", "assigned_to")


# Import models at end to avoid circular import
from django.db import models