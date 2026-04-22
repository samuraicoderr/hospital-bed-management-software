import enum
import secrets
import datetime
import base64
import logging

import pyotp
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.db.models import F
from rest_framework.exceptions import ValidationError

from src.notifications.Notifier import NotifyUser
from .models import User, RecoveryCode
from .utils import generate_qrcode


OTP_EXPIRY_MINUTES = 10          # Raised from 5 — gives users reasonable time
MAX_TRIALS = 5                   # Raised from 3 — less aggressive, still safe
OTP_LOCKOUT_MINUTES = 15         # Lockout duration after MAX_TRIALS exceeded
MAX_SECURITY_CODES = 10

logger = logging.getLogger("app")


# ─────────────────────────────────────────────
# OTP TYPE ENUM
# ─────────────────────────────────────────────

class OtpType(str, enum.Enum):
    EMAIL_VERIFICATION = "email"
    PHONE_VERIFICATION = "phone"
    PASSWORD_RESET = "password_reset"
    TWO_FACTOR = "2fa"


# ─────────────────────────────────────────────
# OTP GENERATION
# ─────────────────────────────────────────────

def generate_random_otp(length: int = 6) -> str:
    """
    Generate a cryptographically secure numeric OTP of fixed length.
    Uses secrets.randbelow to avoid modulo bias.
    """
    return str(secrets.randbelow(10**length)).zfill(length)


# ─────────────────────────────────────────────
# OTP FIELD CONFIG
# Maps OtpType → field name prefixes on the User model.
# ─────────────────────────────────────────────

_OTP_FIELD_MAP: dict[OtpType, str] = {
    OtpType.EMAIL_VERIFICATION: "email",
    OtpType.PHONE_VERIFICATION: "phone",
    OtpType.PASSWORD_RESET: "password_reset",
}


# ─────────────────────────────────────────────
# USER SERVICE
# ─────────────────────────────────────────────

