"""
Admission services for BedFlow.
Per requirements section 4.2 - Admission and allocation.
"""

from django.db import transaction, models
from django.utils import timezone
from rest_framework.exceptions import APIException

from src.admissions.models import AdmissionRequest, Admission, Transfer
from src.beds.models import Bed
from src.common.constants import AdmissionStatus, TransferStatus, TransferType, BedStatus
from src.audit.services import AuditService


class NoAvailableBedsException(APIException):
    status_code = 409
    default_detail = "No beds available matching the requirements."
    default_code = "no_available_beds"


class AdmissionService:
    """Service for admission operations."""

    @staticmethod
    def create_admission_request(patient, hospital, **kwargs):
        """Create a new admission request."""
        with transaction.atomic():
            request = AdmissionRequest.objects.create(
                patient=patient,
                preferred_hospital=hospital,
                **kwargs
            )

            AuditService.log_action(
                action="create",
                model_name="AdmissionRequest",
                object_id=str(request.id),
                user=kwargs.get("created_by"),
                details={"admission_source": request.admission_source}
            )

            return request

    @staticmethod
    def assign_bed_to_request(admission_request, bed, user):
        """Assign a bed to an admission request."""
        with transaction.atomic():
            bed = Bed.objects.select_for_update().get(pk=bed.pk)

            if not bed.is_available():
                raise NoAvailableBedsException("Bed is no longer available")

            admission_request.assigned_bed = bed
            admission_request.status = AdmissionStatus.ASSIGNED
            admission_request.assigned_by = user
            admission_request.assigned_at = timezone.now()
            admission_request.save()

            bed.change_status(
                new_status=BedStatus.RESERVED,
                user=user,
                reason="Reserved for admission"
            )

            return admission_request

    @staticmethod
    def admit_patient(admission_request, user):
        """Convert admission request to actual admission."""
        with transaction.atomic():
            admission = Admission.objects.create(
                patient=admission_request.patient,
                bed=admission_request.assigned_bed,
                admission_request=admission_request,
                hospital=admission_request.preferred_hospital or admission_request.assigned_bed.get_hospital(),
                department=admission_request.preferred_department or admission_request.assigned_bed.ward.department,
                admission_source=admission_request.admission_source,
                admitted_by=user,
                status=AdmissionStatus.ADMITTED,
                clinical_notes=admission_request.clinical_notes,
            )

            admission_request.status = AdmissionStatus.ADMITTED
            admission_request.save()

            admission_request.assigned_bed.change_status(
                new_status=BedStatus.OCCUPIED,
                user=user,
                reason="Patient admitted"
            )

            admission_request.assigned_bed.current_admission = admission
            admission_request.assigned_bed.save()

            return admission

    @staticmethod
    def get_admission_queue(hospital, status=None):
        """Get admission queue for hospital."""
        queryset = AdmissionRequest.objects.filter(
            preferred_hospital=hospital,
            status__in=["pending", "approved", "assigned"]
        )

        if status:
            queryset = queryset.filter(status=status)

        return queryset.select_related("patient", "assigned_bed").order_by("priority", "waiting_since")
