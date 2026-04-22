"""
Alert models for BedFlow - Notifications and alerts per section 4.6
"""

from django.db import models, transaction
from django.conf import settings
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

from src.lib.utils.uuid7 import uuid7
from src.common.constants import AlertSeverity, AlertType, NotificationChannel


class Alert(models.Model):
    """
    System alert for threshold monitoring.
    Per requirements 4.6 - Alerts for various conditions.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    # Alert classification
    alert_type = models.CharField(
        max_length=50,
        choices=AlertType.choices
    )
    severity = models.CharField(
        max_length=20,
        choices=AlertSeverity.choices
    )

    # Content
    title = models.CharField(max_length=200)
    message = models.TextField()

    # Context
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="alerts"
    )
    department = models.ForeignKey(
        "organizations.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alerts"
    )

    # Generic relation to related object
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    object_id = models.CharField(max_length=100, blank=True)
    related_object = GenericForeignKey('content_type', 'object_id')

    # Status
    is_active = models.BooleanField(default=True)
    is_acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acknowledged_alerts"
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    # Resolution
    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_alerts"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)

    # Metrics
    triggered_at = models.DateTimeField(default=timezone.now)
    escalated_at = models.DateTimeField(null=True, blank=True)
    notification_count = models.PositiveIntegerField(default=0)

    # Threshold data (for metric-based alerts)
    threshold_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    current_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_alerts"
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["alert_type", "is_active"]),
            models.Index(fields=["hospital", "is_active"]),
            models.Index(fields=["severity", "is_active"]),
            models.Index(fields=["is_acknowledged"]),
            models.Index(fields=["triggered_at"]),
        ]

    def __str__(self):
        return f"{self.alert_type}: {self.title}"

    def acknowledge(self, user):
        """Acknowledge the alert."""
        with transaction.atomic():
            self.is_acknowledged = True
            self.acknowledged_by = user
            self.acknowledged_at = timezone.now()
            self.save()

    def resolve(self, user, notes=""):
        """Mark alert as resolved."""
        with transaction.atomic():
            self.is_resolved = True
            self.is_active = False
            self.resolved_by = user
            self.resolved_at = timezone.now()
            self.resolution_notes = notes
            self.save()


class AlertConfiguration(models.Model):
    """
    Alert configuration and rules.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="alert_configurations"
    )

    # Alert rule
    name = models.CharField(max_length=200)
    alert_type = models.CharField(
        max_length=50,
        choices=AlertType.choices
    )
    is_enabled = models.BooleanField(default=True)

    # Threshold configuration
    threshold_type = models.CharField(
        max_length=50,
        choices=[
            ("occupancy_percentage", "Occupancy Percentage"),
            ("queue_length", "Queue Length"),
            ("time_threshold", "Time Threshold (minutes)"),
            ("count", "Count"),
        ]
    )
    threshold_value = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )
    comparison_operator = models.CharField(
        max_length=10,
        choices=[
            ("gt", "Greater Than"),
            ("gte", "Greater Than or Equal"),
            ("lt", "Less Than"),
            ("lte", "Less Than or Equal"),
            ("eq", "Equal"),
        ],
        default="gt"
    )

    # Scope
    applies_to_all_departments = models.BooleanField(default=True)
    departments = models.ManyToManyField(
        "organizations.Department",
        blank=True,
        related_name="alert_configurations"
    )

    # Notification settings
    notification_channels = models.JSONField(default=list)  # [sms, email, in_app]
    notify_roles = models.JSONField(default=list)  # List of role names
    escalation_enabled = models.BooleanField(default=True)
    escalation_delay_minutes = models.PositiveIntegerField(default=30)

    # Cooldown
    cooldown_minutes = models.PositiveIntegerField(default=60)
    last_triggered_at = models.DateTimeField(null=True, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_alert_configs"
    )

    class Meta:
        ordering = ["alert_type", "name"]
        indexes = [
            models.Index(fields=["hospital", "alert_type"]),
            models.Index(fields=["is_enabled"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.hospital.name})"

    def can_trigger(self):
        """Check if enough time has passed since last trigger."""
        if not self.last_triggered_at:
            return True
        cooldown = timezone.timedelta(minutes=self.cooldown_minutes)
        return timezone.now() > self.last_triggered_at + cooldown

    def record_trigger(self):
        """Record that this alert was triggered."""
        self.last_triggered_at = timezone.now()
        self.save()


class UserAlertPreference(models.Model):
    """
    User preferences for alert notifications.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="alert_preferences"
    )
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="user_alert_preferences"
    )

    # Notification channels
    notify_email = models.BooleanField(default=True)
    notify_sms = models.BooleanField(default=False)
    notify_in_app = models.BooleanField(default=True)
    notify_push = models.BooleanField(default=False)

    # Alert types this user wants to receive
    subscribed_alert_types = models.JSONField(default=list)

    # Quiet hours
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    quiet_hours_enabled = models.BooleanField(default=False)

    # Severities
    min_severity = models.CharField(
        max_length=20,
        choices=AlertSeverity.choices,
        default="info"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [["user", "hospital"]]
        indexes = [
            models.Index(fields=["user", "hospital"]),
        ]

    def __str__(self):
        return f"Alert Preferences: {self.user.get_name()} ({self.hospital.code})"


class NotificationLog(models.Model):
    """
    Log of all notifications sent.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    alert = models.ForeignKey(
        Alert,
        on_delete=models.CASCADE,
        related_name="notification_logs"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_logs"
    )

    channel = models.CharField(
        max_length=20,
        choices=NotificationChannel.choices
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("sent", "Sent"),
            ("delivered", "Delivered"),
            ("failed", "Failed"),
            ("read", "Read"),
        ]
    )
    error_message = models.TextField(blank=True)

    sent_at = models.DateTimeField(default=timezone.now)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    # Content
    subject = models.CharField(max_length=200, blank=True)
    body = models.TextField(blank=True)

    class Meta:
        ordering = ["-sent_at"]
        indexes = [
            models.Index(fields=["alert", "status"]),
            models.Index(fields=["user", "status"]),
            models.Index(fields=["channel", "status"]),
        ]

    def __str__(self):
        return f"Notification to {self.user.get_name()} via {self.channel}"
