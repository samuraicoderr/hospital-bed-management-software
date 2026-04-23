"""
ViewSets for alert management.
Per requirements section 4.6 - Notifications and alerts.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from src.alerts.models import Alert, AlertConfiguration, UserAlertPreference
from src.alerts.serializers import (
    AlertListSerializer, AlertDetailSerializer,
    AlertConfigurationSerializer, UserAlertPreferenceSerializer
)
from src.alerts.services import AlertService


class AlertViewSet(viewsets.ModelViewSet):
    """
    ViewSet for alerts.
    Per requirements 4.6
    """
    queryset = Alert.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["is_active", "severity", "alert_type", "hospital"]

    def get_serializer_class(self):
        if self.action == "list":
            return AlertListSerializer
        return AlertDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by active status by default
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")

        # Filter by hospital
        hospital_id = self.request.query_params.get("hospital")
        if hospital_id:
            queryset = queryset.filter(hospital_id=hospital_id)

        return queryset.select_related("acknowledged_by", "resolved_by")

    @action(detail=True, methods=["post"])
    def acknowledge(self, request, pk=None):
        """Acknowledge an alert."""
        alert = self.get_object()
        AlertService.acknowledge_alert(alert, request.user)
        return Response({"status": "acknowledged"})

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        """Resolve an alert."""
        alert = self.get_object()
        notes = request.data.get("notes", "")
        AlertService.resolve_alert(alert, request.user, notes)
        return Response({"status": "resolved"})

    @action(detail=False, methods=["get"])
    def my_alerts(self, request):
        """Get alerts for current user based on preferences."""
        hospital_id = request.query_params.get("hospital")

        queryset = Alert.objects.filter(
            is_active=True
        )
        if hospital_id:
            queryset = queryset.filter(hospital_id=hospital_id)

        serializer = AlertListSerializer(queryset, many=True)
        return Response(serializer.data)


class AlertConfigurationViewSet(viewsets.ModelViewSet):
    """ViewSet for alert configurations."""
    queryset = AlertConfiguration.objects.all()
    serializer_class = AlertConfigurationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["hospital", "alert_type", "is_enabled"]


class UserAlertPreferenceViewSet(viewsets.ModelViewSet):
    """ViewSet for user alert preferences."""
    queryset = UserAlertPreference.objects.all()
    serializer_class = UserAlertPreferenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)


