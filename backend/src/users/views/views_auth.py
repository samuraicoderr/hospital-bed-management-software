import logging

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotFound,
    PermissionDenied,
    ValidationError,
)
from rest_framework.parsers import FileUploadParser, FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.throttling import UserRateThrottle

from drf_spectacular.utils import extend_schema

from src.lib.django.errors import DeprecatedError
from src.common.serializers import EmptySerializer
from src.lib.django.views_mixin import ViewSetHelperMixin
from src.lib.utils.uuid7 import uuid7
from src.notifications.Notifier import NotifyUser
from src.organizations.services import HospitalService
from src.users.models import User, RecoveryCode, WaitList
from src.users.permissions import IsVerifiedUser
from src.users.serializers import (
    AuthLoginSerializer,
    BarcodeStuffSerializer,
    MFAChallengeSerializer,
    MFAPushDeviceSerializer,
    MFATotpSetupSerializer,
    MFATotpVerifySerializer,
    MFAVerifySerializer,
    MFAWebAuthnSetupSerializer,
    MFAWebAuthnVerifySerializer,

    CheckUsernameSerializer,
    CreateUserSerializer,
    EmailOrPhoneSerializer,
    EmailVerificationSerializer,
    GetOboardingTokenSerializer,
    Onboarding,
    PhoneVerificationSerializer,
    PasswordResetSerializer,
    ResetForgottenPasswordSerializer,
    ResetPasswordAndSendEmailSerializer,
    ResetRecoveryCodesSerializer,
    TFA_OtpSerializer,
    TFA_Serializer,
    UpdateUserSerializer,
    UserSerializer,
    WaitListSerializer,
)
from src.users.password import PasswordValidator
from src.users.auth import _jwt_response, _mfa_required_response, _onboarding_required_response
from src.users.auth import response_tokens

from src.users.mfa_services import (
    begin_challenge,
    get_available_methods,
    get_session_from_token,
    register_push_device,
    setup_totp,
    setup_webauthn,
    verify_challenge,
    verify_totp_setup,
)
from src.users.services import OtpType, UserService
from src.users.utils import (
    WaitlistSpreadSheet,
    generate_qrcode,
    generate_signed_token,
    verify_signed_token,
)

logger = logging.getLogger("app")


# ─────────────────────────────────────────────
# THROTTLES
# ─────────────────────────────────────────────

class OtpRateThrottle(UserRateThrottle):
    rate = "3/min"


