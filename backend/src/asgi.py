"""
ASGI config for bedflow project.

Handles both HTTP (via Django WSGI adapter) and WebSocket (via Django Channels).
"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "src.config.settings")

django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

from src.notifications.routing import websocket_urlpatterns

django_asgi_app = get_asgi_application()


application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            URLRouter(websocket_urlpatterns)
        ),
    }
)
