"""
Centralized cloud storage configuration for Django.

Reads CLOUD_STORAGE_PROVIDER from the environment and configures the correct
django-storages backend.  All provider-specific logic is encapsulated here —
models, views, and serializers should never reference storage internals.

Usage (in settings):
    from src.config.cloud_settings import get_storage_settings
    globals().update(get_storage_settings())
"""

import logging
import os
import sys
from typing import Any
from uuid import uuid4

from django.utils.module_loading import import_string


logger = logging.getLogger("app")


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _env(key: str, default: str = "") -> str:
    """Shorthand to read an env var with an empty-string default."""
    return os.getenv(key, default)


def _require_env_vars(provider: str, keys: list[str]) -> dict[str, str]:
    """
    Return a dict of {key: value} for every key in *keys*.
    Raises ImproperlyConfigured if any are missing or blank.
    """
    from django.core.exceptions import ImproperlyConfigured

    values: dict[str, str] = {}
    missing: list[str] = []
    for k in keys:
        v = os.getenv(k, "")
        if not v:
            missing.append(k)
        values[k] = v

    if missing:
        joined = ", ".join(missing)
        raise ImproperlyConfigured(
            f"Missing required environment variables for '{provider}' storage provider: {joined}"
        )
    return values


# ─────────────────────────────────────────────
# PER-PROVIDER SETTINGS BUILDERS
# ─────────────────────────────────────────────
# Each builder returns a dict that will be merged into Django settings.
# The dict MUST include a "STORAGES" key (Django ≥4.2 format).

def _s3_settings() -> dict[str, Any]:
    """Amazon S3 (native)."""
    env = _require_env_vars("s3", [
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_STORAGE_BUCKET_NAME",
    ])
    region = _env("AWS_S3_REGION_NAME", "us-east-1")
    endpoint_url = _env("AWS_S3_ENDPOINT_URL", "")
    addressing_style = _env("AWS_S3_ADDRESSING_STYLE", "")
    bucket = env["AWS_STORAGE_BUCKET_NAME"]
    settings_dict = {
        "AWS_ACCESS_KEY_ID": env["AWS_ACCESS_KEY_ID"],
        "AWS_SECRET_ACCESS_KEY": env["AWS_SECRET_ACCESS_KEY"],
        "AWS_STORAGE_BUCKET_NAME": bucket,
        "AWS_S3_REGION_NAME": region,
        "AWS_S3_FILE_OVERWRITE": False,
        "AWS_DEFAULT_ACL": _env("AWS_DEFAULT_ACL", "public-read"),
        "AWS_QUERYSTRING_AUTH": _env("AWS_QUERYSTRING_AUTH", "False") == "True",
        "AWS_S3_CUSTOM_DOMAIN": _env("AWS_S3_CUSTOM_DOMAIN", ""),
        "AWS_HEADERS": {
            "Cache-Control": "max-age=86400, s-maxage=86400, must-revalidate",
        },
        "MEDIA_URL": _env(
            "MEDIA_URL",
            f"https://s3.amazonaws.com/{bucket}/",
        ),
        "STORAGES": {
            "default": {"BACKEND": "storages.backends.s3boto3.S3Boto3Storage"},
            "staticfiles": {"BACKEND": "storages.backends.s3boto3.S3StaticStorage"},
        },
    }

    if endpoint_url:
        settings_dict["AWS_S3_ENDPOINT_URL"] = endpoint_url
        # Local S3 APIs (RustFS/MinIO/etc.) commonly require path-style addressing.
        settings_dict["AWS_S3_ADDRESSING_STYLE"] = addressing_style or "path"

    return settings_dict


