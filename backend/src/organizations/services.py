import secrets
import re
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import (
    HospitalStaffRole,
    HospitalStaffInvitationStatus,
    Organization,
    Hospital,
    Department,
    HospitalStaff,
    HospitalStaffInvitation,
)


ORG_MANAGEMENT_ROLES = {
    HospitalStaffRole.OWNER,
    HospitalStaffRole.SYSTEM_ADMINISTRATOR,
}

STRUCTURE_MANAGEMENT_ROLES = {
    HospitalStaffRole.OWNER,
    HospitalStaffRole.SYSTEM_ADMINISTRATOR,
    HospitalStaffRole.BED_MANAGER,
    HospitalStaffRole.NURSE_SUPERVISOR,
}


def clean_model_fields(model, data):
    allowed_fields = {f.name for f in model._meta.fields}
    return {k: v for k, v in data.items() if k in allowed_fields}


class HospitalAccessService:
    @staticmethod
    def get_user_membership(hospital: Hospital, user):
        return HospitalStaff.objects.filter(
            hospital=hospital,
            user=user,
            is_active=True,
        ).order_by("-is_primary_assignment", "-created_at").first()

    @staticmethod
    def can_view_hospital(hospital: Hospital, user) -> bool:
        if hospital.organization.created_by_id == user.id:
            return True
        return HospitalAccessService.get_user_membership(hospital, user) is not None

    @staticmethod
    def can_manage_organization(hospital: Hospital, user) -> bool:
        if hospital.organization.created_by_id == user.id:
            return True
        membership = HospitalAccessService.get_user_membership(hospital, user)
        return bool(membership and membership.role in ORG_MANAGEMENT_ROLES)

    @staticmethod
    def can_manage_structure(hospital: Hospital, user) -> bool:
        if hospital.organization.created_by_id == user.id:
            return True
        membership = HospitalAccessService.get_user_membership(hospital, user)
        return bool(membership and membership.role in STRUCTURE_MANAGEMENT_ROLES)

    @staticmethod
    def require_view_access(hospital: Hospital, user) -> None:
        if not HospitalAccessService.can_view_hospital(hospital, user):
            raise PermissionDenied("You do not have access to this hospital.")

    @staticmethod
    def require_org_management(hospital: Hospital, user) -> None:
        if not HospitalAccessService.can_manage_organization(hospital, user):
            raise PermissionDenied("You do not have permission to manage staff for this hospital.")

    @staticmethod
    def require_structure_management(hospital: Hospital, user) -> None:
        if not HospitalAccessService.can_manage_structure(hospital, user):
            raise PermissionDenied("You do not have permission to manage this hospital structure.")


