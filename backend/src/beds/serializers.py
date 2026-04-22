"""
Serializers for bed models.
"""

from rest_framework import serializers

from src.beds.models import Bed, EquipmentTag, BedStatusHistory
from src.common.constants import BedStatus


class EquipmentTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = EquipmentTag
        fields = ["id", "name", "code", "category", "description"]


class BedListSerializer(serializers.ModelSerializer):
    ward_name = serializers.CharField(source="ward.name", read_only=True)
    department_name = serializers.CharField(source="ward.department.name", read_only=True)
    bed_type_display = serializers.CharField(source="get_bed_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Bed
        fields = [
            "id", "bed_code", "bed_number", "ward_name", "department_name",
            "bed_type", "bed_type_display", "status", "status_display",
            "is_isolation", "gender_restriction", "is_active"
        ]


class BedDetailSerializer(serializers.ModelSerializer):
    equipment_tags = EquipmentTagSerializer(many=True, read_only=True)
    ward = serializers.SerializerMethodField()
    current_patient = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    bed_type_display = serializers.CharField(source="get_bed_type_display", read_only=True)

    class Meta:
        model = Bed
        fields = [
            "id", "bed_code", "bed_number", "bed_type", "bed_type_display",
            "status", "status_display", "is_isolation", "gender_restriction",
            "equipment_tags", "ward", "current_admission", "current_patient",
            "blocked_until", "blocked_reason", "max_patient_weight_kg",
            "status_changed_at", "occupied_since", "is_active"
        ]

    def get_ward(self, obj):
        return {
            "id": str(obj.ward.id),
            "name": obj.ward.name,
            "room_number": obj.ward.room_number,
            "department": {
                "id": str(obj.ward.department.id),
                "name": obj.ward.department.name,
            }
        }

    def get_current_patient(self, obj):
        if obj.current_admission:
            patient = obj.current_admission.patient
            return {
                "id": str(patient.id),
                "mrn": patient.mrn,
                "name": patient.get_full_name(),
                "admitted_at": obj.current_admission.admitted_at
            }
        return None


class BedStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating bed status."""
    status = serializers.ChoiceField(choices=BedStatus.choices)
    reason = serializers.CharField(required=False, allow_blank=True)


class BedSearchSerializer(serializers.Serializer):
    """Serializer for searching available beds."""
    bed_type = serializers.ChoiceField(
        choices=BedType.choices,
        required=False,
        allow_blank=True
    )
    requires_isolation = serializers.BooleanField(default=False)
    patient_gender = serializers.CharField(required=False, allow_blank=True)
    equipment_required = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    department_id = serializers.UUIDField(required=False)


class BedStatisticsSerializer(serializers.Serializer):
    """Serializer for bed statistics."""
    total = serializers.IntegerField()
    available = serializers.IntegerField()
    occupied = serializers.IntegerField()
    reserved = serializers.IntegerField()
    cleaning_required = serializers.IntegerField()
    cleaning_in_progress = serializers.IntegerField()
    maintenance = serializers.IntegerField()
    blocked = serializers.IntegerField()
    isolation = serializers.IntegerField()
    occupancy_rate = serializers.FloatField()


class BedStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.get_name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = BedStatusHistory
        fields = ["id", "status", "status_display", "changed_by_name", "changed_at", "reason"]


# Import for search serializer
from src.common.constants import BedType