from rest_framework.routers import SimpleRouter
from .views import BedViewSet, EquipmentTagViewSet

beds_router = SimpleRouter()
beds_router.register(r"beds", BedViewSet, basename="bed")
beds_router.register(r"equipment-tags", EquipmentTagViewSet, basename="equipment-tag")
