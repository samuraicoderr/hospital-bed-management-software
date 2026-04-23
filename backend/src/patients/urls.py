from rest_framework.routers import SimpleRouter
from .views import PatientViewSet, ClinicalRequirementViewSet

patients_router = SimpleRouter()
patients_router.register(r"patients", PatientViewSet, basename="patient")
patients_router.register(r"clinical-requirements", ClinicalRequirementViewSet, basename="clinical-requirement")
