import secrets
from datetime import timedelta

from django.conf import settings as django_settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from src.lib.utils.uuid7 import uuid7


def invitation_expires_at_default():
	return timezone.now() + timedelta(days=7)


def invitation_token_default():
	return secrets.token_urlsafe(32)


class OrganizationStatus(models.TextChoices):
	ACTIVE = "active", "Active"
	INACTIVE = "inactive", "Inactive"


class OrganizationRoleType(models.TextChoices):
	OWNER = "owner", "Owner"
	ADMIN = "admin", "Admin"
	MEMBER = "member", "Member"
	CUSTOM = "custom", "Custom"


class OrganizationMembershipStatus(models.TextChoices):
	ACTIVE = "active", "Active"
	INACTIVE = "inactive", "Inactive"


class OrganizationInvitationStatus(models.TextChoices):
	PENDING = "pending", "Pending"
	ACCEPTED = "accepted", "Accepted"
	DECLINED = "declined", "Declined"
	REVOKED = "revoked", "Revoked"
	EXPIRED = "expired", "Expired"


class OrganizationResourceType(models.TextChoices):
	PROJECT = "project", "Project"
	FILE = "file", "File"
	CONFIG = "config", "Config"
	OTHER = "other", "Other"


class Organization(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
	name = models.CharField(max_length=255)
	description = models.TextField(blank=True, default="")
	logo = models.ImageField(upload_to="organizations/logos/", blank=True, null=True)
	status = models.CharField(
		max_length=20,
		choices=OrganizationStatus.choices,
		default=OrganizationStatus.ACTIVE,
		db_index=True,
	)
	settings = models.JSONField(default=dict, blank=True)
	created_by = models.ForeignKey(
		django_settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		related_name="created_organizations",
		null=True,
		blank=True,
	)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-created_at"]
		indexes = [
			models.Index(fields=["status", "-created_at"]),
			models.Index(fields=["name"]),
		]

	def __str__(self):
		return self.name


class OrganizationRole(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
	organization = models.ForeignKey(
		Organization,
		on_delete=models.CASCADE,
		related_name="roles",
	)
	name = models.CharField(max_length=100)
	role_type = models.CharField(
		max_length=20,
		choices=OrganizationRoleType.choices,
		default=OrganizationRoleType.CUSTOM,
	)
	is_system = models.BooleanField(default=False)
	permissions = models.JSONField(default=dict, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["name"]
		constraints = [
			models.UniqueConstraint(
				fields=["organization", "name"],
				name="unique_org_role_name",
			),
			models.UniqueConstraint(
				fields=["organization", "role_type"],
				condition=Q(is_system=True),
				name="unique_org_system_role_type",
			),
		]

	def __str__(self):
		return f"{self.organization_id}:{self.name}"


class OrganizationMembership(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
	organization = models.ForeignKey(
		Organization,
		on_delete=models.CASCADE,
		related_name="memberships",
	)
	user = models.ForeignKey(
		django_settings.AUTH_USER_MODEL,
		on_delete=models.CASCADE,
		related_name="organization_memberships",
	)
	role = models.ForeignKey(
		OrganizationRole,
		on_delete=models.PROTECT,
		related_name="memberships",
	)
	status = models.CharField(
		max_length=20,
		choices=OrganizationMembershipStatus.choices,
		default=OrganizationMembershipStatus.ACTIVE,
		db_index=True,
	)
	invited_by = models.ForeignKey(
		django_settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		related_name="organization_memberships_invited",
		null=True,
		blank=True,
	)
	joined_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-joined_at"]
		constraints = [
			models.UniqueConstraint(
				fields=["organization", "user"],
				name="unique_org_membership",
			),
		]
		indexes = [
			models.Index(fields=["organization", "status"]),
			models.Index(fields=["user", "status"]),
		]

	def __str__(self):
		return f"{self.user_id}@{self.organization_id}"


class OrganizationResource(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
	organization = models.ForeignKey(
		Organization,
		on_delete=models.CASCADE,
		related_name="resources",
	)
	name = models.CharField(max_length=255)
	description = models.TextField(blank=True, default="")
	resource_type = models.CharField(
		max_length=20,
		choices=OrganizationResourceType.choices,
		default=OrganizationResourceType.OTHER,
		db_index=True,
	)
	payload = models.JSONField(default=dict, blank=True)
	created_by = models.ForeignKey(
		django_settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		related_name="organization_resources_created",
		null=True,
		blank=True,
	)
	updated_by = models.ForeignKey(
		django_settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		related_name="organization_resources_updated",
		null=True,
		blank=True,
	)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-created_at"]
		indexes = [
			models.Index(fields=["organization", "resource_type"]),
			models.Index(fields=["organization", "-created_at"]),
		]

	def __str__(self):
		return f"{self.resource_type}:{self.name}"


class OrganizationSetting(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
	organization = models.ForeignKey(
		Organization,
		on_delete=models.CASCADE,
		related_name="organization_settings",
	)
	key = models.CharField(max_length=100)
	value = models.JSONField(default=dict, blank=True)
	description = models.CharField(max_length=255, blank=True, default="")
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["key"]
		constraints = [
			models.UniqueConstraint(
				fields=["organization", "key"],
				name="unique_org_setting_key",
			),
		]

	def __str__(self):
		return f"{self.organization_id}:{self.key}"


class OrganizationInvitation(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
	organization = models.ForeignKey(
		Organization,
		on_delete=models.CASCADE,
		related_name="invitations",
	)
	email = models.EmailField(db_index=True)
	invited_user = models.ForeignKey(
		django_settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		related_name="organization_invitations",
		null=True,
		blank=True,
	)
	role = models.ForeignKey(
		OrganizationRole,
		on_delete=models.PROTECT,
		related_name="invitations",
	)
	token = models.CharField(max_length=255, unique=True, default=invitation_token_default)
	status = models.CharField(
		max_length=20,
		choices=OrganizationInvitationStatus.choices,
		default=OrganizationInvitationStatus.PENDING,
		db_index=True,
	)
	message = models.CharField(max_length=500, blank=True, default="")
	invited_by = models.ForeignKey(
		django_settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		related_name="organization_invitations_sent",
		null=True,
		blank=True,
	)
	responded_by = models.ForeignKey(
		django_settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		related_name="organization_invitations_responded",
		null=True,
		blank=True,
	)
	expires_at = models.DateTimeField(default=invitation_expires_at_default)
	responded_at = models.DateTimeField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-created_at"]
		indexes = [
			models.Index(fields=["organization", "status"]),
			models.Index(fields=["organization", "email"]),
		]

	def __str__(self):
		return f"{self.organization_id}:{self.email}:{self.status}"

	def is_expired(self) -> bool:
		return timezone.now() >= self.expires_at


class OrganizationAuditLog(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
	organization = models.ForeignKey(
		Organization,
		on_delete=models.CASCADE,
		related_name="audit_logs",
	)
	actor = models.ForeignKey(
		django_settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		related_name="organization_audit_logs",
		null=True,
		blank=True,
	)
	action = models.CharField(max_length=80, db_index=True)
	resource_type = models.CharField(max_length=80, db_index=True)
	resource_id = models.UUIDField(null=True, blank=True)
	metadata = models.JSONField(default=dict, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-created_at"]
		indexes = [
			models.Index(fields=["organization", "-created_at"]),
			models.Index(fields=["organization", "action"]),
		]

	def __str__(self):
		return f"{self.organization_id}:{self.action}"