class NormalThrottle(UserRateThrottle):
    rate = "50/min"

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _get_client_ip(request) -> str | None:
    """Extract the real client IP, respecting reverse-proxy headers."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _resolve_user_from_onboarding_token(token: str) -> User:
    """
    Verify an onboarding token and return the corresponding User.
    Raises ValidationError or NotFound on failure.
    """
    user_id = User.verify_onboarding_token(
        token, max_age=User.ONBOARDING_TOKEN_MAX_AGE
    )
    if not user_id:
        raise ValidationError({"error": "invalid or expired onboarding token"})
    user = User.objects.filter(id=user_id).first()
    if user is None:
        raise NotFound({"error": "user not found"})
    return user


# ─────────────────────────────────────────────
# AUTH VIEWSET
# ─────────────────────────────────────────────

class AuthRouterViewSet(ViewSetHelperMixin, viewsets.GenericViewSet):
    """
    Handles registration, onboarding, OTP flows, password management,
    2FA setup, and recovery code management.
    """

    serializers = {
        "default": UserSerializer,          # was CreateUserSerializer — wrong
        "login": AuthLoginSerializer,
        "register": CreateUserSerializer,
        "update_me": UpdateUserSerializer,


        "password_reset": PasswordResetSerializer,
        "forgot_password": ResetPasswordAndSendEmailSerializer,
        "send_forgot_password_otp": EmailOrPhoneSerializer,
        "reset_forgot_password": ResetForgottenPasswordSerializer,
        "send_email_verification_otp": EmailVerificationSerializer,
        "check_email_verification_otp": EmailVerificationSerializer,
        "send_phone_verification_otp": PhoneVerificationSerializer,
        "check_phone_verification_otp": PhoneVerificationSerializer,
        "send_2fa_otp": TFA_Serializer,
        "check_2fa_otp": TFA_OtpSerializer,
        "reset_recovery_codes": ResetRecoveryCodesSerializer,
        "request_qr_code": BarcodeStuffSerializer,
        "health": EmptySerializer,
        "mfa_challenge": MFAChallengeSerializer,
        "mfa_verify": MFAVerifySerializer,
        "mfa_setup_totp": MFATotpSetupSerializer,
        "mfa_verify_totp": MFATotpVerifySerializer,
        "mfa_setup_webauthn": MFAWebAuthnSetupSerializer,
        "mfa_verify_webauthn": MFAWebAuthnVerifySerializer,
        "mfa_register_push_device": MFAPushDeviceSerializer,
        "get_onboarding_token": GetOboardingTokenSerializer,
        "exchange_onboarding_tokens_for_login_tokens": Onboarding.UseOnboardingTokenSerializer,
        "set_user_basic_info": Onboarding.ChangeBasicInfoSerializer,
        "set_password": Onboarding.ChangePasswordSerializer,
        "set_username": Onboarding.ChangeUserNameSerializer,
        "set_profile_picture": Onboarding.ChangeProfilePictureSerializer,
        "create_or_join_first_hospital": Onboarding.CreateHospitalSerializer,  # reusing the same serializer since it only has the onboarding token and the hospital name is optional
        "join_waitlist": WaitListSerializer,      # was missing
        "check_username": CheckUsernameSerializer,
        "qr_image_for_2fa": EmptySerializer,      # GET with no body
    }

    permissions = {
        "default": [IsVerifiedUser],
        "login": (AllowAny,),
        "mfa_challenge": (AllowAny,),
        "mfa_verify": (AllowAny,),
        "mfa_setup_totp": (IsAuthenticated,),
        "mfa_verify_totp": (IsAuthenticated,),
        "mfa_setup_webauthn": (IsAuthenticated,),
        "mfa_verify_webauthn": (AllowAny,),
        "mfa_register_push_device": (IsAuthenticated,),
        "qr_image_for_2fa": (AllowAny,),
        "forgot_password": (AllowAny,),
        "register": (AllowAny,),
        "send_email_verification_otp": (AllowAny,),
        "check_email_verification_otp": (AllowAny,),
        "send_phone_verification_otp": (AllowAny,),
        "check_phone_verification_otp": (AllowAny,),
        "send_2fa_otp": (AllowAny,),
        "check_2fa_otp": (IsAuthenticated,),
        "health": (AllowAny,),
        "join_waitlist": (AllowAny,),

        "send_forgot_password_otp": (AllowAny,),
        "reset_forgot_password": (AllowAny,),
        "get_onboarding_token": (AllowAny,),
        "exchange_onboarding_tokens_for_login_tokens": (AllowAny,),
        "set_username": (AllowAny,),
        "set_user_basic_info": (AllowAny,),
        "set_profile_picture": (AllowAny,),
        "create_or_join_first_hospital": (AllowAny,),
        "check_username": (AllowAny,),
        "set_password": (AllowAny,),
    }

    # ── Waitlist ──────────────────────────────

# trottle this endponit
    @action(detail=False, methods=["post"], throttle_classes=[NormalThrottle])
    def check_username(self, request):
        """Check if a username is available."""
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"].strip()
        if not username:
            return Response({"error": "username cannot be blank"}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=username).exists():
            return Response({"available": False, "username": username}, status=status.HTTP_200_OK)
        return Response({"available": True, "username": username}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="join_waitlist")
    def join_waitlist(self, request):
        serializer = WaitListSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        if WaitList.objects.filter(email=email).exists():
            return Response(
                {"message": "already_joined"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        WaitList.objects.create(
            email=email,
            ip_address=_get_client_ip(request),
        )

        try:
            WaitlistSpreadSheet.append_to_waitlist(email)
        except Exception:
            logger.exception("Failed to append %s to waitlist spreadsheet", email)

        try:
            NotifyUser.send_waitlist_confirmation(email=email)
        except Exception:
            logger.exception("Failed to send waitlist confirmation email to %s", email)

        return Response({"message": "success"}, status=status.HTTP_201_CREATED)

    # ── MFA Core ─────────────────────────────

    @action(detail=False, methods=["post"], url_path="login")
    def login(self, request):
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].strip().lower()
        password = serializer.validated_data["password"]
        user = User.objects.filter(email=email).first()
        if not user or not user.check_password(password):
            raise AuthenticationFailed("No active account found with the given credentials")

        return response_tokens(user, request=request)
    
    @action(detail=False, methods=["post"])
    def register(self, request):
        """
        Register a new user account.
        Returns the created user and advances onboarding to the first real step.
        """
        serializer = CreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        raw_password = validated["password"]

        if User.objects.filter(email=validated["email"]).exists():
            return Response(
                {"error": "a user with this email already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pv = PasswordValidator(raw_password)
        if not pv.run_check():
            return Response(
                {"password": pv.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            user = User(
                **validated,
                username=f"user_{uuid7().hex}",
                is_email_verified=False,
                is_phone_number_verified=False,
            )
            user.set_password(raw_password)
            user.save()
            # Advance from NEEDS_BASIC_INFORMATION → NEEDS_EMAIL_VERIFICATION
            # user.advance_onboarding(
            #     from_step=User.OnboardingStatus.NEEDS_BASIC_INFORMATION
            # )
            user.advance_onboarding(
                from_step=User.OnboardingStatus.NEEDS_PASSWORD,  # skip the password step since we already have the password at registration
            )

        try:
            NotifyUser(user).send_welcome_to_user()
        except Exception:
            logger.exception("Failed to send welcome email to user %s", user.id)

        return Response(
            CreateUserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=False,
        methods=["post"],
        throttle_classes=[OtpRateThrottle],
        url_path="mfa/challenge",
    )
    def mfa_challenge(self, request):
        """Initiate an MFA challenge for the user associated with the provided MFA session token."""
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        session = get_session_from_token(
            token=serializer.validated_data["mfa_session_token"],
            request=request,
        )
        payload = begin_challenge(session=session, method=serializer.validated_data["selected_method"])
        return Response(payload, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["post"],
        throttle_classes=[OtpRateThrottle],
        url_path="mfa/verify",
    )
    def mfa_verify(self, request):
        """Verify the response to an MFA challenge using the provided MFA session token."""
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        session = get_session_from_token(
            token=serializer.validated_data["mfa_session_token"],
            request=request,
        )

        selected_method = serializer.validated_data["selected_method"]
        payload = {
            "otp": serializer.validated_data.get("otp"),
            "approval_code": serializer.validated_data.get("approval_code"),
            "challenge": serializer.validated_data.get("challenge"),
            "assertion": serializer.validated_data.get("assertion"),
        }

        is_valid = verify_challenge(session=session, method=selected_method, payload=payload)
        if not is_valid:
            raise AuthenticationFailed("Invalid MFA response", code="invalid_mfa_response")

        return _jwt_response(session.user)

    @action(detail=False, methods=["get"], url_path="mfa/methods")
    def mfa_methods(self, request):
        """Return the available MFA methods for the authenticated user."""
        methods = get_available_methods(request.user)
        return Response({"available_methods": methods}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="mfa/setup/totp")
    def mfa_setup_totp(self, request):
        """Initiate TOTP setup for the authenticated user and return the provisioning URI."""
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.check_password(serializer.validated_data["password"]):
            raise ValidationError({"error": "wrong password"})

        payload = setup_totp(request.user)
        return Response(payload, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="mfa/verify/totp")
    def mfa_verify_totp(self, request):
        """Verify the TOTP code provided by the user during TOTP setup."""
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        is_valid = verify_totp_setup(request.user, serializer.validated_data["otp"])
        if not is_valid:
            raise ValidationError({"otp": "invalid otp"})

        return Response({"message": "totp verified", "mfa_is_enabled": request.user.mfa_is_enabled}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="mfa/setup/webauthn")
    def mfa_setup_webauthn(self, request):
        """Initiate WebAuthn setup for the authenticated user and return the challenge and credential options."""
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        method = setup_webauthn(
            request.user,
            credential_id=serializer.validated_data["credential_id"],
            public_key=serializer.validated_data["public_key"],
            sign_count=serializer.validated_data.get("sign_count", 0),
        )
        request.user.mfa_is_enabled = True
        request.user.save(update_fields=["mfa_is_enabled"])
        return Response({"message": "webauthn configured", "method_id": str(method.id)}, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["post"],
        throttle_classes=[OtpRateThrottle],
        url_path="mfa/verify/webauthn",
    )
    def mfa_verify_webauthn(self, request):
        """Verify the WebAuthn assertion provided by the user during the MFA challenge flow."""
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        session = get_session_from_token(
            token=serializer.validated_data["mfa_session_token"],
            request=request,
        )
        is_valid = verify_challenge(
            session=session,
            method="webauthn",
            payload={
                "challenge": serializer.validated_data["challenge"],
                "assertion": serializer.validated_data["assertion"],
            },
        )
        if not is_valid:
            raise AuthenticationFailed("Invalid WebAuthn assertion")

        return _jwt_response(session.user)

    @action(detail=False, methods=["post"], url_path="mfa/push/register-device")
    def mfa_register_push_device(self, request):
        """Register a push notification device for MFA challenges. Requires the device token and platform."""
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        device = register_push_device(
            user=request.user,
            token=serializer.validated_data["token"],
            platform=serializer.validated_data["platform"],
        )
        return Response(
            {
                "message": "push device registered",
                "device_id": str(device.id),
                "is_active": device.is_active,
            },
            status=status.HTTP_201_CREATED,
        )

    # ── MFA Auth App QR code ───────────────────────────

    @action(detail=False, methods=["get"], url_path="mfa/authapp/qr-image/(?P<token>.*)")
    def authapp_qrimage(self, request, token):
        """
        Renders a QR code PNG for the given short-lived signed token.
        Used by email clients or frontends that cannot render otpauth URIs directly.
        """
        user_id = verify_signed_token(token, max_age=300)
        if not user_id:
            raise NotFound({"error": "QR code expired or invalid"})
        user = User.objects.filter(id=user_id).first()
        if not user:
            raise NotFound({"error": "user not found"})

        buffer = generate_qrcode(user.get_authenticator_uri()).getvalue()
        return HttpResponse(buffer, content_type="image/png")

    @action(detail=False, methods=["post"], url_path="mfa/authapp/request_qr_code")
    def request_authapp_qr_code(self, request):
        """
        Returns a short-lived signed URL for the QR image and the raw otpauth URI.

        Prefer the `qrcode_uri` — render the QR yourself on the frontend.
        **DO NOT store the QR code or URI in localStorage or any browser storage.**
        """
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data["password"]):
            raise ValidationError({"error": "wrong password"})

        # Token for the image-serving endpoint only — not a TFA/onboarding token.
        token = generate_signed_token(str(user.id))
        image_url = request.build_absolute_uri(
            reverse("auth-authapp-qrimage", kwargs={"token": token})
        )

        return Response(
            {
                "image_url": image_url,
                "qrcode_uri": user.get_authenticator_uri(),
            },
            status=status.HTTP_200_OK,
        )

    # ── Onboarding ────────────────────────────

    @action(detail=False, methods=["post"], url_path="onboarding/get_onboarding_token")
    def get_onboarding_token(self, request):
        """
        Authenticate the user and return an onboarding token.
        Only works while onboarding is incomplete.
        Token expires after `settings.ONBOARDING_TOKEN_EXPIRY_TIME_SECONDS`.
        """
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        user = User.objects.filter(email=email).first()
        if user is None:
            raise NotFound({"error": "user with this email does not exist"})
        if not user.check_password(password):
            raise ValidationError({"error": "invalid password"})
        if user.is_onboarding_completed():
            raise ValidationError({"error": "user onboarding is already completed"})

        return _onboarding_required_response(user)
    
    @action(detail=False, methods=["post"], url_path="onboarding/exchange_onboarding_tokens_for_login_tokens")
    def exchange_onboarding_tokens_for_login_tokens(self, request):
        """
        Exchange valid onboarding tokens for regular JWT auth tokens.
        Used when the user has just completed onboarding.

        """
        # Since a user with completed onboarding process can't generate another onboarding token this is safish
        # but once we once we return the real deal we shouldn't do it again.
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = _resolve_user_from_onboarding_token(
            serializer.validated_data["onboarding_token"]
        )

        if not user.is_onboarding_completed():
            raise ValidationError({"error": "user onboarding is not yet completed"})

        return response_tokens(user, request=request, skip_mfa=True)

    @action(detail=False, methods=["post"], url_path="onboarding/set_user_basic_info")
    def set_user_basic_info(self, request):
        """
        Set the user's basic information during onboarding.
        stuff like
        ```json
        {
            "first_name": "Alice",
            "last_name": "Smith",
            "password": "...",
            ...
        }
        ```
        These are actually collected during registration it's only ever needed if the user uses oauth to signup and we didn't get enough info from the provider.
        """
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = _resolve_user_from_onboarding_token(
            serializer.validated_data["onboarding_token"]
        )

        if user.is_onboarding_completed():
            raise ValidationError({"error": "user onboarding is already completed"})
        if user.is_future_step(User.OnboardingStatus.NEEDS_BASIC_INFORMATION):
            raise ValidationError({"error": "user has not yet reached the basic information step"})

        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=user.pk)
            user.first_name = serializer.validated_data["first_name"]
            user.last_name = serializer.validated_data["last_name"]
            user.set_password(serializer.validated_data["password"])
            user.save()
            if user.is_email_verified:
                # skip email verification step if email is already verified (e.g. from OAuth signup)s
                user.advance_onboarding(from_step=User.OnboardingStatus.NEEDS_EMAIL_VERIFICATION)
            else:
                user.advance_onboarding(
                    from_step=User.OnboardingStatus.NEEDS_PASSWORD  # skip the password step since we've just done that -> NEEDS_EMAIL_VERIFICATION
                )

        return Response(
            CreateUserSerializer(user, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="onboarding/set_password")
    def set_password(self, request):
        """Set the user's password during onboarding.
        
        This is needed especially when we don't want to use `set_user_basic_info` because we already have the users info and only need the password since that endpoint collects both
        ```json
        {
            "onboarding_token": "...",
            "password": "..."
        }
        ```
        """

        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = _resolve_user_from_onboarding_token(
            serializer.validated_data["onboarding_token"]
        )

        if user.is_onboarding_completed():
            raise ValidationError({"error": "user onboarding is already completed"})
        if user.is_future_step(User.OnboardingStatus.NEEDS_PASSWORD):
            raise ValidationError({"error": "user has not yet reached the password step"})

        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=user.pk)
            user.set_password(serializer.validated_data["password"])
            user.save(
                update_fields=["password"]
            )
            user.advance_onboarding(
                from_step=User.OnboardingStatus.NEEDS_EMAIL_VERIFICATION  # -> NEEDS_PROFILE_USERNAME
            )

        return Response(
            CreateUserSerializer(user, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
    
    @action(detail=False, methods=["post"], url_path="onboarding/set_username")
    def set_username(self, request):
        """
        Set the user's username during onboarding.
        Requires a valid onboarding token. Advances onboarding on success.
        """
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = _resolve_user_from_onboarding_token(
            serializer.validated_data["onboarding_token"]
        )

        if user.is_onboarding_completed():
            raise ValidationError({"error": "user onboarding is already completed"})
        if user.is_future_step(User.OnboardingStatus.NEEDS_PROFILE_USERNAME):
            raise ValidationError({"error": "user has not yet reached the username step"})

        new_username = serializer.validated_data.get("new_username", None).strip() or None
        if not new_username:
            if user.username:
                new_username = user.username
            else:
                new_username = f"user_{uuid7().hex[:8]}"
        if User.objects.exclude(pk=user.pk).filter(username=new_username).exists():
            raise ValidationError({"error": "this username is already taken"})

        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=user.pk)
            if user.username != new_username:
                user.username = new_username
                user.save(update_fields=["username"])
            user.advance_onboarding(from_step=User.OnboardingStatus.NEEDS_PROFILE_USERNAME)

        return Response(
            CreateUserSerializer(user, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        request=Onboarding.ChangeProfilePictureSerializer,
        responses={200: CreateUserSerializer},
    )
    @action(
        detail=False,
        methods=["post"],
        url_path="onboarding/set_profile_picture",
        parser_classes=[MultiPartParser, FormParser, FileUploadParser],
    )
    def set_profile_picture(self, request):
        """
        Upload profile picture during onboarding.
        Requires a valid onboarding token. Advances onboarding on success.
        """
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = _resolve_user_from_onboarding_token(
            serializer.validated_data["onboarding_token"]
        )

        if user.is_onboarding_completed():
            raise ValidationError({"error": "user onboarding is already completed"})
        if user.is_future_step(User.OnboardingStatus.NEEDS_PROFILE_PICTURE):
            raise ValidationError({"error": "user has not yet reached the profile picture step"})

        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=user.pk)
            user.profile_picture = serializer.validated_data["profile_picture"]
            user.save(update_fields=["profile_picture"])
            user.advance_onboarding(from_step=User.OnboardingStatus.NEEDS_PROFILE_PICTURE)

        return Response(
            CreateUserSerializer(user, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
    

    @action(detail=False, methods=["post"], url_path="onboarding/create_or_join_first_hospital")
    def create_or_join_first_hospital(self, request):
        """
        Create or join the user's first hospital during onboarding.
        Requires a valid onboarding token. Advances onboarding on success.
        """
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = _resolve_user_from_onboarding_token(
            serializer.validated_data["onboarding_token"]
        )

        if user.is_onboarding_completed():
            raise ValidationError({"error": "user onboarding is already completed"})
        if user.is_future_step(User.OnboardingStatus.NEEDS_HOSPITAL):
            raise ValidationError({"error": "user has not yet reached the hospital affiliation step"})

        hospital_data = serializer.validated_data
        organization, hospital, staff = HospitalService.create_or_join_first_hospital(
            user, 
            hospital_data=hospital_data
        )

        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=user.pk)
            user.advance_onboarding(from_step=User.OnboardingStatus.NEEDS_HOSPITAL)

        return Response(
            CreateUserSerializer(user, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


    # ── Onboarding Email OTP ─────────────────────────────

    @action(
        detail=False,
        methods=["post"],
        throttle_classes=[OtpRateThrottle],
        url_path="onboarding/email/send_email_verification_otp",
    )
    def send_email_verification_otp(self, request):
        """Send a verification OTP to the user's email address."""
        serializer = EmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = User.objects.filter(email=serializer.validated_data["email"]).first()
        if user is None:
            raise NotFound({"error": "user with this email does not exist"})
        if user.is_email_verified:
            raise ValidationError({"error": "email is already verified"})
        if user.is_future_step(User.OnboardingStatus.NEEDS_EMAIL_VERIFICATION):
            raise ValidationError({"error": "user has not yet reached the email verification step"})

        UserService.send_user_otp(user, otp_type=OtpType.EMAIL_VERIFICATION)
        return Response({"message": "OTP sent to your email"}, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["post"],
        throttle_classes=[OtpRateThrottle],
        url_path="onboarding/email/check_email_verification_otp",
    )
    def check_email_verification_otp(self, request):
        """
        Verify the email OTP. On success, marks email as verified and
        advances onboarding. Raises ValidationError on invalid/expired OTP.
        """
        serializer = EmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        otp = serializer.validated_data.get("otp")
        if not otp:
            raise ValidationError({"error": "OTP is required"})

        user = User.objects.filter(email=serializer.validated_data["email"]).first()
        if user is None:
            raise NotFound({"error": "user with this email does not exist"})
        if user.is_email_verified:
            raise ValidationError({"error": "email is already verified"})
        if user.is_future_step(User.OnboardingStatus.NEEDS_EMAIL_VERIFICATION):
            raise ValidationError({"error": "user has not yet reached the email verification step"})

        # verify_otp raises ValidationError on failure — let it propagate.
        UserService.verify_user_otp(user, otp, otp_type=OtpType.EMAIL_VERIFICATION)

        # Reload to reflect state changes made inside verify_otp/set_otp.
        user.refresh_from_db()
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=user.pk)
            user.advance_onboarding(from_step=User.OnboardingStatus.NEEDS_EMAIL_VERIFICATION)

        return Response(
            {
                "message": "email verified",
                **_onboarding_required_response(user, include_token=False),
            },
            status=status.HTTP_200_OK,
        )

    # ── Onboarding Phone OTP ─────────────────────────────

    @action(
        detail=False,
        methods=["post"],
        throttle_classes=[OtpRateThrottle],
        url_path="onboarding/phone/send_phone_verification_otp",
    )
    def send_phone_verification_otp(self, request):
        """Send a verification OTP to the user's phone number."""
        serializer = PhoneVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone_number = serializer.validated_data["phone_number"]
        user = User.objects.filter(phone_number=phone_number).first()
        if user is None:
            raise NotFound({"error": "user with this phone number does not exist"})
        if user.is_phone_number_verified:
            raise ValidationError({"error": "phone number is already verified"})
        if user.is_future_step(User.OnboardingStatus.NEEDS_PHONE_VERIFICATION):
            raise ValidationError({"error": "user has not yet reached the phone verification step"})

        UserService.send_user_otp(user, otp_type=OtpType.PHONE_VERIFICATION)
        return Response({"message": "OTP sent to your phone number"}, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["post"],
        throttle_classes=[OtpRateThrottle],
        url_path="onboarding/phone/check_phone_verification_otp",
    )
    def check_phone_verification_otp(self, request):
        """
        Verify the phone OTP. On success, marks phone as verified and
        advances onboarding. Raises ValidationError on invalid/expired OTP.
        """
        serializer = PhoneVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        otp = serializer.validated_data.get("otp")
        if not otp:
            raise ValidationError({"error": "OTP is required"})

        phone_number = serializer.validated_data["phone_number"]
        user = User.objects.filter(phone_number=phone_number).first()
        if user is None:
            raise NotFound({"error": "user with this phone number does not exist"})
        if user.is_phone_number_verified:
            raise ValidationError({"error": "phone number is already verified"})
        if user.is_future_step(User.OnboardingStatus.NEEDS_PHONE_VERIFICATION):
            raise ValidationError({"error": "user has not yet reached the phone verification step"})

        UserService.verify_user_otp(user, otp, otp_type=OtpType.PHONE_VERIFICATION)

        user.refresh_from_db()
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=user.pk)
            user.advance_onboarding(from_step=User.OnboardingStatus.NEEDS_PHONE_VERIFICATION)

        return Response(
            {
                "message": "phone number verified",
                **_onboarding_required_response(user, include_token=False),
            },
            status=status.HTTP_200_OK,
        )



