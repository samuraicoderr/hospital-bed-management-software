import logging
from urllib.parse import urlparse

from django.conf import settings
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import viewsets
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response

from social_core.exceptions import AuthException
from social_django.utils import load_backend, load_strategy

from src.config.settings.oauth_settings import (
	REGISTERED_OAUTH_BACKEND_MAP,
	REGISTERED_OAUTH_PROVIDER_NAMES,
)
from src.lib.django.views_mixin import ViewSetHelperMixin
from src.users.models import User
from src.users.auth import response_tokens
from src.users.auth import _jwt_response, _mfa_required_response
from src.users.serializers import OAuthCodeExchangeSerializer


logger = logging.getLogger("app")


def _validate_redirect_uri(provider: str, redirect_uri: str) -> None:
	if not redirect_uri:
		return

	allowed = tuple(getattr(settings, "OAUTH_ALLOWED_REDIRECT_URIS", ()))
	if allowed and redirect_uri not in allowed:
		raise ValidationError(
			{
				"error": "invalid_redirect_uri",
				"provider": provider,
				"details": "The redirect_uri is not allowed for this environment.",
			}
		)

	parsed = urlparse(redirect_uri)
	if not parsed.scheme or not parsed.netloc:
		raise ValidationError(
			{
				"error": "invalid_redirect_uri",
				"provider": provider,
				"details": "The redirect_uri must be an absolute URL.",
			}
		)



