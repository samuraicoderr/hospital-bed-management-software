"""
If you're too lazy to keep remembering the config stuff for oauth like me, this exists.

just set REGISTERED_OAUTH_PROVIDERS in env to the list of providers you want to use.

Example:

REGISTERED_OAUTH_PROVIDERS = ["google", "twitter", "github", "apple"]

"""

import os
import time
from pathlib import Path
from typing import Any

from django.core.exceptions import ImproperlyConfigured
from social_core.backends.google import GoogleOAuth2


POSSIBLE_OAUTH_PROVIDERS = [
	"google",
	"facebook",
	"linkedin",
	"yahoo",
	"discord",
	"microsoft",
	"slack",
	"twitter",
	"github",
	"apple",
]

REGISTERED_OAUTH_PROVIDERS = set({
	# hardcode here or use REGISTERED_OAUTH_PROVIDERS env variable
	# "google", 
	# "twitter", 
	# "github", 
	# "apple"
})


# Provider metadata templates. Enabled providers are selected from this map
# using REGISTERED_OAUTH_PROVIDERS.
OAUTH_PROVIDER_TEMPLATES = {
	"google": {
		"provider": "google",
		"backend_name": "google-oauth2",
		"backend_path": "social_core.backends.google.GoogleOAuth2",
		"required_env_vars": ["*"],
		"settings_env_map": {
			"SOCIAL_AUTH_GOOGLE_OAUTH2_KEY": "THEAPP_GOOGLE_OAUTH2_KEY",
			"SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET": "THEAPP_GOOGLE_OAUTH2_SECRET",
		},
		"scopes": [
			"openid",
			"email", 
			"profile",
			"+calendar.readonly", # `+` means append `scope_prefix`, `+` will be removed
		],
		"scope_setting_name": "SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE",
		"scope_prefix": "https://www.googleapis.com/auth/",
	},
	"facebook": {
		"provider": "facebook",
		"backend_name": "facebook",
		"backend_path": "social_core.backends.facebook.FacebookOAuth2",
		"required_env_vars": ["*"],
		"settings_env_map": {
			"SOCIAL_AUTH_FACEBOOK_KEY": "THEAPP_FACEBOOK_OAUTH2_KEY",
			"SOCIAL_AUTH_FACEBOOK_SECRET": "THEAPP_FACEBOOK_OAUTH2_SECRET",
		},
		"scopes": ["email", "public_profile"],
		"scope_setting_name": "SOCIAL_AUTH_FACEBOOK_SCOPE",
		"scope_prefix": "",
	},
	"linkedin": {
		"provider": "linkedin",
		"backend_name": "linkedin-oauth2",
		"backend_path": "social_core.backends.linkedin.LinkedinOAuth2",
		"required_env_vars": ["*"],
		"settings_env_map": {
			"SOCIAL_AUTH_LINKEDIN_OAUTH2_KEY": "THEAPP_LINKEDIN_OAUTH2_KEY",
			"SOCIAL_AUTH_LINKEDIN_OAUTH2_SECRET": "THEAPP_LINKEDIN_OAUTH2_SECRET",
		},
		"scopes": ["openid", "profile", "email"],
		"scope_setting_name": "SOCIAL_AUTH_LINKEDIN_OAUTH2_SCOPE",
		"scope_prefix": "",
	},
	"yahoo": {
		"provider": "yahoo",
		"backend_name": "yahoo-oauth2",
		"backend_path": "social_core.backends.yahoo.YahooOAuth2",
		"required_env_vars": ["*"],
		"settings_env_map": {
			"SOCIAL_AUTH_YAHOO_OAUTH2_KEY": "THEAPP_YAHOO_OAUTH2_KEY",
			"SOCIAL_AUTH_YAHOO_OAUTH2_SECRET": "THEAPP_YAHOO_OAUTH2_SECRET",
		},
		"scopes": ["openid", "profile", "email"],
		"scope_setting_name": "SOCIAL_AUTH_YAHOO_OAUTH2_SCOPE",
		"scope_prefix": "",
	},
	"discord": {
		"provider": "discord",
		"backend_name": "discord",
		"backend_path": "social_core.backends.discord.DiscordOAuth2",
		"required_env_vars": ["*"],
		"settings_env_map": {
			"SOCIAL_AUTH_DISCORD_KEY": "THEAPP_DISCORD_OAUTH2_KEY",
			"SOCIAL_AUTH_DISCORD_SECRET": "THEAPP_DISCORD_OAUTH2_SECRET",
		},
		"scopes": ["identify", "email"],
		"scope_setting_name": "SOCIAL_AUTH_DISCORD_SCOPE",
		"scope_prefix": "",
	},
	"microsoft": {
		"provider": "microsoft",
		"backend_name": "microsoft-graph",
		"backend_path": "social_core.backends.microsoft.MicrosoftOAuth2",
		"required_env_vars": ["*"],
		"settings_env_map": {
			"SOCIAL_AUTH_MICROSOFT_GRAPH_KEY": "THEAPP_MICROSOFT_GRAPH_KEY",
			"SOCIAL_AUTH_MICROSOFT_GRAPH_SECRET": "THEAPP_MICROSOFT_GRAPH_SECRET",
		},
		"scopes": ["openid", "profile", "email", "User.Read"],
		"scope_setting_name": "SOCIAL_AUTH_MICROSOFT_GRAPH_SCOPE",
		"scope_prefix": "",
	},
	"slack": {
		"provider": "slack",
		"backend_name": "slack",
		"backend_path": "social_core.backends.slack.SlackOAuth2",
		"required_env_vars": ["*"],
		"settings_env_map": {
			"SOCIAL_AUTH_SLACK_KEY": "THEAPP_SLACK_OAUTH2_KEY",
			"SOCIAL_AUTH_SLACK_SECRET": "THEAPP_SLACK_OAUTH2_SECRET",
		},
		"scopes": ["identity.basic", "identity.email"],
		"scope_setting_name": "SOCIAL_AUTH_SLACK_SCOPE",
		"scope_prefix": "",
	},
	"twitter": {
		"provider": "twitter",
		"backend_name": "twitter-oauth2",
		"backend_path": "social_core.backends.twitter_oauth2.TwitterOAuth2",
		"required_env_vars": ["*"],
		"settings_env_map": {
			"SOCIAL_AUTH_TWITTER_OAUTH2_KEY": "THEAPP_TWITTER_OAUTH2_KEY",
			"SOCIAL_AUTH_TWITTER_OAUTH2_SECRET": "THEAPP_TWITTER_OAUTH2_SECRET",
		},
		"scopes": ["users.read", "tweet.read", "offline.access"],
		"scope_setting_name": "SOCIAL_AUTH_TWITTER_OAUTH2_SCOPE",
		"scope_prefix": "",
	},
	"github": {
		"provider": "github",
		"backend_name": "github",
		"backend_path": "social_core.backends.github.GithubOAuth2",
		"required_env_vars": ["*"],
		"settings_env_map": {
			"SOCIAL_AUTH_GITHUB_KEY": "THEAPP_GITHUB_OAUTH2_KEY",
			"SOCIAL_AUTH_GITHUB_SECRET": "THEAPP_GITHUB_OAUTH2_SECRET",
		},
		"scopes": ["read:user", "user:email"],
		"scope_setting_name": "SOCIAL_AUTH_GITHUB_SCOPE",
		"scope_prefix": "",
	},
	"apple": {
		"provider": "apple",
		"backend_name": "apple-id",
		"backend_path": "social_core.backends.apple.AppleIdAuth",
		"required_env_vars": ["THEAPP_APPLE_CLIENT_ID"],
		"settings_env_map": {
			"SOCIAL_AUTH_APPLE_ID_CLIENT": "THEAPP_APPLE_CLIENT_ID",
			"SOCIAL_AUTH_APPLE_ID_TEAM": "THEAPP_APPLE_TEAM_ID",
			"SOCIAL_AUTH_APPLE_ID_KEY": "THEAPP_APPLE_KEY_ID",
		},
		"scopes": ["name", "email"],
		"scope_setting_name": "SOCIAL_AUTH_APPLE_ID_SCOPE",
		"scope_prefix": "",
	},
}

