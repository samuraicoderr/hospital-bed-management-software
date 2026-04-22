import os

from datetime import timedelta


APP_NAME = os.getenv("SITE_NAME", "THEAPP")


REST_FRAMEWORK = {
	"DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
	"DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
	"DEFAULT_FILTER_BACKENDS": [
		"django_filters.rest_framework.DjangoFilterBackend",
		"rest_framework.filters.OrderingFilter",
		"rest_framework.filters.SearchFilter",
	],
	"PAGE_SIZE": int(os.getenv("DJANGO_PAGINATION_LIMIT", 18)),
	"DATETIME_FORMAT": "%Y-%m-%dT%H:%M:%S.%fZ",
	"DEFAULT_RENDERER_CLASSES": (
		"rest_framework.renderers.JSONRenderer",
		"rest_framework.renderers.BrowsableAPIRenderer",
	),
	"DEFAULT_PERMISSION_CLASSES": [
		"rest_framework.permissions.AllowAny",
	],
	"DEFAULT_AUTHENTICATION_CLASSES": (
		"rest_framework_simplejwt.authentication.JWTAuthentication",
	),
	"DEFAULT_PARSER_CLASSES": (
		"rest_framework.parsers.JSONParser",
		"rest_framework_xml.parsers.XMLParser",
	),
	"DEFAULT_THROTTLE_CLASSES": [
		"rest_framework.throttling.AnonRateThrottle",
		"rest_framework.throttling.UserRateThrottle",
		"rest_framework.throttling.ScopedRateThrottle",
	],
	"DEFAULT_THROTTLE_RATES": {
		"anon": "100/second",
		"user": "1000/second",
		"subscribe": "60/minute",
	},
	"TEST_REQUEST_DEFAULT_FORMAT": "json",
}


SPECTACULAR_SETTINGS = {
	"TITLE": f"{APP_NAME} API",
	"DESCRIPTION": f"Backend API documentation for {APP_NAME}",
	"VERSION": "1.0.0",
	"SERVE_INCLUDE_SCHEMA": False,
}


JWT_SECRET_KEY = os.getenv(
	"JWT_SIGNING_KEY", "nlt2fz*q*&+fj0*e$+vj2&l=5(%uw)rg0u6d7dt0c"
)

SIMPLE_JWT = {
	"ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
	"REFRESH_TOKEN_LIFETIME": timedelta(days=1),
	"ALGORITHM": "HS256",
	"SIGNING_KEY": JWT_SECRET_KEY,
	"VERIFYING_KEY": None,
	"AUTH_HEADER_TYPES": ("Bearer", "JWT"),
	"USER_ID_FIELD": "id",
	"USER_ID_CLAIM": "user_id",
	"AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
	"TOKEN_TYPE_CLAIM": "token_type",
}


SWAGGER_SETTINGS = {
	"api_version": "1.0",
	"relative_paths": True,
	"VALIDATOR_URL": None,
	"USE_SESSION_AUTH": True,
	"SECURITY_DEFINITIONS": {
		"Token": {
			"type": "apiKey",
			"name": "Authorization",
			"in": "header",
			"description": 'Enter "Token <your_token_here>" (for DRF TokenAuthentication) or "Bearer <your_jwt_here>" if using JWT-based auth.',
		},
	},
}
