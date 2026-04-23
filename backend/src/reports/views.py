"""
ViewSets for report management.
Per requirements section 4.5.2 - Scheduled/exportable reports.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from src.reports.models import ReportTemplate, ReportRun
from src.reports.serializers import ReportTemplateSerializer, ReportRunSerializer


class ReportTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for report templates."""
    queryset = ReportTemplate.objects.filter(is_active=True)
    serializer_class = ReportTemplateSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["hospital", "report_type", "is_scheduled"]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by hospital
        hospital_id = self.request.query_params.get("hospital")
        if hospital_id:
            queryset = queryset.filter(hospital_id=hospital_id)

        return queryset

    @action(detail=True, methods=["post"])
    def generate(self, request, pk=None):
        """Generate a report from this template."""
        template = self.get_object()
        format = request.data.get("format", template.default_format)

        # TODO: Implement async report generation
        # For now, return placeholder
        return Response({
            "status": "queued",
            "message": "Report generation has been queued"
        })


class ReportRunViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for report runs."""
    queryset = ReportRun.objects.all()
    serializer_class = ReportRunSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["hospital", "report_type", "status"]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by hospital
        hospital_id = self.request.query_params.get("hospital")
        if hospital_id:
            queryset = queryset.filter(hospital_id=hospital_id)

        return queryset.select_related("template", "requested_by")

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        """Download generated report."""
        report_run = self.get_object()

        if report_run.status != "completed" or not report_run.file:
            return Response(
                {"error": "Report not ready for download"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # TODO: Implement file download
        return Response({
            "download_url": f"/api/v1/reports/{report_run.id}/download/"
        })