ENV_PREFIX = "THEAPP_"

def _getenv(key: str, return_alternative: Any = "", as_list: bool = False, as_set: bool = False, lowered: bool = False, add_prefix: bool = True) -> str|list[str]:
	if add_prefix and not key.startswith(ENV_PREFIX):
		key = f"{ENV_PREFIX}{key}"
	if not add_prefix and key.startswith(ENV_PREFIX):
		key = key[len(ENV_PREFIX):]
	val = os.getenv(key, "").replace(" ", "").strip()
	if lowered:
		val = val.lower()
	if as_list or as_set:
		l = val.split(",")
		ret = []
		for item in l:
			item = item.strip()
			if item:
				ret.append(item)
		if as_set:
			return set(ret)
		return ret
	if val:
		return val
	return return_alternative


def _required_setting(setting_name: str, *, provider: str, **kw) -> str:
	if "key" in kw:
		kw.pop("key")
	value = _getenv(key=setting_name, **kw)
	if not value:
		raise ImproperlyConfigured(
			f"OAuth provider '{provider}' requires non-empty env var '{setting_name}'."
		)
	return value


# Comma-separated exact callback URLs allowed for OAuth code exchange redirect_uri.
# Example:
# THEAPP_OAUTH_ALLOWED_REDIRECT_URIS=http://localhost:3000/auth/oauth/callback/google,https://app.example.com/auth/oauth/callback/google
OAUTH_ALLOWED_REDIRECT_URIS = tuple(
	_getenv("OAUTH_ALLOWED_REDIRECT_URIS", as_list=True)
)


