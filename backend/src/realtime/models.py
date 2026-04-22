"""
Realtime models for BedFlow - WebSocket events per section 4.4
"""

from django.db import models
from django.conf import settings
from django.utils import timezone

from src.lib.utils.uuid7 import uuid7


class RealtimeEvent(models.Model):
    """
    Store recent realtime events for replay and logging.
    Per requirements 4.4 - Real-time updates.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    # Event classification
    event_type = models.CharField(max_length=50, db_index=True)
    channel = models.CharField(max_length=100)

    # Hospital context
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="realtime_events"
    )

    # Event data
    payload = models.JSONField()

    # Target (who should receive this)
    target_users = models.JSONField(default=list, blank=True)
    target_roles = models.JSONField(default=list, blank=True)

    # Status
    delivered_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)

    # Metadata
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["hospital", "event_type"]),
            models.Index(fields=["channel"]),
            models.Index(fields=["expires_at"]),
        ]

    def __str__(self):
        return f"{self.event_type} on {self.channel}"

    def is_expired(self):
        """Check if event has expired."""
        return timezone.now() >= self.expires_at


class UserPresence(models.Model):
    """
    Track user online presence status.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="presence_records"
    )
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="user_presence"
    )

    # Presence
    is_online = models.BooleanField(default=False)
    last_seen_at = models.DateTimeField(default=timezone.now)
    last_activity_at = models.DateTimeField(default=timezone.now)

    # Connection info
    channel_name = models.CharField(max_length=200, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    # Current view (for targeted updates)
    current_view = models.CharField(max_length=100, blank=True)
    current_department = models.ForeignKey(
        "organizations.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    # Metadata
    connected_at = models.DateTimeField(null=True, blank=True)
    disconnected_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-last_seen_at"]
        indexes = [
            models.Index(fields=["user", "is_online"]),
            models.Index(fields=["hospital", "is_online"]),
            models.Index(fields=["last_seen_at"]),
        ]

    def __str__(self):
        return f"{self.user.get_name()} - {'Online' if self.is_online else 'Offline'}"

    def update_activity(self):
        """Update last activity timestamp."""
        self.last_activity_at = timezone.now()
        self.save()

    def mark_online(self, channel_name=None):
        """Mark user as online."""
        self.is_online = True
        self.connected_at = timezone.now()
        self.last_seen_at = timezone.now()
        if channel_name:
            self.channel_name = channel_name
        self.save()

    def mark_offline(self):
        """Mark user as offline."""
        self.is_online = False
        self.disconnected_at = timezone.now()
        self.channel_name = ""
        self.save()


class DashboardSubscription(models.Model):
    """
    Track which dashboards users are currently viewing.
    Used for targeted real-time updates.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dashboard_subscriptions"
    )
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="dashboard_subscribers"
    )

    # Subscription details
    dashboard_type = models.CharField(
        max_length=50,
        choices=[
            ("operational", "Operational Dashboard"),
            ("department", "Department View"),
            ("executive", "Executive Dashboard"),
            ("housekeeping", "Housekeeping Dashboard"),
            ("admission", "Admission Dashboard"),
        ]
    )
    department = models.ForeignKey(
        "organizations.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    # Channel
    channel_name = models.CharField(max_length=200)

    # Subscription time
    subscribed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-subscribed_at"]
        indexes = [
            models.Index(fields=["hospital", "dashboard_type"]),
            models.Index(fields=["channel_name"]),
        ]

    def __str__(self):
        return f"{self.user.get_name()} subscribed to {self.dashboard_type}"
