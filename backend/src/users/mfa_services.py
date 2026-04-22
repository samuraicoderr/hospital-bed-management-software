import datetime
import hashlib
import secrets

import pyotp
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed, ValidationError

from src.notifications.Notifier import NotifyUser
from src.users.models import (
    MFAChallenge,
    MFAMethod,
    MFAMethodType,
    MFASession,
    MFATrustedDevice,
    User,
)


MFA_SESSION_TTL_SECONDS = int(getattr(settings, "MFA_SESSION_TTL_SECONDS", 300))
MFA_CHALLENGE_TTL_SECONDS = int(getattr(settings, "MFA_CHALLENGE_TTL_SECONDS", 300))
MFA_MAX_ATTEMPTS = int(getattr(settings, "MFA_MAX_ATTEMPTS", 5))
MFA_PUSH_APPROVAL_CODE_LENGTH = int(getattr(settings, "MFA_PUSH_APPROVAL_CODE_LENGTH", 6))


class PushProvider:
    def send_challenge(self, *, user, devices, payload):
        raise NotImplementedError


class FCMPushProvider(PushProvider):
    def send_challenge(self, *, user, devices, payload):
        # Placeholder provider; mark bad tokens inactive when provider reports invalid-token.
        # Integrate real FCM transport here.
        invalid_device_ids = []
        for device in devices:
            device.last_delivery_status = "sent"
            device.save(update_fields=["last_delivery_status", "updated_at"])
        return {"sent": len(devices), "invalid_device_ids": invalid_device_ids}


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _make_request_fingerprint(request) -> str:
    if request is None:
        return ""
    ip = request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR", ""))
    if ip and "," in ip:
        ip = ip.split(",", 1)[0].strip()
    ua = request.META.get("HTTP_USER_AGENT", "")
    return _hash_token(f"{ip}|{ua}")


def _generate_numeric_code(length=6) -> str:
    return str(secrets.randbelow(10 ** length)).zfill(length)


def ensure_default_contact_methods(user: User):
    if user.is_email_verified:
        MFAMethod.objects.get_or_create(
            user=user,
            type=MFAMethodType.EMAIL,
            defaults={"is_active": True, "is_verified": True, "metadata": {}},
        )

    if user.is_phone_number_verified:
        MFAMethod.objects.get_or_create(
            user=user,
            type=MFAMethodType.SMS,
            defaults={"is_active": True, "is_verified": True, "metadata": {}},
        )


def ensure_totp_method_from_legacy(user: User):
    if not user.two_factor_otp_secret:
        return None

    method, _ = MFAMethod.objects.get_or_create(
        user=user,
        type=MFAMethodType.TOTP,
        defaults={
            "is_active": True,
            "is_verified": True,
            "metadata": {"secret": user.two_factor_otp_secret},
        },
    )

    if "secret" not in method.metadata:
        method.metadata = {**method.metadata, "secret": user.two_factor_otp_secret}
        method.save(update_fields=["metadata", "updated_at"])

    return method


def get_available_methods(user: User) -> list[str]:
    ensure_default_contact_methods(user)
    ensure_totp_method_from_legacy(user)

    method_types = list(
        MFAMethod.objects.filter(user=user, is_active=True, is_verified=True).values_list("type", flat=True)
    )

    has_active_push = MFATrustedDevice.objects.filter(user=user, is_active=True).exists()
    if has_active_push and MFAMethodType.PUSH not in method_types:
        method_types.append(MFAMethodType.PUSH)

    return sorted(set(method_types))


def create_mfa_session(*, user: User, request=None) -> tuple[str, MFASession, list[str]]:
    methods = get_available_methods(user)
    if not methods:
        raise ValidationError(
            {
                "error": "mfa_enabled_but_no_verified_methods",
                "details": "Add at least one active MFA method before login.",
            }
        )

    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    expires_at = timezone.now() + datetime.timedelta(seconds=MFA_SESSION_TTL_SECONDS)

    session = MFASession.objects.create(
        user=user,
        token_hash=token_hash,
        expires_at=expires_at,
        request_fingerprint=_make_request_fingerprint(request),
    )

    return raw_token, session, methods


def get_session_from_token(*, token: str, request=None) -> MFASession:
    session = MFASession.objects.select_related("user").filter(token_hash=_hash_token(token)).first()
    if not session:
        raise AuthenticationFailed("Invalid MFA session token.")

    if session.used_at or session.verified:
        raise AuthenticationFailed("MFA session token has already been used.")

    if session.is_expired():
        raise AuthenticationFailed("MFA session token expired.")

    expected_fp = session.request_fingerprint
    if request is not None and expected_fp and expected_fp != _make_request_fingerprint(request):
        raise AuthenticationFailed("MFA session does not match this client context.")

    return session


