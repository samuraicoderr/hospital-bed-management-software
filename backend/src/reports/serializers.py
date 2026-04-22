"""
Serializers for report models.
"""

from rest_framework import serializers

from src.reports.models import ReportTemplate, ReportRun


class ReportTemplateSerializer(serializers.ModelSerializer):
    report_type_display = serializers.CharField(source="get_report_type_display", read_only=True)
    default_format_display = serializers.CharField(source="get_default_format_display", read_only=True)

    class Meta:
        model = ReportTemplate
        fields = [
            "id", "name", "report_type", "report_type_display", "description",
            "default_format", "default_format_display", "is_scheduled",
            "schedule_frequency", "is_active", "created_at"
        ]


class ReportRunSerializer(serializers.ModelSerializer):
    report_type_display = serializers.CharField(source="get_report_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    format_display = serializers.CharField(source="get_format_display", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.get_name", read_only=True)

    class Meta:
        model = ReportRun
        fields = [
            "id", "template", "name", "report_type", "report_type_display",
            "status", "status_display", "format", "format_display",
            "start_date", "end_date", "file", "file_size",
            "record_count", "generated_at", "requested_by", "requested_by_name",
            "created_at"
        ]