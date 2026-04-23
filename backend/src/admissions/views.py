"""
ViewSets for admission management.
Per requirements section 4.2 - Admissions and transfers.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404

from src.admissions.models import AdmissionRequest, Admission, Transfer
from src.admissions.serializers import (
    AdmissionRequestListSerializer, AdmissionRequestDetailSerializer,
    AdmissionRequestCreateSerializer, AdmissionListSerializer,
    AdmissionDetailSerializer, TransferListSerializer,
    TransferDetailSerializer, TransferCreateSerializer
)
from src.admissions.services import AdmissionService, TransferService
from src.beds.models import Bed


class AdmissionRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for admission requests.
    Per requirements 4.2.1
    """
    queryset = AdmissionRequest.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "priority", "preferred_hospital"]

    def get_serializer_class(self):
        if self.action == "list":
            return AdmissionRequestListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return AdmissionRequestCreateSerializer
        return AdmissionRequestDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by hospital
        hospital_id = self.request.query_params.get("hospital")
        if hospital_id:
            queryset = queryset.filter(preferred_hospital_id=hospital_id)

        return queryset.select_related(
            "patient", "assigned_bed", "preferred_hospital"
        )

    @action(detail=True, methods=["post"])
    def assign_bed(self, request, pk=None):
        """Assign a bed to this admission request."""
        admission_request = self.get_object()
        bed_id = request.data.get("bed_id")

        if not bed_id:
            return Response(
                {"error": "bed_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        bed = get_object_or_404(Bed, id=bed_id)

        try:
            result = AdmissionService.assign_bed_to_request(
                admission_request=admission_request,
                bed=bed,
                user=request.user
            )
            return Response({
                "status": "success",
                "request_id": str(result.id),
                "assigned_bed": bed.bed_code
            })
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=["post"])
    def admit(self, request, pk=None):
        """Convert request to actual admission."""
        admission_request = self.get_object()

        try:
            admission = AdmissionService.admit_patient(
                admission_request=admission_request,
                user=request.user
            )
            return Response({
                "status": "success",
                "admission_id": str(admission.id),
                "bed": admission.bed.bed_code if admission.bed else None
            })
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=["get"])
    def suggest_beds(self, request, pk=None):
        """Suggest available beds for this request."""
        admission_request = self.get_object()
        beds = AdmissionService.suggest_beds_for_request(admission_request)

        from src.beds.serializers import BedListSerializer
        serializer = BedListSerializer(beds, many=True)
        return Response(serializer.data)


class AdmissionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for admissions.
    Per requirements 4.2
    """
    queryset = Admission.objects.filter(status__in=["admitted", "assigned"])
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["hospital", "department", "status"]

    def get_serializer_class(self):
        if self.action == "list":
            return AdmissionListSerializer
        return AdmissionDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by hospital
        hospital_id = self.request.query_params.get("hospital")
        if hospital_id:
            queryset = queryset.filter(hospital_id=hospital_id)

        return queryset.select_related("patient", "bed", "hospital", "department")


class TransferViewSet(viewsets.ModelViewSet):
    """
    ViewSet for patient transfers.
    Per requirements 4.2.3
    """
    queryset = Transfer.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "from_hospital", "to_hospital"]

    def get_serializer_class(self):
        if self.action == "list":
            return TransferListSerializer
        if self.action == "create":
            return TransferCreateSerializer
        return TransferDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by hospital
        hospital_id = self.request.query_params.get("hospital")
        if hospital_id:
            queryset = queryset.filter(
                Q(from_hospital_id=hospital_id) | Q(to_hospital_id=hospital_id)
            )

        return queryset.select_related(
            "patient", "from_bed", "to_bed", "from_department", "to_department"
        )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approve a transfer request."""
        transfer = self.get_object()

        try:
            TransferService.approve_transfer(transfer, request.user)
            return Response({"status": "approved"})
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Complete an approved transfer."""
        transfer = self.get_object()

        try:
            TransferService.complete_transfer(transfer, request.user)
            return Response({"status": "completed"})
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
