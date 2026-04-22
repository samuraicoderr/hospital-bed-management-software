"""
Serializers for organization models.
"""

from rest_framework import serializers

from src.organizations.models import (
    Organization, Hospital, Building, Department, Ward, HospitalStaff
)


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = [
            "id", "name", "code", "description",
            "address", "city", "state", "country", "postal_code",
            "phone", "email", "timezone", "is_active"
        ]


class HospitalListSerializer(serializers.ModelSerializer):
    available_beds = serializers.SerializerMethodField()
    occupancy_rate = serializers.SerializerMethodField()

    class Meta:
        model = Hospital
        fields = [
            "id", "name", "code", "hospital_type",
            "city", "state", "total_beds", "available_beds",
            "occupancy_rate", "is_active"
        ]

    def get_available_beds(self, obj):
        return obj.get_available_beds_count()

    def get_occupancy_rate(self, obj):
        return obj.get_occupancy_rate()


class HospitalDetailSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)

    class Meta:
        model = Hospital
        fields = [
            "id", "organization", "name", "code", "hospital_type",
            "license_number", "address", "city", "state", "postal_code",
            "phone", "email", "total_beds", "icu_beds", "emergency_beds",
            "cleaning_sla_minutes", "is_active", "created_at"
        ]


class BuildingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Building
        fields = ["id", "name", "code", "floors", "is_active"]


class DepartmentSerializer(serializers.ModelSerializer):
    available_beds_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            "id", "name", "code", "department_type",
            "floor", "wing", "total_beds",
            "available_beds_count", "gender_restriction", "is_active"
        ]

    def get_available_beds_count(self, obj):
        return obj.get_available_beds().count()


class WardSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)

    class Meta:
        model = Ward
        fields = [
            "id", "name", "code", "department",
            "room_number", "floor", "capacity",
            "has_bathroom", "has_oxygen", "has_suction",
            "has_monitor", "has_ventilator", "is_active"
        ]


class WardListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ward
        fields = ["id", "name", "code", "room_number", "capacity", "is_active"]


class HospitalStaffSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = HospitalStaff
        fields = [
            "id", "user_name", "user_email", "role",
            "department", "employee_id", "is_primary_assignment", "is_active"
        ]