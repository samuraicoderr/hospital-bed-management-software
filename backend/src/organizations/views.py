"""
ViewSets for organization management.
Per requirements section 4.7 - Multi-hospital support.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from src.organizations.models import (
    Organization, Hospital, Building, Department, Ward, HospitalStaff
)
from src.organizations.serializers import (
    OrganizationSerializer, HospitalListSerializer, HospitalDetailSerializer,
    BuildingSerializer, DepartmentSerializer, WardSerializer,
    WardListSerializer, HospitalStaffSerializer
)


class OrganizationViewSet(viewsets.ModelViewSet):
    """ViewSet for organizations."""
    queryset = Organization.objects.filter(is_active=True)
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["name", "code"]


class HospitalViewSet(viewsets.ModelViewSet):
    """ViewSet for hospitals."""
    queryset = Hospital.objects.filter(is_active=True)
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["organization", "hospital_type", "is_active"]

    def get_serializer_class(self):
        if self.action in ["list"]:
            return HospitalListSerializer
        return HospitalDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by organization
        organization_id = self.request.query_params.get("organization")
        if organization_id:
            queryset = queryset.filter(organization_id=organization_id)

        return queryset

    @action(detail=True, methods=["get"])
    def departments(self, request, pk=None):
        """Get departments for this hospital."""
        hospital = self.get_object()
        departments = Department.objects.filter(
            hospital=hospital,
            is_active=True
        ).order_by("name")

        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def buildings(self, request, pk=None):
        """Get buildings for this hospital."""
        hospital = self.get_object()
        buildings = Building.objects.filter(
            hospital=hospital,
            is_active=True
        ).order_by("name")

        serializer = BuildingSerializer(buildings, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def staff(self, request, pk=None):
        """Get staff for this hospital."""
        hospital = self.get_object()
        staff = HospitalStaff.objects.filter(
            hospital=hospital,
            is_active=True
        ).select_related("user", "department")

        serializer = HospitalStaffSerializer(staff, many=True)
        return Response(serializer.data)


class BuildingViewSet(viewsets.ModelViewSet):
    """ViewSet for buildings."""
    queryset = Building.objects.filter(is_active=True)
    serializer_class = BuildingSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["hospital"]


class DepartmentViewSet(viewsets.ModelViewSet):
    """ViewSet for departments."""
    queryset = Department.objects.filter(is_active=True)
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["hospital", "department_type", "gender_restriction"]
    search_fields = ["name", "code"]

    @action(detail=True, methods=["get"])
    def wards(self, request, pk=None):
        """Get wards for this department."""
        department = self.get_object()
        wards = Ward.objects.filter(
            department=department,
            is_active=True
        ).order_by("name")

        serializer = WardListSerializer(wards, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def available_beds(self, request, pk=None):
        """Get available beds for this department."""
        department = self.get_object()
        beds = department.get_available_beds()

        from src.beds.serializers import BedListSerializer
        serializer = BedListSerializer(beds, many=True)
        return Response(serializer.data)


class WardViewSet(viewsets.ModelViewSet):
    """ViewSet for wards."""
    queryset = Ward.objects.filter(is_active=True)
    serializer_class = WardSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["department", "ward_type"]


class HospitalStaffViewSet(viewsets.ModelViewSet):
    """ViewSet for hospital staff."""
    queryset = HospitalStaff.objects.filter(is_active=True)
    serializer_class = HospitalStaffSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["hospital", "department", "role"]
