import os
import sentry_sdk

from sentry_sdk.integrations.django import DjangoIntegration
from os.path import join
from ._utils import env
from ._errors import SettingsError


# ============================================================
# BASE CONFIG
# ============================================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Explicit boolean parsing (prevents casing bugs like TRUE/true)
DEBUG = os.getenv("DJANGO_DEBUG", "False").lower() == "true"

SITE_NAME = os.getenv("SITE_NAME", "THEAPP")
APP_NAME = SITE_NAME
SITE_DOMAIN = os.getenv("SITE_DOMAIN", "THEAPP.com")
SITE_URL = f"https://{SITE_DOMAIN}/"

FRONTEND_DOMAIN = os.getenv("FRONTEND_DOMAIN", "THEAPPFRONTEND.com")
FRONTEND_SERVER = f"https://{FRONTEND_DOMAIN}"

DEVELOPER_EMAIL = "williamusanga23@gmail.com"
DEVELOPER_EMAILS = [DEVELOPER_EMAIL]


# ============================================================
# SECRET KEY (FAIL FAST IN PRODUCTION)
# ============================================================

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")

if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "insecure-dev-secret-key"
    else:
        raise SettingsError("settings: DJANGO_SECRET_KEY must be set in production")


# ============================================================
# HOST + CSRF CONFIG
# ============================================================

_ALLOWED_HOST = env.parse_env_list(os.getenv("ALLOWED_HOSTS", ""))
_CSRF_TRUSTED_ORIGINS = env.parse_env_list(os.getenv("CSRF_TRUSTED_ORIGINS", ""))
_CORS_ALLOWED_ORIGINS = env.parse_env_list(os.getenv("CORS_ALLOWED_ORIGINS", ""))
_CSP_SCRIPT_SRC = env.parse_env_list(os.getenv("CSP_SCRIPT_SRC", ""))
_CSP_DEFAULT_SRC = env.parse_env_list(os.getenv("CSP_DEFAULT_SRC", ""))

if DEBUG:
    ALLOWED_HOSTS = ["*"]

    # Allow all origins in development for ease of testing with tools like Postman or local frontend dev servers
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOW_CREDENTIALS = True

    CSRF_TRUSTED_ORIGINS = _CSRF_TRUSTED_ORIGINS or [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ] + _CSRF_TRUSTED_ORIGINS

else:
    if not _ALLOWED_HOST:
        raise SettingsError("settings: ALLOWED_HOSTS must be set in production")

    if not _CSRF_TRUSTED_ORIGINS:
        raise SettingsError("settings: CSRF_TRUSTED_ORIGINS must be set in production")

    ALLOWED_HOSTS = _ALLOWED_HOST
    CSRF_TRUSTED_ORIGINS = _CSRF_TRUSTED_ORIGINS

    # ========================================================
    # HTTPS ENFORCEMENT
    # ========================================================

    # Redirect all HTTP requests to HTTPS
    SECURE_SSL_REDIRECT = True
    # If nginx says the request is secure (https) just trust it (needed when behind a proxy)
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

    # tells browsers to only connect to the site over HTTPS for the next year, and to include subdomains and preload in browser lists
    # SECURE_HSTS_SECONDS = 31536000
    # # Include subdomains in HSTS policy (e.g. for www and api subdomains)
    # SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    # # Allow site to be included in browser preload lists (e.g. Chrome preload list) for even stronger HSTS enforcement
    # SECURE_HSTS_PRELOAD = True

    # ========================================================
    # SECURE COOKIES
    # ========================================================
    # Set cookie domain to allow cookies to be shared across subdomains (e.g. www and api)
    SESSION_COOKIE_DOMAIN = f".{SITE_DOMAIN}"
    # Same for CSRF cookie if used (e.g. with session authentication in DRF)
    CSRF_COOKIE_DOMAIN = f".{SITE_DOMAIN}"

    # Only send cookies over HTTPS
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    # Prevent cookie access by JavaScript (mitigates XSS attacks stealing cookies)
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True

    # Set SameSite policy to Lax to prevent CSRF attacks while still allowing cookies in top-level navigation (e.g. user clicking a link from an email to the site)
    SESSION_COOKIE_SAMESITE = "Lax"
    CSRF_COOKIE_SAMESITE = "Lax"

    # ========================================================
    # SECURITY HEADERS
    # ========================================================

    # Enables a legacy "Stop XSS" mode in older browsers.
    SECURE_BROWSER_XSS_FILTER = True
    # Prevents the browser from "guessing" the file type. This stops a .txt file containing code from being executed as JavaScript.
    SECURE_CONTENT_TYPE_NOSNIFF = True
    # Limits how much info (like the URL you came from) is sent to other sites when you click an external link.
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
    # Prevents your site from being put in an <iframe> on another site (stops "Clickjacking").
    X_FRAME_OPTIONS = "DENY"

    # Strict CORS in production
    CORS_ALLOWED_ORIGINS = [
        f"https://{FRONTEND_DOMAIN}",
    ] + _CORS_ALLOWED_ORIGINS
    # Allow cookies to be sent in CORS requests (e.g. for session authentication)
    CORS_ALLOW_CREDENTIALS = True

    # Isolates your site’s execution environment so other tabs can’t poke around in your site's memory.
    SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"

    # Only allow resources (images, data) from your own domain.
    # CSP_DEFAULT_SRC = [
    #     "'self'",
    #     # "https://trusted.cdn.com"
    # ] + _CSP_DEFAULT_SRC
    # # Only allow scripts from your own domain and a trusted CDN (e.g. for analytics or UI libraries)
    # CSP_SCRIPT_SRC = [
    #     "'self'", 
    #     # "https://trusted.cdn.com"
    # ] + _CSP_SCRIPT_SRC
    # Only allow styles from your own domain and a trusted CDN (e.g. for analytics or UI libraries)
    # CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")