def _s3_compatible_settings(
    provider: str,
    required_keys: list[str],
    endpoint_url: str,
    media_url: str,
) -> dict[str, Any]:
    """
    Generic builder for any S3-compatible provider.
    Uses S3Boto3Storage with a custom endpoint.
    """
    env = _require_env_vars(provider, required_keys)
    bucket = env.get("AWS_STORAGE_BUCKET_NAME", "")
    return {
        "AWS_ACCESS_KEY_ID": env.get("AWS_ACCESS_KEY_ID", ""),
        "AWS_SECRET_ACCESS_KEY": env.get("AWS_SECRET_ACCESS_KEY", ""),
        "AWS_STORAGE_BUCKET_NAME": bucket,
        "AWS_S3_ENDPOINT_URL": endpoint_url,
        "AWS_S3_REGION_NAME": _env("AWS_S3_REGION_NAME", "auto"),
        "AWS_S3_FILE_OVERWRITE": False,
        "AWS_DEFAULT_ACL": _env("AWS_DEFAULT_ACL", "public-read"),
        "AWS_QUERYSTRING_AUTH": _env("AWS_QUERYSTRING_AUTH", "False") == "True",
        "AWS_S3_CUSTOM_DOMAIN": _env("AWS_S3_CUSTOM_DOMAIN", ""),
        "MEDIA_URL": _env("MEDIA_URL", media_url),
        "STORAGES": {
            "default": {"BACKEND": "storages.backends.s3boto3.S3Boto3Storage"},
            "staticfiles": {"BACKEND": "storages.backends.s3boto3.S3StaticStorage"},
        },
    }


def _r2_settings() -> dict[str, Any]:
    """Cloudflare R2 (S3-compatible)."""
    account_id = _require_env_vars("r2", ["R2_ACCOUNT_ID"])["R2_ACCOUNT_ID"]
    endpoint = f"https://{account_id}.r2.cloudflarestorage.com"
    bucket = _env("AWS_STORAGE_BUCKET_NAME", "")
    return _s3_compatible_settings(
        provider="r2",
        required_keys=["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_STORAGE_BUCKET_NAME", "R2_ACCOUNT_ID"],
        endpoint_url=endpoint,
        media_url=f"{endpoint}/{bucket}/",
    )


def _digitalocean_settings() -> dict[str, Any]:
    """DigitalOcean Spaces (S3-compatible)."""
    region = _require_env_vars("digitalocean", ["DO_SPACES_REGION"])["DO_SPACES_REGION"]
    endpoint = f"https://{region}.digitaloceanspaces.com"
    bucket = _env("AWS_STORAGE_BUCKET_NAME", "")
    return _s3_compatible_settings(
        provider="digitalocean",
        required_keys=["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_STORAGE_BUCKET_NAME", "DO_SPACES_REGION"],
        endpoint_url=endpoint,
        media_url=f"https://{bucket}.{region}.digitaloceanspaces.com/",
    )


def _b2_settings() -> dict[str, Any]:
    """Backblaze B2 (S3-compatible)."""
    env = _require_env_vars("b2", [
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_STORAGE_BUCKET_NAME",
        "B2_S3_ENDPOINT",
    ])
    bucket = env["AWS_STORAGE_BUCKET_NAME"]
    return _s3_compatible_settings(
        provider="b2",
        required_keys=["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_STORAGE_BUCKET_NAME", "B2_S3_ENDPOINT"],
        endpoint_url=env["B2_S3_ENDPOINT"],
        media_url=f"{env['B2_S3_ENDPOINT']}/{bucket}/",
    )


def _scaleway_settings() -> dict[str, Any]:
    """Scaleway Object Storage (S3-compatible)."""
    region = _require_env_vars("scaleway", ["SCALEWAY_REGION"])["SCALEWAY_REGION"]
    endpoint = f"https://s3.{region}.scw.cloud"
    bucket = _env("AWS_STORAGE_BUCKET_NAME", "")
    return _s3_compatible_settings(
        provider="scaleway",
        required_keys=["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_STORAGE_BUCKET_NAME", "SCALEWAY_REGION"],
        endpoint_url=endpoint,
        media_url=f"https://{bucket}.s3.{region}.scw.cloud/",
    )


def _oracle_settings() -> dict[str, Any]:
    """Oracle Cloud Object Storage (S3-compatible)."""
    env = _require_env_vars("oracle", [
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_STORAGE_BUCKET_NAME",
        "ORACLE_NAMESPACE",
        "ORACLE_REGION",
    ])
    namespace = env["ORACLE_NAMESPACE"]
    region = env["ORACLE_REGION"]
    endpoint = f"https://{namespace}.compat.objectstorage.{region}.oraclecloud.com"
    bucket = env["AWS_STORAGE_BUCKET_NAME"]
    return _s3_compatible_settings(
        provider="oracle",
        required_keys=[
            "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY",
            "AWS_STORAGE_BUCKET_NAME", "ORACLE_NAMESPACE", "ORACLE_REGION",
        ],
        endpoint_url=endpoint,
        media_url=f"{endpoint}/{bucket}/",
    )


