from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from django_filters import rest_framework as django_filters
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from src.lib.utils.uuid7 import uuid7
from src.lib.django.views_mixin import ViewSetHelperMixin
from src.organizations.models import (
	Organization,
	OrganizationAuditLog,
	OrganizationInvitation,
	OrganizationInvitationStatus,
	OrganizationMembership,
	OrganizationMembershipStatus,
	OrganizationResource,
	OrganizationRole,
	OrganizationRoleType,
	OrganizationSetting,
)
from src.organizations.permissions import (
	IsOrganizationAdminOrOwner,
	IsOrganizationMember,
)
from src.organizations.serializers import (
	AcceptInvitationSerializer,
	CreateInvitationSerializer,
	CreateOrganizationMembershipSerializer,
	CreateOrganizationResourceSerializer,
	CreateOrganizationRoleSerializer,
	CreateOrganizationSerializer,
	CreateOrganizationSettingSerializer,
	DeclineInvitationSerializer,
	OrganizationAuditLogSerializer,
	OrganizationInvitationSerializer,
	OrganizationMembershipSerializer,
	OrganizationResourceSerializer,
	OrganizationRoleSerializer,
	OrganizationSerializer,
	OrganizationSettingSerializer,
	ResendInvitationSerializer,
	RevokeInvitationSerializer,
	UpdateOrganizationMembershipSerializer,
	UpdateOrganizationResourceSerializer,
	UpdateOrganizationRoleSerializer,
	UpdateOrganizationSettingSerializer,
	UpdateOrganizationSerializer,
)
from src.organizations.services import (
	accept_invitation,
	create_default_roles,
	create_membership_if_missing,
	decline_invitation,
	ensure_invitation_not_expired,
	ensure_not_last_owner,
	ensure_role_belongs_to_organization,
	get_system_role,
	log_audit,
	send_invitation_email,
)
from src.users.permissions import IsVerifiedUser


User = get_user_model()


class OrganizationScopedViewSet(ViewSetHelperMixin, viewsets.GenericViewSet):
	organization_queryset = Organization.objects.all()
	_organization_cache = None

	def get_organization(self):
		if self._organization_cache is not None:
			return self._organization_cache

		organization_id = self.kwargs.get("organization_id")
		if not organization_id:
			return None

		organization = self.organization_queryset.filter(pk=organization_id).first()
		if not organization:
			raise NotFound("Organization not found.")

		self._organization_cache = organization
		return self._organization_cache


class OrganizationFilterSet(django_filters.FilterSet):
	status = django_filters.CharFilter(field_name="status")
	name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")

	class Meta:
		model = Organization
		fields = ["status", "name"]


class OrganizationViewSet(
	mixins.CreateModelMixin,
	mixins.ListModelMixin,
	mixins.RetrieveModelMixin,
	mixins.UpdateModelMixin,
	mixins.DestroyModelMixin,
	ViewSetHelperMixin,
	viewsets.GenericViewSet,
):
	queryset = Organization.objects.select_related("created_by").all()
	serializers = {
		"default": OrganizationSerializer,
		"create": CreateOrganizationSerializer,
		"update": UpdateOrganizationSerializer,
		"partial_update": UpdateOrganizationSerializer,
	}
	permissions = {
		"default": [IsVerifiedUser],
		"update": [IsOrganizationAdminOrOwner],
		"partial_update": [IsOrganizationAdminOrOwner],
		"destroy": [IsOrganizationAdminOrOwner],
	}
	filters = {
		"default": OrganizationFilterSet,
	}
	search_fields = ["name", "description"]
	ordering_fields = ["created_at", "updated_at", "name"]

	def get_queryset(self):
		if self.request.user.is_superuser:
			return self.queryset

		return self.queryset.filter(
			memberships__user=self.request.user,
			memberships__status=OrganizationMembershipStatus.ACTIVE,
		).distinct()

	@transaction.atomic
	def perform_create(self, serializer):
		organization = serializer.save(created_by=self.request.user)
		create_default_roles(organization)
		owner_role = get_system_role(organization, OrganizationRoleType.OWNER)

		OrganizationMembership.objects.create(
			organization=organization,
			user=self.request.user,
			role=owner_role,
			invited_by=self.request.user,
			status=OrganizationMembershipStatus.ACTIVE,
		)

		log_audit(
			organization=organization,
			actor=self.request.user,
			action="organization.created",
			resource_type="organization",
			resource_id=organization.id,
			metadata={"name": organization.name},
		)

	def perform_update(self, serializer):
		previous = {
			"name": serializer.instance.name,
			"status": serializer.instance.status,
		}
		organization = serializer.save()

		log_audit(
			organization=organization,
			actor=self.request.user,
			action="organization.updated",
			resource_type="organization",
			resource_id=organization.id,
			metadata={
				"before": previous,
				"after": {
					"name": organization.name,
					"status": organization.status,
				},
			},
		)

	def perform_destroy(self, instance):
		log_audit(
			organization=instance,
			actor=self.request.user,
			action="organization.deleted",
			resource_type="organization",
			resource_id=instance.id,
			metadata={"name": instance.name},
		)
		instance.delete()