def _get_or_create_challenge(session: MFASession, method: str) -> MFAChallenge:
    now = timezone.now()
    challenge = (
        MFAChallenge.objects.filter(
            session=session,
            method=method,
            verified_at__isnull=True,
            expires_at__gt=now,
        )
        .order_by("-created_at")
        .first()
    )

    if challenge:
        return challenge

    return MFAChallenge.objects.create(
        session=session,
        method=method,
        expires_at=now + datetime.timedelta(seconds=MFA_CHALLENGE_TTL_SECONDS),
        max_attempts=MFA_MAX_ATTEMPTS,
    )


def begin_challenge(*, session: MFASession, method: str) -> dict:
    if method not in dict(MFAMethodType.choices):
        raise ValidationError({"selected_method": "Unsupported MFA method."})

    available = get_available_methods(session.user)
    if method not in available:
        raise ValidationError({"selected_method": "Method is not available for this user."})

    challenge = _get_or_create_challenge(session, method)
    session.selected_method = method
    session.save(update_fields=["selected_method"])

    if method == MFAMethodType.TOTP:
        return {
            "challenge_id": str(challenge.id),
            "selected_method": method,
            "expires_at": challenge.expires_at,
            "message": "Submit your authenticator code.",
        }

    if method in (MFAMethodType.EMAIL, MFAMethodType.SMS):
        otp = _generate_numeric_code(6)
        challenge.challenge_data = {
            "otp_hash": make_password(otp),
            "channel": method,
        }
        challenge.save(update_fields=["challenge_data"])

        if method == MFAMethodType.EMAIL:
            NotifyUser(session.user).send_2fa_otp(otp)
        else:
            NotifyUser(session.user).send_phone_verification_otp(otp)

        return {
            "challenge_id": str(challenge.id),
            "selected_method": method,
            "expires_at": challenge.expires_at,
            "message": f"OTP sent via {method}.",
        }

    if method == MFAMethodType.WEBAUTHN:
        # django-webauthn package is used in dependencies; this v1 implementation stores
        # a server-generated challenge that clients sign using their credential.
        webauthn_challenge = secrets.token_urlsafe(48)
        challenge.challenge_data = {
            "challenge": webauthn_challenge,
            "rp_id": getattr(settings, "MFA_WEBAUTHN_RP_ID", ""),
            "rp_name": getattr(settings, "MFA_WEBAUTHN_RP_NAME", ""),
            "origins": getattr(settings, "MFA_WEBAUTHN_ORIGINS", []),
        }
        challenge.save(update_fields=["challenge_data"])

        return {
            "challenge_id": str(challenge.id),
            "selected_method": method,
            "expires_at": challenge.expires_at,
            "public_key": {
                "challenge": webauthn_challenge,
                "rpId": challenge.challenge_data["rp_id"],
                "timeout": MFA_CHALLENGE_TTL_SECONDS * 1000,
            },
        }

    if method == MFAMethodType.PUSH:
        approval_code = _generate_numeric_code(MFA_PUSH_APPROVAL_CODE_LENGTH)
        challenge.challenge_data = {
            "approval_code_hash": make_password(approval_code),
        }
        challenge.save(update_fields=["challenge_data"])

        devices = list(MFATrustedDevice.objects.filter(user=session.user, is_active=True))
        provider = FCMPushProvider()
        payload = {
            "challenge_id": str(challenge.id),
            "approval_code": approval_code,
            "message": "Approve login request",
        }
        provider_result = provider.send_challenge(user=session.user, devices=devices, payload=payload)

        invalid_ids = provider_result.get("invalid_device_ids", [])
        if invalid_ids:
            MFATrustedDevice.objects.filter(id__in=invalid_ids).update(is_active=False, last_delivery_status="invalid_token")

        return {
            "challenge_id": str(challenge.id),
            "selected_method": method,
            "expires_at": challenge.expires_at,
            "message": "Push challenge sent to trusted devices.",
        }

    raise ValidationError({"selected_method": "Unsupported MFA method."})


def _consume_failed_attempt(challenge: MFAChallenge):
    challenge.attempts += 1
    challenge.save(update_fields=["attempts"])
    if challenge.attempts >= challenge.max_attempts:
        raise AuthenticationFailed("Maximum MFA attempts exceeded for this challenge.")


