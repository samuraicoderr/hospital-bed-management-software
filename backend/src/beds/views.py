"""
ViewSets for bed management.
Per requirements section 4.1 - Bed inventory and status management.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q

from src.beds.models import Bed, EquipmentTag, BedStatusHistory
from src.beds.serializers import (
    BedListSerializer, BedDetailSerializer, BedStatusUpdateSerializer,
    EquipmentTagSerializer, BedStatusHistorySerializer, BedSearchSerializer,
    BedStatisticsSerializer
)
from src.beds.services import BedService
from src.organizations.models import Hospital


class BedViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing beds.
    Provides CRUD operations and additional actions for status management.
    """
    queryset = Bed.objects.filter(is_active=True)
    serializer_class = BedListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "bed_type", "ward__department", "is_isolation"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return BedDetailSerializer
        if self.action == "update_status":
            return BedStatusUpdateSerializer
        return BedListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by hospital
        hospital_id = self.request.query_params.get("hospital")
        if hospital_id:
            queryset = queryset.filter(ward__department__hospital_id=hospital_id)

        # Filter by department
        department_id = self.request.query_params.get("department")
        if department_id:
            queryset = queryset.filter(ward__department_id=department_id)

        # Filter by ward
        ward_id = self.request.query_params.get("ward")
        if ward_id:
            queryset = queryset.filter(ward_id=ward_id)

        # Search
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(bed_code__icontains=search) |
                Q(bed_number__icontains=search)
            )

        return queryset.select_related(
            "ward__department__hospital",
            "current_admission__patient"
        )

    @action(detail=True, methods=["post"])
    def update_status(self, request, pk=None):
        """
        Update bed status with audit trail.
        Per requirements 4.1.2
        """
        bed = self.get_object()
        serializer = BedStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        reason = serializer.validated_data.get("reason", "")

        try:
            result = BedService.change_status(
                bed=bed,
                new_status=new_status,
                user=request.user,
                reason=reason
            )
            return Response({
                "status": "success",
                "bed_id": str(result.id),
                "new_status": result.status,
                "changed_at": result.status_changed_at
            })
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=["post"])
    def block(self, request, pk=None):
        """Block a bed from being allocated."""
        bed = self.get_object()
        reason = request.data.get("reason", "")
        until = request.data.get("until")

        bed = BedService.block_bed(bed, request.user, reason, until)
        return Response({"status": "blocked", "bed_id": str(bed.id)})

    @action(detail=True, methods=["post"])
    def unblock(self, request, pk=None):
        """Unblock a preiously blocked bed."""
        bed = self.get_object()
        bed = BedService.unblock_bed(bed, request.user)
        return Response({"status": "unblocked", "bed_id": str(bed.id)})

    @action(detail=False, methods=["post"])
    def search_available(self, request):
        """
        Search for available beds matching patient requirements.
        Per requirements 4.2.2
        """
        serializer = BedSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        hospital_id = request.data.get("hospital_id")
        hospital = Hospital.objects.get(id=hospital_id)

        beds = BedService.find_available_beds(
            hospital=hospital,
            bed_type=serializer.validated_data.get("bed_type"),
            requires_isolation=serializer.validated_data.get("requires_isolation", False),
            patient_gender=serializer.validated_data.get("patient_gender"),
            equipment_required=serializer.validated_data.get("equipment_required")
        )

        # Filter by department if specified
        department_id = serializer.validated_data.get("department_id")
        if department_id:
            beds = beds.filter(ward__department_id=department_id)

        page = self.paginate_queryset(beds)
        if page is not None:
            serializer = BedListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = BedListSerializer(beds, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        """Get bed statistics for a hospital."""
        hospital_id = request.query_params.get("hospital")
        if not hospital_id:
            return Response(
                {"error": "hospital parameter required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        hospital = Hospital.objects.filter(id=hospital_id).first()
        if not hospital:
            return Response(
                {"error": "Hospital not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        stats = BedService.get_bed_statistics(hospital)
        serializer = BedStatisticsSerializer(stats)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        """Get status history for a bed."""
        bed = self.get_object()
        history = BedStatusHistory.objects.filter(
            bed=bed
        ).select_related("changed_by")[:100]

        serializer = BedStatusHistorySerializer(history, many=True)
        return Response(serializer.data)


class EquipmentTagViewSet(viewsets.ModelViewSet):
    """ViewSet for equipment tags."""
    queryset = EquipmentTag.objects.filter(is_active=True)
    serializer_class = EquipmentTagSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["category"]
    search_fields = ["name", "code"]


# DRF Router
from rest_framework.routers import DefaultRouter

beds_router = DefaultRouter()
beds_router.register(r"beds", BedViewSet, basename="bed")
beds_router.register(r"equipment-tags", EquipmentTagViewSet, basename="equipment-tag")
