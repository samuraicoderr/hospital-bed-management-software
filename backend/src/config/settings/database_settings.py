import os

from django.core.exceptions import ImproperlyConfigured

from .common import BASE_DIR


ALT_BACKENDS = {
	"postgres": "django.db.backends.postgresql",
	"mysql": "django.db.backends.mysql",
}

USE_DEFAULT_BACKEND = os.getenv("USE_DEFAULT_BACKEND") == "True"
ALT_BACKEND = str(os.getenv("ALT_BACKEND", "")).strip().lower()


if USE_DEFAULT_BACKEND:
	DATABASES = {
		"default": {
			"ENGINE": "django.db.backends.sqlite3",
			"NAME": os.path.join(BASE_DIR, "db.sqlite3"),
		}
	}
else:
	try:
		db_backend = ALT_BACKENDS[ALT_BACKEND]
	except KeyError as exc:
		raise ImproperlyConfigured(
			f"ALT_BACKEND={ALT_BACKEND!r} in .env must be either 'postgres' or 'mysql'."
		) from exc

	options = {
		"sslmode": os.getenv("DB_SSL_MODE"),
		"channel_binding": os.getenv("DB_CHANNEL_BINDING"),
	}
	if not options["sslmode"] and not options["channel_binding"]:
		options = {}

	DATABASES = {
		"default": {
			"ENGINE": db_backend,
			"NAME": os.getenv("DB_NAME"),
			"USER": os.getenv("DB_USER"),
			"PASSWORD": os.getenv("DB_PASSWORD"),
			"HOST": os.getenv("DB_HOST", "db"),
			"PORT": os.getenv("DB_PORT"),
			"OPTIONS": options,
		}
	}
