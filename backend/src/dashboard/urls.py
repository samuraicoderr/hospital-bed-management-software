from rest_framework.routers import SimpleRouter
from .views import DashboardViewSet

dashboard_router = SimpleRouter()
dashboard_router.register(r"dashboard", DashboardViewSet, basename="dashboard")
