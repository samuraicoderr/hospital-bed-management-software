from rest_framework import serializers
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from phonenumber_field.serializerfields import PhoneNumberField
from drf_spectacular.utils import extend_schema_field
from drf_spectacular.types import OpenApiTypes
from phonenumber_field.phonenumber import to_python


from src.common.serializers import ThumbnailerJSONSerializer
from src.users.models import User, WaitList


# ─────────────────────────────────────────────
# SHARED FIELDS
# ─────────────────────────────────────────────

class EmailOrPhoneField(serializers.Field):
    """
    Accepts either a valid email address or an E.164 phone number.
    Returns {"type": "email"|"phone", "value": <normalised string>}.
    """

    def to_internal_value(self, data):
        # Try email first.
        try:
            validate_email(data)
            return {"type": "email", "value": data.strip().lower()}
        except ValidationError:
            pass

        # Try phone number.
        try:
            phone = to_python(data)
            if phone and phone.is_valid():
                return {"type": "phone", "value": phone.as_e164}
        except Exception:
            pass

        raise serializers.ValidationError(
            "Enter a valid email address or phone number."
        )

    def to_representation(self, value):
        return value


# ─────────────────────────────────────────────
# USER
# ─────────────────────────────────────────────

class CheckUsernameSerializer(serializers.Serializer):
    """Serializer for validating username availability."""
    username = serializers.CharField(max_length=150, required=True)
    is_available = serializers.BooleanField(read_only=True)

class UserSerializer(serializers.ModelSerializer):
    """Read-only serializer for returning user profile data."""

    profile_picture = ThumbnailerJSONSerializer(
        required=False, allow_null=True, alias_target="src.users"
    )
    onboarding_flow = serializers.SerializerMethodField()

    def get_onboarding_flow(self, obj) -> list:
        return obj.get_onboarding_flow()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "profile_picture",
            "picture_url",
            "phone_number",
            "onboarding_status",
            "onboarding_flow",
            "is_email_verified",
            "is_phone_number_verified",
            "mfa_is_enabled",
        )
        read_only_fields = [*fields]


class CreateUserSerializer(serializers.ModelSerializer):
    """
    Used for registration input validation and the registration response.
    User creation is handled explicitly in the view — do not call .save() on this serializer.
    """

    profile_picture = ThumbnailerJSONSerializer(
        required=False, allow_null=True, alias_target="src.users"
    )
    onboarding_flow = serializers.SerializerMethodField()
    onboarding_token = serializers.SerializerMethodField()

    def get_onboarding_flow(self, obj) -> list:
        return obj.get_onboarding_flow()

    def get_onboarding_token(self, obj) -> str:
        return obj.get_onboarding_token()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "password",
            "first_name",
            "last_name",
            "email",
            "profile_picture",
            "phone_number",
            "onboarding_status",
            "onboarding_flow",
            "is_email_verified",
            "is_phone_number_verified",
            "onboarding_token",
        )
        read_only_fields = (
            "username",
            "onboarding_status",
            "onboarding_flow",
            "is_email_verified",
            "is_phone_number_verified",
            "onboarding_token",
        )
        extra_kwargs = {
            "password": {"write_only": True},
        }


class UpdateUserSerializer(serializers.ModelSerializer):
    """Serializer for partial profile updates by an authenticated user."""

    class Meta:
        model = User
        fields = (
            "id",
            "first_name",
            "last_name",
            "username",
            "mfa_is_enabled",
        )
        read_only_fields = ("id",)


# ─────────────────────────────────────────────
# WAITLIST
# ─────────────────────────────────────────────

class WaitListSerializer(serializers.ModelSerializer):
    """Input/output serializer for waitlist entries. ip_address is never exposed."""

    class Meta:
        model = WaitList
        fields = ("id", "email", "created_at")
        read_only_fields = ("id", "created_at")


# ─────────────────────────────────────────────
# PASSWORD
# ─────────────────────────────────────────────

class PasswordResetSerializer(serializers.Serializer):
    """For authenticated password change (requires current password)."""
    old_password = serializers.CharField(max_length=500, write_only=True)
    new_password = serializers.CharField(max_length=500, write_only=True)
    repeat_new_password = serializers.CharField(max_length=500, write_only=True)


class ResetPasswordAndSendEmailSerializer(serializers.Serializer):
    """Accepts an email to trigger a forgot-password flow."""
    email = serializers.EmailField()


class EmailOrPhoneSerializer(serializers.Serializer):
    """Accepts email or phone as a single unified field."""
    email_or_phone_number = EmailOrPhoneField(required=True)


class ResetForgottenPasswordSerializer(serializers.Serializer):
    """Completes a forgot-password reset using an OTP."""
    email_or_phone_number = EmailOrPhoneField(required=True)
    otp = serializers.CharField(required=True, write_only=True)
    password = serializers.CharField(required=True, write_only=True)
    repeat_password = serializers.CharField(required=True, write_only=True)


# ─────────────────────────────────────────────
# OTP VERIFICATION
# ─────────────────────────────────────────────

class EmailVerificationSerializer(serializers.Serializer):
    """Used for both sending and checking email OTPs. `otp` is optional on send."""
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=10, write_only=True, required=False)

    def validate_email(self, value: str) -> str:
        return value.strip().lower()


