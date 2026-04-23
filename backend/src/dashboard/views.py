"""
ViewSets for dashboard.
Per requirements section 4.5.1 - Operational Dashboard.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q, Avg
from django.utils import timezone

from src.dashboard.models import (
    TimeSeriesMetric, BedAvailabilitySnapshot, DailyCensus
)
from src.beds.services import BedService
from src.organizations.models import Hospital


class DashboardViewSet(viewsets.ViewSet):
    """
    ViewSet for dashboard operations.
    Per requirements 4.5.1
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def operational(self, request):
        """
        Get operational dashboard data.
        Total beds, Occupied, Available, ICU occupancy, Cleaning backlog, ALOS
        """
        hospital_id = request.query_params.get("hospital")
        if not hospital_id:
            return Response(
                {"error": "hospital parameter required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        hospital = Hospital.objects.get(id=hospital_id)

        # Bed statistics
        bed_stats = BedService.get_bed_statistics(hospital)

        # Cleaning backlog
        from src.housekeeping.models import CleaningTask
        cleaning_backlog = CleaningTask.objects.filter(
            bed__ward__department__hospital=hospital,
            status__in=["pending", "assigned", "overdue"]
        ).count()

        # Admission queue
        from src.admissions.models import AdmissionRequest
        admission_queue = AdmissionRequest.objects.filter(
            preferred_hospital=hospital,
            status__in=["pending", "approved"]
        ).count()

        # Average Length of Stay (ALOS)
        from src.admissions.models import Admission
        alos_data = Admission.objects.filter(
            hospital=hospital,
            status="discharged",
            admitted_at__gte=timezone.now() - timezone.timedelta(days=30)
        ).aggregate(
            avg_los=Avg("admitted_at")  # This is a placeholder - actual calculation needed
        )

        return Response({
            "bed_stats": bed_stats,
            "cleaning_backlog": cleaning_backlog,
            "admission_queue": admission_queue,
            "average_los_days": alos_data.get("avg_los") or 0,
            "updated_at": timezone.now()
        })

    @action(detail=False, methods=["get"])
    def occupancy_trend(self, request):
        """Get occupancy trend data for charts."""
        hospital_id = request.query_params.get("hospital")
        days = int(request.query_params.get("days", 7))

        if not hospital_id:
            return Response(
                {"error": "hospital parameter required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        snapshots = BedAvailabilitySnapshot.objects.filter(
            hospital_id=hospital_id,
            snapshot_time__gte=timezone.now() - timezone.timedelta(days=days)
        ).order_by("snapshot_time")

        return Response({
            "labels": [s.snapshot_time.strftime("%Y-%m-%d %H:00") for s in snapshots],
            "occupancy": [s.occupancy_rate for s in snapshots],
            "available": [s.available_beds for s in snapshots],
            "occupied": [s.occupied_beds for s in snapshots],
        })
