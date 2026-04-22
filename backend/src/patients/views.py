"""
ViewSets for patient management.
Per requirements section 4.2 - Patient records.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q

from src.patients.models import Patient, ClinicalRequirement
from src.patients.serializers import (
    PatientListSerializer, PatientDetailSerializer,
    PatientCreateSerializer, ClinicalRequirementSerializer
)


class PatientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for patient management.
    """
    queryset = Patient.objects.filter(is_active=True)
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["gender", "primary_hospital"]

    def get_serializer_class(self):
        if self.action == "list":
            return PatientListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return PatientCreateSerializer
        return PatientDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Search by name or MRN
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(mrn__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )

        # Filter by current admission status
        admitted = self.request.query_params.get("admitted")
        if admitted is not None:
            # This would need a more complex query in production
            pass

        return queryset

    @action(detail=True, methods=["get"])
    def admission_history(self, request, pk=None):
        """Get patient admission history."""
        patient = self.get_object()
        admissions = patient.get_admission_history()

        return Response([
            {
                "id": str(a.id),
                "admitted_at": a.admitted_at,
                "discharged_at": a.discharged_at,
                "bed": a.bed.bed_code if a.bed else None,
                "hospital": a.hospital.name,
            }
            for a in admissions
        ])

    @action(detail=True, methods=["get"])
    def clinical_requirements(self, request, pk=None):
        """Get active clinical requirements for patient."""
        patient = self.get_object()
        requirements = patient.clinical_requirements.filter(is_active=True)

        serializer = ClinicalRequirementSerializer(requirements, many=True)
        return Response(serializer.data)


class ClinicalRequirementViewSet(viewsets.ModelViewSet):
    """ViewSet for clinical requirements."""
    queryset = ClinicalRequirement.objects.filter(is_active=True)
    serializer_class = ClinicalRequirementSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["patient", "requirement_type", "priority"]


# DRF Router
from rest_framework.routers import DefaultRouter

patients_router = DefaultRouter()
patients_router.register(r"patients", PatientViewSet, basename="patient")
patients_router.register(r"clinical-requirements", ClinicalRequirementViewSet, basename="clinical-requirement")