class OrganizationRoleFilterSet(django_filters.FilterSet):
	role_type = django_filters.CharFilter(field_name="role_type")
	name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")

	class Meta:
		model = OrganizationRole
		fields = ["role_type", "is_system", "name"]


class OrganizationRoleViewSet(
	mixins.CreateModelMixin,
	mixins.ListModelMixin,
	mixins.RetrieveModelMixin,
	mixins.UpdateModelMixin,
	mixins.DestroyModelMixin,
	OrganizationScopedViewSet,
):
	queryset = OrganizationRole.objects.select_related("organization").all()
	serializers = {
		"default": OrganizationRoleSerializer,
		"create": CreateOrganizationRoleSerializer,
		"update": UpdateOrganizationRoleSerializer,
		"partial_update": UpdateOrganizationRoleSerializer,
	}
	permissions = {
		"default": [IsOrganizationMember],
		"create": [IsOrganizationAdminOrOwner],
		"update": [IsOrganizationAdminOrOwner],
		"partial_update": [IsOrganizationAdminOrOwner],
		"destroy": [IsOrganizationAdminOrOwner],
	}
	filters = {
		"default": OrganizationRoleFilterSet,
	}

	def get_queryset(self):
		organization = self.get_organization()
		return self.queryset.filter(organization=organization)

	def perform_create(self, serializer):
		organization = self.get_organization()
		role = serializer.save(
			organization=organization,
			role_type=OrganizationRoleType.CUSTOM,
			is_system=False,
		)
		log_audit(
			organization=organization,
			actor=self.request.user,
			action="organization.role.created",
			resource_type="organization_role",
			resource_id=role.id,
			metadata={"name": role.name},
		)

	def perform_update(self, serializer):
		role = serializer.instance
		if role.is_system:
			raise ValidationError({"role": "System roles cannot be modified."})

		role = serializer.save()
		log_audit(
			organization=role.organization,
			actor=self.request.user,
			action="organization.role.updated",
			resource_type="organization_role",
			resource_id=role.id,
			metadata={"name": role.name},
		)

	def perform_destroy(self, instance):
		if instance.is_system:
			raise ValidationError({"role": "System roles cannot be deleted."})

		if instance.memberships.exists():
			raise ValidationError({"role": "Role is assigned to users and cannot be deleted."})

		organization = instance.organization
		role_id = instance.id
		role_name = instance.name
		instance.delete()

		log_audit(
			organization=organization,
			actor=self.request.user,
			action="organization.role.deleted",
			resource_type="organization_role",
			resource_id=role_id,
			metadata={"name": role_name},
		)


class OrganizationMembershipFilterSet(django_filters.FilterSet):
	status = django_filters.CharFilter(field_name="status")
	role = django_filters.UUIDFilter(field_name="role_id")
	user = django_filters.UUIDFilter(field_name="user_id")

	class Meta:
		model = OrganizationMembership
		fields = ["status", "role", "user"]