def _gcs_settings() -> dict[str, Any]:
    """Google Cloud Storage."""
    env = _require_env_vars("gcs", ["GS_BUCKET_NAME"])
    bucket = env["GS_BUCKET_NAME"]
    return {
        "GS_BUCKET_NAME": bucket,
        "GS_PROJECT_ID": _env("GS_PROJECT_ID", ""),
        "GS_CREDENTIALS": _env("GOOGLE_APPLICATION_CREDENTIALS", ""),
        "GS_DEFAULT_ACL": _env("GS_DEFAULT_ACL", "publicRead"),
        "GS_FILE_OVERWRITE": False,
        "GS_QUERYSTRING_AUTH": _env("GS_QUERYSTRING_AUTH", "False") == "True",
        "MEDIA_URL": _env("MEDIA_URL", f"https://storage.googleapis.com/{bucket}/"),
        "STORAGES": {
            "default": {"BACKEND": "storages.backends.gcloud.GoogleCloudStorage"},
            "staticfiles": {"BACKEND": "storages.backends.gcloud.GoogleCloudStorage"},
        },
    }


def _azure_settings() -> dict[str, Any]:
    """Azure Blob Storage."""
    env = _require_env_vars("azure", [
        "AZURE_ACCOUNT_NAME",
        "AZURE_ACCOUNT_KEY",
        "AZURE_CONTAINER",
    ])
    account = env["AZURE_ACCOUNT_NAME"]
    container = env["AZURE_CONTAINER"]
    return {
        "AZURE_ACCOUNT_NAME": account,
        "AZURE_ACCOUNT_KEY": env["AZURE_ACCOUNT_KEY"],
        "AZURE_CONTAINER": container,
        "AZURE_SSL": True,
        "AZURE_OVERWRITE_FILES": False,
        "AZURE_CUSTOM_DOMAIN": _env("AZURE_CUSTOM_DOMAIN", ""),
        "MEDIA_URL": _env(
            "MEDIA_URL",
            f"https://{account}.blob.core.windows.net/{container}/",
        ),
        "STORAGES": {
            "default": {"BACKEND": "storages.backends.azure_storage.AzureStorage"},
            "staticfiles": {"BACKEND": "storages.backends.azure_storage.AzureStorage"},
        },
    }


def _dropbox_settings() -> dict[str, Any]:
    """Dropbox."""
    env = _require_env_vars("dropbox", ["DROPBOX_OAUTH2_TOKEN"])
    return {
        "DROPBOX_OAUTH2_TOKEN": env["DROPBOX_OAUTH2_TOKEN"],
        "DROPBOX_ROOT_PATH": _env("DROPBOX_ROOT_PATH", "/media"),
        "DROPBOX_WRITE_MODE": "overwrite",
        "MEDIA_URL": _env("MEDIA_URL", "/media/"),
        "STORAGES": {
            "default": {"BACKEND": "storages.backends.dropbox.DropboxStorage"},
            "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
        },
    }


def _ftp_settings() -> dict[str, Any]:
    """FTP."""
    env = _require_env_vars("ftp", ["FTP_STORAGE_LOCATION"])
    return {
        "FTP_STORAGE_LOCATION": env["FTP_STORAGE_LOCATION"],
        "FTP_ALLOW_OVERWRITE": False,
        "MEDIA_URL": _env("MEDIA_URL", "/media/"),
        "STORAGES": {
            "default": {"BACKEND": "storages.backends.ftp.FTPStorage"},
            "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
        },
    }


