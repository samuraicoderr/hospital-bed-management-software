import os


EMAIL_BACKEND = os.getenv(
	"EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend"
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "localhost")
EMAIL_PORT = os.getenv("EMAIL_PORT", 1025)
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True") == "True"
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")


ELASTIC_EMAIL_NAME = os.getenv("ELASTIC_EMAIL_NAME", "MyApp")
ELASTIC_EMAIL = os.getenv("ELASTIC_EMAIL", "noreply@bloombyte.dev")
ELASTIC_EMAIL_KEY = os.getenv("ELASTIC_EMAIL_KEY")


ZEPTO_EMAIL_NAME = os.getenv("ZEPTO_EMAIL_NAME", "MyApp")
ZEPTO_EMAIL = os.getenv("ZEPTO_EMAIL", "noreply@bloombyte.dev")
ZEPTO_API_KEY = os.getenv("ZEPTO_API_KEY")
