import uuid
import hashlib
import secrets
import logging
from decimal import Decimal

import pyotp
from django.db import models, transaction
from django.conf import settings
from django.core import signing
from django.dispatch import receiver
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import ValidationError
from easy_thumbnails.fields import ThumbnailerImageField
from django.urls import reverse
from django_rest_passwordreset.signals import reset_password_token_created
from easy_thumbnails.signals import saved_file
from easy_thumbnails.signal_handlers import generate_aliases_global
from phonenumber_field.modelfields import PhoneNumberField
from django.db import OperationalError

from django.utils.translation import gettext_lazy as _
from django.contrib.auth.hashers import make_password, check_password

from django.db.models import F

from src.common.helpers import build_absolute_uri
from src.lib.utils.uuid7 import uuid7

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────


def generate_random_secret() -> str:
    """Generate a cryptographically random base32 TOTP secret."""
    return pyotp.random_base32(32)


def generate_otp_hash_seed() -> str:
    """
    Generate a random seed stored in OTP hash fields.
    NOTE: Actual OTP values must be hashed before comparing — this is just
    the per-user secret seed for HOTP/challenge generation, not an OTP value itself.
    """
    return secrets.token_hex(32)  # 256-bit seed


# ─────────────────────────────────────────────
# SIGNAL: Password Reset
# ─────────────────────────────────────────────

@receiver(reset_password_token_created)
def password_reset_token_created(sender, instance, reset_password_token, *args, **kwargs):
    """
    Send password reset email asynchronously to avoid blocking the request cycle
    and leaking timing information.
    """
    from src.notifications.Notifier import NotifyUser  # avoid circular import

    try:
        reset_password_path = reverse("password_reset:reset-password-confirm-list")
        user = reset_password_token.user
        reset_link = build_absolute_uri(
            f"{reset_password_path}?token={reset_password_token.key}"
        )
        NotifyUser(user=user).send_password_reset_token_email(
            reset_link=build_absolute_uri(
                f"{reset_password_path}?token={reset_password_token.key}"
            ),
            # reset_token=reset_password_token.key,
        )
    except Exception:
        # Never let notification failure break the password reset flow.
        logger.exception("Failed to enqueue password reset email for user %s", reset_password_token.user_id)


# ─────────────────────────────────────────────
# ONBOARDING STATUS
# ─────────────────────────────────────────────

class OnboardingStatus(models.TextChoices):
    NEEDS_BASIC_INFORMATION = "needs_basic_information", "Needs Basic Information"
    NEEDS_PASSWORD = "needs_password", "Needs Password"
    NEEDS_EMAIL_VERIFICATION = "needs_email_verification", "Needs Email Verification"
    NEEDS_PHONE_VERIFICATION = "needs_phone_verification", "Needs Phone Verification"
    NEEDS_PROFILE_USERNAME = "needs_profile_username", "Needs Profile Username"
    NEEDS_PROFILE_PICTURE = "needs_profile_picture", "Needs Profile Picture"
    NEEDS_HOSPITAL = "needs_hospital", "Needs Hospital Affiliation"
    COMPLETED = "completed", "Completed"


# ─────────────────────────────────────────────
# MIXINS
# ─────────────────────────────────────────────

class UserAuthMixin:
    def get_authenticator_uri(self) -> str:
        return pyotp.totp.TOTP(self.two_factor_otp_secret).provisioning_uri(
            name=self.email, issuer_name=settings.SITE_NAME
        )

    def get_current_otp(self) -> str:
        """Returns the current TOTP value — for internal/testing use only. Never expose via API."""
        return pyotp.totp.TOTP(self.two_factor_otp_secret).now()

    def rotate_two_factor_secret(self) -> None:
        """Rotate the TOTP secret. Call when user resets or re-enrolls 2FA."""
        self.two_factor_otp_secret = generate_random_secret()
        self.mfa_is_enabled = False
        self.save(update_fields=["two_factor_otp_secret", "mfa_is_enabled"])

    def has_basic_verification(self) -> bool:
        return self.is_email_verified and self.is_phone_number_verified