class UserService:

    # ── Internal helpers ──────────────────────

    @staticmethod
    def _get_otp_field_prefix(otp_type: OtpType) -> str:
        """Return the model field prefix for a given OTP type. Raises for TOTP types."""
        prefix = _OTP_FIELD_MAP.get(otp_type)
        if not prefix:
            raise ValueError(f"OTP type '{otp_type}' does not use stored OTP fields.")
        return prefix

    @staticmethod
    def _is_otp_locked(user: User, prefix: str) -> bool:
        """Return True if OTP is currently locked out."""
        locked_until = getattr(user, f"{prefix}_otp_locked_until", None)
        return bool(locked_until and timezone.now() < locked_until)

    @staticmethod
    def _is_otp_expired(user: User, prefix: str) -> bool:
        """Return True if the stored OTP has passed its expiry."""
        expires_at = getattr(user, f"{prefix}_otp_expires_at", None)
        return not expires_at or timezone.now() > expires_at

    @staticmethod
    def _trials_exceeded(user: User, prefix: str) -> bool:
        trials = getattr(user, f"{prefix}_otp_trials", 0)
        return trials >= MAX_TRIALS

    # ── Email utility ─────────────────────────

    @staticmethod
    def get_secret_as_barcode_text(user: User, secret: str) -> str:
        """
        Generate a QR code for TOTP enrollment and email it to the user.
        The barcode is returned as a base64 string for the frontend as well.
        NOTE: Sending secrets over email is inherently less secure than
        showing the QR only in the authenticated UI. Use only at initial enrollment.
        """
        from src.common.clients import zeptomail  # local import to avoid circular deps

        buf = generate_qrcode(secret)
        barcode_text = base64.b64encode(buf.getvalue()).decode()
        return barcode_text

    # ── Send OTP ──────────────────────────────

    @classmethod
    def send_user_otp(
        cls,
        user: User,
        otp_type: OtpType = OtpType.EMAIL_VERIFICATION,
        preferred_channel: str = "email",
        sendit: bool = True,
    ) -> str:
        """
        Generate, hash, store, and deliver an OTP to the user.

        - For EMAIL / PHONE / PASSWORD_RESET: generates a random numeric OTP,
          hashes it with PBKDF2, stores the hash, and sends the plaintext OTP
          via the appropriate channel.
        - For TWO_FACTOR: reads the existing TOTP secret and sends the current
          time-based code (app-based TOTP flow).

        Returns the plaintext OTP (for testing/logging in dev only — do NOT
        log or return this in production API responses).
        """
        if otp_type == OtpType.TWO_FACTOR:
            return cls._send_totp(user, sendit=sendit)

        prefix = cls._get_otp_field_prefix(otp_type)
        otp = generate_random_otp()

        with transaction.atomic():
            # Atomically reset the OTP fields to prevent partial state
            user = User.objects.select_for_update().get(pk=user.pk)
            user.set_otp(prefix, otp, ttl_seconds=OTP_EXPIRY_MINUTES * 60)

        if not sendit:
            return otp

        # Dispatch notification outside of the transaction to avoid
        # rollback causing a sent OTP with no stored hash.
        cls._dispatch_otp_notification(user, otp_type, otp, preferred_channel)
        return otp

    @staticmethod
    def _send_totp(user: User, sendit: bool = True) -> str:
        """Send the current TOTP value for 2FA. Resets trial counter."""
        secret = user.two_factor_otp_secret
        if not secret:
            raise ValidationError({"error": "Two-factor authentication is not configured."})

        totp = pyotp.TOTP(secret)
        otp = totp.now()

        User.objects.filter(pk=user.pk).update(two_factor_otp_trials=0)

        if sendit:
            NotifyUser(user).send_2fa_otp(otp)

        return otp

    @staticmethod
    def _dispatch_otp_notification(
        user: User, otp_type: OtpType, otp: str, preferred_channel: str
    ) -> None:
        """Route OTP notification to the appropriate channel."""
        try:
            if otp_type == OtpType.EMAIL_VERIFICATION:
                NotifyUser(user).send_email_verification_otp(otp)
            elif otp_type == OtpType.PHONE_VERIFICATION:
                NotifyUser(user).send_phone_verification_otp(otp)
            elif otp_type == OtpType.PASSWORD_RESET:
                if preferred_channel not in ("email", "phone"):
                    raise ValueError(f"Invalid preferred_channel: '{preferred_channel}'")
                NotifyUser(user).send_password_reset_otp(otp, preferred_channel=preferred_channel)
        except Exception:
            # Log but do not crash — the OTP is stored; the user can request a resend.
            logger.exception(
                "Failed to dispatch OTP notification for user %s type %s", user.pk, otp_type
            )

    # ── Verify OTP ────────────────────────────

    @classmethod
    def verify_user_otp(
        cls,
        user: User,
        otp: str,
        otp_type: OtpType = OtpType.EMAIL_VERIFICATION,
    ) -> bool:
        """
        Verify an OTP for the given type.

        - Checks lockout, expiry, and trial limits before comparing.
        - Increments trials atomically on failure (prevents race conditions).
        - Clears the OTP fields on success.
        - Raises ValidationError with a safe message on all failure modes.
        - Returns True on success.

        For TWO_FACTOR, delegates to TOTP verification.
        """
        if otp_type == OtpType.TWO_FACTOR:
            return cls._verify_totp(user, otp)

        prefix = cls._get_otp_field_prefix(otp_type)

        with transaction.atomic():
            # Re-fetch with row lock to prevent concurrent trial bypass
            user = User.objects.select_for_update().get(pk=user.pk)

            cls._assert_otp_preconditions(user, otp_type, prefix)

            stored_hash = getattr(user, f"{prefix}_otp_hash")
            if not stored_hash:
                raise ValidationError({"error": "No active OTP found. Please request a new one."})

            if not check_password(otp, stored_hash):
                cls._record_failed_attempt(user, prefix)
                # Return False rather than raising — lets caller decide response shape.
                # Trials-exceeded case raises inside _record_failed_attempt.
                return False

            # ── Success path ──────────────────
            cls._clear_otp_fields(user, prefix)
            cls._on_otp_verified(user, otp_type)
            return True

    @staticmethod
    def _assert_otp_preconditions(user: User, otp_type: OtpType, prefix: str) -> None:
        """
        Raise ValidationError if the OTP cannot be accepted.
        All errors use generic messages to avoid information leakage.
        """
        if UserService._is_otp_locked(user, prefix):
            raise ValidationError({
                "error": "Too many attempts. Please wait before trying again."
            })

        if UserService._is_otp_expired(user, prefix):
            raise ValidationError({"error": "OTP has expired. Please request a new one."})

        if UserService._trials_exceeded(user, prefix):
            raise ValidationError({
                "error": "Too many attempts. Please request a new OTP."
            })

        # Type-specific pre-checks
        if otp_type == OtpType.EMAIL_VERIFICATION and user.is_email_verified:
            raise ValidationError({"error": "Email is already verified."})

        if otp_type == OtpType.PHONE_VERIFICATION and user.is_phone_number_verified:
            raise ValidationError({"error": "Phone number is already verified."})

    @staticmethod
    def _record_failed_attempt(user: User, prefix: str) -> None:
        """
        Atomically increment trial counter.
        If MAX_TRIALS is now reached, set a lockout timestamp.
        """
        User.objects.filter(pk=user.pk).update(
            **{f"{prefix}_otp_trials": F(f"{prefix}_otp_trials") + 1}
        )
        # Re-fetch to get updated trial count for lockout decision
        updated_trials = (
            User.objects.filter(pk=user.pk)
            .values_list(f"{prefix}_otp_trials", flat=True)
            .first()
        )
        if updated_trials is not None and updated_trials >= MAX_TRIALS:
            lockout_until = timezone.now() + datetime.timedelta(minutes=OTP_LOCKOUT_MINUTES)
            User.objects.filter(pk=user.pk).update(
                **{f"{prefix}_otp_locked_until": lockout_until}
            )
            raise ValidationError({
                "error": f"Too many failed attempts. Please try again in {OTP_LOCKOUT_MINUTES} minutes."
            })

    @staticmethod
    def _clear_otp_fields(user: User, prefix: str) -> None:
        """Zero out all OTP fields for the given prefix after successful verification."""
        User.objects.filter(pk=user.pk).update(**{
            f"{prefix}_otp_hash": None,
            f"{prefix}_otp_trials": 0,
            f"{prefix}_otp_expires_at": None,
            f"{prefix}_otp_locked_until": None,
        })

    @staticmethod
    def _on_otp_verified(user: User, otp_type: OtpType) -> None:
        """
        Side effects triggered on successful OTP verification.
        Each action uses update_fields to minimise DB writes and avoid clobbering
        concurrent field updates.
        """
        if otp_type == OtpType.EMAIL_VERIFICATION:
            User.objects.filter(pk=user.pk).update(is_email_verified=True)
            # Refresh and attempt tier upgrade
            user.refresh_from_db()

        elif otp_type == OtpType.PHONE_VERIFICATION:
            User.objects.filter(pk=user.pk).update(is_phone_number_verified=True)
            user.refresh_from_db()

        # PASSWORD_RESET: no additional field changes needed here —
        # the caller is responsible for accepting the new password.

    # ── TOTP (2FA) Verification ───────────────

    @staticmethod
    def _verify_totp(user: User, otp: str) -> bool:
        """
        Verify a TOTP code with a ±1 window (handles minor clock drift).
        Increments trial counter on failure.
        Does NOT lock out on excessive trials here — that should be enforced
        at the view layer with IP-based rate limiting, since TOTP codes rotate
        every 30 seconds and self-expire.
        """
        if not user.two_factor_otp_secret:
            raise ValidationError({"error": "Two-factor authentication is not configured."})

        if user.two_factor_otp_trials >= MAX_TRIALS:
            raise ValidationError({
                "error": "Too many 2FA attempts. Please use a recovery code or contact support."
            })

        is_valid = pyotp.TOTP(user.two_factor_otp_secret).verify(otp, valid_window=1)

        if not is_valid:
            User.objects.filter(pk=user.pk).update(
                two_factor_otp_trials=F("two_factor_otp_trials") + 1
            )
            return False

        # Reset trial counter on success
        User.objects.filter(pk=user.pk).update(two_factor_otp_trials=0)
        return True

    # ── Recovery Codes ────────────────────────

    @classmethod
    def reset_recovery_codes(cls, user: User) -> list[str]:
        """
        Atomically delete and regenerate all recovery codes for the user.
        Returns the plaintext codes — these must be shown to the user ONCE
        and never stored or logged.
        """
        code_list = RecoveryCode.reset_codes(user, count=MAX_SECURITY_CODES)
        logger.info("Recovery codes regenerated for user %s", user.pk)
        return code_list

    @classmethod
    def verify_recovery_code(cls, user: User, code: str) -> bool:
        """
        Verify and burn a single recovery code.
        Returns True if valid, False otherwise.
        Wraps RecoveryCode.verify_code which uses select_for_update internally.
        """
        result = RecoveryCode.verify_code(user, code)
        if result:
            logger.info("Recovery code used for user %s", user.pk)
        else:
            logger.warning("Invalid recovery code attempt for user %s", user.pk)
        return result