class OrganizationMembershipViewSet(
	mixins.CreateModelMixin,
	mixins.ListModelMixin,
	mixins.RetrieveModelMixin,
	mixins.UpdateModelMixin,
	mixins.DestroyModelMixin,
	OrganizationScopedViewSet,
):
	queryset = OrganizationMembership.objects.select_related("organization", "user", "role").all()
	serializers = {
		"default": OrganizationMembershipSerializer,
		"create": CreateOrganizationMembershipSerializer,
		"update": UpdateOrganizationMembershipSerializer,
		"partial_update": UpdateOrganizationMembershipSerializer,
	}
	permissions = {
		"default": [IsOrganizationMember],
		"create": [IsOrganizationAdminOrOwner],
		"update": [IsOrganizationAdminOrOwner],
		"partial_update": [IsOrganizationAdminOrOwner],
		"destroy": [IsOrganizationAdminOrOwner],
	}
	filters = {
		"default": OrganizationMembershipFilterSet,
	}

	def get_queryset(self):
		organization = self.get_organization()
		return self.queryset.filter(organization=organization)

	@transaction.atomic
	def create(self, request, *args, **kwargs):
		organization = self.get_organization()
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		role = OrganizationRole.objects.filter(pk=serializer.validated_data["role_id"]).first()
		if not role:
			raise NotFound("Role not found.")
		ensure_role_belongs_to_organization(role, organization)

		user = None
		if serializer.validated_data.get("user_id"):
			user = User.objects.filter(pk=serializer.validated_data["user_id"]).first()
		elif serializer.validated_data.get("email"):
			user = User.objects.filter(email__iexact=serializer.validated_data["email"]).first()

		if not user:
			raise ValidationError(
				{"email": "User does not exist. Use invitation endpoint for new users."}
			)

		membership = create_membership_if_missing(
			organization=organization,
			user=user,
			role=role,
			invited_by=request.user,
		)

		log_audit(
			organization=organization,
			actor=request.user,
			action="organization.membership.created",
			resource_type="organization_membership",
			resource_id=membership.id,
			metadata={"user_id": str(user.id), "role_id": str(role.id)},
		)

		output = OrganizationMembershipSerializer(membership, context={"request": request})
		return Response(output.data, status=status.HTTP_201_CREATED)

	@transaction.atomic
	def update(self, request, *args, **kwargs):
		partial = kwargs.pop("partial", False)
		membership = self.get_object()
		serializer = self.get_serializer(membership, data=request.data, partial=partial)
		serializer.is_valid(raise_exception=True)

		role_id = serializer.validated_data.get("role_id")
		if role_id:
			role = OrganizationRole.objects.filter(pk=role_id).first()
			if not role:
				raise NotFound("Role not found.")
			ensure_role_belongs_to_organization(role, membership.organization)

			if membership.role.role_type == OrganizationRoleType.OWNER and role.role_type != OrganizationRoleType.OWNER:
				ensure_not_last_owner(membership)

			membership.role = role

		if serializer.validated_data.get("status"):
			if (
				membership.role.role_type == OrganizationRoleType.OWNER
				and serializer.validated_data["status"] != OrganizationMembershipStatus.ACTIVE
			):
				ensure_not_last_owner(membership)
			membership.status = serializer.validated_data["status"]

		membership.save(update_fields=["role", "status", "updated_at"])

		log_audit(
			organization=membership.organization,
			actor=request.user,
			action="organization.membership.updated",
			resource_type="organization_membership",
			resource_id=membership.id,
			metadata={"role_id": str(membership.role_id), "status": membership.status},
		)

		output = OrganizationMembershipSerializer(membership, context={"request": request})
		return Response(output.data, status=status.HTTP_200_OK)

	def partial_update(self, request, *args, **kwargs):
		kwargs["partial"] = True
		return self.update(request, *args, **kwargs)

	@transaction.atomic
	def perform_destroy(self, instance):
		ensure_not_last_owner(instance)

		organization = instance.organization
		membership_id = instance.id
		user_id = instance.user_id
		instance.delete()

		log_audit(
			organization=organization,
			actor=self.request.user,
			action="organization.membership.deleted",
			resource_type="organization_membership",
			resource_id=membership_id,
			metadata={"user_id": str(user_id)},
		)


