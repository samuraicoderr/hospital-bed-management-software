from django.conf import settings
from django.urls import path, re_path, include, reverse_lazy
from django.conf.urls.static import static
from django.views.generic.base import RedirectView
from django.urls import reverse_lazy
from django.conf import settings

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.routers import DefaultRouter

from src.users.auth import (
    TokenPairView__FirstFactor,
    TokenPairView__SecondFactor,
    RefreshTokenView,
)
from src.files.urls import files_router
from src.users.urls import (
    users_router,
    auth_router,
    oauth_router,
)
from src.common.urls import common_router
from src.notifications.urls import notification_router
from src.reset_password.routes import password_reset_router

# BedFlow hospital management routers
from src.organizations.urls import organizations_router
from src.beds.urls import beds_router
from src.patients.urls import patients_router
from src.admissions.urls import admissions_router
from src.discharges.urls import discharges_router
from src.housekeeping.urls import housekeeping_router
from src.dashboard.urls import dashboard_router
from src.reports.urls import reports_router
from src.alerts.urls import alerts_router

from .lib.django.superlazyroutertools import super_lazy_path


# ==================================================================================================

sub_routers = [
    [users_router, "user"],
    [auth_router, "auth"],
    [oauth_router, "oauth"],
    # [files_router, "files"],
    [notification_router, "notifications"],
    # [common_router, "common"],
    [password_reset_router, "password_reset", "password_reset"],
    # BedFlow routes
    [organizations_router, "organizations"],
    [beds_router, "beds"],
    [patients_router, "patients"],
    [admissions_router, "admissions"],
    [discharges_router, "discharges"],
    [housekeeping_router, "housekeeping"],
    [dashboard_router, "dashboard"],
    [reports_router, "reports"],
    [alerts_router, "alerts"],
]


urlpatterns = [
    # api
    *super_lazy_path("api/v1/", sub_routers, use_tag_as_default_namespace=False),
]


django_urls = [
    # auth
    path("api-auth/", include("rest_framework.urls", namespace="rest_framework")),
    # Legacy login endpoints
    # path(
    #     "api/v1/login/token/1stfactor/",
    #     TokenPairView__FirstFactor.as_view(),
    #     name="token_obtain_pair",
    # ),
    # path(
    #     "api/v1/login/token/2stfactor/",
    #     TokenPairView__SecondFactor.as_view(),
    #     name="token_obtain_pair2",
    # ),
    path(
        "api/v1/auth/login/refresh_token/", RefreshTokenView.as_view(), name="token_refresh"
    ),
    # admin panel
    # path('admin/', admin.site.urls),    # disable the django admin site
    # path('jet/', include('jet.urls')),  # Updated from url() to path()
    # summernote editor
    # path("summernote/", include("django_summernote.urls")),
]


def health(request):
    return JsonResponse({"status": "ok", "message": "We cool homie"})

swagger_urls = [
    
    # OpenAPI schema endpoint
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    
    # Swagger UI
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    
    # Redoc UI (optional)
    path("api/redocs/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # path("health/", include("health_check.urls")),  # Updated
    path("health/", health, name="health"),
    
    # the 'api-root' from django rest-frameworks default router
    re_path(r"^$", RedirectView.as_view(url=reverse_lazy("api-root"), permanent=False)),
] 


urlpatterns += django_urls + swagger_urls
# if settings.DEBUG:
#     urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)