"""
Serializers for housekeeping models.
"""

from rest_framework import serializers

from src.housekeeping.models import CleaningTask, HousekeepingStaff


class CleaningTaskListSerializer(serializers.ModelSerializer):
    bed_code = serializers.CharField(source="bed.bed_code", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.get_name", read_only=True)
    department_name = serializers.CharField(source="bed.ward.department.name", read_only=True)
    sla_status = serializers.SerializerMethodField()

    class Meta:
        model = CleaningTask
        fields = [
            "id", "bed_code", "department_name", "priority", "priority_display",
            "status", "status_display", "assigned_to_name", "sla_deadline",
            "sla_status", "sla_breached", "created_at"
        ]

    def get_sla_status(self, obj):
        if obj.sla_breached:
            return "breached"
        return "on_track"


class CleaningTaskDetailSerializer(serializers.ModelSerializer):
    bed = serializers.SerializerMethodField()
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    assigned_to = serializers.SerializerMethodField()

    class Meta:
        model = CleaningTask
        fields = [
            "id", "bed", "priority", "priority_display", "status", "status_display",
            "assigned_to", "assigned_at", "started_at", "completed_at",
            "sla_deadline", "sla_breached", "sla_breach_minutes",
            "instructions", "notes", "escalated", "created_at"
        ]

    def get_bed(self, obj):
        return {
            "id": str(obj.bed.id),
            "code": obj.bed.bed_code,
            "ward": obj.bed.ward.name,
            "department": obj.bed.ward.department.name
        }

    def get_assigned_to(self, obj):
        if obj.assigned_to:
            return {
                "id": str(obj.assigned_to.id),
                "name": obj.assigned_to.get_name()
            }
        return None


class TaskStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating task status."""
    status = serializers.ChoiceField(choices=[
        ("assigned", "Assigned"),
        ("in_progress", "In Progress"),
        ("completed", "Completed")
    ])
    notes = serializers.CharField(required=False, allow_blank=True)


class HousekeepingStaffSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = HousekeepingStaff
        fields = [
            "id", "user_name", "user_email", "employee_id",
            "shift_start", "shift_end", "max_tasks_per_shift",
            "current_task_count", "tasks_completed_today",
            "is_available", "is_active"
        ]