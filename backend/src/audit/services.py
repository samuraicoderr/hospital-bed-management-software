"""
Audit services for BedFlow.
Per requirements section 4.8 - Immutable audit logging.
"""

from django.utils import timezone
from django.db import transaction

from src.audit.models import AuditLog, LoginAudit


class AuditService:
    """Service for audit log operations."""

    @staticmethod
    def log_action(action, model_name, object_id, user=None, hospital=None, details=None):
        """
        Create an audit log entry.
        This method is called throughout the system for compliance.
        """
        user_repr = ""
        if user:
            user_repr = f"{user.get_name()} ({user.id})"

        return AuditLog.objects.create(
            action=action,
            model_name=model_name,
            object_id=str(object_id),
            user=user,
            user_repr=user_repr,
            hospital=hospital,
            details=details or {},
            timestamp=timezone.now()
        )

    @staticmethod
    def log_status_change(model_name, object_id, old_status, new_status, user=None, hospital=None, reason=None):
        """Log a status change."""
        return AuditService.log_action(
            action="status_change",
            model_name=model_name,
            object_id=object_id,
            user=user,
            hospital=hospital,
            details={
                "old_status": old_status,
                "new_status": new_status,
                "reason": reason
            }
        )

    @staticmethod
    def log_login(user, ip_address=None, user_agent=None, success=True, failure_reason=None):
        """Log user login event."""
        return LoginAudit.objects.create(
            user=user,
            action="login" if success else "failed_login",
            ip_address=ip_address,
            user_agent=user_agent or "",
            success=success,
            failure_reason=failure_reason or ""
        )

    @staticmethod
    def log_logout(user, ip_address=None):
        """Log user logout event."""
        return LoginAudit.objects.create(
            user=user,
            action="logout",
            ip_address=ip_address
        )