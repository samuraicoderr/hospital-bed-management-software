"""
ViewSets for patient management.
Per requirements section 4.2 - Patient records.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, OuterRef, Subquery, Exists

from src.patients.models import Patient, ClinicalRequirement
from src.patients.serializers import (
    PatientListSerializer, PatientDetailSerializer,
    PatientCreateSerializer, PatientUpdateSerializer,
    ClinicalRequirementSerializer, ClinicalRequirementCreateSerializer,
    ClinicalRequirementUpdateSerializer
)


class PatientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for patient management.
    """
    queryset = Patient.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["gender", "primary_hospital", "is_active", "is_deceased"]

    def get_serializer_class(self):
        if self.action == "list":
            return PatientListSerializer
        if self.action == "create":
            return PatientCreateSerializer
        if self.action in ["update", "partial_update"]:
            return PatientUpdateSerializer
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
            admitted_bool = admitted.lower() in ["true", "1", "yes"]
            if admitted_bool:
                # Filter patients with active admissions
                from src.admissions.models import Admission
                queryset = queryset.filter(
                    Exists(
                        Admission.objects.filter(
                            patient=OuterRef("pk"),
                            status__in=["admitted", "assigned"]
                        )
                    )
                )
            else:
                # Filter patients without active admissions
                from src.admissions.models import Admission
                queryset = queryset.exclude(
                    Exists(
                        Admission.objects.filter(
                            patient=OuterRef("pk"),
                            status__in=["admitted", "assigned"]
                        )
                    )
                )

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
                "department": a.department.name,
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

    @action(detail=True, methods=["get"])
    def current_admission(self, request, pk=None):
        """Get current admission for patient."""
        patient = self.get_object()
        admission = patient.get_current_admission()

        if admission:
            return Response({
                "id": str(admission.id),
                "bed": admission.bed.bed_code if admission.bed else None,
                "hospital": admission.hospital.name,
                "hospital_id": str(admission.hospital.id),
                "department": admission.department.name,
                "department_id": str(admission.department.id),
                "admitted_at": admission.admitted_at,
                "status": admission.status,
            })
        return Response({"detail": "No current admission"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=["get"])
    def admission_status(self, request, pk=None):
        """Check if patient is currently admitted."""
        patient = self.get_object()
        is_admitted = patient.is_currently_admitted()

        return Response({
            "is_currently_admitted": is_admitted,
            "current_admission_id": str(patient.get_current_admission().id) if is_admitted else None,
        })

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        """Soft deactivate patient."""
        patient = self.get_object()
        patient.is_active = False
        patient.save()

        serializer = PatientDetailSerializer(patient)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def mark_deceased(self, request, pk=None):
        """Mark patient as deceased."""
        patient = self.get_object()
        patient.is_deceased = True
        patient.is_active = False

        deceased_date = request.data.get("deceased_date")
        if deceased_date:
            from datetime import datetime
            patient.deceased_date = datetime.strptime(deceased_date, "%Y-%m-%d").date()
        else:
            from django.utils import timezone
            patient.deceased_date = timezone.now().date()

        patient.save()

        serializer = PatientDetailSerializer(patient)
        return Response(serializer.data)


class ClinicalRequirementViewSet(viewsets.ModelViewSet):
    """ViewSet for clinical requirements."""
    queryset = ClinicalRequirement.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["patient", "requirement_type", "priority", "is_active"]

    def get_serializer_class(self):
        if self.action == "create":
            return ClinicalRequirementCreateSerializer
        if self.action in ["update", "partial_update"]:
            return ClinicalRequirementUpdateSerializer
        return ClinicalRequirementSerializer

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        """Resolve a clinical requirement."""
        requirement = self.get_object()
        requirement.resolve(request.user)

        serializer = ClinicalRequirementSerializer(requirement)
        return Response(serializer.data)