class OrganizationInvitationFilterSet(django_filters.FilterSet):
	status = django_filters.CharFilter(field_name="status")
	email = django_filters.CharFilter(field_name="email", lookup_expr="icontains")

	class Meta:
		model = OrganizationInvitation
		fields = ["status", "email", "role"]


class OrganizationInvitationViewSet(
	mixins.CreateModelMixin,
	mixins.ListModelMixin,
	mixins.RetrieveModelMixin,
	OrganizationScopedViewSet,
):
	queryset = OrganizationInvitation.objects.select_related("organization", "role", "invited_by").all()
	serializers = {
		"default": OrganizationInvitationSerializer,
		"create": CreateInvitationSerializer,
		"accept": AcceptInvitationSerializer,
		"decline": DeclineInvitationSerializer,
		"accept_by_token": AcceptInvitationSerializer,
		"decline_by_token": DeclineInvitationSerializer,
		"revoke": RevokeInvitationSerializer,
		"resend": ResendInvitationSerializer,
	}
	permissions = {
		"default": [IsOrganizationAdminOrOwner],
		"accept": [IsVerifiedUser],
		"decline": [IsVerifiedUser],
		"accept_by_token": [AllowAny],
		"decline_by_token": [AllowAny],
	}
	filters = {
		"default": OrganizationInvitationFilterSet,
	}

	def get_queryset(self):
		organization = self.get_organization()
		queryset = self.queryset.filter(organization=organization)
		for invitation in queryset.filter(status=OrganizationInvitationStatus.PENDING):
			ensure_invitation_not_expired(invitation)
		return queryset

	@transaction.atomic
	def create(self, request, *args, **kwargs):
		organization = self.get_organization()
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		role = OrganizationRole.objects.filter(pk=serializer.validated_data["role_id"]).first()
		if not role:
			raise NotFound("Role not found.")
		ensure_role_belongs_to_organization(role, organization)

		email = serializer.validated_data["email"].lower()
		invited_user = User.objects.filter(email__iexact=email).first()

		invitation = OrganizationInvitation.objects.create(
			organization=organization,
			email=email,
			invited_user=invited_user,
			role=role,
			message=serializer.validated_data.get("message", ""),
			invited_by=request.user,
			expires_at=serializer.validated_data.get("expires_at")
			or OrganizationInvitation._meta.get_field("expires_at").get_default(),
		)

		send_invitation_email(invitation)
		log_audit(
			organization=organization,
			actor=request.user,
			action="organization.invitation.sent",
			resource_type="organization_invitation",
			resource_id=invitation.id,
			metadata={"email": email, "role_id": str(role.id)},
		)

		output = OrganizationInvitationSerializer(invitation, context={"request": request})
		return Response(output.data, status=status.HTTP_201_CREATED)

	@action(detail=True, methods=["post"])
	def accept(self, request, organization_id=None, pk=None):
		invitation = self.get_object()
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		token = serializer.validated_data.get("token")
		if token and invitation.token != token:
			raise ValidationError({"token": "Invalid invitation token."})

		invitation = accept_invitation(invitation=invitation, user=request.user)
		output = OrganizationInvitationSerializer(invitation, context={"request": request})
		return Response(output.data, status=status.HTTP_200_OK)

	@action(detail=True, methods=["post"])
	def decline(self, request, organization_id=None, pk=None):
		invitation = self.get_object()
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		token = serializer.validated_data.get("token")
		if token and invitation.token != token:
			raise ValidationError({"token": "Invalid invitation token."})

		invitation = decline_invitation(invitation=invitation, user=request.user)
		output = OrganizationInvitationSerializer(invitation, context={"request": request})
		return Response(output.data, status=status.HTTP_200_OK)

	@action(detail=True, methods=["post"])
	def revoke(self, request, organization_id=None, pk=None):
		invitation = self.get_object()
		ensure_invitation_not_expired(invitation)

		if invitation.status != OrganizationInvitationStatus.PENDING:
			raise ValidationError({"invitation": "Only pending invitations can be revoked."})

		invitation.status = OrganizationInvitationStatus.REVOKED
		invitation.responded_by = request.user
		invitation.responded_at = timezone.now()
		invitation.save(update_fields=["status", "responded_by", "responded_at", "updated_at"])

		log_audit(
			organization=invitation.organization,
			actor=request.user,
			action="organization.invitation.revoked",
			resource_type="organization_invitation",
			resource_id=invitation.id,
		)
		output = OrganizationInvitationSerializer(invitation, context={"request": request})
		return Response(output.data, status=status.HTTP_200_OK)

	@action(detail=True, methods=["post"])
	def resend(self, request, organization_id=None, pk=None):
		invitation = self.get_object()
		ensure_invitation_not_expired(invitation)

		if invitation.status != OrganizationInvitationStatus.PENDING:
			raise ValidationError({"invitation": "Only pending invitations can be resent."})

		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		invitation.token = str(uuid7())
		if serializer.validated_data.get("expires_at"):
			invitation.expires_at = serializer.validated_data["expires_at"]
		invitation.save(update_fields=["token", "expires_at", "updated_at"])

		send_invitation_email(invitation)
		log_audit(
			organization=invitation.organization,
			actor=request.user,
			action="organization.invitation.resent",
			resource_type="organization_invitation",
			resource_id=invitation.id,
		)
		output = OrganizationInvitationSerializer(invitation, context={"request": request})
		return Response(output.data, status=status.HTTP_200_OK)

	@action(detail=False, methods=["post"], url_path="accept-by-token")
	def accept_by_token(self, request, organization_id=None):
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		token = serializer.validated_data.get("token")
		if not token:
			raise ValidationError({"token": "token is required"})

		invitation = self.get_queryset().filter(token=token).first()
		if not invitation:
			raise NotFound("Invitation not found.")

		if not request.user.is_authenticated:
			return Response(
				{"message": "Please log in before accepting this invitation."},
				status=status.HTTP_401_UNAUTHORIZED,
			)

		invitation = accept_invitation(invitation=invitation, user=request.user)
		output = OrganizationInvitationSerializer(invitation, context={"request": request})
		return Response(output.data, status=status.HTTP_200_OK)

	@action(detail=False, methods=["post"], url_path="decline-by-token")
	def decline_by_token(self, request, organization_id=None):
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		token = serializer.validated_data.get("token")
		if not token:
			raise ValidationError({"token": "token is required"})

		invitation = self.get_queryset().filter(token=token).first()
		if not invitation:
			raise NotFound("Invitation not found.")

		if not request.user.is_authenticated:
			return Response(
				{"message": "Please log in before declining this invitation."},
				status=status.HTTP_401_UNAUTHORIZED,
			)

		invitation = decline_invitation(invitation=invitation, user=request.user)
		output = OrganizationInvitationSerializer(invitation, context={"request": request})
		return Response(output.data, status=status.HTTP_200_OK)