# ============================================================
# APPLICATIONS
# ============================================================

MY_APPS = [
    "src.notifications",
    "src.users",
    "src.files",
    "src.common",
    "src.organizations",
]

INSTALLED_APPS = (
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.humanize",
    "django.contrib.admin",
    # Third-party
    "rest_framework",
    "rest_framework.authtoken",
    "django_extensions",
    "django_filters",
    "django_rest_passwordreset",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    "easy_thumbnails",
    "social_django",
    "webauthn",
    "corsheaders",
    "django_inlinecss",
    "django_summernote",
    "django_celery_beat",
    "health_check",
    "health_check.db",
    "health_check.cache",
    "health_check.storage",
    "health_check.contrib.migrations",
    "health_check.contrib.celery_ping",
    "countries_plus",
    "storages",
    *MY_APPS,
    "actstream",
    "channels",
)


# ============================================================
# MIDDLEWARE (SecurityMiddleware MUST be first)
# ============================================================

MIDDLEWARE = (
    "django.middleware.security.SecurityMiddleware",
    "csp.middleware.CSPMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "social_django.middleware.SocialAuthExceptionMiddleware",
)


# ============================================================
# URL CONFIG
# ============================================================

ROOT_URLCONF = "src.urls"
WSGI_APPLICATION = "src.wsgi.application"
ASGI_APPLICATION = "src.asgi.application"


# ============================================================
# SENTRY (SAFE CONFIG)
# ============================================================

SENTRY_DSN = os.getenv("SENTRY_DSN")

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        environment="development" if DEBUG else "production",
        send_default_pii=True,
        traces_sample_rate=0.2 if not DEBUG else 1.0,
    )


# ============================================================
# GENERAL SETTINGS
# ============================================================

APPEND_SLASH = True
TIME_ZONE = "UTC"
LANGUAGE_CODE = "en-us"

USE_I18N = False
USE_L10N = True
USE_TZ = True

LOGIN_REDIRECT_URL = "/"

DEFAULT_EXCEPTION_REPORTER_FILTER = (
    "django.views.debug.SafeExceptionReporterFilter"
)


# ============================================================
# STATIC FILES
# ============================================================

STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(os.path.dirname(BASE_DIR), "staticfiles")

_STATIC_SOURCE_DIR = os.path.join(os.path.dirname(BASE_DIR), "static")
STATICFILES_DIRS = [_STATIC_SOURCE_DIR] if os.path.isdir(_STATIC_SOURCE_DIR) else []

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
    },
}


# ============================================================
# MEDIA FILES
# ============================================================

MEDIA_ROOT = join(os.path.dirname(BASE_DIR), "media")
MEDIA_URL = "/media/"


# ============================================================
# TEMPLATES
# ============================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": STATICFILES_DIRS,
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "social_django.context_processors.backends",
                "social_django.context_processors.login_redirect",
            ],
        },
    },
]


# ============================================================
# PASSWORD SECURITY (STRONGER POLICY)
# ============================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12},
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# ============================================================
# SESSION SECURITY
# ============================================================

SESSION_COOKIE_AGE = 3600  # 1 hour
SESSION_SAVE_EVERY_REQUEST = True


# ============================================================
# AUTH USER MODEL
# ============================================================

AUTH_USER_MODEL = "users.User"


THUMBNAIL_ALIASES = {
    "src.users": {
        "thumbnail": {"size": (100, 100), "crop": True},
        "medium_square_crop": {"size": (400, 400), "crop": True},
        "small_square_crop": {"size": (50, 50), "crop": True},
    },
}


# summernote configuration
SUMMERNOTE_CONFIG = {
    "summernote": {
        "toolbar": [
            ["style", ["style"]],
            ["font", ["bold", "underline", "clear"]],
            ["fontname", ["fontname"]],
            ["color", ["color"]],
            ["para", ["ul", "ol", "paragraph", "smallTagButton"]],
            ["table", ["table"]],
            ["insert", ["link", "video"]],
            ["view", ["fullscreen", "codeview", "help"]],
        ]
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.AutoField"