class SecurityViewSet(ViewSetHelperMixin, viewsets.GenericViewSet):

    serializers = {
        "default": UserSerializer,          # was CreateUserSerializer — wrong
        "password_reset": PasswordResetSerializer,
        "send_forgot_password_otp": EmailOrPhoneSerializer,
        "reset_forgot_password": ResetForgottenPasswordSerializer,
        "reset_recovery_codes": ResetRecoveryCodesSerializer,
    }

    permissions = {
        "default": [IsVerifiedUser],
        "send_forgot_password_otp": (AllowAny,),
        "reset_forgot_password": (AllowAny,),
    }


    # ── Password ──────────────────────────────

    @action(detail=False, methods=["put"], url_path="password")
    def password_reset(self, request):
        """Change password for an authenticated user who knows their current password."""
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_password = serializer.validated_data["new_password"]
        confirm_new = serializer.validated_data["repeat_new_password"]
        old_password = serializer.validated_data["old_password"]

        if new_password != confirm_new:
            raise ValidationError({"error": "new password and confirmation do not match"})

        user = request.user
        if not user.check_password(old_password):
            raise ValidationError({"error": "invalid current password"})

        pv = PasswordValidator(new_password)
        if not pv.run_check():
            return Response({"password": pv.errors}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response({"message": "password changed successfully"}, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["put"],
        throttle_classes=[OtpRateThrottle],
        url_path="password/send_forgot_password_otp",
    )
    def send_forgot_password_otp(self, request):
        """
        Send a password-reset OTP to the user's email or phone.
        Always responds with 200 to avoid leaking account existence.
        """
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        identifier = serializer.validated_data["email_or_phone_number"]
        value, preferred_channel = identifier["value"], identifier["type"]

        user = User.objects.filter(
            Q(email=value) | Q(phone_number=value)
        ).first()

        if user:
            try:
                UserService.send_user_otp(
                    user,
                    otp_type=OtpType.PASSWORD_RESET,
                    preferred_channel=preferred_channel,
                )
            except Exception:
                logger.exception("Failed to send password reset OTP for user %s", user.id)
        else:
            # Intentionally silent — do not reveal whether the account exists.
            logger.info("Password reset OTP requested for unknown identifier (not logged for privacy)")

        return Response({"message": "if an account exists, a reset code has been sent"}, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["put"],
        throttle_classes=[OtpRateThrottle],
        url_path="password/reset_forgot_password",
    )
    def reset_forgot_password(self, request):
        """Reset password using an OTP sent to email or phone."""
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        value = serializer.validated_data["email_or_phone_number"]["value"]
        otp = serializer.validated_data["otp"]
        password = serializer.validated_data["password"]
        repeat_password = serializer.validated_data["repeat_password"]

        if password != repeat_password:
            raise ValidationError({
                "error": "password and confirmation do not match",
                "code": "password_mismatch",
            })

        pv = PasswordValidator(password)
        if not pv.run_check():
            return Response({"password": pv.errors}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            user = (
                User.objects.select_for_update()
                .filter(Q(email=value) | Q(phone_number=value))
                .first()
            )
            if not user:
                raise ValidationError({"error": "account not found"})

            # verify_otp raises ValidationError on failure — let it propagate.
            UserService.verify_user_otp(user, otp, otp_type=OtpType.PASSWORD_RESET)

            user.set_password(password)
            user.save(update_fields=["password"])

        return Response({"message": "password reset successfully"}, status=status.HTTP_200_OK)

    # ── Recovery codes ────────────────────────

    @action(detail=False, methods=["post"], url_path="2fa/reset_recovery_codes")
    def reset_recovery_codes(self, request):
        """
        Regenerate all recovery codes for the authenticated user.
        Requires password confirmation. Codes are shown once and never again.
        """
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.check_password(serializer.validated_data["password"]):
            raise ValidationError({"error": "invalid password"})

        code_list = UserService.reset_recovery_codes(request.user)
        return Response({"recovery_codes": code_list}, status=status.HTTP_201_CREATED)
