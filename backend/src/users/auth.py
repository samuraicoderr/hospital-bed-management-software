from datetime import datetime
import secrets

from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.exceptions import (
    ValidationError,
    PermissionDenied,
    AuthenticationFailed,
)
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenViewBase,
)
from rest_framework_simplejwt.serializers import (
    TokenObtainSerializer,
)
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import update_last_login

from src.users.utils import generate_signed_token, verify_signed_token
from src.users.models import User
from src.users.mfa_services import (
    create_mfa_session,
    get_session_from_token,
    verify_challenge,
)
from src.users.services import OtpType, UserService


def _jwt_response(serializer_or_user):
    user = getattr(serializer_or_user, "user", serializer_or_user)
    refresh = RefreshToken.for_user(user)
    tokens = {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }
    access, refresh = tokens["access"], tokens["refresh"]
    access_expiry = int(
        (timezone.now() + settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]).timestamp()
    )
    refresh_expiry = int(
        (timezone.now() + settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]).timestamp()
    )

    update_last_login(None, user)

    return Response(
        {
            "access": access,
            "refresh": refresh,
            "access_expiry": str(access_expiry),
            "refresh_expiry": str(refresh_expiry),
            "mfa_required": False,
        },
        status=status.HTTP_200_OK,
    )


def _mfa_required_response(*, user, request=None):
    mfa_session_token, _session, available_methods = create_mfa_session(user=user, request=request)
    return Response(
        {
            "mfa_required": True,
            "mfa_session_token": mfa_session_token,
            "available_methods": available_methods,
            # Backward compatibility for legacy clients that still expect tfa_token.
            "tfa_token": mfa_session_token,
        },
        status=status.HTTP_200_OK,
    )


def _onboarding_required_response(user, include_token=True):
    return Response(
        {
            "onboarding_required": True,
            "onboarding_status": user.onboarding_status,
            "onboarding_flow": user.get_onboarding_flow(),
            ** ({"onboarding_token": user.get_onboarding_token()} if include_token else {}),
        },
        status=status.HTTP_200_OK,
    )


def response_tokens(user, request=None, *, skip_mfa=False):
    if not user.is_onboarding_completed() and not skip_mfa:
        return _onboarding_required_response(user=user)
    if not user.mfa_is_enabled or skip_mfa:
        return _jwt_response(serializer_or_user=user)
    return _mfa_required_response(user=user, request=request)



def authenticate(**kwargs):
    password = kwargs.pop("password", None)
    user = User.objects.filter(**kwargs).first()

    if password is None:
        raise ValueError("Server Error password is required")

    if user is not None and user.check_password(password):
        return user


class FirstFactorSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(max_length=128, write_only=True)

    default_error_messages = {
        "no_active_account": _("No active account found with the given credentials")
    }

    def validate(self, attrs: dict):
        authenticate_kwargs = {
            "email": attrs["email"],
            "password": attrs["password"],
        }
        self.user = authenticate(**authenticate_kwargs)

        if not self.user:
            raise AuthenticationFailed(
                self.error_messages["no_active_account"],
                "no_active_account",
            )

        return {}


class SecondFactorSerializer(serializers.Serializer):
    otp = serializers.CharField(max_length=10, write_only=True)
    tfa_token = serializers.CharField(max_length=200, write_only=True)

    default_error_messages = {
        "no_active_account": _("No active account found with the given credentials"),
        "invalid_otp": _("invalid otp"),
        "invalid_tfa_token": _("invalid tfa_token"),
    }

    def validate(self, attrs: dict):
        otp = attrs.get("otp")
        if not otp or len(otp) != 6 or not otp.isdigit():
            raise AuthenticationFailed(
                self.error_messages["invalid_otp"],
                "invalid_otp",
            )

        tfa_token = attrs.get("tfa_token")
        if not tfa_token:
            raise AuthenticationFailed(
                self.error_messages["invalid_tfa_token"],
                "invalid_tfa_token",
            )

        try:
            session = get_session_from_token(token=tfa_token)
        except AuthenticationFailed:
            raise AuthenticationFailed(
                self.error_messages["no_active_account"],
                "no_active_account",
            )

        self.user = session.user
        self.mfa_session = session

        return {}

@extend_schema(tags=["auth"])
class TokenPairView__FirstFactor(TokenObtainPairView):
    """Return access and refresh token if 2FA is disabled

    since 2fa will be ENABLED by default and cannot be disabled, this returns
    ```json
    {
        "tfa_token": "<token>"  // expires in 5 minutes
    }
    ```

    CALL THE Second Factor endpoint with this `tfa_token` bro to get your { access_token, refresh_token }

    """

    serializer_class = FirstFactorSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        user = serializer.user

        # if not (user.is_email_verified or user.is_phone_number_verified):
        # if not (user.is_email_verified):
        #     raise PermissionDenied(
        #         {
        #             "error": "user email or phone number not verified",
        #             "details": {
        #                 "email_verified": user.is_email_verified,
        #                 "phone_number_verified": user.is_phone_number_verified,
        #             },
        #         }
        #     )
        if not user.is_onboarding_completed():
            raise PermissionDenied(
                {
                    "message": "You need to complete the onboarding process to perform this action.",
                    "details": {
                        "onboarding_status": user.onboarding_status,
                        "onboarding_flow": user.get_onboarding_flow(),
                        "onboarding_token": user.get_onboarding_token(),
                    },
                    "code": "onboarding_incomplete",
                }
            )

        if not user.mfa_is_enabled:
            return _jwt_response(serializer)

        return _mfa_required_response(user=user, request=request)

@extend_schema(tags=["auth"])
class TokenPairView__SecondFactor(TokenViewBase):
    serializer_class = SecondFactorSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        user = serializer.user
        session = serializer.mfa_session

        if not (user.is_email_verified or user.is_phone_number_verified):
            raise PermissionDenied(
                {
                    "error": "user email or phone number not verified",
                    "details": {
                        "email_verified": user.is_email_verified,
                        "phone_number_verified": user.is_phone_number_verified,
                    },
                }
            )

        if session.selected_method:
            is_valid = verify_challenge(
                session=session,
                method=session.selected_method,
                payload={"otp": request.data.get("otp", "")},
            )
        else:
            # Backward compatibility: legacy clients can still call firstfactor->secondfactor
            # without creating an explicit challenge.
            is_valid = UserService.verify_user_otp(
                user,
                str(request.data.get("otp", "")),
                otp_type=OtpType.TWO_FACTOR,
            )
            if is_valid:
                session.verified = True
                session.used_at = timezone.now()
                session.selected_method = "totp"
                session.save(update_fields=["verified", "used_at", "selected_method"])
        if not is_valid:
            raise AuthenticationFailed("Invalid OTP", code="invalid_otp")

        return _jwt_response(serializer)

@extend_schema(tags=["auth"])
class RefreshTokenView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        access = serializer.validated_data["access"]
        access_expiry = int(
            (datetime.now() + settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]).timestamp()
        )

        return_values = {
            "access": access,
            "access_expiry": str(access_expiry),
        }

        return Response(return_values, status=status.HTTP_200_OK)