class OrganizationResourceFilterSet(django_filters.FilterSet):
	resource_type = django_filters.CharFilter(field_name="resource_type")
	name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")

	class Meta:
		model = OrganizationResource
		fields = ["resource_type", "name"]


class OrganizationResourceViewSet(
	mixins.CreateModelMixin,
	mixins.ListModelMixin,
	mixins.RetrieveModelMixin,
	mixins.UpdateModelMixin,
	mixins.DestroyModelMixin,
	OrganizationScopedViewSet,
):
	queryset = OrganizationResource.objects.select_related("organization", "created_by", "updated_by").all()
	serializers = {
		"default": OrganizationResourceSerializer,
		"create": CreateOrganizationResourceSerializer,
		"update": UpdateOrganizationResourceSerializer,
		"partial_update": UpdateOrganizationResourceSerializer,
	}
	permissions = {
		"default": [IsOrganizationMember],
		"create": [IsOrganizationAdminOrOwner],
		"update": [IsOrganizationAdminOrOwner],
		"partial_update": [IsOrganizationAdminOrOwner],
		"destroy": [IsOrganizationAdminOrOwner],
	}
	filters = {
		"default": OrganizationResourceFilterSet,
	}

	def get_queryset(self):
		return self.queryset.filter(organization=self.get_organization())

	def perform_create(self, serializer):
		organization = self.get_organization()
		resource = serializer.save(
			organization=organization,
			created_by=self.request.user,
			updated_by=self.request.user,
		)
		log_audit(
			organization=organization,
			actor=self.request.user,
			action="organization.resource.created",
			resource_type="organization_resource",
			resource_id=resource.id,
			metadata={"resource_type": resource.resource_type},
		)

	def perform_update(self, serializer):
		resource = serializer.save(updated_by=self.request.user)
		log_audit(
			organization=resource.organization,
			actor=self.request.user,
			action="organization.resource.updated",
			resource_type="organization_resource",
			resource_id=resource.id,
		)

	def perform_destroy(self, instance):
		organization = instance.organization
		resource_id = instance.id
		instance.delete()
		log_audit(
			organization=organization,
			actor=self.request.user,
			action="organization.resource.deleted",
			resource_type="organization_resource",
			resource_id=resource_id,
		)