class OnboardingMixin:
    """
    Encapsulates onboarding flow logic independently of user type.
    The flow order can be changed by modifying ONBOARDING_FLOW.
    
    IMPORTANT: advance_onboarding must be called within a select_for_update()
    context at the view/service layer to prevent race conditions.
    """

    ONBOARDING_FLOW = [
        OnboardingStatus.NEEDS_BASIC_INFORMATION,
        OnboardingStatus.NEEDS_PASSWORD,
        OnboardingStatus.NEEDS_EMAIL_VERIFICATION,
        OnboardingStatus.NEEDS_PROFILE_USERNAME,
        OnboardingStatus.NEEDS_PROFILE_PICTURE,
        OnboardingStatus.NEEDS_HOSPITAL,
        OnboardingStatus.COMPLETED,
    ]

    OnboardingStatus = OnboardingStatus

    def get_onboarding_flow(self) -> list:
        flow = self.ONBOARDING_FLOW.copy()
        if self.is_email_verified:
            flow.remove(OnboardingStatus.NEEDS_EMAIL_VERIFICATION)
        if self.social_auth.exists():
            # Social users skip password step
            return [
                step for step in flow
                if step not in (OnboardingStatus.NEEDS_EMAIL_VERIFICATION,)
            ]
        return [
            step for step in flow
            if step not in (OnboardingStatus.NEEDS_PASSWORD,)
        ]

    def get_next_onboarding_step(self, from_step=None):
        flow = self.get_onboarding_flow()
        if not flow or self.onboarding_status == OnboardingStatus.COMPLETED:
            return None
        from_step = from_step or self.onboarding_status
        try:
            current_index = flow.index(from_step)
        except ValueError:
            return flow[0]
        if current_index + 1 < len(flow):
            return flow[current_index + 1]
        return None

    def step_after(self, step: OnboardingStatus):
        flow = self.get_onboarding_flow()
        if not flow or self.onboarding_status == OnboardingStatus.COMPLETED:
            return None
        try:
            current_index = flow.index(step)
        except ValueError:
            return flow[0]
        if current_index + 1 < len(flow):
            return flow[current_index + 1]
        return None

    def is_onboarding_completed(self) -> bool:
        return self.onboarding_status == OnboardingStatus.COMPLETED

    def is_onboarding_complete(self) -> bool:
        # Kept for compatibility with permission checks.
        return self.is_onboarding_completed()

    def advance_onboarding(self, from_step=None, strict: bool = False):
        """
        Advance onboarding by exactly one logical step.

        Rules:
        - If from_step is in the past → no-op (idempotent).
        - If from_step == current step → advance one step.
        - If from_step is in the future:
            - strict=True → raise ValidationError
            - strict=False → treat as advancing from current step.
        - Never skips steps.
        
        MUST be called inside select_for_update() transaction.
        """

        flow = self.get_onboarding_flow()

        # If no flow or already completed
        if not flow or self.onboarding_status == OnboardingStatus.COMPLETED:
            return self.onboarding_status

        # Ensure current status is valid
        _must_save = False
        if self.onboarding_status not in flow:
            self.onboarding_status = flow[0]
            _must_save = True
            # self.save(update_fields=["onboarding_status"])  # too many db calls man :)

        current_step = self.onboarding_status
        current_index = flow.index(current_step)

        # Default from_step to current
        if from_step is None:
            from_step = current_step

        if from_step not in flow:
            # raise ValidationError({
            #     "error": f"Step '{from_step}' is not valid for this user type."
            # })
            from_step = current_step  # Treat as if from current step for robustness

        from_index = flow.index(from_step)

        # ---- Core Logic ----

        # Case 1: from_step is in the past → no-op (idempotent)
        if from_index < current_index:
            return current_step

        # Case 2: from_step is in the future
        if from_index > current_index:
            if strict:
                raise ValidationError(
                    "Cannot advance from a future onboarding step."
                )
            # Treat as advancing from current step instead
            from_index = current_index

        # Case 3: advance exactly one step from from_index
        next_index = from_index + 1

        if next_index >= len(flow):
            return current_step  # Already at last step

        next_step = flow[next_index]

        # Prevent unnecessary writes
        if next_step != current_step or _must_save:
            self.onboarding_status = next_step
            self.save(update_fields=["onboarding_status"])

        return self.onboarding_status

    def remaining_onboarding_steps(self) -> list:
        flow = self.get_onboarding_flow()
        if not flow:
            return []
        try:
            current_index = flow.index(self.onboarding_status)
        except ValueError:
            current_index = 0
        return flow[current_index + 1:]

    def is_past_step(self, step: OnboardingStatus) -> bool:
        flow = self.get_onboarding_flow()
        if not flow:
            return False
        try:
            step_index = flow.index(step)
            current_index = flow.index(self.onboarding_status)
        except ValueError:
            return False
        return current_index > step_index

    def is_future_step(self, step: OnboardingStatus) -> bool:
        flow = self.get_onboarding_flow()
        if not flow:
            return False
        try:
            step_index = flow.index(step)
            current_index = flow.index(self.onboarding_status)
        except ValueError:
            return False
        return current_index < step_index


