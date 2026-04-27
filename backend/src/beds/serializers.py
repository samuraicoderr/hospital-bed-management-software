"""
Serializers for the bed domain.
"""

from __future__ import annotations

from django.utils import timezone
from rest_framework import serializers

from src.admissions.models import Admission, AdmissionRequest
from src.beds.models import Bed, BedMaintenanceRecord, BedStatusHistory, EquipmentTag
from src.common.constants import BedStatus, BedType, GenderRestriction
from src.organizations.models import Ward


class EquipmentTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = EquipmentTag
        fields = [
            "id",
            "name",
            "code",
            "category",
            "description",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class BedListSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(source="ward.department.hospital.id", read_only=True)
    hospital_name = serializers.CharField(source="ward.department.hospital.name", read_only=True)
    department_id = serializers.UUIDField(source="ward.department.id", read_only=True)
    department_name = serializers.CharField(source="ward.department.name", read_only=True)
    ward_id = serializers.UUIDField(source="ward.id", read_only=True)
    ward_name = serializers.CharField(source="ward.name", read_only=True)
    bed_type_display = serializers.CharField(source="get_bed_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    equipment_tags = EquipmentTagSerializer(many=True, read_only=True)

    class Meta:
        model = Bed
        fields = [
            "id",
            "bed_code",
            "bed_number",
            "hospital_id",
            "hospital_name",
            "department_id",
            "department_name",
            "ward_id",
            "ward_name",
            "bed_type",
            "bed_type_display",
            "status",
            "status_display",
            "is_isolation",
            "gender_restriction",
            "bed_size",
            "max_patient_weight_kg",
            "equipment_tags",
            "is_active",
            "blocked_until",
            "status_changed_at",
            "occupied_since",
        ]


class BedDetailSerializer(serializers.ModelSerializer):
    equipment_tags = EquipmentTagSerializer(many=True, read_only=True)
    ward = serializers.SerializerMethodField()
    current_patient = serializers.SerializerMethodField()
    current_reservation = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    bed_type_display = serializers.CharField(source="get_bed_type_display", read_only=True)
    active_maintenance = serializers.SerializerMethodField()

    class Meta:
        model = Bed
        fields = [
            "id",
            "bed_code",
            "bed_number",
            "bed_type",
            "bed_type_display",
            "status",
            "status_display",
            "is_isolation",
            "gender_restriction",
            "equipment_tags",
            "ward",
            "current_admission",
            "current_patient",
            "current_reservation",
            "active_maintenance",
            "blocked_until",
            "blocked_reason",
            "under_maintenance_since",
            "maintenance_reason",
            "bed_size",
            "max_patient_weight_kg",
            "status_changed_at",
            "status_changed_by",
            "status_reason",
            "occupied_since",
            "is_active",
            "is_deleted",
            "created_at",
            "updated_at",
        ]

    def get_ward(self, obj):
        return {
            "id": str(obj.ward.id),
            "name": obj.ward.name,
            "room_number": obj.ward.room_number,
            "department": {
                "id": str(obj.ward.department.id),
                "name": obj.ward.department.name,
            },
            "hospital": {
                "id": str(obj.ward.department.hospital.id),
                "name": obj.ward.department.hospital.name,
            },
        }

    def get_current_patient(self, obj):
        if obj.current_admission:
            patient = obj.current_admission.patient
            return {
                "id": str(patient.id),
                "mrn": patient.mrn,
                "name": patient.get_full_name(),
                "admitted_at": obj.current_admission.admitted_at,
            }
        return None

    def get_current_reservation(self, obj):
        if obj.reserved_for and obj.reservation_is_active():
            return {
                "id": str(obj.reserved_for.id),
                "patient_name": obj.reserved_for.patient.get_full_name(),
                "patient_mrn": obj.reserved_for.patient.mrn,
                "reserved_until": obj.reserved_until,
            }
        return None

    def get_active_maintenance(self, obj):
        open_records = obj.get_open_maintenance()[:5]
        return BedMaintenanceRecordSerializer(open_records, many=True).data


class BedWriteSerializer(serializers.ModelSerializer):
    ward_id = serializers.UUIDField(write_only=True)
    equipment_tag_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Bed
        fields = [
            "id",
            "ward_id",
            "bed_number",
            "bed_type",
            "is_isolation",
            "gender_restriction",
            "bed_size",
            "max_patient_weight_kg",
            "equipment_tag_ids",
            "is_active",
        ]
        read_only_fields = ["id"]

    def validate_ward_id(self, value):
        ward = Ward.objects.filter(id=value, is_active=True, is_deleted=False).first()
        if not ward:
            raise serializers.ValidationError("Ward not found or inactive.")
        return value

    def validate(self, attrs):
        ward_id = attrs.get("ward_id")
        ward = Ward.objects.filter(id=ward_id).select_related("department", "department__hospital").first() if ward_id else getattr(self.instance, "ward", None)
        if ward:
            attrs["ward"] = ward
        if attrs.get("is_isolation") and not ward.is_isolation_capable:
            raise serializers.ValidationError(
                {"is_isolation": "Selected ward is not isolation-capable."}
            )
        return attrs

    def create(self, validated_data):
        raise NotImplementedError

    def update(self, instance, validated_data):
        raise NotImplementedError


class BedStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=BedStatus.choices)
    reason = serializers.CharField(required=False, allow_blank=True)


class BedBlockSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True)
    until = serializers.DateTimeField(required=False)