def verify_challenge(*, session: MFASession, method: str, payload: dict) -> bool:
    challenge = (
        MFAChallenge.objects.filter(
            session=session,
            method=method,
            verified_at__isnull=True,
        )
        .order_by("-created_at")
        .first()
    )

    if not challenge:
        raise ValidationError({"challenge": "No active challenge found. Start a new challenge."})

    if challenge.is_expired():
        raise AuthenticationFailed("MFA challenge expired.")

    if challenge.attempts >= challenge.max_attempts:
        raise AuthenticationFailed("Maximum MFA attempts exceeded for this challenge.")

    if method == MFAMethodType.TOTP:
        method_obj = MFAMethod.objects.filter(user=session.user, type=MFAMethodType.TOTP, is_active=True, is_verified=True).first()
        secret = (method_obj.metadata or {}).get("secret") if method_obj else None
        if not secret:
            secret = session.user.two_factor_otp_secret
        otp = str(payload.get("otp", "")).strip()
        if not otp:
            raise ValidationError({"otp": "otp is required"})

        is_valid = pyotp.TOTP(secret).verify(otp, valid_window=1) if secret else False
        if not is_valid:
            _consume_failed_attempt(challenge)
            return False

    elif method in (MFAMethodType.EMAIL, MFAMethodType.SMS):
        otp = str(payload.get("otp", "")).strip()
        otp_hash = (challenge.challenge_data or {}).get("otp_hash")
        if not otp:
            raise ValidationError({"otp": "otp is required"})
        if not otp_hash or not check_password(otp, otp_hash):
            _consume_failed_attempt(challenge)
            return False

    elif method == MFAMethodType.WEBAUTHN:
        # v1 minimal: verify challenge echo + assertion marker and allow plugging django-webauthn verifier.
        challenge_value = (challenge.challenge_data or {}).get("challenge")
        signed_challenge = payload.get("challenge")
        assertion = payload.get("assertion")
        if not challenge_value or not signed_challenge or not assertion:
            raise ValidationError({"webauthn": "challenge and assertion are required"})

        if not secrets.compare_digest(str(challenge_value), str(signed_challenge)):
            _consume_failed_attempt(challenge)
            return False

        method_obj = MFAMethod.objects.filter(user=session.user, type=MFAMethodType.WEBAUTHN, is_active=True, is_verified=True).first()
        if not method_obj:
            raise ValidationError({"webauthn": "No active webauthn credential"})

    elif method == MFAMethodType.PUSH:
        approval_code = str(payload.get("approval_code", "")).strip()
        approval_hash = (challenge.challenge_data or {}).get("approval_code_hash")
        if not approval_code:
            raise ValidationError({"approval_code": "approval_code is required"})
        if not approval_hash or not check_password(approval_code, approval_hash):
            _consume_failed_attempt(challenge)
            return False

    else:
        raise ValidationError({"selected_method": "Unsupported MFA method."})

    now = timezone.now()
    challenge.verified_at = now
    challenge.save(update_fields=["verified_at"])
    session.verified = True
    session.used_at = now
    session.save(update_fields=["verified", "used_at"])
    return True


def setup_totp(user: User) -> dict:
    secret = pyotp.random_base32(32)
    method, _ = MFAMethod.objects.get_or_create(
        user=user,
        type=MFAMethodType.TOTP,
        defaults={"is_active": True, "is_verified": False, "metadata": {}},
    )
    method.metadata = {**(method.metadata or {}), "secret": secret}
    method.is_active = True
    method.is_verified = False
    method.save(update_fields=["metadata", "is_active", "is_verified", "updated_at"])

    uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name=getattr(settings, "SITE_NAME", "THEAPP"))
    return {"secret": secret, "qrcode_uri": uri}


def verify_totp_setup(user: User, otp: str) -> bool:
    method = MFAMethod.objects.filter(user=user, type=MFAMethodType.TOTP).first()
    if not method:
        raise ValidationError({"totp": "TOTP setup not initialized."})

    secret = (method.metadata or {}).get("secret")
    if not secret:
        raise ValidationError({"totp": "TOTP secret missing."})

    is_valid = pyotp.TOTP(secret).verify(str(otp).strip(), valid_window=1)
    if not is_valid:
        return False

    method.is_verified = True
    method.is_active = True
    method.save(update_fields=["is_verified", "is_active", "updated_at"])

    user.two_factor_otp_secret = secret
    user.mfa_is_enabled = True
    user.save(update_fields=["two_factor_otp_secret", "mfa_is_enabled"])
    return True


def setup_webauthn(user: User, credential_id: str, public_key: str, sign_count: int = 0) -> MFAMethod:
    method, _ = MFAMethod.objects.get_or_create(
        user=user,
        type=MFAMethodType.WEBAUTHN,
        defaults={"is_active": True, "is_verified": False, "metadata": {}},
    )
    method.metadata = {
        **(method.metadata or {}),
        "credential_id": credential_id,
        "public_key": public_key,
        "sign_count": sign_count,
    }
    method.is_active = True
    method.is_verified = True
    method.save(update_fields=["metadata", "is_active", "is_verified", "updated_at"])
    return method


def register_push_device(*, user: User, token: str, platform: str, provider: str = MFATrustedDevice.Provider.FCM) -> MFATrustedDevice:
    device, _ = MFATrustedDevice.objects.get_or_create(
        provider=provider,
        token=token,
        defaults={
            "user": user,
            "platform": platform,
            "is_active": True,
            "last_seen_at": timezone.now(),
        },
    )

    if device.user_id != user.id:
        raise ValidationError({"device": "Push device token already linked to another user."})

    device.is_active = True
    device.platform = platform
    device.last_seen_at = timezone.now()
    device.last_delivery_status = "registered"
    device.save(update_fields=["is_active", "platform", "last_seen_at", "last_delivery_status", "updated_at"])

    MFAMethod.objects.get_or_create(
        user=user,
        type=MFAMethodType.PUSH,
        defaults={"is_active": True, "is_verified": True, "metadata": {}},
    )

    return device
