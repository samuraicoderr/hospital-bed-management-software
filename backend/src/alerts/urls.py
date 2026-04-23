from rest_framework.routers import SimpleRouter
from .views import AlertViewSet, AlertConfigurationViewSet, UserAlertPreferenceViewSet

alerts_router = SimpleRouter()
alerts_router.register(r"alerts", AlertViewSet, basename="alert")
alerts_router.register(r"alert-configurations", AlertConfigurationViewSet, basename="alert-configuration")
alerts_router.register(r"alert-preferences", UserAlertPreferenceViewSet, basename="alert-preference")