from django.db import router
from django.urls import path
from rest_framework.routers import SimpleRouter


from src.notifications.views import (
    NotificationViewSet
)


notification_router = SimpleRouter()
notification_router.register(r'notifications', NotificationViewSet, basename='notifications')