from unittest.mock import patch

from django.test import TestCase
import pyotp
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate

from src.users.models import MFAMethod, MFAMethodType, OnboardingStatus, User
from src.users.views.views_auth import AuthRouterViewSet
from src.users.views.views_oauth import OAuthViewSet


class _FakeUser:
    def __init__(self, *, completed: bool):
        self.pk = "test-user-pk"
        self.is_active = True
        self.email = "oauth.user@example.com"
        self.onboarding_status = "needs_profile_username"
        self._completed = completed
        self.mfa_is_enabled = False

    def is_onboarding_completed(self):
        return self._completed

    def get_onboarding_flow(self):
        return [
            "needs_basic_information",
            "needs_email_verification",
            "needs_profile_username",
            "needs_profile_picture",
            "completed",
        ]

    def get_onboarding_token(self):
        return "test-onboarding-token"


class _FakeBackend:
    def __init__(self, user):
        self._user = user

    def auth_complete(self):
        return self._user


class OAuthOnboardingResponseTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.provider_map = {
            "google": {
                "backend_name": "google-oauth2",
            }
        }

    @staticmethod
    def _base_jwt_response(_):
        return Response(
            {
                "access": "access-token",
                "refresh": "refresh-token",
                "access_expiry": "123",
                "refresh_expiry": "456",
            }
        )

    @patch("src.users.views.views_oauth.response_tokens")
    @patch("src.users.views.views_oauth.load_backend")
    @patch("src.users.views.views_oauth.load_strategy")
    @patch("src.users.views.views_oauth.REGISTERED_OAUTH_BACKEND_MAP")
    def test_login_or_register_includes_onboarding_fields_when_incomplete(
        self,
        mock_provider_map,
        mock_load_strategy,
        mock_load_backend,
        mock_response_tokens,
    ):
        mock_provider_map.get.side_effect = self.provider_map.get
        mock_response_tokens.return_value = Response(
            {
                "onboarding_required": True,
                "onboarding_status": "needs_profile_username",
                "onboarding_token": "test-onboarding-token",
                "onboarding_flow": [
                    "needs_basic_information",
                    "needs_email_verification",
                    "needs_profile_username",
                    "needs_profile_picture",
                    "completed",
                ],
            }
        )

        user = _FakeUser(completed=False)
        mock_load_backend.return_value = _FakeBackend(user)
        mock_load_strategy.return_value = type("Strategy", (), {})()

        view = OAuthViewSet.as_view({"post": "login_or_register"})
        request = self.factory.post(
            "/api/v1/oauth/google/login-or-register",
            {"code": "oauth-code", "redirect_uri": "https://frontend.local/callback"},
            format="json",
        )

        response = view(request, provider="google")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["onboarding_status"], "needs_profile_username")
        self.assertEqual(response.data["onboarding_token"], "test-onboarding-token")
        self.assertIn("onboarding_flow", response.data)
        mock_response_tokens.assert_called_once_with(user, request=request)

    @patch("src.users.views.views_oauth.response_tokens")
    @patch("src.users.views.views_oauth.load_backend")
    @patch("src.users.views.views_oauth.load_strategy")
    @patch("src.users.views.views_oauth.REGISTERED_OAUTH_BACKEND_MAP")
    def test_login_or_register_omits_onboarding_fields_when_completed(
        self,
        mock_provider_map,
        mock_load_strategy,
        mock_load_backend,
        mock_response_tokens,
    ):
        mock_provider_map.get.side_effect = self.provider_map.get
        mock_response_tokens.return_value = self._base_jwt_response(None)

        user = _FakeUser(completed=True)
        mock_load_backend.return_value = _FakeBackend(user)
        mock_load_strategy.return_value = type("Strategy", (), {})()

        view = OAuthViewSet.as_view({"post": "login_or_register"})
        request = self.factory.post(
            "/api/v1/oauth/google/login-or-register",
            {"code": "oauth-code", "redirect_uri": "https://frontend.local/callback"},
            format="json",
        )

        response = view(request, provider="google")

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("onboarding_status", response.data)
        self.assertNotIn("onboarding_flow", response.data)
        self.assertNotIn("onboarding_token", response.data)
        mock_response_tokens.assert_called_once_with(user, request=request)

    def test_callback_endpoint_is_deprecated(self):
        view = OAuthViewSet.as_view({"get": "oauth_callback"})
        request = self.factory.get(
            "/api/v1/oauth/google/callback",
            {
                "code": "oauth-code",
                "state": "oauth-state",
                "redirect_uri": "https://frontend.local/callback",
            },
            format="json",
        )

        response = view(request, provider="google")

        self.assertEqual(response.status_code, 401)
        self.assertIn("Deprecated endpoint", str(response.data.get("detail", "")))


class MFAFlowTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.password = "StrongPass123!"
        self.user = User.objects.create_user(
            username="mfa_user",
            email="mfa.user@example.com",
            password=self.password,
            is_active=True,
        )
        self.user.onboarding_status = OnboardingStatus.COMPLETED
        self.user.save(update_fields=["onboarding_status"])

    @patch("src.users.views.views_auth._jwt_response")
    def test_login_returns_jwt_when_mfa_disabled(self, mock_jwt_response):
        mock_jwt_response.return_value = Response({"access": "a", "refresh": "r"})

        view = AuthRouterViewSet.as_view({"post": "login"})
        request = self.factory.post(
            "/api/v1/auth/login/",
            {"email": self.user.email, "password": self.password},
            format="json",
        )
        response = view(request)

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)

    def test_login_returns_mfa_required_when_enabled(self):
        secret = pyotp.random_base32(32)
        self.user.mfa_is_enabled = True
        self.user.two_factor_otp_secret = secret
        self.user.save(update_fields=["mfa_is_enabled", "two_factor_otp_secret"])
        MFAMethod.objects.create(
            user=self.user,
            type=MFAMethodType.TOTP,
            is_active=True,
            is_verified=True,
            metadata={"secret": secret},
        )

        view = AuthRouterViewSet.as_view({"post": "login"})
        request = self.factory.post(
            "/api/v1/auth/login/",
            {"email": self.user.email, "password": self.password},
            format="json",
        )
        response = view(request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["mfa_required"])
        self.assertIn("mfa_session_token", response.data)
        self.assertIn("totp", response.data["available_methods"])

    @patch("src.users.views.views_auth._jwt_response")
    def test_mfa_challenge_and_verify_totp(self, mock_jwt_response):
        mock_jwt_response.return_value = Response({"access": "a", "refresh": "r"})

        secret = pyotp.random_base32(32)
        self.user.mfa_is_enabled = True
        self.user.two_factor_otp_secret = secret
        self.user.save(update_fields=["mfa_is_enabled", "two_factor_otp_secret"])
        MFAMethod.objects.create(
            user=self.user,
            type=MFAMethodType.TOTP,
            is_active=True,
            is_verified=True,
            metadata={"secret": secret},
        )

        login_view = AuthRouterViewSet.as_view({"post": "login"})
        login_request = self.factory.post(
            "/api/v1/auth/login/",
            {"email": self.user.email, "password": self.password},
            format="json",
        )
        login_response = login_view(login_request)
        mfa_session_token = login_response.data["mfa_session_token"]

        challenge_view = AuthRouterViewSet.as_view({"post": "mfa_challenge"})
        challenge_request = self.factory.post(
            "/api/v1/auth/mfa/challenge/",
            {
                "mfa_session_token": mfa_session_token,
                "selected_method": "totp",
            },
            format="json",
        )
        challenge_response = challenge_view(challenge_request)
        self.assertEqual(challenge_response.status_code, 200)

        otp = pyotp.TOTP(secret).now()
        verify_view = AuthRouterViewSet.as_view({"post": "mfa_verify"})
        verify_request = self.factory.post(
            "/api/v1/auth/mfa/verify/",
            {
                "mfa_session_token": mfa_session_token,
                "selected_method": "totp",
                "otp": otp,
            },
            format="json",
        )
        verify_response = verify_view(verify_request)
        self.assertEqual(verify_response.status_code, 200)
        self.assertIn("access", verify_response.data)

    def test_mfa_methods_lists_available_methods(self):
        self.user.mfa_is_enabled = True
        self.user.save(update_fields=["mfa_is_enabled"])
        MFAMethod.objects.create(
            user=self.user,
            type=MFAMethodType.EMAIL,
            is_active=True,
            is_verified=True,
            metadata={},
        )

        view = AuthRouterViewSet.as_view({"get": "mfa_methods"})
        request = self.factory.get("/api/v1/auth/mfa/methods/")
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, 200)
        self.assertIn("email", response.data["available_methods"])

