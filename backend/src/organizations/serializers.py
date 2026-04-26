"""
Serializers for organization models.
"""

from django.core.validators import RegexValidator
from rest_framework import serializers

from src.organizations.models import (
    Organization,
    Hospital,
    Building,
    Department,
    Ward,
    HospitalStaff,
    HospitalStaffInvitation,
    HospitalType,
    HospitalStaffRole,
)


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "code",
            "description",
            "address",
            "city",
            "state",
            "country",
            "postal_code",
            "phone",
            "email",
            "timezone",
            "currency",
            "date_format",
            "allow_cross_hospital_transfers",
            "allow_centralized_reporting",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class HospitalListSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    current_user_role = serializers.SerializerMethodField()
    available_beds = serializers.SerializerMethodField()
    occupancy_rate = serializers.SerializerMethodField()
    can_manage_organization = serializers.SerializerMethodField()
    can_manage_structure = serializers.SerializerMethodField()

    class Meta:
        model = Hospital
        fields = [
            "id",
            "organization",
            "organization_name",
            "name",
            "code",
            "hospital_type",
            "city",
            "state",
            "total_beds",
            "available_beds",
            "occupancy_rate",
            "current_user_role",
            "can_manage_organization",
            "can_manage_structure",
            "is_active",
        ]

    def _membership(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        return obj.staff.filter(user=request.user, is_active=True).order_by("-is_primary_assignment").first()

    def get_current_user_role(self, obj):
        request = self.context.get("request")
        if request and obj.organization.created_by_id == request.user.id:
            return HospitalStaffRole.OWNER
        membership = self._membership(obj)
        return membership.role if membership else None

    def get_can_manage_organization(self, obj):
        return self.get_current_user_role(obj) in {
            HospitalStaffRole.OWNER,
            HospitalStaffRole.SYSTEM_ADMINISTRATOR,
        }

    def get_can_manage_structure(self, obj):
        return self.get_current_user_role(obj) in {
            HospitalStaffRole.OWNER,
            HospitalStaffRole.SYSTEM_ADMINISTRATOR,
            HospitalStaffRole.BED_MANAGER,
            HospitalStaffRole.NURSE_SUPERVISOR,
        }

    def get_available_beds(self, obj):
        return obj.get_available_beds_count()

    def get_occupancy_rate(self, obj):
        return obj.get_occupancy_rate()


class HospitalDetailSerializer(HospitalListSerializer):
    organization = OrganizationSerializer(read_only=True)

    class Meta(HospitalListSerializer.Meta):
        model = Hospital
        fields = HospitalListSerializer.Meta.fields + [
            "license_number",
            "tax_id",
            "address",
            "postal_code",
            "phone",
            "email",
            "website",
            "latitude",
            "longitude",
            "timezone",
            "icu_beds",
            "emergency_beds",
            "cleaning_sla_minutes",
            "auto_assign_cleaning",
            "require_discharge_approval",
            "created_at",
            "updated_at",
        ]


class HospitalWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hospital
        fields = [
            "id",
            "organization",
            "name",
            "code",
            "hospital_type",
            "license_number",
            "tax_id",
            "address",
            "city",
            "state",
            "postal_code",
            "phone",
            "email",
            "website",
            "latitude",
            "longitude",
            "timezone",
            "total_beds",
            "icu_beds",
            "emergency_beds",
            "cleaning_sla_minutes",
            "auto_assign_cleaning",
            "require_discharge_approval",
            "is_active",
        ]
        read_only_fields = ["id"]


class BuildingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Building
        fields = [
            "id",
            "hospital",
            "name",
            "code",
            "description",
            "floors",
            "has_elevator",
            "is_accessible",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class DepartmentSerializer(serializers.ModelSerializer):
    available_beds_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            "id",
            "hospital",
            "building",
            "name",
            "code",
            "description",
            "department_type",
            "floor",
            "wing",
            "total_beds",
            "available_beds_count",
            "gender_restriction",
            "extension",
            "nurse_station_phone",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "available_beds_count"]

    def get_available_beds_count(self, obj):
        return obj.get_available_beds().count()


class WardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ward
        fields = [
            "id",
            "department",
            "name",
            "code",
            "description",
            "ward_type",
            "room_number",
            "floor",
            "capacity",
            "has_bathroom",
            "has_oxygen",
            "has_suction",
            "has_monitor",
            "has_ventilator",
            "is_isolation_capable",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class WardListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ward
        fields = ["id", "department", "name", "code", "room_number", "capacity", "is_active"]


class HospitalStaffSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    user_name = serializers.CharField(source="user.get_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = HospitalStaff
        fields = [
            "id",
            "user_id",
            "user_name",
            "user_email",
            "hospital",
            "role",
            "department",
            "department_name",
            "employee_id",
            "is_primary_assignment",
            "is_active",
            "shift_start",
            "shift_end",
            "is_me",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user_id", "user_name", "user_email", "is_me", "created_at", "updated_at"]

    def get_is_me(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.id == obj.user_id)


class HospitalStaffInvitationSerializer(serializers.ModelSerializer):
    hospital_name = serializers.CharField(source="hospital.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    invited_by_name = serializers.CharField(source="invited_by.get_name", read_only=True)

    class Meta:
        model = HospitalStaffInvitation
        fields = [
            "id",
            "hospital",
            "hospital_name",
            "department",
            "department_name",
            "email",
            "role",
            "employee_id",
            "message",
            "token",
            "status",
            "expires_at",
            "accepted_at",
            "invited_by",
            "invited_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "hospital_name",
            "department_name",
            "token",
            "status",
            "accepted_at",
            "invited_by",
            "invited_by_name",
            "created_at",
            "updated_at",
        ]


class CreateHospitalStaffInvitationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    role = serializers.ChoiceField(choices=HospitalStaffRole.choices)
    department = serializers.UUIDField(required=False, allow_null=True)
    employee_id = serializers.CharField(required=False, allow_blank=True, max_length=100)
    message = serializers.CharField(required=False, allow_blank=True, max_length=255)


class AcceptHospitalStaffInvitationSerializer(serializers.Serializer):
    token = serializers.CharField(required=True, max_length=64)


class CreateOrJoinFirstHospitalSerializerMixin:
    invitation_token = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=64,
        help_text="Invitation token to join an existing hospital.",
    )
    name = serializers.CharField(
        required=False,
        max_length=255,
        help_text="Hospital name (required when creating a hospital).",
    )
    code = serializers.CharField(
        required=False,
        max_length=50,
        validators=[
            RegexValidator(
                regex=r"^[A-Z0-9_]+$",
                message="Code must contain only uppercase letters, numbers, and underscores",
            )
        ],
        help_text="Unique hospital code (uppercase, alphanumeric, underscores only).",
    )
    hospital_type = serializers.ChoiceField(
        choices=HospitalType.choices,
        default=HospitalType.GENERAL,
        required=False,
    )
    license_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    tax_id = serializers.CharField(max_length=100, required=False, allow_blank=True)

    address = serializers.CharField(required=False, max_length=500)
    city = serializers.CharField(required=False, max_length=100)
    state = serializers.CharField(required=False, max_length=100)
    postal_code = serializers.CharField(required=False, max_length=20)
    phone = serializers.CharField(required=False, max_length=20)
    email = serializers.EmailField(required=False, max_length=255)
    website = serializers.URLField(required=False, allow_blank=True, max_length=255)
    latitude = serializers.DecimalField(max_digits=10, decimal_places=8, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=11, decimal_places=8, required=False, allow_null=True)
    timezone = serializers.CharField(required=False, max_length=50, default="UTC")
    total_beds = serializers.IntegerField(required=False, default=0, min_value=0)
    icu_beds = serializers.IntegerField(required=False, default=0, min_value=0)
    emergency_beds = serializers.IntegerField(required=False, default=0, min_value=0)
    cleaning_sla_minutes = serializers.IntegerField(required=False, default=60, min_value=1)
    auto_assign_cleaning = serializers.BooleanField(required=False, default=True)
    require_discharge_approval = serializers.BooleanField(required=False, default=False)
    organization_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, data):
        invitation_token = (data.get("invitation_token") or "").strip()
        if invitation_token:
            return data

        if not (data.get("name") or "").strip():
            raise serializers.ValidationError({"name": "This field is required when creating a new hospital."})

        code = (data.get("code") or "").strip()
        if code:
            data["code"] = code.upper()

        if "organization_id" in data:
            org_id = data["organization_id"]
            code = data.get("code")
            if code and Hospital.objects.filter(organization_id=org_id, code=code).exists():
                raise serializers.ValidationError(
                    {"code": "Hospital with this code already exists in the organization."}
                )

        if "latitude" in data and data["latitude"] is not None and not (-90 <= data["latitude"] <= 90):
            raise serializers.ValidationError({"latitude": "Must be between -90 and 90."})

        if "longitude" in data and data["longitude"] is not None and not (-180 <= data["longitude"] <= 180):
            raise serializers.ValidationError({"longitude": "Must be between -180 and 180."})

        return data


class CreateOrJoinFirstHospitalSerializer(CreateOrJoinFirstHospitalSerializerMixin, serializers.Serializer):
    pass
