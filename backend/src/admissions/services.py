"""
Admission services for BedFlow.
Per requirements section 4.2 - Admission and allocation.
"""

from django.db import transaction, models
from django.utils import timezone
from rest_framework.exceptions import APIException

from src.admissions.models import AdmissionRequest, Admission, Transfer
from src.beds.models import Bed
from src.common.constants import AdmissionStatus, TransferStatus, TransferType, BedStatus, BedType
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
            from src.beds.services import BedService
            issues = BedService.validate_patient_eligibility(
                bed,
                patient_gender=getattr(admission_request.patient, "gender", None),
                requires_isolation=admission_request.requires_isolation
                or admission_request.required_bed_type == "isolation",
            )
            if issues:
                raise NoAvailableBedsException(" ".join(issues))

            admission_request.assigned_bed = bed
            admission_request.status = AdmissionStatus.ASSIGNED
            admission_request.assigned_by = user
            admission_request.assigned_at = timezone.now()
            admission_request.save()

            bed.reserve_for_request(
                admission_request,
                user=user,
                reason=f"Reserved for admission request {admission_request.id}",
                until=admission_request.reserved_until,
            )

            return admission_request

    @staticmethod
    def admit_patient(admission_request, user):
        """Convert admission request to actual admission."""
        with transaction.atomic():
            if not admission_request.assigned_bed:
                raise NoAvailableBedsException("Admission request does not have an assigned bed.")
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

            admission_request.assigned_bed.assign_to_admission(
                admission,
                user=user,
                reason=f"Patient admitted from request {admission_request.id}",
            )

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

    @staticmethod
    def suggest_beds_for_request(admission_request):
        """
        Suggest available beds for an admission request.
        Per requirements 4.2.2 - Bed assignment suggestions.
        """
        from src.beds.services import BedService

        hospital = admission_request.preferred_hospital
        if not hospital:
            return Bed.objects.none()

        # Determine bed type from request
        bed_type_map = {
            "icu": BedType.ICU,
            "isolation": BedType.ISOLATION,
            "general": BedType.GENERAL,
            "emergency": BedType.EMERGENCY,
            "maternity": BedType.MATERNITY,
        }
        bed_type = bed_type_map.get(admission_request.required_bed_type)

        # Use BedService to find matching beds
        beds = BedService.find_available_beds(
            hospital=hospital,
            bed_type=bed_type,
            requires_isolation=admission_request.requires_isolation or admission_request.required_bed_type == "isolation",
            patient_gender=admission_request.patient.gender if admission_request.patient else None,
        )

        # Filter by preferred department if specified
        if admission_request.preferred_department:
            beds = beds.filter(ward__department=admission_request.preferred_department)

        # Prioritize by isolation capability if needed
        if admission_request.requires_isolation:
            beds = beds.order_by("-is_isolation", "ward__department__name", "bed_number")

        return beds


class TransferService:
    """Service for patient transfer operations."""

    @staticmethod
    def approve_transfer(transfer, approved_by):
        """Approve a transfer request."""
        with transaction.atomic():
            transfer.approve(approved_by)

            AuditService.log_action(
                action="update",
                model_name="Transfer",
                object_id=str(transfer.id),
                user=approved_by,
                details={"action": "approved"}
            )

            return transfer

    @staticmethod
    def complete_transfer(transfer, completed_by):
        """Complete an approved transfer."""
        with transaction.atomic():
            admission = transfer.admission
            if transfer.from_bed:
                transfer.from_bed.release_from_admission(
                    user=completed_by,
                    reason=f"Transferred from bed {transfer.from_bed.bed_code}",
                    trigger_cleaning=True,
                    cleaning_priority="urgent" if transfer.transfer_type == TransferType.INTER_HOSPITAL else "routine",
                )

            admission.bed = transfer.to_bed
            admission.department = transfer.to_department
            if transfer.from_hospital != transfer.to_hospital:
                admission.hospital = transfer.to_hospital
            admission.save()

            transfer.status = TransferStatus.COMPLETED
            transfer.completed_by = completed_by
            transfer.completed_at = timezone.now()
            transfer.save()

            if transfer.to_bed:
                transfer.to_bed.assign_to_admission(
                    admission,
                    user=completed_by,
                    reason=f"Transfer completed from {transfer.from_bed.bed_code if transfer.from_bed else 'unknown bed'}",
                )

            AuditService.log_action(
                action="update",
                model_name="Transfer",
                object_id=str(transfer.id),
                user=completed_by,
                details={"action": "completed"}
            )

            return transfer