class OrganizationSettingFilterSet(django_filters.FilterSet):
	key = django_filters.CharFilter(field_name="key", lookup_expr="icontains")

	class Meta:
		model = OrganizationSetting
		fields = ["key"]


class OrganizationSettingViewSet(
	mixins.CreateModelMixin,
	mixins.ListModelMixin,
	mixins.RetrieveModelMixin,
	mixins.UpdateModelMixin,
	mixins.DestroyModelMixin,
	OrganizationScopedViewSet,
):
	queryset = OrganizationSetting.objects.select_related("organization").all()
	serializers = {
		"default": OrganizationSettingSerializer,
		"create": CreateOrganizationSettingSerializer,
		"update": UpdateOrganizationSettingSerializer,
		"partial_update": UpdateOrganizationSettingSerializer,
	}
	permissions = {
		"default": [IsOrganizationMember],
		"create": [IsOrganizationAdminOrOwner],
		"update": [IsOrganizationAdminOrOwner],
		"partial_update": [IsOrganizationAdminOrOwner],
		"destroy": [IsOrganizationAdminOrOwner],
	}
	filters = {
		"default": OrganizationSettingFilterSet,
	}

	def get_queryset(self):
		return self.queryset.filter(organization=self.get_organization())

	def perform_create(self, serializer):
		setting = serializer.save(organization=self.get_organization())
		log_audit(
			organization=setting.organization,
			actor=self.request.user,
			action="organization.setting.created",
			resource_type="organization_setting",
			resource_id=setting.id,
			metadata={"key": setting.key},
		)

	def perform_update(self, serializer):
		setting = serializer.save()
		log_audit(
			organization=setting.organization,
			actor=self.request.user,
			action="organization.setting.updated",
			resource_type="organization_setting",
			resource_id=setting.id,
			metadata={"key": setting.key},
		)

	def perform_destroy(self, instance):
		organization = instance.organization
		setting_id = instance.id
		setting_key = instance.key
		instance.delete()
		log_audit(
			organization=organization,
			actor=self.request.user,
			action="organization.setting.deleted",
			resource_type="organization_setting",
			resource_id=setting_id,
			metadata={"key": setting_key},
		)


class OrganizationAuditLogFilterSet(django_filters.FilterSet):
	action = django_filters.CharFilter(field_name="action", lookup_expr="icontains")
	resource_type = django_filters.CharFilter(field_name="resource_type", lookup_expr="icontains")
	actor = django_filters.UUIDFilter(field_name="actor_id")

	class Meta:
		model = OrganizationAuditLog
		fields = ["action", "resource_type", "actor"]


class OrganizationAuditLogViewSet(
	mixins.ListModelMixin,
	mixins.RetrieveModelMixin,
	OrganizationScopedViewSet,
):
	queryset = OrganizationAuditLog.objects.select_related("organization", "actor").all()
	serializers = {
		"default": OrganizationAuditLogSerializer,
	}
	permissions = {
		"default": [IsOrganizationMember],
	}
	filters = {
		"default": OrganizationAuditLogFilterSet,
	}
	ordering_fields = ["created_at", "action", "resource_type"]

	def get_queryset(self):
		return self.queryset.filter(organization=self.get_organization())