class OAuthViewSet(ViewSetHelperMixin, viewsets.GenericViewSet):
	"""Provider-based OAuth login endpoint for code exchange flows."""

	serializers = {
		# "default": OAuthCodeExchangeSerializer,
		"login_or_register": OAuthCodeExchangeSerializer,
	}

	permissions = {
		"default": [AllowAny],
	}

	@action(detail=False, methods=["post"], url_path=r"(?P<provider>[^/.]+)/login-or-register")
	def login_or_register(self, request, provider=None, *args, **kwargs):
		provider = (provider or "").strip().lower()
		provider_config = REGISTERED_OAUTH_BACKEND_MAP.get(provider)

		if not provider_config:
			raise ValidationError(
				{
					"error": "unsupported oauth provider",
					"allowed_providers": list(REGISTERED_OAUTH_PROVIDER_NAMES),
				}
			)

		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		payload = serializer.validated_data
		from pprint import pprint
		print("*"*100)
		pprint(payload)
		print("*"*100)

		redirect_uri = payload.get("redirect_uri") or ""
		_validate_redirect_uri(provider=provider, redirect_uri=redirect_uri)
		strategy = load_strategy(request=request)
		backend = load_backend(
			strategy=strategy,
			name=provider_config["backend_name"],
			redirect_uri=redirect_uri,
		)

		oauth_request_data = {
			"code": payload["code"],
			"state": payload.get("state", ""),
			"redirect_uri": redirect_uri,
			"code_verifier": payload.get("code_verifier", ""),
		}
		oauth_request_data = {k: v for k, v in oauth_request_data.items() if v}

		# social-auth's auth_complete() reads request_data() from strategy.
		strategy.request_data = lambda merge=True: oauth_request_data  # type: ignore[assignment]

		# IMPORTANT:
		# load_backend() snapshots request data into backend.data at init time,
		# which misses JSON payload fields from DRF requests unless we sync it.
		backend.data = oauth_request_data

		# This endpoint is frontend-initiated OAuth code exchange. CSRF/state
		# validation happens on the frontend, so we disable social-auth's
		# session-bound state validation for this backend call.
		backend.STATE_PARAMETER = False
		backend.REDIRECT_STATE = False

		try:
			user = backend.auth_complete()
		except AuthException as exc:
			logger.warning("OAuth auth_complete failed for provider=%s: %s", provider, exc)
			raise AuthenticationFailed(
				{"error": "oauth_exchange_failed", "provider": provider, "details": str(exc)}
			)
		except Exception as exc:
			logger.exception("Unexpected OAuth failure for provider=%s", provider)
			raise AuthenticationFailed(
				{
					"error": "oauth_exchange_failed",
					"provider": provider,
					"details": "unexpected provider error",
				}
			) from exc

		if not user:
			raise AuthenticationFailed(
				{"error": "oauth_authentication_failed", "provider": provider}
			)

		if not user.is_active:
			raise AuthenticationFailed(
				{"error": "inactive_user", "provider": provider}
			)

		if not getattr(user, "email", ""):
			raise ValidationError(
				{
					"error": "email_required",
					"provider": provider,
					"details": "Provider did not return an email. Ensure provider app is configured for email access.",
				}
			)
	
		
		user.advance_onboarding(
			from_step=User.OnboardingStatus.NEEDS_BASIC_INFORMATION 
		)
		user.save(
			update_fields=["onboarding_status"]
		)


		return response_tokens(user, request=request)

	@action(detail=False, methods=["get"], url_path=r"(?P<provider>[^/.]+)/callback")
	def oauth_callback(self, request, provider=None):
		"""
		OAuth callback endpoint that providers (e.g. Google) redirect to after authorization.

		Accepts OAuth query parameters (code, state, etc.) via GET, completes the
		authentication flow, and returns a JWT response.

		GET /api/v1/oauth/{provider}/callback/?code=...&state=...
		"""

		raise AuthenticationFailed("Deprecated endpoint - use POST /api/v1/oauth/{provider}/login-or-register/ instead")
	
		provider = (provider or "").strip().lower()
		provider_config = REGISTERED_OAUTH_BACKEND_MAP.get(provider)

		if not provider_config:
			logger.warning(
				"OAuth callback received for unsupported provider=%s from IP=%s",
				provider,
				request.META.get("REMOTE_ADDR", "unknown"),
			)
			raise ValidationError(
				{
					"error": "unsupported oauth provider",
					"allowed_providers": list(REGISTERED_OAUTH_PROVIDER_NAMES),
				}
			)

		# Check for OAuth error responses from the provider (e.g. user denied access)
		oauth_error = request.query_params.get("error", "").strip()
		if oauth_error:
			error_description = request.query_params.get("error_description", "").strip()
			logger.warning(
				"OAuth provider=%s returned error=%s description=%s",
				provider,
				oauth_error,
				error_description,
			)
			raise AuthenticationFailed(
				{
					"error": "oauth_provider_error",
					"provider": provider,
					"details": error_description or oauth_error,
				}
			)

		# Extract and sanitize OAuth query parameters
		raw_code = request.query_params.get("code", "").strip()
		raw_state = request.query_params.get("state", "").strip()
		raw_redirect_uri = request.query_params.get("redirect_uri", "").strip()
		raw_code_verifier = request.query_params.get("code_verifier", "").strip()

		if not raw_code:
			logger.warning(
				"OAuth callback for provider=%s missing authorization code from IP=%s",
				provider,
				request.META.get("REMOTE_ADDR", "unknown"),
			)
			raise ValidationError(
				{
					"error": "missing_authorization_code",
					"provider": provider,
					"details": "The authorization code is required but was not provided by the OAuth provider.",
				}
			)

		# Validate code format: authorization codes should be reasonable length
		# and contain only safe characters
		max_code_length = 4096
		if len(raw_code) > max_code_length:
			logger.warning(
				"OAuth callback for provider=%s received oversized code (length=%d) from IP=%s",
				provider,
				len(raw_code),
				request.META.get("REMOTE_ADDR", "unknown"),
			)
			raise ValidationError(
				{
					"error": "invalid_authorization_code",
					"provider": provider,
					"details": "The authorization code exceeds the maximum allowed length.",
				}
			)

		if raw_state and len(raw_state) > 2048:
			logger.warning(
				"OAuth callback for provider=%s received oversized state (length=%d)",
				provider,
				len(raw_state),
			)
			raise ValidationError(
				{
					"error": "invalid_state_parameter",
					"provider": provider,
					"details": "The state parameter exceeds the maximum allowed length.",
				}
			)

		if raw_redirect_uri and len(raw_redirect_uri) > 2048:
			logger.warning(
				"OAuth callback for provider=%s received oversized redirect_uri (length=%d)",
				provider,
				len(raw_redirect_uri),
			)
			raise ValidationError(
				{
					"error": "invalid_redirect_uri",
					"provider": provider,
					"details": "The redirect_uri parameter exceeds the maximum allowed length.",
				}
			)

		logger.info(
			"OAuth callback initiated for provider=%s",
			provider,
		)

		strategy = load_strategy(request=request)
		backend = load_backend(
			strategy=strategy,
			name=provider_config["backend_name"],
			redirect_uri=raw_redirect_uri,
		)

		backend.STATE_PARAMETER = False
		backend.REDIRECT_STATE = False

		# Build the OAuth request data dict, filtering out empty values
		oauth_request_data = {
			"code": raw_code,
			"state": raw_state,
			"redirect_uri": raw_redirect_uri,
			"code_verifier": raw_code_verifier,
		}
		oauth_request_data = {k: v for k, v in oauth_request_data.items() if v}

		# social-auth's auth_complete() reads request_data() from strategy.
		strategy.request_data = lambda merge=True: oauth_request_data  # type: ignore[assignment]

		try:
			user = backend.auth_complete()
		except AuthException as exc:
			logger.warning(
				"OAuth callback auth_complete failed for provider=%s: %s",
				provider,
				exc,
			)
			raise AuthenticationFailed(
				{
					"error": "oauth_exchange_failed",
					"provider": provider,
					"details": str(exc),
				}
			)
		except Exception as exc:
			logger.exception(
				"Unexpected OAuth callback failure for provider=%s",
				provider,
			)
			raise AuthenticationFailed(
				{
					"error": "oauth_exchange_failed",
					"provider": provider,
					"details": "unexpected provider error",
				}
			) from exc

		if not user:
			logger.warning(
				"OAuth callback for provider=%s returned no user",
				provider,
			)
			raise AuthenticationFailed(
				{"error": "oauth_authentication_failed", "provider": provider}
			)

		if not user.is_active:
			logger.warning(
				"OAuth callback for provider=%s matched inactive user_id=%s",
				provider,
				user.pk,
			)
			raise AuthenticationFailed(
				{"error": "inactive_user", "provider": provider}
			)

		if not getattr(user, "email", ""):
			logger.warning(
				"OAuth callback for provider=%s returned user_id=%s without email",
				provider,
				user.pk,
			)
			raise ValidationError(
				{
					"error": "email_required",
					"provider": provider,
					"details": "Provider did not return an email. Ensure provider app is configured for email access.",
				}
			)

		logger.info(
			"OAuth callback successful for provider=%s user_id=%s",
			provider,
			user.pk,
		)

		return _oauth_success_response(user)

	@action(detail=False, methods=["get"])
	def get_providers(self, request):
		return Response({"providers": list(REGISTERED_OAUTH_PROVIDER_NAMES)})