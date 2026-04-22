from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from src.lib.clients import zeptomail
from src.organizations.models import (
    OrganizationAuditLog,
    OrganizationInvitation,
    OrganizationInvitationStatus,
    OrganizationMembership,
    OrganizationMembershipStatus,
    OrganizationRole,
    OrganizationRoleType,
)


User = get_user_model()


SYSTEM_ROLE_DEFINITIONS = (
    (OrganizationRoleType.OWNER, "Owner", {"all": True}),
    (OrganizationRoleType.ADMIN, "Admin", {"manage_members": True, "manage_resources": True, "manage_settings": True}),
    (OrganizationRoleType.MEMBER, "Member", {"view": True}),
)


def get_organization_or_404(view):
    organization_id = view.kwargs.get("organization_id")
    if not organization_id:
        return None

    organization = view.organization_queryset.filter(pk=organization_id).first()
    if not organization:
        raise NotFound("Organization not found.")
    return organization


def create_default_roles(organization):
    for role_type, name, permissions in SYSTEM_ROLE_DEFINITIONS:
        OrganizationRole.objects.get_or_create(
            organization=organization,
            role_type=role_type,
            defaults={
                "name": name,
                "is_system": True,
                "permissions": permissions,
            },
        )


def get_system_role(organization, role_type):
    role = OrganizationRole.objects.filter(
        organization=organization,
        role_type=role_type,
        is_system=True,
    ).first()
    if not role:
        raise NotFound(f"System role '{role_type}' not found for organization.")
    return role


def get_membership(organization, user):
    return OrganizationMembership.objects.filter(
        organization=organization,
        user=user,
        status=OrganizationMembershipStatus.ACTIVE,
    ).select_related("role").first()


def ensure_role_belongs_to_organization(role, organization):
    if role.organization_id != organization.id:
        raise ValidationError({"role_id": "Role does not belong to this organization."})


def ensure_invitation_not_expired(invitation):
    if invitation.is_expired() and invitation.status == OrganizationInvitationStatus.PENDING:
        invitation.status = OrganizationInvitationStatus.EXPIRED
        invitation.save(update_fields=["status", "updated_at"])


def log_audit(
    *,
    organization,
    actor,
    action,
    resource_type,
    resource_id=None,
    metadata=None,
):
    OrganizationAuditLog.objects.create(
        organization=organization,
        actor=actor,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata=metadata or {},
    )


def ensure_not_last_owner(membership):
    if membership.role.role_type != OrganizationRoleType.OWNER:
        return

    owner_count = OrganizationMembership.objects.filter(
        organization=membership.organization,
        role__role_type=OrganizationRoleType.OWNER,
        status=OrganizationMembershipStatus.ACTIVE,
    ).count()

    if owner_count <= 1:
        raise ValidationError(
            {"role_id": "Organization must always have at least one active owner."}
        )


def send_invitation_email(invitation):
    # We intentionally keep this simple and robust even if templates are unavailable.
    invitation_link = f"/api/v1/organizations/{invitation.organization_id}/invitations/{invitation.id}/accept/"
    html_body = (
        f"<p>You were invited to join {invitation.organization.name}.</p>"
        f"<p>Use this token: <strong>{invitation.token}</strong></p>"
        f"<p>Accept endpoint: {invitation_link}</p>"
    )

    try:
        zeptomail._send(
            subject=f"Invitation to {invitation.organization.name}",
            to=[invitation.email.lower()],
            html_body=html_body,
            thread=True,
        )
    except Exception:
        # Invitation creation should not fail because email delivery failed.
        pass


def create_membership_if_missing(*, organization, user, role, invited_by=None):
    membership, _ = OrganizationMembership.objects.get_or_create(
        organization=organization,
        user=user,
        defaults={
            "role": role,
            "invited_by": invited_by,
            "status": OrganizationMembershipStatus.ACTIVE,
        },
    )
    if membership.status != OrganizationMembershipStatus.ACTIVE:
        membership.status = OrganizationMembershipStatus.ACTIVE
        membership.role = role
        membership.save(update_fields=["status", "role", "updated_at"])
    return membership


@transaction.atomic
def accept_invitation(*, invitation, user):
    ensure_invitation_not_expired(invitation)

    if invitation.status != OrganizationInvitationStatus.PENDING:
        raise ValidationError({"invitation": "Invitation is no longer pending."})

    if invitation.email.lower() != (user.email or "").lower():
        raise ValidationError({"invitation": "Invitation email does not match current user."})

    membership = create_membership_if_missing(
        organization=invitation.organization,
        user=user,
        role=invitation.role,
        invited_by=invitation.invited_by,
    )

    invitation.status = OrganizationInvitationStatus.ACCEPTED
    invitation.responded_by = user
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=["status", "responded_by", "responded_at", "updated_at"])

    log_audit(
        organization=invitation.organization,
        actor=user,
        action="invitation.accepted",
        resource_type="organization_invitation",
        resource_id=invitation.id,
        metadata={"membership_id": str(membership.id)},
    )
    return invitation


@transaction.atomic
def decline_invitation(*, invitation, user):
    ensure_invitation_not_expired(invitation)

    if invitation.status != OrganizationInvitationStatus.PENDING:
        raise ValidationError({"invitation": "Invitation is no longer pending."})

    if invitation.email.lower() != (user.email or "").lower():
        raise ValidationError({"invitation": "Invitation email does not match current user."})

    invitation.status = OrganizationInvitationStatus.DECLINED
    invitation.responded_by = user
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=["status", "responded_by", "responded_at", "updated_at"])

    log_audit(
        organization=invitation.organization,
        actor=user,
        action="invitation.declined",
        resource_type="organization_invitation",
        resource_id=invitation.id,
    )
    return invitation
