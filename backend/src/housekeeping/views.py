"""
ViewSets for housekeeping management.
Per requirements section 4.3.2 - Cleaning workflow.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from src.housekeeping.models import CleaningTask, HousekeepingStaff
from src.housekeeping.services import HousekeepingService
from src.housekeeping.serializers import (
    CleaningTaskListSerializer, CleaningTaskDetailSerializer,
    HousekeepingStaffSerializer, TaskStatusUpdateSerializer
)


class CleaningTaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for cleaning tasks.
    Per requirements 4.3.2
    """
    queryset = CleaningTask.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "priority", "bed__ward__department__hospital"]

    def get_serializer_class(self):
        if self.action == "list":
            return CleaningTaskListSerializer
        if self.action == "update_status":
            return TaskStatusUpdateSerializer
        return CleaningTaskDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.select_related("bed", "assigned_to")

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        """Assign task to housekeeping staff."""
        task = self.get_object()
        staff_id = request.data.get("staff_id")

        try:
            task = HousekeepingService.assign_task(task)
            return Response({"status": "assigned"})
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Start cleaning task."""
        task = self.get_object()

        try:
            HousekeepingService.start_cleaning(task, request.user)
            return Response({"status": "started"})
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Complete cleaning task."""
        task = self.get_object()
        notes = request.data.get("notes", "")

        try:
            HousekeepingService.complete_cleaning(task, request.user, notes)
            return Response({
                "status": "completed",
                "bed_status": task.bed.status
            })
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=["get"])
    def my_tasks(self, request):
        """Get tasks assigned to current user."""
        tasks = CleaningTask.objects.filter(
            assigned_to=request.user,
            status__in=["assigned", "in_progress"]
        ).select_related("bed")

        serializer = CleaningTaskListSerializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def backlog(self, request):
        """Get cleaning backlog for hospital."""
        hospital_id = request.query_params.get("hospital")
        if not hospital_id:
            return Response(
                {"error": "hospital parameter required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        tasks = HousekeepingService.get_cleaning_backlog(hospital_id)
        serializer = CleaningTaskListSerializer(tasks, many=True)
        return Response(serializer.data)


class HousekeepingStaffViewSet(viewsets.ModelViewSet):
    """ViewSet for housekeeping staff."""
    queryset = HousekeepingStaff.objects.filter(is_active=True)
    serializer_class = HousekeepingStaffSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["hospital", "is_available"]


# DRF Router
from rest_framework.routers import DefaultRouter

housekeeping_router = DefaultRouter()
housekeeping_router.register(r"cleaning-tasks", CleaningTaskViewSet, basename="cleaning-task")
housekeeping_router.register(r"housekeeping-staff", HousekeepingStaffViewSet, basename="housekeeping-staff")
