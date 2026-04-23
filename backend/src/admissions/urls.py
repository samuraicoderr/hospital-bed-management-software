from rest_framework.routers import SimpleRouter
from .views import AdmissionRequestViewSet, AdmissionViewSet, TransferViewSet

admissions_router = SimpleRouter()
admissions_router.register(r"admission-requests", AdmissionRequestViewSet, basename="admission-request")
admissions_router.register(r"admissions", AdmissionViewSet, basename="admission")
admissions_router.register(r"transfers", TransferViewSet, basename="transfer")
