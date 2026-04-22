"""
Report models for BedFlow - Reports and analytics per section 4.5
"""

from django.db import models
from django.conf import settings
from django.utils import timezone

from src.lib.utils.uuid7 import uuid7
from src.common.constants import ReportType, ReportFormat


class ReportTemplate(models.Model):
    """
    Report template definition.
    Per requirements 4.5.2 - Scheduled/exportable reports.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="report_templates"
    )

    name = models.CharField(max_length=200)
    report_type = models.CharField(
        max_length=50,
        choices=ReportType.choices
    )
    description = models.TextField(blank=True)

    # Configuration
    config = models.JSONField(default=dict, blank=True)
    default_format = models.CharField(
        max_length=10,
        choices=ReportFormat.choices,
        default=ReportFormat.PDF
    )

    # Scope
    include_all_departments = models.BooleanField(default=True)
    departments = models.ManyToManyField(
        "organizations.Department",
        blank=True,
        related_name="report_templates"
    )

    # Scheduling
    is_scheduled = models.BooleanField(default=False)
    schedule_frequency = models.CharField(
        max_length=20,
        choices=[
            ("daily", "Daily"),
            ("weekly", "Weekly"),
            ("monthly", "Monthly"),
            ("quarterly", "Quarterly"),
        ],
        blank=True
    )
    schedule_day_of_week = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="0=Monday, 6=Sunday"
    )
    schedule_time = models.TimeField(null=True, blank=True)
    schedule_recipients = models.JSONField(default=list, blank=True)

    # Status
    is_active = models.BooleanField(default=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_report_templates"
    )

    class Meta:
        ordering = ["report_type", "name"]
        indexes = [
            models.Index(fields=["hospital", "report_type"]),
            models.Index(fields=["is_scheduled", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.hospital.code})"


class ReportRun(models.Model):
    """
    Individual report generation run.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    template = models.ForeignKey(
        ReportTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="runs"
    )
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="report_runs"
    )

    # Run details
    report_type = models.CharField(
        max_length=50,
        choices=ReportType.choices
    )
    name = models.CharField(max_length=200)

    # Date range
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()

    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("running", "Running"),
            ("completed", "Completed"),
            ("failed", "Failed"),
        ],
        default="pending"
    )
    error_message = models.TextField(blank=True)

    # Output
    format = models.CharField(
        max_length=10,
        choices=ReportFormat.choices
    )
    file = models.FileField(upload_to="reports/", null=True, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)

    # Metrics
    generated_at = models.DateTimeField(null=True, blank=True)
    generation_time_seconds = models.PositiveIntegerField(null=True, blank=True)
    record_count = models.PositiveIntegerField(null=True, blank=True)

    # Requested by
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="report_runs"
    )

    # Scheduled run
    is_scheduled_run = models.BooleanField(default=False)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["hospital", "report_type"]),
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.status}"


class DashboardMetric(models.Model):
    """
    Cached dashboard metric data.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="dashboard_metrics"
    )

    # Metric identification
    metric_name = models.CharField(max_length=100)
    department = models.ForeignKey(
        "organizations.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dashboard_metrics"
    )

    # Data
    value = models.DecimalField(max_digits=15, decimal_places=4)
    unit = models.CharField(max_length=50, blank=True)
    previous_value = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        null=True,
        blank=True
    )
    change_percentage = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        null=True,
        blank=True
    )

    # Context
    dimension_data = models.JSONField(default=dict, blank=True)
    benchmark_value = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        null=True,
        blank=True
    )

    # Caching
    calculated_at = models.DateTimeField(default=timezone.now)
    valid_until = models.DateTimeField()

    class Meta:
        ordering = ["-calculated_at"]
        indexes = [
            models.Index(fields=["hospital", "metric_name"]),
            models.Index(fields=["valid_until"]),
        ]

    def __str__(self):
        return f"{self.metric_name}: {self.value}"

    def is_stale(self):
        """Check if metric data is stale."""
        return timezone.now() >= self.valid_until


class ScheduledReportEmail(models.Model):
    """
    Email log for scheduled reports.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    report_run = models.ForeignKey(
        ReportRun,
        on_delete=models.CASCADE,
        related_name="emails"
    )

    recipient_email = models.EmailField()
    sent_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("sent", "Sent"),
            ("failed", "Failed"),
        ],
        default="pending"
    )
    error_message = models.TextField(blank=True)

    # Tracking
    opened_at = models.DateTimeField(null=True, blank=True)
    open_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-sent_at"]

    def __str__(self):
        return f"Email to {self.recipient_email} - {self.status}"
