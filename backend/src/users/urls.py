from django.urls import path
from rest_framework.routers import SimpleRouter

from src.users.views import (
    UserViewSet,
    AuthRouterViewSet,
    OAuthViewSet,
    SecurityViewSet
)

users_router = SimpleRouter()
users_router.register(r'users', UserViewSet, basename='users') # reverse('users-{list|create|action}', kwargs={'action': 'me'})


auth_router = SimpleRouter()
auth_router.register(r'auth', AuthRouterViewSet, basename='auth') # reverse('auth-{list|create|action}', kwargs={'action': 'login'})
auth_router.register(r'security', SecurityViewSet, basename='security') # reverse('security-{list|create|action}', kwargs={'action': '2fa'})

oauth_router = SimpleRouter()
oauth_router.register(r'oauth', OAuthViewSet, basename='oauth') # reverse('oauth