def _read_apple_private_key(provider: str) -> str:
	"""Read Apple private key, from env var or file.
	"""
	private_key = _getenv("APPLE_PRIVATE_KEY", "")
	private_key_path = _getenv("APPLE_PRIVATE_KEY_PATH", "")

	if private_key:
		return private_key

	if not private_key_path:
		raise ImproperlyConfigured(
			f"OAuth provider '{provider}' requires one of APPLE_PRIVATE_KEY or APPLE_PRIVATE_KEY_PATH."
		)

	path = Path(private_key_path).expanduser()
	if not path.exists() or not path.is_file():
		raise ImproperlyConfigured(
			f"OAuth provider '{provider}' has invalid APPLE_PRIVATE_KEY_PATH='{private_key_path}'."
		)

	return path.read_text(encoding="utf-8").strip()


def _build_apple_client_secret() -> str:
	"""Build Apple client secret.
	"""
	provider = "apple"
	client_id = _required_setting("APPLE_CLIENT_ID", provider=provider)
	team_id = _required_setting("APPLE_TEAM_ID", provider=provider)
	key_id = _required_setting("APPLE_KEY_ID", provider=provider)
	private_key = _read_apple_private_key(provider)

	# Imported lazily so environments that do not register Apple don't need these deps.
	import jwt  # pylint: disable=import-outside-toplevel

	now = int(time.time())
	payload = {
		"iss": team_id,
		"iat": now,
		"exp": now + 60 * 60 * 24 * 180,
		"aud": "https://appleid.apple.com",
		"sub": client_id,
	}
	headers = {"kid": key_id}

	return jwt.encode(payload, private_key, algorithm="ES256", headers=headers)


def _read_registered_oauth_providers() -> set[str]:
	"""Read registered OAuth providers from env var.

	Return type looks like this 
	{"google", "facebook", "linkedin", "yahoo", "discord", "microsoft", "slack", "twitter", "github", "apple"}
	"""
	providers = _getenv("REGISTERED_OAUTH_PROVIDERS", "", as_set=True, add_prefix=False, lowered=True)
	if not providers:
		return set(REGISTERED_OAUTH_PROVIDERS)

	return {	
		provider \
			for provider in providers \
				if provider in POSSIBLE_OAUTH_PROVIDERS
	}


REGISTERED_OAUTH_PROVIDERS = _read_registered_oauth_providers()


