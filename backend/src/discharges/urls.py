# DRF Router
from rest_framework.routers import SimpleRouter
from .views import DischargeViewSet


discharges_router = SimpleRouter()
discharges_router.register(r"discharges", DischargeViewSet, basename="discharge")
