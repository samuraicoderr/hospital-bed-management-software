from django.contrib.auth import login
from django.db import transaction

from src.users.models import User


def social_user(backend, uid, user=None, *args, **kwargs):
    provider = backend.name
    social = backend.strategy.storage.user.get_social_auth(provider, uid)

    user = social.user if social else None

    return {'social': social, 'user': user, 'is_new': user is None, 'new_association': social is None}


def login_user(strategy, backend, user=None, *args, **kwargs):
    login(backend.strategy.request, user, backend='src.users.backends.EmailOrUsernameModelBackend')


def mark_oauth_email_verified_and_advance_onboarding(
    backend,
    user=None,
    is_new=False,
    *args,
    **kwargs,
):
    """
    For new OAuth signups only:
    - Trust provider email and mark the user as email-verified.
    - Skip NEEDS_EMAIL_VERIFICATION in onboarding.
    """
    if not is_new or not user:
        return

    with transaction.atomic():
        user = User.objects.select_for_update().get(pk=user.pk)
        update_fields = []

        if not user.is_email_verified:
            user.is_email_verified = True
            update_fields.append("is_email_verified")

        if user.onboarding_status == User.OnboardingStatus.NEEDS_BASIC_INFORMATION:
            user.advance_onboarding(
                from_step=User.OnboardingStatus.NEEDS_BASIC_INFORMATION,
            )

        if user.onboarding_status == User.OnboardingStatus.NEEDS_EMAIL_VERIFICATION:
            user.advance_onboarding(
                from_step=User.OnboardingStatus.NEEDS_EMAIL_VERIFICATION,
            )

        if update_fields:
            user.save(update_fields=update_fields)