class HospitalInvitationService:
    DEFAULT_INVITE_TTL_DAYS = 14

    @staticmethod
    def _new_token() -> str:
        return secrets.token_urlsafe(32)

    @staticmethod
    def create_invitation(
        *,
        hospital: Hospital,
        invited_by,
        email: str,
        role: str,
        department: Department | None = None,
        employee_id: str = "",
        message: str = "",
    ) -> HospitalStaffInvitation:
        HospitalAccessService.require_org_management(hospital, invited_by)

        normalized_email = email.strip().lower()
        if not normalized_email:
            raise ValidationError({"email": "Email is required."})

        if department and department.hospital_id != hospital.id:
            raise ValidationError({"department": "Selected department does not belong to this hospital."})

        existing_pending = HospitalStaffInvitation.objects.filter(
            hospital=hospital,
            email=normalized_email,
            status=HospitalStaffInvitationStatus.PENDING,
            expires_at__gt=timezone.now(),
        ).first()
        if existing_pending:
            raise ValidationError({"email": "There is already an active invitation for this email."})

        return HospitalStaffInvitation.objects.create(
            hospital=hospital,
            department=department,
            invited_by=invited_by,
            email=normalized_email,
            role=role,
            employee_id=employee_id,
            message=message,
            token=HospitalInvitationService._new_token(),
            expires_at=timezone.now() + timedelta(days=HospitalInvitationService.DEFAULT_INVITE_TTL_DAYS),
        )

    @staticmethod
    @transaction.atomic
    def accept_invitation(*, invitation: HospitalStaffInvitation, user) -> HospitalStaff:
        invitation = HospitalStaffInvitation.objects.select_for_update().get(pk=invitation.pk)

        if invitation.status != HospitalStaffInvitationStatus.PENDING:
            raise ValidationError({"invitation": "This invitation is no longer active."})

        if invitation.is_expired():
            invitation.status = HospitalStaffInvitationStatus.EXPIRED
            invitation.save(update_fields=["status", "updated_at"])
            raise ValidationError({"invitation": "This invitation has expired."})

        if invitation.email.lower() != user.email.lower():
            raise ValidationError({"invitation": "This invitation was sent to a different email address."})

        staff, _ = HospitalStaff.objects.get_or_create(
            user=user,
            hospital=invitation.hospital,
            department=invitation.department,
            role=invitation.role,
            defaults={
                "employee_id": invitation.employee_id,
                "is_primary_assignment": True,
                "is_active": True,
                "assigned_by": invitation.invited_by,
            },
        )
        if not staff.is_active:
            staff.is_active = True
            staff.save(update_fields=["is_active", "updated_at"])

        invitation.status = HospitalStaffInvitationStatus.ACCEPTED
        invitation.accepted_by = user
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=["status", "accepted_by", "accepted_at", "updated_at"])
        return staff


class HospitalService:
    @staticmethod
    def _generate_hospital_code(name: str, organization: Organization) -> str:
        normalized = re.sub(r"[^A-Z0-9]+", "_", (name or "").upper()).strip("_")
        base = (normalized or "HOSPITAL")[:40]
        candidate = base
        counter = 1
        while Hospital.objects.filter(organization=organization, code=candidate).exists():
            suffix = f"_{counter}"
            candidate = f"{base[: max(1, 50 - len(suffix))]}{suffix}"
            counter += 1
        return candidate

    @staticmethod
    def get_hospital_by_id(hospital_id):
        try:
            return Hospital.objects.get(id=hospital_id)
        except Hospital.DoesNotExist:
            return None

    @staticmethod
    @transaction.atomic
    def create_or_join_first_hospital(user, hospital_data):
        """
        Create a new first hospital for a user or accept a valid invitation.
        """
        invitation_token = hospital_data.get("invitation_token")

        if invitation_token:
            invitation = HospitalStaffInvitation.objects.filter(
                token=invitation_token,
            ).select_related("hospital", "department", "hospital__organization").first()
            if not invitation:
                raise ValidationError({"invitation_token": "Invitation not found."})
            staff = HospitalInvitationService.accept_invitation(invitation=invitation, user=user)
            return invitation.hospital.organization, invitation.hospital, staff

        org_id = hospital_data.get("organization_id")
        if org_id:
            organization = Organization.objects.filter(
                id=org_id,
                created_by=user,
            ).first()
            if not organization:
                raise ValidationError({"organization_id": "Organization not found."})
        else:
            organization, _ = Organization.objects.get_or_create(
                created_by=user,
                defaults={
                    "name": f"{user.get_name() or user.username}'s Organization",
                    "code": f"ORG_{str(user.id).replace('-', '')[:8].upper()}",
                    "is_active": True,
                },
            )

        create_payload = clean_model_fields(Hospital, hospital_data)
        provided_code = (create_payload.get("code") or "").strip()
        if provided_code:
            create_payload["code"] = provided_code.upper()
        else:
            create_payload["code"] = HospitalService._generate_hospital_code(
                create_payload.get("name", ""),
                organization,
            )

        hospital = Hospital.objects.create(
            **create_payload,
            organization=organization,
            created_by=user,
        )

        staff = HospitalStaff.objects.create(
            user=user,
            hospital=hospital,
            role=HospitalStaffRole.OWNER,
            assigned_by=user,
            is_primary_assignment=True,
            is_active=True,
        )

        return organization, hospital, staff