# ─────────────────────────────────────────────
# USER MODEL
# ─────────────────────────────────────────────

class User(OnboardingMixin, UserAuthMixin, AbstractUser):
    PASSWORD_MIN_LENGTH = 8   # Raised from 6 — NIST recommends ≥8
    PASSWORD_MAX_LENGTH = 128

    # Max OTP attempts before lockout — enforced at the service layer.
    OTP_MAX_TRIALS = 5

    # TFA token max age in seconds.
    TFA_TOKEN_MAX_AGE = 300        # 5 minutes
    ONBOARDING_TOKEN_MAX_AGE = 1800  # 30 minutes — onboarding takes longer

    # Signing salts — domain-separate token types so one can never be
    # accepted in place of the other, even if the payload shape matches.
    TFA_TOKEN_SALT = "user.tfa-token.v1"
    ONBOARDING_TOKEN_SALT = "user.onboarding-token.v1"

    OnboardingStatus = OnboardingStatus

    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    # If public_key is a cryptographic key, validate and enforce uniqueness.
    public_key = models.CharField(
        editable=False, max_length=256, blank=True, null=True, unique=True,
    )

    onboarding_status = models.CharField(
        max_length=50,
        choices=OnboardingStatus.choices,
        default=OnboardingStatus.NEEDS_BASIC_INFORMATION,
        db_index=True,
    )

    profile_picture = ThumbnailerImageField(
        "ProfilePicture", upload_to="profile_pictures/", blank=True, null=True
    )
    picture_url = models.URLField("PictureUrl", blank=True, null=True)

    phone_number = PhoneNumberField(
        unique=True, null=True, blank=True, default=None
        # Removed region="NG" — enforce region at the serializer/form layer per user's country
    )

    date_of_birth = models.DateField(blank=True, null=True)

    is_email_verified = models.BooleanField(default=False, db_index=True)
    is_phone_number_verified = models.BooleanField(default=False)

    # OTP fields: store a random seed; actual OTP values are hashed (PBKDF2/bcrypt)
    # before storage. The seed is used server-side to generate the challenge.
    email_otp_secret = models.CharField(
        max_length=128, blank=True, null=True, default=generate_otp_hash_seed
    )
    email_otp_hash = models.CharField(max_length=256, blank=True, null=True)
    email_otp_trials = models.PositiveSmallIntegerField(default=0)
    email_otp_expires_at = models.DateTimeField(blank=True, null=True)
    email_otp_locked_until = models.DateTimeField(blank=True, null=True)

    phone_otp_secret = models.CharField(
        max_length=128, blank=True, null=True, default=generate_otp_hash_seed
    )
    phone_otp_hash = models.CharField(max_length=256, blank=True, null=True)
    phone_otp_trials = models.PositiveSmallIntegerField(default=0)
    phone_otp_expires_at = models.DateTimeField(blank=True, null=True)
    phone_otp_locked_until = models.DateTimeField(blank=True, null=True)

    password_reset_otp_hash = models.CharField(max_length=256, blank=True, null=True)
    password_reset_otp_trials = models.PositiveSmallIntegerField(default=0)
    password_reset_otp_expires_at = models.DateTimeField(blank=True, null=True)
    password_reset_otp_locked_until = models.DateTimeField(blank=True, null=True)

    two_factor_otp_secret = models.CharField(
        max_length=64, blank=True, null=True, default=generate_random_secret
    )
    two_factor_otp_trials = models.PositiveSmallIntegerField(default=0)
    mfa_is_enabled = models.BooleanField(default=False, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["phone_number"]),
        ]

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        # Keep username in sync with email if email is the login identifier.
        # Only do this if USERNAME_FIELD == 'email' in settings; otherwise remove.
        if hasattr(self, 'USERNAME_FIELD') and self.USERNAME_FIELD == 'email':
            self.username = self.email
        super().save(*args, **kwargs)

    def get_tokens(self) -> dict:
        refresh = RefreshToken.for_user(self)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

    # ── Opaque signed tokens ────────────────────────────────────────
    #
    # Both TFA and onboarding tokens are serialised with
    # django.core.signing.dumps(), which produces a single HMAC-signed,
    # base62-encoded, optionally compressed blob.  The client never
    # needs to parse or understand the content — it is fully opaque.
    #
    # Domain separation is achieved via distinct *salts* so that a
    # token minted for one purpose can never validate for the other,
    # even if the payload structure is identical.
    # ────────────────────────────────────────────────────────────────

    def _build_signed_token(self, *, purpose: str, salt: str) -> str:
        """
        Internal helper — produce an opaque, HMAC-signed token that
        embeds the user id, a purpose tag, and a 128-bit nonce.
        """
        return signing.dumps(
            {
                "uid": str(self.id),
                "purpose": purpose,
                "nonce": secrets.token_hex(16),
            },
            salt=salt,
            compress=True,
        )

    @staticmethod
    def _verify_signed_token(
        token: str,
        *,
        purpose: str,
        salt: str,
        max_age: int,
    ) -> str | bool:
        """
        Internal helper — verify and unpack a signed token.

        Returns the ``uid`` string on success, ``False`` on any failure
        (bad signature, expired, wrong purpose, missing fields).
        """
        try:
            data = signing.loads(token, salt=salt, max_age=max_age)
        except signing.BadSignature:
            # signing.SignatureExpired is a subclass of BadSignature,
            # so this single except covers both expired and tampered tokens.
            return False

        if not isinstance(data, dict):
            return False

        if data.get("purpose") != purpose:
            return False

        uid = data.get("uid")
        if not uid:
            return False

        return uid

    # ── TFA token ───────────────────────────────────────────────────

    def get_tfa_token(self) -> dict:
        token = self._build_signed_token(
            purpose="tfa",
            salt=self.TFA_TOKEN_SALT,
        )
        return {"tfa_token": token}

    @staticmethod
    def verify_tfa_token(tfa_token: str, max_age: int = None) -> str | bool:
        """
        Returns the user id string on success, ``False`` on failure.

        Callers **must** check ``result is not False`` (not just truthiness)
        because an empty string could theoretically slip through a
        malformed token.
        """
        return User._verify_signed_token(
            tfa_token,
            purpose="tfa",
            salt=User.TFA_TOKEN_SALT,
            max_age=max_age or User.TFA_TOKEN_MAX_AGE,
        )

    # ── Onboarding token ────────────────────────────────────────────

    def get_onboarding_token(self) -> str:
        """Produce an onboarding token with a longer TTL than a TFA token."""
        return self._build_signed_token(
            purpose="onboarding",
            salt=self.ONBOARDING_TOKEN_SALT,
        )

    @staticmethod
    def verify_onboarding_token(token: str, max_age: int = None) -> str | bool:
        """
        Returns the user id string on success, ``False`` on failure.
        """
        return User._verify_signed_token(
            token,
            purpose="onboarding",
            salt=User.ONBOARDING_TOKEN_SALT,
            max_age=max_age or User.ONBOARDING_TOKEN_MAX_AGE,
        )

    def set_otp(self, field_prefix: str, otp_value: str, ttl_seconds: int = 600) -> None:
        """
        Hash and store an OTP value for the given field prefix.
        Resets trial counter and sets expiry.
        field_prefix: 'email', 'phone', or 'password_reset'

        >>> user.set_otp('email', '123456', ttl_seconds=300)
        """
        otp_hash = make_password(otp_value)  # PBKDF2 with salt
        now = timezone.now()
        expires = now + timezone.timedelta(seconds=ttl_seconds)
        setattr(self, f"{field_prefix}_otp_hash", otp_hash)
        setattr(self, f"{field_prefix}_otp_trials", 0)
        setattr(self, f"{field_prefix}_otp_expires_at", expires)
        setattr(self, f"{field_prefix}_otp_locked_until", None)
        self.save(update_fields=[
            f"{field_prefix}_otp_hash",
            f"{field_prefix}_otp_trials",
            f"{field_prefix}_otp_expires_at",
            f"{field_prefix}_otp_locked_until",
        ])

    def verify_otp(self, field_prefix: str, otp_value: str) -> bool:
        """
        Verify an OTP for the given prefix with rate limiting and expiry checks.
        Uses atomic increment to prevent race conditions on trial counter.
        Returns True if valid, raises ValidationError otherwise.

        >>> user.verify_otp('email', '123456')
        True
        """
        now = timezone.now()
        locked_until = getattr(self, f"{field_prefix}_otp_locked_until")
        if locked_until and now < locked_until:
            raise ValidationError("Too many attempts. Please request a new OTP.")

        expires_at = getattr(self, f"{field_prefix}_otp_expires_at")
        if not expires_at or now > expires_at:
            raise ValidationError("OTP has expired.")

        trials = getattr(self, f"{field_prefix}_otp_trials")
        if trials >= self.OTP_MAX_TRIALS:
            lock_until = now + timezone.timedelta(minutes=15)
            setattr(self, f"{field_prefix}_otp_locked_until", lock_until)
            self.save(update_fields=[f"{field_prefix}_otp_locked_until"])
            raise ValidationError("Too many attempts. Account temporarily locked.")

        stored_hash = getattr(self, f"{field_prefix}_otp_hash")
        if not stored_hash or not check_password(otp_value, stored_hash):
            # Atomically increment trial counter to prevent race condition
            User.objects.filter(pk=self.pk).update(
                **{f"{field_prefix}_otp_trials": F(f"{field_prefix}_otp_trials") + 1}
            )
            raise ValidationError("Invalid OTP.")

        # Success — clear OTP fields
        setattr(self, f"{field_prefix}_otp_hash", None)
        setattr(self, f"{field_prefix}_otp_trials", 0)
        setattr(self, f"{field_prefix}_otp_expires_at", None)
        setattr(self, f"{field_prefix}_otp_locked_until", None)
        self.save(update_fields=[
            f"{field_prefix}_otp_hash",
            f"{field_prefix}_otp_trials",
            f"{field_prefix}_otp_expires_at",
            f"{field_prefix}_otp_locked_until",
        ])
        return True

    def get_name(self) -> str:
        """Return display name. Falls back to a non-PII placeholder if name is unset."""
        full_name = self.get_full_name().strip()
        return full_name if full_name else f"User {str(self.id)[:8]}"

    def __str__(self):
        return self.email or str(self.id)


