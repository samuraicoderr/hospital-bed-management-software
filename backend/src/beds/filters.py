from django.db.models import Q
from django_filters import rest_framework as filters

from src.beds.models import Bed, BedMaintenanceRecord


class UUIDInFilter(filters.BaseInFilter, filters.UUIDFilter):
    pass


class BedFilterSet(filters.FilterSet):
    hospital = filters.UUIDFilter(field_name="ward__department__hospital_id")
    department = filters.UUIDFilter(field_name="ward__department_id")
    ward = filters.UUIDFilter(field_name="ward_id")
    status = filters.CharFilter(field_name="status")
    bed_type = filters.CharFilter(field_name="bed_type")
    gender_restriction = filters.CharFilter(field_name="gender_restriction")
    is_isolation = filters.BooleanFilter(field_name="is_isolation")
    is_active = filters.BooleanFilter(field_name="is_active")
    equipment_tags = UUIDInFilter(method="filter_equipment_tags")
    maintenance_severity = filters.CharFilter(method="filter_maintenance_severity")
    occupied_since_after = filters.IsoDateTimeFilter(field_name="occupied_since", lookup_expr="gte")
    occupied_since_before = filters.IsoDateTimeFilter(field_name="occupied_since", lookup_expr="lte")
    status_changed_at_after = filters.IsoDateTimeFilter(field_name="status_changed_at", lookup_expr="gte")
    status_changed_at_before = filters.IsoDateTimeFilter(field_name="status_changed_at", lookup_expr="lte")
    search = filters.CharFilter(method="filter_search")

    class Meta:
        model = Bed
        fields = [
            "hospital",
            "department",
            "ward",
            "status",
            "bed_type",
            "gender_restriction",
            "is_isolation",
            "is_active",
        ]

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(bed_code__icontains=value)
            | Q(bed_number__icontains=value)
            | Q(ward__name__icontains=value)
            | Q(ward__department__name__icontains=value)
            | Q(ward__department__hospital__name__icontains=value)
        )

    def filter_equipment_tags(self, queryset, name, value):
        for tag_id in value:
            queryset = queryset.filter(equipment_tags__id=tag_id)
        return queryset

    def filter_maintenance_severity(self, queryset, name, value):
        return queryset.filter(
            maintenance_records__severity=value,
            maintenance_records__status__in=["pending", "in_progress"],
        ).distinct()


class BedMaintenanceRecordFilterSet(filters.FilterSet):
    hospital = filters.UUIDFilter(field_name="bed__ward__department__hospital_id")
    department = filters.UUIDFilter(field_name="bed__ward__department_id")
    ward = filters.UUIDFilter(field_name="bed__ward_id")
    bed = filters.UUIDFilter(field_name="bed_id")

    class Meta:
        model = BedMaintenanceRecord
        fields = [
            "hospital",
            "department",
            "ward",
            "bed",
            "severity",
            "status",
            "maintenance_type",
        ]
