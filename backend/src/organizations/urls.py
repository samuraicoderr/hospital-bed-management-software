# DRF Router
from rest_framework.routers import SimpleRouter
from .views import (
    OrganizationViewSet,
    HospitalViewSet,
    BuildingViewSet,
    DepartmentViewSet,
    WardViewSet,
    HospitalStaffViewSet,
    HospitalStaffInvitationViewSet,
)

organizations_router = SimpleRouter()
organizations_router.register(r"organizations", OrganizationViewSet, basename="organization")
organizations_router.register(r"hospitals", HospitalViewSet, basename="hospital")
organizations_router.register(r"buildings", BuildingViewSet, basename="building")
organizations_router.register(r"departments", DepartmentViewSet, basename="department")
organizations_router.register(r"wards", WardViewSet, basename="ward")
organizations_router.register(r"hospital-staff", HospitalStaffViewSet, basename="hospital-staff")
organizations_router.register(r"hospital-staff-invitations", HospitalStaffInvitationViewSet, basename="hospital-staff-invitations")
