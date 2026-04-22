"""
Dashboard models for BedFlow - KPI aggregation per section 4.5.1
"""

from django.db import models
from django.conf import settings
from django.utils import timezone

from src.lib.utils.uuid7 import uuid7


class TimeSeriesMetric(models.Model):
    """
    Time-series data for dashboard charts and trend analysis.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="time_series_metrics"
    )
    department = models.ForeignKey(
        "organizations.Department",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="time_series_metrics"
    )

    metric_name = models.CharField(max_length=100)
    metric_value = models.DecimalField(max_digits=15, decimal_places=4)
    unit = models.CharField(max_length=50, blank=True)

    # Time bucketing
    timestamp = models.DateTimeField(db_index=True)
    granularity = models.CharField(
        max_length=20,
        choices=[
            ("minute", "Minute"),
            ("hour", "Hour"),
            ("day", "Day"),
            ("week", "Week"),
            ("month", "Month"),
        ],
        default="hour"
    )

    # Additional dimensions
    dimension_1 = models.CharField(max_length=100, blank=True)
    dimension_2 = models.CharField(max_length=100, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["hospital", "metric_name", "timestamp"]),
            models.Index(fields=["hospital", "department", "metric_name"]),
            models.Index(fields=["granularity", "timestamp"]),
        ]

    def __str__(self):
        return f"{self.metric_name}: {self.metric_value} at {self.timestamp}"


class BedAvailabilitySnapshot(models.Model):
    """
    Point-in-time snapshot of bed availability status.
    Used for occupancy trend reports.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="bed_snapshots"
    )

    snapshot_time = models.DateTimeField(default=timezone.now, db_index=True)

    # Counts by status
    total_beds = models.PositiveIntegerField()
    available_beds = models.PositiveIntegerField()
    occupied_beds = models.PositiveIntegerField()
    reserved_beds = models.PositiveIntegerField()
    cleaning_required_beds = models.PositiveIntegerField()
    cleaning_in_progress_beds = models.PositiveIntegerField()
    maintenance_beds = models.PositiveIntegerField()
    blocked_beds = models.PositiveIntegerField()
    isolation_beds = models.PositiveIntegerField()

    # ICU specific
    total_icu_beds = models.PositiveIntegerField(default=0)
    occupied_icu_beds = models.PositiveIntegerField(default=0)
    available_icu_beds = models.PositiveIntegerField(default=0)

    # Derived metrics
    occupancy_rate = models.DecimalField(max_digits=5, decimal_places=2)
    icu_occupancy_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0
    )

    class Meta:
        ordering = ["-snapshot_time"]
        indexes = [
            models.Index(fields=["hospital", "snapshot_time"]),
        ]

    def __str__(self):
        return f"Snapshot {self.hospital.code} at {self.snapshot_time}"


class AdmissionQueueSnapshot(models.Model):
    """
    Snapshot of admission queue depth over time.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="queue_snapshots"
    )

    snapshot_time = models.DateTimeField(default=timezone.now, db_index=True)

    # Queue counts
    total_pending = models.PositiveIntegerField()
    urgent_pending = models.PositiveIntegerField(default=0)
    emergency_pending = models.PositiveIntegerField(default=0)

    # Wait times
    average_wait_minutes = models.PositiveIntegerField()
    max_wait_minutes = models.PositiveIntegerField()

    class Meta:
        ordering = ["-snapshot_time"]

    def __str__(self):
        return f"Queue Snapshot {self.hospital.code} at {self.snapshot_time}"


class CleaningPerformanceMetric(models.Model):
    """
    Cleaning performance metrics.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="cleaning_metrics"
    )
    housekeeping_staff = models.ForeignKey(
        "housekeeping.HousekeepingStaff",
        on_delete=models.CASCADE,
        related_name="performance_metrics"
    )

    # Period
    date = models.DateField()

    # Task counts
    tasks_completed = models.PositiveIntegerField()
    tasks_overdue = models.PositiveIntegerField()
    tasks_escalated = models.PositiveIntegerField()

    # Performance
    average_turnaround_minutes = models.PositiveIntegerField()
    sla_compliance_percentage = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        ordering = ["-date"]
        unique_together = [["housekeeping_staff", "date"]]

    def __str__(self):
        return f"Cleaning Metric: {self.housekeeping_staff} on {self.date}"


class DailyCensus(models.Model):
    """
    Daily census report data.
    Per requirements 4.5.2 - Daily census report.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="daily_census"
    )
    department = models.ForeignKey(
        "organizations.Department",
        on_delete=models.CASCADE,
        related_name="daily_census"
    )

    # Date
    census_date = models.DateField(db_index=True)

    # Midnight census (ACD)
    midnight_census = models.PositiveIntegerField()

    # Admissions and discharges
    admissions = models.PositiveIntegerField()
    discharges = models.PositiveIntegerField()

    # Transfers
    transfers_in = models.PositiveIntegerField()
    transfers_out = models.PositiveIntegerField()

    # Capacity
    available_beds = models.PositiveIntegerField()
    total_beds = models.PositiveIntegerField()

    # Derived
    occupancy_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    average_los = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        ordering = ["-census_date"]
        unique_together = [["hospital", "department", "census_date"]]
        indexes = [
            models.Index(fields=["hospital", "census_date"]),
        ]

    def __str__(self):
        return f"Census {self.hospital.code} - {self.department.name} - {self.census_date}"