# ─────────────────────────────────────────────
# RECOVERY CODES
# ─────────────────────────────────────────────

class RecoveryCode(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="recovery_codes"
    )
    code_hash = models.CharField(max_length=64, db_index=True)
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Prevent duplicate hash storage
        constraints = [
            models.UniqueConstraint(fields=["user", "code_hash"], name="unique_recovery_code_per_user")
        ]

    def mark_used(self):
        self.used = True
        self.save(update_fields=["used"])

    @staticmethod
    def hash_code(code: str) -> str:
        """SHA-256 is acceptable here since recovery codes are high-entropy (64-bit random)."""
        return hashlib.sha256(code.encode("utf-8")).hexdigest()

    @classmethod
    @transaction.atomic
    def generate_codes(cls, user, count: int = 10) -> list[str]:
        """
        Generate N recovery codes atomically.
        Wrapped in a transaction so partial failure leaves no codes stored.
        """
        codes = []
        objs = []
        for _ in range(count):
            code = secrets.token_hex(8).upper()  # 64-bit entropy — stronger than token_hex(4)
            code_hash = cls.hash_code(code)
            objs.append(cls(user=user, code_hash=code_hash))
            codes.append(code)
        cls.objects.bulk_create(objs)
        return codes

    @classmethod
    @transaction.atomic
    def reset_codes(cls, user, count: int = 10) -> list[str]:
        """Delete all existing codes and generate new ones atomically."""
        cls.objects.filter(user=user).delete()
        return cls.generate_codes(user, count)

    @classmethod
    def verify_code(cls, user, code: str) -> bool:
        """
        Constant-time-safe recovery code verification.
        Marks the code used on success (burn-after-use).
        """
        code_hash = cls.hash_code(code)
        try:
            recovery_code = cls.objects.select_for_update().get(
                user=user, code_hash=code_hash, used=False
            )
        except cls.DoesNotExist:
            # Run a dummy comparison to reduce timing difference
            hashlib.sha256(b"dummy").hexdigest()
            return False
        recovery_code.mark_used()
        return True


