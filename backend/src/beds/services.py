"""
Services for the bed domain.
"""

from __future__ import annotations

from typing import Any

from django.db import models, transaction
from django.db.models import Avg, Count, Q
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from src.audit.services import AuditService
from src.beds.models import Bed, BedMaintenanceRecord, BedStatusHistory, EquipmentTag
from src.common.constants import BedStatus, BedType, GenderRestriction


class BedNotAvailableException(APIException):
    status_code = 409
    default_detail = "Bed is not available for assignment."
    default_code = "bed_not_available"


class InvalidStatusTransitionException(APIException):
    status_code = 400
    default_detail = "Invalid bed status transition."
    default_code = "invalid_status_transition"


class BedService:
    VALID_TRANSITIONS = {
        BedStatus.AVAILABLE: [
            BedStatus.RESERVED,
            BedStatus.BLOCKED,
            BedStatus.UNDER_MAINTENANCE,
            BedStatus.CLEANING_REQUIRED,
            BedStatus.OCCUPIED,
        ],
        BedStatus.RESERVED: [
            BedStatus.AVAILABLE,
            BedStatus.OCCUPIED,
            BedStatus.BLOCKED,
            BedStatus.UNDER_MAINTENANCE,
        ],
        BedStatus.OCCUPIED: [
            BedStatus.CLEANING_REQUIRED,
            BedStatus.BLOCKED,
            BedStatus.UNDER_MAINTENANCE,
        ],
        BedStatus.CLEANING_REQUIRED: [
            BedStatus.CLEANING_IN_PROGRESS,
            BedStatus.BLOCKED,
            BedStatus.UNDER_MAINTENANCE,
            BedStatus.AVAILABLE,
        ],
        BedStatus.CLEANING_IN_PROGRESS: [
            BedStatus.AVAILABLE,
            BedStatus.BLOCKED,
            BedStatus.UNDER_MAINTENANCE,
        ],
        BedStatus.UNDER_MAINTENANCE: [
            BedStatus.AVAILABLE,
            BedStatus.BLOCKED,
            BedStatus.CLEANING_REQUIRED,
            BedStatus.OCCUPIED,
            BedStatus.RESERVED,
        ],
        BedStatus.BLOCKED: [
            BedStatus.AVAILABLE,
            BedStatus.UNDER_MAINTENANCE,
        ],
    }

    @staticmethod
    def expire_stale_reservations(queryset=None):
        queryset = queryset or Bed.objects.all()
        stale_beds = queryset.filter(
            status=BedStatus.RESERVED,
            reserved_until__isnull=False,
            reserved_until__lte=timezone.now(),
        )
        for bed in stale_beds.select_related("ward__department__hospital"):
            bed.clear_reservation(reason="Reservation expired automatically")
        return stale_beds.count()

    @staticmethod
    def validate_status_transition(bed: Bed, new_status: str):
        allowed = BedService.VALID_TRANSITIONS.get(bed.status, [])
        if new_status != bed.status and new_status not in allowed:
            raise InvalidStatusTransitionException(
                f"Cannot move bed from {bed.status} to {new_status}."
            )

    @staticmethod
    def change_status(bed: Bed, new_status: str, user, reason: str | None = None):
        BedService.validate_status_transition(bed, new_status)
        return bed.change_status(new_status, user=user, reason=reason)

    @staticmethod
    def create_bed(*, ward, bed_number, created_by=None, equipment_tags=None, **kwargs):
        with transaction.atomic():
            bed = Bed.objects.create(
                ward=ward,
                bed_number=bed_number,
                created_by=created_by,
                **kwargs,
            )
            if equipment_tags:
                bed.equipment_tags.set(equipment_tags)
            AuditService.log_action(
                action="create",
                model_name="Bed",
                object_id=str(bed.id),
                user=created_by,
                hospital=bed.get_hospital(),
                details={"bed_code": bed.bed_code},
            )
            return bed

    @staticmethod
    def update_bed(bed: Bed, *, updated_by=None, equipment_tags=None, **kwargs):
        for field, value in kwargs.items():
            setattr(bed, field, value)
        with transaction.atomic():
            bed.save()
            if equipment_tags is not None:
                bed.equipment_tags.set(equipment_tags)
            AuditService.log_action(
                action="update",
                model_name="Bed",
                object_id=str(bed.id),
                user=updated_by,
                hospital=bed.get_hospital(),
                details={"bed_code": bed.bed_code},
            )
            return bed

    @staticmethod
    def deactivate_bed(bed: Bed, *, user):
        bed.is_active = False
        bed.is_deleted = True
        bed.save(update_fields=["is_active", "is_deleted", "updated_at"])
        AuditService.log_action(
            action="delete",
            model_name="Bed",
            object_id=str(bed.id),
            user=user,
            hospital=bed.get_hospital(),
            details={"bed_code": bed.bed_code, "soft_delete": True},
        )
        return bed

    @staticmethod
    def validate_patient_eligibility(
        bed: Bed,
        *,
        patient_gender: str | None = None,
        requires_isolation: bool = False,
        equipment_required: list[str] | None = None,
    ) -> list[str]:
        return bed.eligibility_issues(
            patient_gender=patient_gender,
            requires_isolation=requires_isolation,
            equipment_codes=equipment_required,
        )

    @staticmethod
    def reserve_bed(
        *,
        bed: Bed,
        admission_request,
        user,
        reserved_until,
        reason: str | None = None,
    ):
        with transaction.atomic():
            locked_bed = Bed.objects.select_for_update().get(pk=bed.pk)
            BedService.expire_stale_reservations(Bed.objects.filter(pk=locked_bed.pk))
            if locked_bed.reserved_for_id and locked_bed.reserved_for_id != admission_request.id:
                raise ValidationError("Bed is already reserved.")
            issues = locked_bed.eligibility_issues(
                patient_gender=getattr(admission_request.patient, "gender", None),
                requires_isolation=admission_request.requires_isolation
                or admission_request.required_bed_type == "isolation",
            )
            if issues:
                raise BedNotAvailableException(" ".join(issues))
            return locked_bed.reserve_for_request(
                admission_request,
                user=user,
                reason=reason,
                until=reserved_until,
            )

    @staticmethod
    def assign_bed(
        *,
        bed: Bed,
        admission,
        user,
        reason: str | None = None,
    ):
        with transaction.atomic():
            locked_bed = Bed.objects.select_for_update().get(pk=bed.pk)
            BedService.expire_stale_reservations(Bed.objects.filter(pk=locked_bed.pk))
            issues = locked_bed.eligibility_issues(
                patient_gender=getattr(admission.patient, "gender", None),
                requires_isolation=getattr(admission, "is_isolation", False),
            )
            if issues:
                raise BedNotAvailableException(" ".join(issues))
            return locked_bed.assign_to_admission(
                admission,
                user=user,
                reason=reason or f"Assigned to admission {admission.id}",
            )

    @staticmethod
    def release_bed(
        *,
        bed: Bed,
        user,
        reason: str | None = None,
        trigger_cleaning: bool = True,
        cleaning_priority: str = "routine",
    ):
        with transaction.atomic():
            locked_bed = Bed.objects.select_for_update().get(pk=bed.pk)
            if not locked_bed.current_admission_id:
                raise ValidationError("Bed is not assigned to an active admission.")
            return locked_bed.release_from_admission(
                user=user,
                reason=reason or "Bed released",
                trigger_cleaning=trigger_cleaning,
                cleaning_priority=cleaning_priority,
            )

    @staticmethod
    def find_available_beds(
        hospital,
        *,
        bed_type=None,
        requires_isolation=False,
        patient_gender=None,
        equipment_required=None,
        department_id=None,
        ward_id=None,
    ):
        BedService.expire_stale_reservations(
            Bed.objects.filter(ward__department__hospital=hospital)
        )
        queryset = Bed.objects.filter(
            ward__department__hospital=hospital,
            status=BedStatus.AVAILABLE,
            is_active=True,
            is_deleted=False,
            current_admission__isnull=True,
        )

        if bed_type:
            queryset = queryset.filter(bed_type=bed_type)
        if requires_isolation:
            queryset = queryset.filter(is_isolation=True)
        if department_id:
            queryset = queryset.filter(ward__department_id=department_id)
        if ward_id:
            queryset = queryset.filter(ward_id=ward_id)

        if patient_gender:
            gender_map = {
                "M": GenderRestriction.MALE_ONLY,
                "F": GenderRestriction.FEMALE_ONLY,
            }
            expected = gender_map.get(patient_gender.upper())
            if expected:
                queryset = queryset.filter(
                    Q(gender_restriction=GenderRestriction.NONE)
                    | Q(gender_restriction=expected)
                )

        if equipment_required:
            for equipment_code in equipment_required:
                queryset = queryset.filter(equipment_tags__code=equipment_code)

        queryset = queryset.exclude(
            maintenance_records__status__in=["pending", "in_progress"]
        ).distinct()
        return queryset.select_related(
            "ward__department__hospital",
            "ward__department",
        ).prefetch_related("equipment_tags")

    @staticmethod
    def block_bed(bed: Bed, user, reason, until=None):
        return bed.block(user=user, reason=reason, until=until)

    @staticmethod
    def unblock_bed(bed: Bed, user):
        return bed.unblock(user=user)

    @staticmethod
    def get_bed_statistics(hospital):
        stats = Bed.objects.filter(
            ward__department__hospital=hospital,
            is_deleted=False,
        ).aggregate(
            total=Count("id"),
            available=Count("id", filter=Q(status=BedStatus.AVAILABLE, is_active=True)),
            occupied=Count("id", filter=Q(status=BedStatus.OCCUPIED, is_active=True)),
            reserved=Count("id", filter=Q(status=BedStatus.RESERVED, is_active=True)),
            cleaning_required=Count(
                "id", filter=Q(status=BedStatus.CLEANING_REQUIRED, is_active=True)
            ),
            cleaning_in_progress=Count(
                "id", filter=Q(status=BedStatus.CLEANING_IN_PROGRESS, is_active=True)
            ),
            maintenance=Count(
                "id", filter=Q(status=BedStatus.UNDER_MAINTENANCE, is_active=True)
            ),
            blocked=Count("id", filter=Q(status=BedStatus.BLOCKED, is_active=True)),
            isolation=Count("id", filter=Q(is_isolation=True, is_active=True)),
            inactive=Count("id", filter=Q(is_active=False)),
        )
        total = stats["total"] or 0
        occupied = stats["occupied"] or 0
        stats["occupancy_rate"] = round((occupied / total * 100), 2) if total else 0.0
        return stats

    @staticmethod
    def get_bed_analytics(hospital) -> dict[str, Any]:
        from src.admissions.models import Admission
        from src.discharges.models import Discharge
        from src.housekeeping.models import CleaningTask

        beds = Bed.objects.filter(
            ward__department__hospital=hospital,
            is_deleted=False,
        )
        utilization_by_type = list(
            beds.values("bed_type")
            .annotate(
                total=Count("id"),
                occupied=Count("id", filter=Q(status=BedStatus.OCCUPIED)),
            )
            .order_by("bed_type")
        )
        for item in utilization_by_type:
            item["occupancy_rate"] = round(
                (item["occupied"] / item["total"] * 100), 2
            ) if item["total"] else 0.0

        isolation_usage = beds.aggregate(
            total=Count("id", filter=Q(is_isolation=True)),
            occupied=Count("id", filter=Q(is_isolation=True, status=BedStatus.OCCUPIED)),
            available=Count("id", filter=Q(is_isolation=True, status=BedStatus.AVAILABLE)),
        )
        gender_allocation = list(
            beds.values("gender_restriction")
            .annotate(
                total=Count("id"),
                occupied=Count("id", filter=Q(status=BedStatus.OCCUPIED)),
            )
            .order_by("gender_restriction")
        )
        turnover = Discharge.objects.filter(hospital=hospital, turnover_minutes__isnull=False).aggregate(
            average_turnover_minutes=Avg("turnover_minutes")
        )
        cleaning = CleaningTask.objects.filter(
            bed__ward__department__hospital=hospital,
            completed_at__isnull=False,
        )
        completed_cleaning = list(cleaning.values_list("created_at", "completed_at"))
        average_cleaning_turnaround_minutes = 0.0
        if completed_cleaning:
            durations = [
                (completed_at - created_at).total_seconds() / 60
                for created_at, completed_at in completed_cleaning
                if created_at and completed_at
            ]
            if durations:
                average_cleaning_turnaround_minutes = round(sum(durations) / len(durations), 2)
        maintenance_frequency = list(
            BedMaintenanceRecord.objects.filter(bed__ward__department__hospital=hospital)
            .values("severity")
            .annotate(total=Count("id"), open=Count("id", filter=Q(status__in=["pending", "in_progress"])))
            .order_by("severity")
        )
        admission_history = Admission.objects.filter(hospital=hospital).aggregate(
            total_admissions=Count("id"),
            currently_admitted=Count("id", filter=Q(status="admitted")),
        )
        return {
            "statistics": BedService.get_bed_statistics(hospital),
            "utilization_by_type": utilization_by_type,
            "isolation_usage": isolation_usage,
            "gender_allocation": gender_allocation,
            "average_turnover_minutes": round(turnover["average_turnover_minutes"] or 0, 2),
            "average_cleaning_turnaround_minutes": average_cleaning_turnaround_minutes,
            "maintenance_frequency": maintenance_frequency,
            "admission_history": {
                **admission_history,
                "status_history_events": BedStatusHistory.objects.filter(
                    bed__ward__department__hospital=hospital
                ).count(),
            },
        }


