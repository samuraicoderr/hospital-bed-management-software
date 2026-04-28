"""
ViewSets for the bed domain.
"""

from __future__ import annotations

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from src.admissions.models import Admission, AdmissionRequest
from src.beds.filters import BedFilterSet, BedMaintenanceRecordFilterSet
from src.beds.models import Bed, BedMaintenanceRecord, BedStatusHistory, EquipmentTag
from src.beds.serializers import (
    BedAnalyticsSerializer,
    BedAssignmentSerializer,
    BedBlockSerializer,
    BedDetailSerializer,
    BedEligibilitySerializer,
    BedListSerializer,
    BedMaintenanceCreateSerializer,
    BedMaintenanceRecordSerializer,
    BedMaintenanceResolveSerializer,
    BedReleaseSerializer,
    BedReservationSerializer,
    BedSearchSerializer,
    BedStatisticsSerializer,
    BedStatusHistorySerializer,
    BedStatusUpdateSerializer,
    BedWriteSerializer,
    EquipmentTagSerializer,
)
from src.beds.services import BedMaintenanceService, BedService, EquipmentTagService
from src.lib.django.views_mixin import ViewSetHelperMixin
from src.organizations.models import Hospital
from src.organizations.services import HospitalAccessService
from src.users.permissions import IsVerifiedUser


