"""
Serializers for alert models.
"""

from rest_framework import serializers

from src.alerts.models import Alert, AlertConfiguration, UserAlertPreference


class AlertListSerializer(serializers.ModelSerializer):
    severity_display = serializers.CharField(source="get_severity_display", read_only=True)
    alert_type_display = serializers.CharField(source="get_alert_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Alert
        fields = [
            "id", "alert_type", "alert_type_display", "severity", "severity_display",
            "title", "message", "status", "status_display", "is_acknowledged",
            "is_resolved", "triggered_at", "created_at"
        ]


class AlertDetailSerializer(serializers.ModelSerializer):
    severity_display = serializers.CharField(source="get_severity_display", read_only=True)
    alert_type_display = serializers.CharField(source="get_alert_type_display", read_only=True)
    acknowledged_by_name = serializers.CharField(source="acknowledged_by.get_name", read_only=True)
    resolved_by_name = serializers.CharField(source="resolved_by.get_name", read_only=True)

    class Meta:
        model = Alert
        fields = [
            "id", "alert_type", "alert_type_display", "severity", "severity_display",
            "title", "message", "hospital", "department", "status",
            "is_acknowledged", "acknowledged_by", "acknowledged_by_name", "acknowledged_at",
            "is_resolved", "resolved_by", "resolved_by_name", "resolved_at", "resolution_notes",
            "threshold_value", "current_value", "triggered_at", "notification_count",
            "created_at"
        ]


class AlertConfigurationSerializer(serializers.ModelSerializer):
    alert_type_display = serializers.CharField(source="get_alert_type_display", read_only=True)

    class Meta:
        model = AlertConfiguration
        fields = [
            "id", "name", "alert_type", "alert_type_display", "is_enabled",
            "threshold_type", "threshold_value", "comparison_operator",
            "notification_channels", "escalation_enabled", "escalation_delay_minutes"
        ]


class UserAlertPreferenceSerializer(serializers.ModelSerializer):
    min_severity_display = serializers.CharField(source="get_min_severity_display", read_only=True)

    class Meta:
        model = UserAlertPreference
        fields = [
            "id", "hospital", "notify_email", "notify_sms", "notify_in_app", "notify_push",
            "subscribed_alert_types", "quiet_hours_enabled", "quiet_hours_start",
            "quiet_hours_end", "min_severity", "min_severity_display"
        ]