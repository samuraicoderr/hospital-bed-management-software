"""
Serializers for organization models.
"""

from rest_framework import serializers
from django.core.validators import RegexValidator

from src.organizations.models import (
    Organization, Hospital, Building, Department, Ward, HospitalStaff
)
from .models import (
    HospitalType,
    DepartmentType,
    WardType,
    HospitalStaffRole,
    GenderRestriction,
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


class CreateOrJoinFirstHospitalSerializerMixin():
    # Hospital fields
    name = serializers.CharField(
        required=True,
        max_length=255,
        help_text="Hospital name."
    )
    code = serializers.CharField(
        required=True,
        max_length=50,
        validators=[
            RegexValidator(
                regex=r'^[A-Z0-9_]+$',
                message='Code must contain only uppercase letters, numbers, and underscores'
            )
        ],
        help_text="Unique hospital code (uppercase, alphanumeric, underscores only)."
    )
    hospital_type = serializers.ChoiceField(
        choices=HospitalType.choices,
        default=HospitalType.GENERAL,
        help_text="Type of hospital."
    )
    license_number = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        help_text="Hospital license number."
    )
    tax_id = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        help_text="Hospital tax ID."
    )

    # Contact Information
    address = serializers.CharField(
        required=True,
        max_length=500,
        help_text="Hospital address."
    )
    city = serializers.CharField(
        required=True,
        max_length=100,
        help_text="City."
    )
    state = serializers.CharField(
        required=True,
        max_length=100,
        help_text="State or province."
    )
    postal_code = serializers.CharField(
        required=True,
        max_length=20,
        help_text="Postal or ZIP code."
    )
    phone = serializers.CharField(
        required=True,
        max_length=20,
        help_text="Hospital phone number."
    )
    email = serializers.EmailField(
        required=True,
        max_length=255,
        help_text="Hospital email."
    )
    website = serializers.URLField(
        required=False,
        allow_blank=True,
        max_length=255,
        help_text="Hospital website URL."
    )

    # Location (optional)
    latitude = serializers.DecimalField(
        max_digits=10,
        decimal_places=8,
        required=False,
        allow_null=True,
        help_text="Latitude for mapping."
    )
    longitude = serializers.DecimalField(
        max_digits=11,
        decimal_places=8,
        required=False,
        allow_null=True,
        help_text="Longitude for mapping."
    )

    # Hospital Settings
    timezone = serializers.CharField(
        required=False,
        max_length=50,
        default="UTC",
        help_text="Hospital timezone."
    )
    total_beds = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
        help_text="Total bed count."
    )
    icu_beds = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
        help_text="ICU bed count."
    )
    emergency_beds = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
        help_text="Emergency bed count."
    )

    # Operational Settings
    cleaning_sla_minutes = serializers.IntegerField(
        required=False,
        default=60,
        min_value=1,
        help_text="Cleaning SLA in minutes."
    )
    auto_assign_cleaning = serializers.BooleanField(
        required=False,
        default=True,
        help_text="Auto-assign cleaning tasks."
    )
    require_discharge_approval = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Require discharge approval."
    )

    # Organization (optional - for joining existing org)
    organization_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Existing organization ID to join."
    )

    def validate(self, data):
        # Validate code uniqueness within organization
        if "organization_id" in data:
            org_id = data["organization_id"]
            code = data["code"]
            if Hospital.objects.filter(
                organization_id=org_id,
                code=code
            ).exists():
                raise serializers.ValidationError({
                    "code": "Hospital with this code already exists in the organization."
                })

        # Validate location if provided
        if "latitude" in data and data["latitude"] is not None:
            if not (-90 <= data["latitude"] <= 90):
                raise serializers.ValidationError({
                    "latitude": "Must be between -90 and 90."
                })

        if "longitude" in data and data["longitude"] is not None:
            if not (-180 <= data["longitude"] <= 180):
                raise serializers.ValidationError({
                    "longitude": "Must be between -180 and 180."
                })

        return data


class CreateOrJoinFirstHospitalSerializer(CreateOrJoinFirstHospitalSerializerMixin, serializers.Serializer):
    pass