class BedViewSet(ViewSetHelperMixin, viewsets.ModelViewSet):
    serializers = {
        "default": BedListSerializer,
        "retrieve": BedDetailSerializer,
        "create": BedWriteSerializer,
        "update": BedWriteSerializer,
        "partial_update": BedWriteSerializer,
        "update_status": BedStatusUpdateSerializer,
        "block": BedBlockSerializer,
        "reserve": BedReservationSerializer,
        "assign": BedAssignmentSerializer,
        "release": BedReleaseSerializer,
        "eligible": BedEligibilitySerializer,
        "search_available": BedSearchSerializer,
    }
    permissions = {"default": [IsVerifiedUser]}
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = BedFilterSet
    search_fields = ["bed_code", "bed_number", "ward__name", "ward__department__name"]
    ordering_fields = ["bed_code", "bed_number", "status_changed_at", "occupied_since", "created_at"]

    def get_queryset(self):
        BedService.expire_stale_reservations()
        return (
            Bed.objects.filter(
                Q(ward__department__hospital__organization__created_by=self.request.user)
                | Q(
                    ward__department__hospital__staff__user=self.request.user,
                    ward__department__hospital__staff__is_active=True,
                ),
                is_deleted=False,
            )
            .select_related(
                "ward__department__hospital",
                "ward__department",
                "current_admission__patient",
                "reserved_for__patient",
                "status_changed_by",
            )
            .prefetch_related("equipment_tags", "maintenance_records")
            .distinct()
        )

    def perform_create(self, serializer):
        ward = serializer.validated_data["ward"]
        HospitalAccessService.require_structure_management(ward.department.hospital, self.request.user)
        equipment_ids = serializer.validated_data.pop("equipment_tag_ids", [])
        equipment_tags = list(EquipmentTag.objects.filter(id__in=equipment_ids, is_active=True))
        payload = {
            key: value
            for key, value in serializer.validated_data.items()
            if key not in {"ward", "ward_id", "bed_number"}
        }
        self.instance = BedService.create_bed(
            ward=ward,
            bed_number=serializer.validated_data["bed_number"],
            created_by=self.request.user,
            equipment_tags=equipment_tags,
            **payload,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        output = BedDetailSerializer(self.instance, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        bed = self.get_object()
        HospitalAccessService.require_structure_management(bed.get_hospital(), self.request.user)
        equipment_ids = serializer.validated_data.pop("equipment_tag_ids", None)
        equipment_tags = None
        if equipment_ids is not None:
            equipment_tags = list(EquipmentTag.objects.filter(id__in=equipment_ids, is_active=True))
        updates = {key: value for key, value in serializer.validated_data.items() if key not in {"ward_id"}}
        if "ward" in serializer.validated_data:
            HospitalAccessService.require_structure_management(
                serializer.validated_data["ward"].department.hospital,
                self.request.user,
            )
        self.instance = BedService.update_bed(
            bed,
            updated_by=self.request.user,
            equipment_tags=equipment_tags,
            **updates,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(BedDetailSerializer(self.instance, context={"request": request}).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def perform_destroy(self, instance):
        HospitalAccessService.require_structure_management(instance.get_hospital(), self.request.user)
        BedService.deactivate_bed(instance, user=self.request.user)

    @action(detail=True, methods=["post"])
    def update_status(self, request, pk=None):
        bed = self.get_object()
        HospitalAccessService.require_structure_management(bed.get_hospital(), request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bed = BedService.change_status(
            bed=bed,
            new_status=serializer.validated_data["status"],
            user=request.user,
            reason=serializer.validated_data.get("reason"),
        )
        return Response(BedDetailSerializer(bed, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def block(self, request, pk=None):
        bed = self.get_object()
        HospitalAccessService.require_structure_management(bed.get_hospital(), request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bed = BedService.block_bed(
            bed,
            request.user,
            serializer.validated_data["reason"],
            serializer.validated_data.get("until"),
        )
        return Response(BedDetailSerializer(bed, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def unblock(self, request, pk=None):
        bed = self.get_object()
        HospitalAccessService.require_structure_management(bed.get_hospital(), request.user)
        bed = BedService.unblock_bed(bed, request.user)
        return Response(BedDetailSerializer(bed, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def mark_for_cleaning(self, request, pk=None):
        bed = self.get_object()
        HospitalAccessService.require_structure_management(bed.get_hospital(), request.user)
        priority = request.data.get("priority", "routine")
        reason = request.data.get("reason", "Manually marked for cleaning")
        bed = bed.mark_for_cleaning(user=request.user, priority=priority, reason=reason)
        return Response(BedDetailSerializer(bed, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def unmark_for_cleaning(self, request, pk=None):
        bed = self.get_object()
        HospitalAccessService.require_structure_management(bed.get_hospital(), request.user)
        reason = request.data.get("reason", "Cleaning requirement cleared")
        bed = bed.unmark_for_cleaning(user=request.user, reason=reason)
        return Response(BedDetailSerializer(bed, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def reserve(self, request, pk=None):
        bed = self.get_object()
        HospitalAccessService.require_structure_management(bed.get_hospital(), request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        admission_request = get_object_or_404(
            AdmissionRequest,
            id=serializer.validated_data["admission_request_id"],
        )
        bed = BedService.reserve_bed(
            bed=bed,
            admission_request=admission_request,
            user=request.user,
            reserved_until=serializer.validated_data["reserved_until"],
            reason=serializer.validated_data.get("reason"),
        )
        return Response(BedDetailSerializer(bed, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def clear_reservation(self, request, pk=None):
        bed = self.get_object()
        HospitalAccessService.require_structure_management(bed.get_hospital(), request.user)
        bed = bed.clear_reservation(user=request.user)
        return Response(BedDetailSerializer(bed, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        bed = self.get_object()
        HospitalAccessService.require_structure_management(bed.get_hospital(), request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        admission = get_object_or_404(Admission, id=serializer.validated_data["admission_id"])
        bed = BedService.assign_bed(
            bed=bed,
            admission=admission,
            user=request.user,
            reason=serializer.validated_data.get("reason"),
        )
        return Response(BedDetailSerializer(bed, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def release(self, request, pk=None):
        bed = self.get_object()
        HospitalAccessService.require_structure_management(bed.get_hospital(), request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bed = BedService.release_bed(
            bed=bed,
            user=request.user,
            reason=serializer.validated_data.get("reason"),
            trigger_cleaning=serializer.validated_data["trigger_cleaning"],
            cleaning_priority=serializer.validated_data["cleaning_priority"],
        )
        return Response(BedDetailSerializer(bed, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def eligible(self, request, pk=None):
        bed = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        issues = BedService.validate_patient_eligibility(
            bed,
            patient_gender=serializer.validated_data.get("patient_gender"),
            requires_isolation=serializer.validated_data.get("requires_isolation", False),
            equipment_required=serializer.validated_data.get("equipment_required"),
        )
        return Response({"eligible": not issues, "issues": issues})

    @action(detail=False, methods=["post"])
    def search_available(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        hospital = get_object_or_404(Hospital, id=serializer.validated_data["hospital_id"])
        HospitalAccessService.require_view_access(hospital, request.user)
        beds = BedService.find_available_beds(
            hospital=hospital,
            bed_type=serializer.validated_data.get("bed_type"),
            requires_isolation=serializer.validated_data.get("requires_isolation", False),
            patient_gender=serializer.validated_data.get("patient_gender"),
            equipment_required=serializer.validated_data.get("equipment_required"),
            department_id=serializer.validated_data.get("department_id"),
            ward_id=serializer.validated_data.get("ward_id"),
        )
        return self.paginate_and_respond(beds, BedListSerializer)

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        hospital_id = request.query_params.get("hospital")
        hospital = get_object_or_404(Hospital, id=hospital_id)
        HospitalAccessService.require_view_access(hospital, request.user)
        serializer = BedStatisticsSerializer(BedService.get_bed_statistics(hospital))
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def analytics(self, request):
        hospital_id = request.query_params.get("hospital")
        hospital = get_object_or_404(Hospital, id=hospital_id)
        HospitalAccessService.require_view_access(hospital, request.user)
        serializer = BedAnalyticsSerializer(BedService.get_bed_analytics(hospital))
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        bed = self.get_object()
        history = BedStatusHistory.objects.filter(bed=bed).select_related(
            "changed_by",
            "admission__patient",
        )[:100]
        return Response(BedStatusHistorySerializer(history, many=True).data)

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        bed = self.get_object()
        HospitalAccessService.require_structure_management(bed.get_hospital(), request.user)
        reason = request.data.get("reason", "Bed activated")
        bed = bed.activate(user=request.user, reason=reason)
        return Response(BedDetailSerializer(bed, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        bed = self.get_object()
        HospitalAccessService.require_structure_management(bed.get_hospital(), request.user)
        reason = request.data.get("reason", "Bed deactivated")
        bed = bed.deactivate(user=request.user, reason=reason)
        return Response(BedDetailSerializer(bed, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def delete_bed(self, request, pk=None):
        bed = self.get_object()
        HospitalAccessService.require_structure_management(bed.get_hospital(), request.user)
        reason = request.data.get("reason", "Bed deleted")
        bed = bed.soft_delete(user=request.user, reason=reason)
        return Response(BedDetailSerializer(bed, context={"request": request}).data)


class EquipmentTagViewSet(ViewSetHelperMixin, viewsets.ModelViewSet):
    serializers = {"default": EquipmentTagSerializer}
    permissions = {"default": [IsVerifiedUser]}
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category", "is_active"]
    search_fields = ["name", "code", "description"]
    ordering_fields = ["name", "category", "created_at"]

    def get_queryset(self):
        return EquipmentTag.objects.all().order_by("name")

    def perform_create(self, serializer):
        self.instance = EquipmentTagService.create_tag(**serializer.validated_data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            EquipmentTagSerializer(self.instance, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class BedMaintenanceRecordViewSet(ViewSetHelperMixin, viewsets.ModelViewSet):
    serializers = {
        "default": BedMaintenanceRecordSerializer,
        "create": BedMaintenanceCreateSerializer,
        "update": BedMaintenanceRecordSerializer,
        "partial_update": BedMaintenanceRecordSerializer,
        "resolve": BedMaintenanceResolveSerializer,
    }
    permissions = {"default": [IsVerifiedUser]}
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = BedMaintenanceRecordFilterSet
    ordering_fields = ["reported_at", "resolved_at", "severity"]

    def get_queryset(self):
        return (
            BedMaintenanceRecord.objects.filter(
                Q(bed__ward__department__hospital__organization__created_by=self.request.user)
                | Q(
                    bed__ward__department__hospital__staff__user=self.request.user,
                    bed__ward__department__hospital__staff__is_active=True,
                )
            )
            .select_related("bed__ward__department__hospital", "reported_by", "resolved_by")
            .distinct()
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bed = get_object_or_404(Bed, id=serializer.validated_data["bed"].id)
        HospitalAccessService.require_structure_management(bed.get_hospital(), request.user)
        record = BedMaintenanceService.create_record(
            bed=bed,
            user=request.user,
            issue_description=serializer.validated_data["issue_description"],
            maintenance_type=serializer.validated_data["maintenance_type"],
            severity=serializer.validated_data["severity"],
        )
        return Response(
            BedMaintenanceRecordSerializer(record, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        HospitalAccessService.require_structure_management(instance.bed.get_hospital(), request.user)
        serializer = BedMaintenanceRecordSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        record = BedMaintenanceService.update_record(
            instance,
            user=request.user,
            **serializer.validated_data,
        )
        return Response(BedMaintenanceRecordSerializer(record).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        record = self.get_object()
        HospitalAccessService.require_structure_management(record.bed.get_hospital(), request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = BedMaintenanceService.resolve_record(
            record,
            user=request.user,
            resolution_notes=serializer.validated_data.get("resolution_notes", ""),
        )
        return Response(BedMaintenanceRecordSerializer(record).data)