def _sftp_settings() -> dict[str, Any]:
    """SFTP."""
    env = _require_env_vars("sftp", ["SFTP_STORAGE_HOST"])
    return {
        "SFTP_STORAGE_HOST": env["SFTP_STORAGE_HOST"],
        "SFTP_STORAGE_ROOT": _env("SFTP_STORAGE_ROOT", "/media"),
        "SFTP_STORAGE_PARAMS": {
            "username": _env("SFTP_STORAGE_USER", ""),
            "password": _env("SFTP_STORAGE_PASSWORD", ""),
            "port": int(_env("SFTP_STORAGE_PORT", "22")),
        },
        "MEDIA_URL": _env("MEDIA_URL", "/media/"),
        "STORAGES": {
            "default": {"BACKEND": "storages.backends.sftpstorage.SFTPStorage"},
            "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
        },
    }


def _libcloud_settings() -> dict[str, Any]:
    """Apache Libcloud."""
    env = _require_env_vars("libcloud", [
        "LIBCLOUD_PROVIDER",
        "LIBCLOUD_KEY",
        "LIBCLOUD_SECRET",
        "LIBCLOUD_CONTAINER",
    ])
    return {
        "DEFAULT_LIBCLOUD_PROVIDER": "default",
        "LIBCLOUD_PROVIDERS": {
            "default": {
                "type": env["LIBCLOUD_PROVIDER"],
                "user": env["LIBCLOUD_KEY"],
                "key": env["LIBCLOUD_SECRET"],
                "bucket": env["LIBCLOUD_CONTAINER"],
            },
        },
        "MEDIA_URL": _env("MEDIA_URL", "/media/"),
        "STORAGES": {
            "default": {"BACKEND": "storages.backends.apache_libcloud.LibCloudStorage"},
            "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
        },
    }


# ─────────────────────────────────────────────
# PROVIDER REGISTRY
# ─────────────────────────────────────────────

PROVIDER_BUILDERS: dict[str, callable] = {
    "s3": _s3_settings,
    "r2": _r2_settings,
    "gcs": _gcs_settings,
    "azure": _azure_settings,
    "b2": _b2_settings,
    "digitalocean": _digitalocean_settings,
    "scaleway": _scaleway_settings,
    "oracle": _oracle_settings,
    "ftp": _ftp_settings,
    "sftp": _sftp_settings,
    "dropbox": _dropbox_settings,
    "libcloud": _libcloud_settings,
}

VALID_PROVIDERS = sorted(PROVIDER_BUILDERS.keys())


def _startup_feedback(message: str, is_error: bool = False) -> None:
    """Emit startup status to console and logger during early settings load."""
    stream = sys.stderr if is_error else sys.stdout
    print(message, file=stream, flush=True)
    if is_error:
        logger.error(message)
    else:
        logger.info(message)


def _provider_connection_details(provider_key: str, settings_dict: dict[str, Any], backend: str) -> str:
    """Build a compact metadata string for connection logs."""
    bucket_or_container = (
        settings_dict.get("AWS_STORAGE_BUCKET_NAME")
        or settings_dict.get("GS_BUCKET_NAME")
        or settings_dict.get("AZURE_CONTAINER")
        or settings_dict.get("LIBCLOUD_PROVIDERS", {}).get("default", {}).get("bucket")
        or "n/a"
    )
    endpoint = (
        settings_dict.get("AWS_S3_ENDPOINT_URL")
        or settings_dict.get("AWS_S3_CUSTOM_DOMAIN")
        or settings_dict.get("AZURE_CUSTOM_DOMAIN")
        or settings_dict.get("MEDIA_URL")
        or "n/a"
    )
    return (
        f"provider={provider_key}, backend={backend}, "
        f"target={bucket_or_container}, endpoint={endpoint}"
    )