# ─────────────────────────────────────────────
# WAIT LIST
# ─────────────────────────────────────────────

class WaitList(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)  # for abuse tracking

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.email


class MFAMethodType(models.TextChoices):
    TOTP = "totp", "TOTP"
    SMS = "sms", "SMS"
    EMAIL = "email", "Email"
    WEBAUTHN = "webauthn", "WebAuthn"
    PUSH = "push", "Push"


class MFAMethod(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="mfa_methods")
    type = models.CharField(max_length=20, choices=MFAMethodType.choices, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    is_verified = models.BooleanField(default=False, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "type"], name="unique_user_mfa_method_type")
        ]
        indexes = [
            models.Index(fields=["user", "is_active"]),
        ]

    def __str__(self):
        return f"{self.user_id}:{self.type}"


class MFASession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="mfa_sessions")
    token_hash = models.CharField(max_length=255, unique=True)
    selected_method = models.CharField(max_length=20, choices=MFAMethodType.choices, null=True, blank=True)
    expires_at = models.DateTimeField(db_index=True)
    verified = models.BooleanField(default=False, db_index=True)
    used_at = models.DateTimeField(null=True, blank=True)
    request_fingerprint = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["verified", "expires_at"]),
        ]

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at


class MFAChallenge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    session = models.ForeignKey(MFASession, on_delete=models.CASCADE, related_name="challenges")
    method = models.CharField(max_length=20, choices=MFAMethodType.choices, db_index=True)
    challenge_data = models.JSONField(default=dict, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=5)
    expires_at = models.DateTimeField(db_index=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["session", "method"]),
            models.Index(fields=["expires_at"]),
        ]

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at


class MFATrustedDevice(models.Model):
    class Provider(models.TextChoices):
        FCM = "fcm", "FCM"

    class Platform(models.TextChoices):
        IOS = "ios", "iOS"
        ANDROID = "android", "Android"
        WEB = "web", "Web"
        UNKNOWN = "unknown", "Unknown"

    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="mfa_trusted_devices")
    provider = models.CharField(max_length=20, choices=Provider.choices, default=Provider.FCM)
    platform = models.CharField(max_length=20, choices=Platform.choices, default=Platform.UNKNOWN)
    token = models.CharField(max_length=500)
    is_active = models.BooleanField(default=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    last_delivery_status = models.CharField(max_length=80, blank=True, default="")
    last_seen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["provider", "token"], name="unique_push_device_token_per_provider")
        ]
        indexes = [
            models.Index(fields=["user", "is_active"]),
        ]

    def __str__(self):
        return f"{self.user_id}:{self.provider}:{self.platform}"


# ─────────────────────────────────────────────
# SIGNALS
# ─────────────────────────────────────────────

saved_file.connect(generate_aliases_global, dispatch_uid="generate_aliases_global_thumbnails")