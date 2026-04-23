from rest_framework.routers import SimpleRouter
from .views import ReportTemplateViewSet, ReportRunViewSet

reports_router = SimpleRouter()
reports_router.register(r"report-templates", ReportTemplateViewSet, basename="report-template")
reports_router.register(r"report-runs", ReportRunViewSet, basename="report-run")