def _verify_cloud_connection(provider_key: str, settings_dict: dict[str, Any]) -> None:
    """
    Validate that the configured cloud provider is reachable and credentials work.
    Raises RuntimeError to stop startup if the probe fails.
    """
    storages_config = settings_dict.get("STORAGES", {})
    default_config = storages_config.get("default", {})
    backend = default_config.get("BACKEND", "")
    if not backend:
        raise RuntimeError(
            f"❌ Failed to connect to cloud '{provider_key}': missing STORAGES.default.BACKEND"
        )

    options = dict(default_config.get("OPTIONS", {}))

    # During settings import, django.conf.settings is not fully initialized yet.
    # For S3 backends, pass explicit values so probing does not depend on global settings.
    if backend.startswith("storages.backends.s3boto3."):
        options.setdefault("access_key", settings_dict.get("AWS_ACCESS_KEY_ID"))
        options.setdefault("secret_key", settings_dict.get("AWS_SECRET_ACCESS_KEY"))
        options.setdefault("bucket_name", settings_dict.get("AWS_STORAGE_BUCKET_NAME"))
        options.setdefault("region_name", settings_dict.get("AWS_S3_REGION_NAME"))
        options.setdefault("endpoint_url", settings_dict.get("AWS_S3_ENDPOINT_URL"))
        options.setdefault("custom_domain", settings_dict.get("AWS_S3_CUSTOM_DOMAIN"))
        options = {k: v for k, v in options.items() if v not in (None, "")}

    details = _provider_connection_details(provider_key, settings_dict, backend)
    probe_name = f"__startup_cloud_probe__{uuid4().hex}"
    _startup_feedback(f"☁️ Checking cloud connection for '{provider_key}' ({details})")

    try:
        storage_cls = import_string(backend)
        storage = storage_cls(**options) if options else storage_cls()
        # A non-existent object check is enough to force most backends to perform
        # network auth/connection without mutating remote state.
        storage.exists(probe_name)
    except Exception as exc:
        _startup_feedback(
            f"❌ Failed to connect to cloud '{provider_key}' ({details}): {exc}",
            is_error=True,
        )
        logger.exception("❌ Failed to connect to cloud '%s' (%s)", provider_key, details)
        raise RuntimeError(
            f"❌ Failed to connect to cloud '{provider_key}' ({details}): {exc}"
        ) from exc

    _startup_feedback(f"✅ Connected to cloud '{provider_key}' ({details})")


# ─────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────

def _local_fallback_settings() -> dict[str, Any]:
    """Return Django settings that use the default local filesystem backend."""
    return {
        "STORAGES": {
            "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
            "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
        },
    }


def get_storage_settings() -> dict[str, Any]:
    """
    Read CLOUD_STORAGE_PROVIDER from the environment and return a dict of
    Django settings to configure the matching django-storages backend.

    Fail-safe behaviour:
    - FORCE_LOCAL_STORAGE=True  →  always use local filesystem (bypass cloud entirely)
    - Unset / empty  →  local filesystem (warn in logs)
    - Invalid value  →  local filesystem if DEBUG, else ImproperlyConfigured
    - Valid value    →  configured provider (may raise if env vars are missing)
    """
    
    # ── FIRST: Check for explicit local storage override ──
    force_local = os.getenv("FORCE_LOCAL_STORAGE", "False") == "True"
    if force_local:
        logger.info("⚠️ FORCE_LOCAL_STORAGE=True. Using local filesystem storage.")
        return _local_fallback_settings()

    provider_key = _env("CLOUD_STORAGE_PROVIDER", "").strip().lower()
    debug = os.getenv("DJANGO_DEBUG", "True") == "True"

    # ── Not set ──────────────────────────
    if not provider_key:
        raise RuntimeError(
            f"⚠️ CLOUD_STORAGE_PROVIDER is not set. \n"
            f"Please set it to one of the following: {', '.join(VALID_PROVIDERS)}"
        )

    # ── Invalid provider ─────────────────────
    if provider_key not in PROVIDER_BUILDERS:
        valid = ", ".join(VALID_PROVIDERS)
        message = (
            f"Invalid CLOUD_STORAGE_PROVIDER='{provider_key}'. "
            f"Valid choices are: {valid}"
        )

        if not debug:
            from django.core.exceptions import ImproperlyConfigured
            raise ImproperlyConfigured(message)

        logger.warning(
            "%s — Falling back to local filesystem storage.", message
        )
        return _local_fallback_settings()

    # ── Valid provider ───────────────────────
    logger.info("Configuring cloud storage provider: %s", provider_key)
    result = PROVIDER_BUILDERS[provider_key]()
    _verify_cloud_connection(provider_key, result)

    # Ensure easy-thumbnails also uses the cloud backend for media.
    storages_config = result.get("STORAGES", {})
    default_backend = storages_config.get("default", {}).get("BACKEND", "")
    if default_backend:
        result.setdefault("THUMBNAIL_DEFAULT_STORAGE", default_backend)

    return result