def _build_registered_oauth_backends() -> list[dict]:
	"""Build registered OAuth backends.

	Technically returns list(OAUTH_PROVIDER_TEMPLATES.values())
	
	Return type looks like this 
	[
		{
			"provider": "google",
			"backend_name": "google-oauth2",
			"backend_path": "social_core.backends.google.GoogleOAuth2",
			"required_env_vars": ["GOOGLE_OAUTH2_KEY", "GOOGLE_OAUTH2_SECRET"],
			"settings_env_map": {
				"SOCIAL_AUTH_GOOGLE_OAUTH2_KEY": "GOOGLE_OAUTH2_KEY",
				"SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET": "GOOGLE_OAUTH2_SECRET",
			},
			"scopes": ["openid", "email", "profile"],
			"scope_setting_name": "SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE",
		},
	]
	"""
	errors: list[str] = []
	providers = set(REGISTERED_OAUTH_PROVIDERS)
	backends: list[dict] = []

	for provider in providers: # google, facebook, ...
		if not provider:
			errors.append("- empty provider name in REGISTERED_OAUTH_PROVIDERS")
			continue

		if provider not in POSSIBLE_OAUTH_PROVIDERS:
			errors.append(
				f"- {provider}: not in POSSIBLE_OAUTH_PROVIDERS"
			)
			continue

		# get provider template
		provider_template = OAUTH_PROVIDER_TEMPLATES.get(provider, {})
		if not provider_template:
			errors.append(
				f"- {provider}: provider metadata template missing in OAUTH_PROVIDER_TEMPLATES"
			)
			continue
		if "provider" not in provider_template:
			provider_template["provider"] = provider

		backends.append(provider_template)

		scope_prefix = provider_template.get("scope_prefix", "")
		scopes = provider_template.get("scopes", [])
		new_scopes = set()
		for scope in scopes:
			if scope.startswith("+"):
				scope = f"{scope_prefix}{scope[1:]}"
			new_scopes.add(scope)
		provider_template["scopes"] = list(new_scopes)

	if errors:
		details = "\n".join(errors)
		raise ImproperlyConfigured(
			"REGISTERED_OAUTH_PROVIDERS is invalid. Fix provider list:\n"
			f"{details}"
		)

	return backends


REGISTERED_OAUTH_BACKENDS = _build_registered_oauth_backends()


def _missing_env_vars_for(provider_config: dict) -> list[str]:
	"""Return list of missing env vars for a provider.
	
	Note: 
		If "*" is in required_env_vars, then all env vars in settings_env_map are required.
	"""
	missing = []
	required_env_vars = {
		p \
		for p in provider_config.get("required_env_vars", []) \
			if p == "*" or p in provider_config.get("settings_env_map", {}).values()
	}
	if "*" in required_env_vars:
		required_env_vars = provider_config.get("settings_env_map", {}).values()
	for env_var in required_env_vars:
		if not _getenv(env_var):
			missing.append(env_var)
	return missing


def validate_registered_oauth_backends() -> None:
	"""Validate registered OAuth backends."""
	errors: list[str] = []
	seen_providers: set[str] = set()

	for backend in REGISTERED_OAUTH_BACKENDS:
		provider = backend["provider"]

		if provider in seen_providers:
			errors.append(f"- {provider}: duplicate provider name in REGISTERED_OAUTH_BACKENDS")
			continue
		seen_providers.add(provider)

		if provider not in POSSIBLE_OAUTH_PROVIDERS:
			errors.append(f"- {provider}: not in POSSIBLE_OAUTH_PROVIDERS")
			continue

		missing = _missing_env_vars_for(backend)

		if provider == "apple":
			has_client_secret = bool(_getenv("APPLE_CLIENT_SECRET", ""))
			has_signing_material = all(
				[
					_getenv("APPLE_TEAM_ID", ""),
					_getenv("APPLE_KEY_ID", ""),
					_getenv("APPLE_PRIVATE_KEY", "")
					or _getenv("APPLE_PRIVATE_KEY_PATH", ""),
				]
			)

			if not has_client_secret and not has_signing_material:
				missing.extend(
					[
						"APPLE_CLIENT_SECRET (or APPLE_TEAM_ID + APPLE_KEY_ID + APPLE_PRIVATE_KEY/APPLE_PRIVATE_KEY_PATH)",
					]
				)

		if missing:
			missing_csv = ", ".join(missing)
			errors.append(f"- {provider}: missing [{missing_csv}]")

	if errors:
		details = "\n".join(errors)
		raise ImproperlyConfigured(
			"OAuth provider configuration is incomplete. Set required env vars:\n"
			f"{details}"
		)