class PhoneVerificationSerializer(serializers.Serializer):
    """
    Used for both sending and checking phone OTPs. `otp` is optional on send.
    Region is intentionally not set here — enforced at the country level elsewhere.
    """
    phone_number = PhoneNumberField()
    otp = serializers.CharField(max_length=10, write_only=True, required=False)


# ─────────────────────────────────────────────
# 2FA
# ─────────────────────────────────────────────

class TFA_Serializer(serializers.Serializer):
    """Carries a TFA challenge token (used in the unauthenticated send-2fa-otp flow)."""
    tfa_token = serializers.CharField(max_length=200, write_only=True)


class TFA_OtpSerializer(serializers.Serializer):
    """
    Carries only the OTP code for the check-2fa-otp endpoint.
    Does NOT extend TFA_Serializer — check_2fa_otp requires IsAuthenticated,
    so the user is already identified via the session; no tfa_token is needed.
    """
    otp = serializers.CharField(max_length=10, write_only=True)


class BarcodeStuffSerializer(serializers.Serializer):
    """Input/output for the request_qr_code endpoint."""
    password = serializers.CharField(write_only=True)
    qrcode_uri = serializers.CharField(read_only=True)   # matches view response key
    image_url = serializers.CharField(read_only=True)


class ResetRecoveryCodesSerializer(serializers.Serializer):
    """Input for recovery code regeneration. Codes are write-once, read-never."""
    password = serializers.CharField(write_only=True)
    recovery_codes = serializers.ListField(
        child=serializers.CharField(), read_only=True
    )


class AuthLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(max_length=128, write_only=True)


class MFAChallengeSerializer(serializers.Serializer):
    mfa_session_token = serializers.CharField(max_length=255)
    selected_method = serializers.ChoiceField(
        choices=["totp", "sms", "email", "webauthn", "push"]
    )


class MFAVerifySerializer(serializers.Serializer):
    mfa_session_token = serializers.CharField(max_length=255)
    selected_method = serializers.ChoiceField(
        choices=["totp", "sms", "email", "webauthn", "push"]
    )
    otp = serializers.CharField(max_length=20, required=False, allow_blank=True)
    approval_code = serializers.CharField(max_length=20, required=False, allow_blank=True)
    challenge = serializers.CharField(max_length=5000, required=False, allow_blank=True)
    assertion = serializers.CharField(max_length=10000, required=False, allow_blank=True)


class MFATotpSetupSerializer(serializers.Serializer):
    password = serializers.CharField(max_length=500, write_only=True)


class MFATotpVerifySerializer(serializers.Serializer):
    otp = serializers.CharField(max_length=10, write_only=True)


class MFAWebAuthnSetupSerializer(serializers.Serializer):
    credential_id = serializers.CharField(max_length=2048)
    public_key = serializers.CharField(max_length=8192)
    sign_count = serializers.IntegerField(required=False, min_value=0, default=0)


class MFAWebAuthnVerifySerializer(serializers.Serializer):
    mfa_session_token = serializers.CharField(max_length=255)
    challenge = serializers.CharField(max_length=5000)
    assertion = serializers.CharField(max_length=10000)


class MFAPushDeviceSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=500)
    platform = serializers.ChoiceField(choices=["ios", "android", "web", "unknown"])


# ─────────────────────────────────────────────
# ONBOARDING
# ─────────────────────────────────────────────

class GetOboardingTokenSerializer(serializers.Serializer):
    """Authenticates a user who hasn't completed onboarding and returns a token."""
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(max_length=500, write_only=True)
    onboarding_token = serializers.CharField(max_length=500, read_only=True)


class Onboarding:
    """Namespace for onboarding-step serializers."""

    class UseOnboardingTokenSerializer(serializers.Serializer):
        onboarding_token = serializers.CharField(max_length=500, write_only=True)

    class ChangeBasicInfoSerializer(UseOnboardingTokenSerializer):
        first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
        last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
        password = serializers.CharField(max_length=500, write_only=True, required=False, allow_blank=True)

    class ChangeUserNameSerializer(UseOnboardingTokenSerializer):
        new_username = serializers.CharField(max_length=150, write_only=True, required=False, allow_blank=True)

    class ChangeProfilePictureSerializer(UseOnboardingTokenSerializer):

        @extend_schema_field(OpenApiTypes.BINARY)
        class ProfilePictureField(serializers.ImageField):
            pass

        profile_picture = ProfilePictureField(required=True)


# ─────────────────────────────────────────────
# OAUTH
# ─────────────────────────────────────────────

class OAuthCodeExchangeSerializer(serializers.Serializer):
    """Payload for provider authorization code exchange."""
    # input only
    code = serializers.CharField(max_length=4096, write_only=True)
    redirect_uri = serializers.URLField(required=False, allow_blank=True, write_only=True)
    state = serializers.CharField(max_length=1024, required=False, allow_blank=True, write_only=True)
    code_verifier = serializers.CharField(max_length=2048, required=False, allow_blank=True, write_only=True)

    def validate_code(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("code is required")
        return value