class EquipmentTagService:
    @staticmethod
    def create_tag(name, code, category, description=""):
        return EquipmentTag.objects.create(
            name=name,
            code=code.upper(),
            category=category,
            description=description,
        )


class BedMaintenanceService:
    @staticmethod
    def create_record(
        *,
        bed: Bed,
        user,
        issue_description: str,
        maintenance_type: str,
        severity: str,
    ):
        with transaction.atomic():
            record = BedMaintenanceRecord.objects.create(
                bed=bed,
                reported_by=user,
                issue_description=issue_description,
                maintenance_type=maintenance_type,
                severity=severity,
            )
            bed.mark_under_maintenance(
                user=user,
                reason=f"{severity.title()} {maintenance_type} maintenance reported",
            )
            AuditService.log_action(
                action="create",
                model_name="BedMaintenanceRecord",
                object_id=str(record.id),
                user=user,
                hospital=bed.get_hospital(),
                details={"bed_id": str(bed.id), "severity": severity},
            )
            return record

    @staticmethod
    def update_record(record: BedMaintenanceRecord, *, user, **updates):
        for field, value in updates.items():
            setattr(record, field, value)
        with transaction.atomic():
            record.save()
            if record.status in {"pending", "in_progress"}:
                record.bed.mark_under_maintenance(
                    user=user,
                    reason=record.issue_description,
                )
            AuditService.log_action(
                action="update",
                model_name="BedMaintenanceRecord",
                object_id=str(record.id),
                user=user,
                hospital=record.bed.get_hospital(),
                details={"bed_id": str(record.bed.id), "status": record.status},
            )
            return record

    @staticmethod
    def resolve_record(record: BedMaintenanceRecord, *, user, resolution_notes=""):
        with transaction.atomic():
            record.status = "completed"
            record.resolved_by = user
            record.resolved_at = timezone.now()
            record.resolution_notes = resolution_notes
            record.save()
            if not record.bed.get_open_maintenance().exclude(pk=record.pk).exists():
                record.bed.complete_maintenance(user=user)
            AuditService.log_action(
                action="update",
                model_name="BedMaintenanceRecord",
                object_id=str(record.id),
                user=user,
                hospital=record.bed.get_hospital(),
                details={"bed_id": str(record.bed.id), "status": record.status},
            )
            return record
