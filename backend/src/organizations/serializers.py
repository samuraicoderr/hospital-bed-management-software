from django.contrib.auth import get_user_model
from rest_framework import serializers

from src.organizations.models import (
    Organization,
    OrganizationAuditLog,
    OrganizationInvitation,
    OrganizationMembership,
    OrganizationResource,
    OrganizationRole,
    OrganizationRoleType,
    OrganizationSetting,
)


User = get_user_model()


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "description",
            "logo",
            "status",
            "settings",
            "created_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")


class CreateOrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "description",
            "logo",
            "status",
            "settings",
        )
        read_only_fields = ("id",)


class UpdateOrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "description",
            "logo",
            "status",
            "settings",
        )
        read_only_fields = ("id",)


class OrganizationRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationRole
        fields = (
            "id",
            "organization",
            "name",
            "role_type",
            "is_system",
            "permissions",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "organization",
            "role_type",
            "is_system",
            "created_at",
            "updated_at",
        )


class CreateOrganizationRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationRole
        fields = (
            "id",
            "name",
            "permissions",
        )
        read_only_fields = ("id",)


class UpdateOrganizationRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationRole
        fields = (
            "id",
            "name",
            "permissions",
        )
        read_only_fields = ("id",)


class MembershipUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name")


class OrganizationMembershipSerializer(serializers.ModelSerializer):
    user = MembershipUserSerializer(read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = (
            "id",
            "organization",
            "user",
            "role",
            "status",
            "invited_by",
            "joined_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "organization",
            "user",
            "invited_by",
            "joined_at",
            "updated_at",
        )


class CreateOrganizationMembershipSerializer(serializers.Serializer):
    user_id = serializers.UUIDField(required=False)
    email = serializers.EmailField(required=False)
    role_id = serializers.UUIDField()

    def validate(self, attrs):
        if not attrs.get("user_id") and not attrs.get("email"):
            raise serializers.ValidationError("Either user_id or email is required.")
        return attrs


class UpdateOrganizationMembershipSerializer(serializers.Serializer):
    role_id = serializers.UUIDField(required=True)
    status = serializers.ChoiceField(
        choices=OrganizationMembership._meta.get_field("status").choices,
        required=False,
    )


class OrganizationResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationResource
        fields = (
            "id",
            "organization",
            "name",
            "description",
            "resource_type",
            "payload",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "organization",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        )


class CreateOrganizationResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationResource
        fields = (
            "id",
            "name",
            "description",
            "resource_type",
            "payload",
        )
        read_only_fields = ("id",)


class UpdateOrganizationResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationResource
        fields = (
            "id",
            "name",
            "description",
            "resource_type",
            "payload",
        )
        read_only_fields = ("id",)


class OrganizationSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationSetting
        fields = (
            "id",
            "organization",
            "key",
            "value",
            "description",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "organization",
            "created_at",
            "updated_at",
        )


class CreateOrganizationSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationSetting
        fields = (
            "id",
            "key",
            "value",
            "description",
        )
        read_only_fields = ("id",)


class UpdateOrganizationSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationSetting
        fields = (
            "id",
            "key",
            "value",
            "description",
        )
        read_only_fields = ("id",)


class OrganizationInvitationSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)

    class Meta:
        model = OrganizationInvitation
        fields = (
            "id",
            "organization",
            "email",
            "invited_user",
            "role",
            "role_name",
            "status",
            "message",
            "invited_by",
            "responded_by",
            "expires_at",
            "responded_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "organization",
            "status",
            "invited_by",
            "responded_by",
            "responded_at",
            "created_at",
            "updated_at",
        )


class CreateInvitationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role_id = serializers.UUIDField()
    message = serializers.CharField(required=False, allow_blank=True, max_length=500)
    expires_at = serializers.DateTimeField(required=False)


class AcceptInvitationSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=255, required=False)


class DeclineInvitationSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=255, required=False)


class RevokeInvitationSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)


class ResendInvitationSerializer(serializers.Serializer):
    expires_at = serializers.DateTimeField(required=False)


class OrganizationAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationAuditLog
        fields = (
            "id",
            "organization",
            "actor",
            "action",
            "resource_type",
            "resource_id",
            "metadata",
            "created_at",
        )
        read_only_fields = fields
