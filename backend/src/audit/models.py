"""
Audit models for BedFlow - Immutable audit logging per section 4.8
"""

from django.db import models
from django.conf import settings
from django.utils import timezone

from src.lib.utils.uuid7 import uuid7
from src.common.constants import AuditAction


class AuditLog(models.Model):
    """
    Immutable audit log for all system changes.
    Per requirements section 4.8 - Bed status changes, admissions, logins, etc.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    # Action details
    action = models.CharField(
        max_length=30,
        choices=AuditAction.choices
    )
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100)
    object_repr = models.CharField(max_length=500, blank=True)

    # User information
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs"
    )
    user_repr = models.CharField(max_length=200, blank=True)

    # Change details
    previous_state = models.JSONField(null=True, blank=True)
    new_state = models.JSONField(null=True, blank=True)
    changes = models.JSONField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)

    # Request context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    request_id = models.CharField(max_length=100, blank=True)

    # Hospital context
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs"
    )

    # Timestamp (immutable)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["action", "timestamp"]),
            models.Index(fields=["model_name", "timestamp"]),
            models.Index(fields=["user", "timestamp"]),
            models.Index(fields=["hospital", "timestamp"]),
            models.Index(fields=["object_id", "model_name"]),
        ]

    def __str__(self):
        return f"{self.action} on {self.model_name} by {self.user_repr} at {self.timestamp}"

    def save(self, *args, **kwargs):
        # Store user representation for immutability
        if self.user and not self.user_repr:
            self.user_repr = f"{self.user.get_name()} ({self.user.id})"
        super().save(*args, **kwargs)


class LoginAudit(models.Model):
    """
    Specific audit log for authentication events.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="login_audits"
    )
    action = models.CharField(
        max_length=20,
        choices=[
            ("login", "Login"),
            ("logout", "Logout"),
            ("failed_login", "Failed Login"),
            ("password_change", "Password Change"),
            ("mfa_verified", "MFA Verified"),
            ("session_expired", "Session Expired"),
        ]
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    device_info = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=200, blank=True)
    success = models.BooleanField(default=True)
    failure_reason = models.CharField(max_length=200, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["user", "action", "timestamp"]),
            models.Index(fields=["ip_address", "timestamp"]),
            models.Index(fields=["success"]),
        ]

    def __str__(self):
        return f"{self.action} by {self.user.get_name()} at {self.timestamp}"


class SystemConfigurationChange(models.Model):
    """
    Audit log for configuration changes.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="configuration_changes"
    )
    hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.CASCADE,
        related_name="configuration_changes"
    )
    config_path = models.CharField(max_length=200)
    previous_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    reason = models.TextField(blank=True)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["hospital", "config_path"]),
            models.Index(fields=["timestamp"]),
        ]

    def __str__(self):
        return f"Config change: {self.config_path} at {self.timestamp}"
