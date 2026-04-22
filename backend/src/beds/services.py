"""
Bed management services for BedFlow.
Per requirements section 4.1 - Bed inventory and status management.
"""

from django.db import transaction, models
from django.utils import timezone
from django.core.exceptions import ValidationError
from rest_framework.exceptions import APIException

from src.beds.models import Bed, BedStatusHistory, EquipmentTag
from src.common.constants import BedStatus, BedType, GenderRestriction
from src.audit.services import AuditService


class BedNotAvailableException(APIException):
    status_code = 409
    default_detail = "Bed is not available for assignment."
    default_code = "bed_not_available"


class InvalidStatusTransitionException(APIException):
    status_code = 400
    default_detail = "Invalid bed status transition."
    default_code = "invalid_status_transition"


class BedService:
    """Service for bed management operations."""

    VALID_TRANSITIONS = {
        BedStatus.AVAILABLE: [
            BedStatus.RESERVED, BedStatus.BLOCKED,
            BedStatus.UNDER_MAINTENANCE
        ],
        BedStatus.RESERVED: [
            BedStatus.AVAILABLE, BedStatus.OCCUPIED,
            BedStatus.BLOCKED
        ],
        BedStatus.OCCUPIED: [
            BedStatus.CLEANING_REQUIRED, BedStatus.BLOCKED
        ],
        BedStatus.CLEANING_REQUIRED: [
            BedStatus.CLEANING_IN_PROGRESS, BedStatus.BLOCKED
        ],
        BedStatus.CLEANING_IN_PROGRESS: [
            BedStatus.AVAILABLE, BedStatus.BLOCKED
        ],
        BedStatus.UNDER_MAINTENANCE: [
            BedStatus.AVAILABLE, BedStatus.BLOCKED
        ],
        BedStatus.BLOCKED: [
            BedStatus.AVAILABLE, BedStatus.UNDER_MAINTENANCE
        ],
        BedStatus.ISOLATION: [
            BedStatus.CLEANING_REQUIRED, BedStatus.BLOCKED
        ],
    }

    @staticmethod
    def create_bed(ward, bed_number, bed_type=BedType.GENERAL, **kwargs):
        """Create a new bed."""
        with transaction.atomic():
            bed = Bed.objects.create(
                ward=ward,
                bed_number=bed_number,
                bed_type=bed_type,
                **kwargs
            )
            return bed

    @staticmethod
    def change_status(bed, new_status, user, reason=None):
        """
        Change bed status with validation.
        Per requirements 4.1.2 - Status changes must be timestamped and audited.
        """
        current_status = bed.status

        with transaction.atomic():
            # Perform the status change
            result = bed.change_status(new_status, user, reason)

            # Create status history record
            BedStatusHistory.objects.create(
                bed=bed,
                status=new_status,
                changed_by=user,
                reason=reason,
                admission=bed.current_admission
            )

            return result

    @staticmethod
    def find_available_beds(hospital, bed_type=None, requires_isolation=False,
                           patient_gender=None, equipment_required=None):
        """
        Find beds suitable for patient assignment.
        Per requirements 4.2.2 - Suggest suitable beds based on requirements.
        """
        queryset = Bed.objects.filter(
            ward__department__hospital=hospital,
            status=BedStatus.AVAILABLE,
            is_active=True
        )

        if bed_type:
            queryset = queryset.filter(bed_type=bed_type)

        if requires_isolation:
            queryset = queryset.filter(is_isolation=True)

        # Filter by gender restriction
        if patient_gender:
            gender_map = {
                "M": GenderRestriction.MALE_ONLY,
                "F": GenderRestriction.FEMALE_ONLY,
            }
            patient_restriction = gender_map.get(patient_gender)

            if patient_restriction:
                queryset = queryset.filter(
                    models.Q(gender_restriction=GenderRestriction.NONE) |
                    models.Q(gender_restriction=patient_restriction)
                )

        # Filter by equipment
        if equipment_required:
            for equipment_code in equipment_required:
                queryset = queryset.filter(
                    equipment_tags__code=equipment_code
                )

        return queryset.select_related(
            "ward__department__hospital",
            "ward__department"
        ).order_by("ward__department__name", "bed_number")

    @staticmethod
    def block_bed(bed, user, reason, until=None):
        """Block a bed from being allocated."""
        with transaction.atomic():
            bed.blocked_until = until
            bed.blocked_reason = reason
            bed.save()

            return BedService.change_status(
                bed=bed,
                new_status=BedStatus.BLOCKED,
                user=user,
                reason=reason,
            )

    @staticmethod
    def unblock_bed(bed, user):
        """Unblock a bed."""
        return BedService.change_status(
            bed=bed,
            new_status=BedStatus.AVAILABLE,
            user=user,
            reason="Bed unblocked",
        )

    @staticmethod
    def get_bed_statistics(hospital):
        """Get bed statistics for a hospital."""
        from django.db.models import Count, Q

        stats = Bed.objects.filter(
            ward__department__hospital=hospital,
            is_active=True
        ).aggregate(
            total=Count("id"),
            available=Count("id", filter=Q(status=BedStatus.AVAILABLE)),
            occupied=Count("id", filter=Q(status=BedStatus.OCCUPIED)),
            reserved=Count("id", filter=Q(status=BedStatus.RESERVED)),
            cleaning_required=Count("id", filter=Q(status=BedStatus.CLEANING_REQUIRED)),
            cleaning_in_progress=Count("id", filter=Q(status=BedStatus.CLEANING_IN_PROGRESS)),
            maintenance=Count("id", filter=Q(status=BedStatus.UNDER_MAINTENANCE)),
            blocked=Count("id", filter=Q(status=BedStatus.BLOCKED)),
            isolation=Count("id", filter=Q(status=BedStatus.ISOLATION)),
        )

        # Calculate occupancy rate
        total = stats["total"]
        occupied = stats["occupied"]
        stats["occupancy_rate"] = (occupied / total * 100) if total > 0 else 0

        return stats


class EquipmentTagService:
    """Service for equipment tag management."""

    @staticmethod
    def create_tag(name, code, category, description=""):
        """Create a new equipment tag."""
        return EquipmentTag.objects.create(
            name=name,
            code=code,
            category=category,
            description=description
        )

    @staticmethod
    def assign_to_bed(bed, tag):
        """Assign equipment tag to bed."""
        bed.equipment_tags.add(tag)

    @staticmethod
    def remove_from_bed(bed, tag):
        """Remove equipment tag from bed."""
        bed.equipment_tags.remove(tag)
