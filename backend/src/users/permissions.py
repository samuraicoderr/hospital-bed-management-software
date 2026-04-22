from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import APIException


class OnboardingTokens(APIException):
    status_code = 200
    default_detail = {
        "onboarding_required": bool(),
        "onboarding_status": "",
        "onboarding_flow": [],
        "onboarding_token": "",
    }
    default_code = "soft_error"


class IsUserOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        """If this is a GET/HEAD/OPTIONS request OR the user is authenticated, allow access."""

        if request.method in permissions.SAFE_METHODS:
            return True

        return obj == request.user


class IsVerifiedUser(permissions.BasePermission):

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if not request.user.is_active:
            raise PermissionDenied(
                {
                    "message": "Your account has been deactivated. Please contact support for more information.",
                    "code": "account_inactive",
                }
            )
        
        if not request.user.is_onboarding_complete():
            raise OnboardingTokens(
                {
                    "onboarding_required": True,
                    "onboarding_status": request.user.onboarding_status,
                    "onboarding_flow": request.user.get_onboarding_flow(),
                    "onboarding_token": request.user.get_onboarding_token(),
                }
            )

        return True


class IsVerifiedAdminUser(IsVerifiedUser):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        if not request.user.is_staff:
            raise PermissionDenied(
                {
                    "errors": [
                        {
                            "message": "You do not have permission to perform this action.",
                            "code": "not_admin",
                        }
                    ]
                }
            )

        return True