class BedReservationSerializer(serializers.Serializer):
    admission_request_id = serializers.UUIDField()
    reserved_until = serializers.DateTimeField()
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate_reserved_until(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Reservation expiry must be in the future.")
        return value


class BedAssignmentSerializer(serializers.Serializer):
    admission_id = serializers.UUIDField()
    reason = serializers.CharField(required=False, allow_blank=True)


class BedReleaseSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)
    trigger_cleaning = serializers.BooleanField(default=True)
    cleaning_priority = serializers.CharField(default="routine")


class BedEligibilitySerializer(serializers.Serializer):
    patient_gender = serializers.CharField(required=False, allow_blank=True)
    requires_isolation = serializers.BooleanField(default=False)
    equipment_required = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )


class BedSearchSerializer(serializers.Serializer):
    hospital_id = serializers.UUIDField()
    bed_type = serializers.ChoiceField(
        choices=BedType.choices,
        required=False,
        allow_blank=True,
    )
    requires_isolation = serializers.BooleanField(default=False)
    patient_gender = serializers.CharField(required=False, allow_blank=True)
    equipment_required = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )
    department_id = serializers.UUIDField(required=False)
    ward_id = serializers.UUIDField(required=False)


class BedStatisticsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    available = serializers.IntegerField()
    occupied = serializers.IntegerField()
    reserved = serializers.IntegerField()
    cleaning_required = serializers.IntegerField()
    cleaning_in_progress = serializers.IntegerField()
    maintenance = serializers.IntegerField()
    blocked = serializers.IntegerField()
    isolation = serializers.IntegerField()
    inactive = serializers.IntegerField()
    occupancy_rate = serializers.FloatField()


class BedAnalyticsSerializer(serializers.Serializer):
    statistics = BedStatisticsSerializer()
    utilization_by_type = serializers.ListField()
    isolation_usage = serializers.DictField()
    gender_allocation = serializers.ListField()
    average_turnover_minutes = serializers.FloatField()
    average_cleaning_turnaround_minutes = serializers.FloatField()
    maintenance_frequency = serializers.ListField()
    admission_history = serializers.DictField()


class BedStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    linked_admission = serializers.SerializerMethodField()

    class Meta:
        model = BedStatusHistory
        fields = [
            "id",
            "status",
            "status_display",
            "changed_by_name",
            "changed_at",
            "reason",
            "linked_admission",
        ]

    def get_changed_by_name(self, obj):
        return obj.changed_by.get_name() if obj.changed_by else None

    def get_linked_admission(self, obj):
        if not obj.admission:
            return None
        return {
            "id": str(obj.admission.id),
            "patient_name": obj.admission.patient.get_full_name(),
            "patient_mrn": obj.admission.patient.mrn,
        }


class BedMaintenanceRecordSerializer(serializers.ModelSerializer):
    bed_code = serializers.CharField(source="bed.bed_code", read_only=True)
    reported_by_name = serializers.SerializerMethodField()
    resolved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = BedMaintenanceRecord
        fields = [
            "id",
            "bed",
            "bed_code",
            "issue_description",
            "maintenance_type",
            "severity",
            "status",
            "reported_by",
            "reported_by_name",
            "reported_at",
            "resolved_by",
            "resolved_by_name",
            "resolved_at",
            "resolution_notes",
        ]
        read_only_fields = [
            "id",
            "bed_code",
            "reported_by",
            "reported_by_name",
            "reported_at",
            "resolved_by",
            "resolved_by_name",
            "resolved_at",
        ]

    def get_reported_by_name(self, obj):
        return obj.reported_by.get_name() if obj.reported_by else None

    def get_resolved_by_name(self, obj):
        return obj.resolved_by.get_name() if obj.resolved_by else None


class BedMaintenanceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BedMaintenanceRecord
        fields = [
            "bed",
            "issue_description",
            "maintenance_type",
            "severity",
        ]


class BedMaintenanceResolveSerializer(serializers.Serializer):
    resolution_notes = serializers.CharField(required=False, allow_blank=True)


class BedActionDetailSerializer(serializers.Serializer):
    bed = BedDetailSerializer()
