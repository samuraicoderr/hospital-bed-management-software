"""
Alert services for BedFlow.
Per requirements section 4.6 - Notifications and alerts.
"""

from django.db import transaction
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType

from src.alerts.models import Alert, AlertConfiguration, NotificationLog
from src.common.constants import AlertSeverity, AlertType, NotificationChannel


class AlertService:
    """Service for alert operations."""

    @staticmethod
    def create_alert(alert_type, severity, hospital, title, message,
                     department=None, related_object=None, notify_users=True):
        """Create a new alert."""
        with transaction.atomic():
            alert = Alert.objects.create(
                alert_type=alert_type,
                severity=severity,
                hospital=hospital,
                title=title,
                message=message,
                department=department,
                triggered_at=timezone.now()
            )

            # Set related object if provided
            if related_object:
                alert.content_type = ContentType.objects.get_for_model(related_object)
                alert.object_id = str(related_object.id)
                alert.save()

            # Send notifications if required
            if notify_users:
                AlertService.send_notifications(alert)

            return alert

    @staticmethod
    def send_notifications(alert):
        """Send notifications for an alert."""
        # Get notification preferences for hospital staff
        from src.organizations.models import HospitalStaff

        staff = HospitalStaff.objects.filter(
            hospital=alert.hospital,
            is_active=True
        ).select_related("user")

        for member in staff:
            # Check user preferences
            # For now, send in-app notification
            NotificationLog.objects.create(
                alert=alert,
                user=member.user,
                channel=NotificationChannel.IN_APP,
                status="sent",
                subject=alert.title,
                body=alert.message
            )
            alert.notification_count += 1

        alert.save()

    @staticmethod
    def acknowledge_alert(alert, user):
        """Acknowledge an alert."""
        alert.acknowledge(user)
        return alert

    @staticmethod
    def resolve_alert(alert, user, notes=""):
        """Resolve an alert."""
        alert.resolve(user, notes)
        return alert

    @staticmethod
    def check_thresholds(hospital):
        """Check all threshold-based alerts for a hospital."""
        from src.beds.services import BedService
        from src.admissions.services import AdmissionService

        configs = AlertConfiguration.objects.filter(
            hospital=hospital,
            is_enabled=True
        )

        triggered = 0
        for config in configs:
            if not config.can_trigger():
                continue

            # Check based on threshold type
            if config.threshold_type == "occupancy_percentage":
                stats = BedService.get_bed_statistics(hospital)
                current_value = stats.get("occupancy_rate", 0)

                if AlertService._compare(current_value, config.threshold_value, config.comparison_operator):
                    AlertService.create_alert(
                        alert_type=AlertType.ICU_OCCUPANCY_HIGH,
                        severity=AlertSeverity.WARNING,
                        hospital=hospital,
                        title=f"ICU Occupancy Alert",
                        message=f"ICU occupancy is at {current_value}%",
                    )
                    config.record_trigger()
                    triggered += 1

            elif config.threshold_type == "queue_length":
                queue = AdmissionService.get_admission_queue(hospital)
                current_value = queue.count()

                if AlertService._compare(current_value, config.threshold_value, config.comparison_operator):
                    AlertService.create_alert(
                        alert_type=AlertType.ADMISSION_QUEUE_DEEP,
                        severity=AlertSeverity.WARNING,
                        hospital=hospital,
                        title=f"Admission Queue Alert",
                        message=f"Admission queue has {current_value} pending patients",
                    )
                    config.record_trigger()
                    triggered += 1

        return triggered

    @staticmethod
    def _compare(value, threshold, operator):
        """Compare value against threshold using operator."""
        if operator == "gt":
            return value > threshold
        elif operator == "gte":
            return value >= threshold
        elif operator == "lt":
            return value < threshold
        elif operator == "lte":
            return value <= threshold
        elif operator == "eq":
            return value == threshold
        return False

    @staticmethod
    def get_active_alerts(hospital, severity=None):
        """Get active alerts for a hospital."""
        queryset = Alert.objects.filter(
            hospital=hospital,
            is_active=True
        )

        if severity:
            queryset = queryset.filter(severity=severity)

        return queryset.order_by("-created_at")