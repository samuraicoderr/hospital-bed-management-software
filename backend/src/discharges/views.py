"""
ViewSets for discharge management.
Per requirements section 4.3 - Discharge workflow.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from src.discharges.models import Discharge
from src.discharges.services import DischargeService
from src.admissions.models import Admission


class DischargeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for discharge management.
    Per requirements 4.3
    """
    queryset = Discharge.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "hospital", "discharge_type"]

    def get_serializer_class(self):
        from src.discharges.serializers import DischargeListSerializer, DischargeDetailSerializer
        if self.action == "list":
            return DischargeListSerializer
        return DischargeDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by hospital
        hospital_id = self.request.query_params.get("hospital")
        if hospital_id:
            queryset = queryset.filter(hospital_id=hospital_id)

        return queryset.select_related("patient", "bed", "admission")

    def create(self, request, *args, **kwargs):
        """Initiate a discharge."""
        admission_id = request.data.get("admission_id")
        reason = request.data.get("reason", "")
        discharge_type = request.data.get("discharge_type", "routine")
        destination = request.data.get("destination", "home")

        admission = Admission.objects.filter(id=admission_id).first()
        if not admission:
            return Response(
                {"error": "Admission not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            discharge = DischargeService.initiate_discharge(
                admission=admission,
                user=request.user,
                reason=reason,
                discharge_type=discharge_type,
                destination=destination
            )
            return Response({
                "status": "success",
                "discharge_id": str(discharge.id)
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approve a pending discharge."""
        discharge = self.get_object()

        with transaction.atomic():
            discharge.approve(request.user)
            return Response({"status": "approved"})

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Complete a discharge."""
        discharge = self.get_object()

        try:
            result = DischargeService.complete_discharge(
                discharge=discharge,
                user=request.user
            )
            return Response({
                "status": "completed",
                "turnover_minutes": result.turnover_minutes
            })
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=["get"])
    def pending(self, request):
        """Get pending discharges."""
        hospital_id = request.query_params.get("hospital")
        if not hospital_id:
            return Response(
                {"error": "hospital parameter required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        pending = DischargeService.get_pending_discharges(hospital_id)
        from src.discharges.serializers import DischargeListSerializer
        serializer = DischargeListSerializer(pending, many=True)
        return Response(serializer.data)


# DRF Router
from rest_framework.routers import DefaultRouter
from django.db import transaction

discharges_router = DefaultRouter()
discharges_router.register(r"discharges", DischargeViewSet, basename="discharge")
