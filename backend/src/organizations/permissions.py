from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied

from src.organizations.models import (
    Organization,
    OrganizationMembership,
    OrganizationMembershipStatus,
    OrganizationRoleType,
)
from src.users.permissions import IsVerifiedUser


class OrganizationPermissionBase(permissions.BasePermission):
    def _get_organization(self, request, view, obj=None):
        if hasattr(view, "get_organization"):
            organization = view.get_organization()
            if organization:
                return organization

        if isinstance(obj, Organization):
            return obj

        if obj is not None and hasattr(obj, "organization"):
            return obj.organization

        organization_id = view.kwargs.get("organization_id")
        if organization_id:
            return Organization.objects.filter(pk=organization_id).first()

        return None

    def _get_membership(self, request, view, obj=None):
        organization = self._get_organization(request, view, obj=obj)
        if not organization:
            return None

        return OrganizationMembership.objects.filter(
            organization=organization,
            user=request.user,
            status=OrganizationMembershipStatus.ACTIVE,
        ).select_related("role").first()


class IsOrganizationMember(OrganizationPermissionBase):
    def has_permission(self, request, view):
        if not IsVerifiedUser().has_permission(request, view):
            return False

        # Organization creation should be available to any verified user.
        if getattr(view, "action", "") == "create" and view.__class__.__name__ == "OrganizationViewSet":
            return True

        membership = self._get_membership(request, view)
        if membership:
            return True

        raise PermissionDenied(
            {
                "errors": [
                    {
                        "message": "You are not a member of this organization.",
                        "code": "organization_membership_required",
                    }
                ]
            }
        )

    def has_object_permission(self, request, view, obj):
        membership = self._get_membership(request, view, obj=obj)
        if membership:
            return True
        raise PermissionDenied(
            {
                "errors": [
                    {
                        "message": "You are not a member of this organization.",
                        "code": "organization_membership_required",
                    }
                ]
            }
        )


class IsOrganizationAdminOrOwner(IsOrganizationMember):
    def _is_admin_or_owner(self, membership):
        if not membership:
            return False
        return membership.role.role_type in (
            OrganizationRoleType.OWNER,
            OrganizationRoleType.ADMIN,
        )

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        membership = self._get_membership(request, view)
        if self._is_admin_or_owner(membership):
            return True

        raise PermissionDenied(
            {
                "errors": [
                    {
                        "message": "Only organization admins or owners can perform this action.",
                        "code": "organization_admin_required",
                    }
                ]
            }
        )

    def has_object_permission(self, request, view, obj):
        membership = self._get_membership(request, view, obj=obj)
        if self._is_admin_or_owner(membership):
            return True
        raise PermissionDenied(
            {
                "errors": [
                    {
                        "message": "Only organization admins or owners can perform this action.",
                        "code": "organization_admin_required",
                    }
                ]
            }
        )


class IsOrganizationOwner(IsOrganizationMember):
    def _is_owner(self, membership):
        return bool(membership and membership.role.role_type == OrganizationRoleType.OWNER)

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        membership = self._get_membership(request, view)
        if self._is_owner(membership):
            return True

        raise PermissionDenied(
            {
                "errors": [
                    {
                        "message": "Only organization owners can perform this action.",
                        "code": "organization_owner_required",
                    }
                ]
            }
        )

    def has_object_permission(self, request, view, obj):
        membership = self._get_membership(request, view, obj=obj)
        if self._is_owner(membership):
            return True
        raise PermissionDenied(
            {
                "errors": [
                    {
                        "message": "Only organization owners can perform this action.",
                        "code": "organization_owner_required",
                    }
                ]
            }
        )