def _build_provider_env_settings() -> dict:
	"""Build a dict of environment settings for the registered OAuth providers.
	
	Return type looks like this 
	{
		"SOCIAL_AUTH_GOOGLE_OAUTH2_KEY": "<value>",
		"SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET": "<value>",
		"SOCIAL_AUTH_FACEBOOK_KEY": "<value>",
		"SOCIAL_AUTH_FACEBOOK_SECRET": "<value>",
		...
	}
	"""
	settings_map = {}
	for backend in REGISTERED_OAUTH_BACKENDS:
		for setting_name, env_name in backend.get("settings_env_map", {}).items():
			settings_map[setting_name] = _getenv(env_name, "")

	return settings_map


def _build_social_auth_scopes() -> dict:
	"""Build a dict of scopes for the registered OAuth providers.
	
	Return type looks like this 
	{
		"SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE": ["openid", "email", "profile"],
		"SOCIAL_AUTH_FACEBOOK_SCOPE": ["email", "public_profile"],
		"SOCIAL_AUTH_TWITTER_OAUTH2_SCOPE": ["users.read", "tweet.read", "offline.access"],
		"SOCIAL_AUTH_APPLE_OAUTH2_SCOPE": ["openid", "email", "profile"],
		...
	}
	"""
	scopes = {}
	for backend in REGISTERED_OAUTH_BACKENDS:
		scope_setting_name = backend.get("scope_setting_name")
		if scope_setting_name and backend.get("scopes"):
			scopes[scope_setting_name] = backend["scopes"]
	return scopes


def _resolve_apple_secret() -> str:
	"""Resolve Apple client secret.
	
	Return type looks like this 
	"<value>"
	"""
	explicit_secret = _getenv("APPLE_CLIENT_SECRET", "")
	if explicit_secret:
		return explicit_secret

	return _build_apple_client_secret()


validate_registered_oauth_backends()

REGISTERED_OAUTH_BACKEND_MAP = {
	backend["provider"]: backend for backend in REGISTERED_OAUTH_BACKENDS
}
REGISTERED_OAUTH_PROVIDER_NAMES = tuple(REGISTERED_OAUTH_BACKEND_MAP.keys())
SITE_ID = int(_getenv("SITE_ID", "1", add_prefix=False))

AUTHENTICATION_BACKENDS = tuple(
	[backend["backend_path"] for backend in REGISTERED_OAUTH_BACKENDS]
	# + [
	# 	"src.users.backends.EmailOrUsernameModelBackend",
	# 	"django.contrib.auth.backends.ModelBackend",
	# ]
)

# This is a sequence of functions that run in order every time a user logs in via OAuth. Each step receives the output of the previous step
SOCIAL_AUTH_PIPELINE = (
	"social_core.pipeline.social_auth.social_details", # extracts user info from the provider
	"social_core.pipeline.social_auth.social_uid", # generates a unique identifier for the user
	"social_core.pipeline.social_auth.auth_allowed", # checks if the user is allowed to log in
	"social_core.pipeline.social_auth.social_user", # creates a user if they don't exist
	"social_core.pipeline.user.get_username", # sets the username
	"social_core.pipeline.social_auth.associate_by_email", # associates the user with an email if they have one
	"social_core.pipeline.user.create_user", # creates a user if they don't exist
	"social_core.pipeline.social_auth.associate_user", # associates the user with the provider
	"social_core.pipeline.social_auth.load_extra_data", # loads extra data from the provider
	"social_core.pipeline.user.user_details", # loads user details from the provider
	"src.common.social_pipeline.user.mark_oauth_email_verified_and_advance_onboarding", # marks the user as verified and advances the onboarding process
)


SOCIAL_AUTH_USERNAME_IS_FULL_EMAIL = True  # whether to use email as username
SOCIAL_AUTH_SANITIZE_REDIRECTS = True  # whether to sanitize redirects. Prevents open redirect attacks where an attacker crafts a login URL that redirects to a malicious site after authentication
SOCIAL_AUTH_PROTECTED_USER_FIELDS = ["email"] # Prevents OAuth login from overwriting the user's email field. Without this, if you change your email on Google, it would silently change your email in this app too


globals().update(_build_provider_env_settings())
globals().update(_build_social_auth_scopes())

# Apple provider requires a generated client secret JWT.
SOCIAL_AUTH_APPLE_ID_SECRET = (
	_resolve_apple_secret() if "apple" in REGISTERED_OAUTH_BACKEND_MAP else ""
)

# for django admin
# SOCIAL_AUTH_ADMIN_USER_SEARCH_FIELDS = ["username", "first_name", "email"]
