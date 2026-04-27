"""
Discharge services for BedFlow.
Per requirements section 4.3 - Discharge and turnover workflow.
"""

from django.db import transaction
from django.utils import timezone

from src.discharges.models import Discharge
from src.common.constants import DischargeStatus
from src.audit.services import AuditService


class DischargeService:
    """Service for discharge operations."""

    @staticmethod
    def initiate_discharge(admission, user, reason, discharge_type="routine", destination="home"):
        """
        Initiate discharge process.
        Per requirements 4.3.1 - Bed marked as Cleaning Required.
        """
        with transaction.atomic():
            discharge = Discharge.objects.create(
                admission=admission,
                patient=admission.patient,
                bed=admission.bed,
                hospital=admission.hospital,
                initiated_by=user,
                reason=reason,
                discharge_type=discharge_type,
                destination=destination,
                status=DischargeStatus.PENDING,
                approval_required=admission.hospital.require_discharge_approval
            )

            AuditService.log_action(
                action="create",
                model_name="Discharge",
                object_id=str(discharge.id),
                user=user,
                hospital=admission.hospital,
                details={"admission_id": str(admission.id)}
            )

            return discharge

    @staticmethod
    def complete_discharge(discharge, user):
        """
        Complete discharge process.
        Per requirements 4.3.1 - Bed marked as Available after cleaning.
        """
        with transaction.atomic():
            now = timezone.now()

            # Update discharge
            discharge.status = DischargeStatus.COMPLETED
            discharge.completed_by = user
            discharge.completed_at = now
            discharge.patient_left_at = now
            discharge.save()

            # Update admission
            admission = discharge.admission
            admission.status = "discharged"
            admission.discharged_at = now
            admission.discharged_by = user
            admission.save()

            if discharge.bed:
                priority = "isolation_clean" if admission.is_isolation else "routine"
                discharge.bed.release_from_admission(
                    user=user,
                    reason=f"Discharged admission {admission.id}",
                    trigger_cleaning=True,
                    cleaning_priority=priority,
                )

            AuditService.log_action(
                action="update",
                model_name="Discharge",
                object_id=str(discharge.id),
                user=user,
                hospital=discharge.hospital,
                details={"action": "completed"}
            )

            return discharge

    @staticmethod
    def get_pending_discharges(hospital):
        """Get pending discharges for a hospital."""
        return Discharge.objects.filter(
            hospital=hospital,
            status__in=["pending", "approved"]
        ).select_related("patient", "admission", "bed")
