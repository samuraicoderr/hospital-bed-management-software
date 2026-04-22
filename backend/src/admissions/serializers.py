"""
Serializers for admission models.
"""

from rest_framework import serializers

from src.admissions.models import AdmissionRequest, Admission, Transfer
from src.common.constants import AdmissionStatus, TransferStatus


class AdmissionRequestListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.get_full_name", read_only=True)
    patient_mrn = serializers.CharField(source="patient.mrn", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    assigned_bed_code = serializers.CharField(source="assigned_bed.bed_code", read_only=True)

    class Meta:
        model = AdmissionRequest
        fields = [
            "id", "patient_name", "patient_mrn", "priority", "priority_display",
            "status", "status_display", "requires_isolation", "requires_icu",
            "assigned_bed_code", "waiting_since", "created_at"
        ]


class AdmissionRequestDetailSerializer(serializers.ModelSerializer):
    patient = serializers.SerializerMethodField()
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    admission_source_display = serializers.CharField(source="get_admission_source_display", read_only=True)
    assigned_bed = serializers.SerializerMethodField()

    class Meta:
        model = AdmissionRequest
        fields = [
            "id", "patient", "admission_source", "admission_source_display",
            "priority", "priority_display", "status", "status_display",
            "requires_isolation", "requires_icu", "clinical_notes",
            "assigned_bed", "assigned_at", "waiting_since",
            "cancelled_at", "cancellation_reason", "created_at"
        ]

    def get_patient(self, obj):
        return {
            "id": str(obj.patient.id),
            "mrn": obj.patient.mrn,
            "name": obj.patient.get_full_name(),
            "gender": obj.patient.gender,
            "date_of_birth": obj.patient.date_of_birth,
        }

    def get_assigned_bed(self, obj):
        if obj.assigned_bed:
            return {
                "id": str(obj.assigned_bed.id),
                "code": obj.assigned_bed.bed_code,
                "ward": obj.assigned_bed.ward.name,
                "department": obj.assigned_bed.ward.department.name,
            }
        return None


class AdmissionRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdmissionRequest
        fields = [
            "patient", "preferred_hospital", "preferred_department",
            "admission_source", "requires_isolation", "requires_icu",
            "required_bed_type", "clinical_notes", "priority"
        ]


class AdmissionListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.get_full_name", read_only=True)
    patient_mrn = serializers.CharField(source="patient.mrn", read_only=True)
    bed_code = serializers.CharField(source="bed.bed_code", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Admission
        fields = [
            "id", "patient_name", "patient_mrn", "bed_code",
            "status", "status_display", "admitted_at", "expected_discharge_date"
        ]


class AdmissionDetailSerializer(serializers.ModelSerializer):
    patient = serializers.SerializerMethodField()
    bed = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    admission_source_display = serializers.CharField(source="get_admission_source_display", read_only=True)
    length_of_stay = serializers.IntegerField(source="get_length_of_stay", read_only=True)

    class Meta:
        model = Admission
        fields = [
            "id", "patient", "bed", "admission_source", "admission_source_display",
            "status", "status_display", "admitted_at", "discharged_at",
            "diagnosis_description", "clinical_notes", "is_isolation",
            "expected_discharge_date", "length_of_stay", "created_at"
        ]

    def get_patient(self, obj):
        return {
            "id": str(obj.patient.id),
            "mrn": obj.patient.mrn,
            "name": obj.patient.get_full_name(),
            "gender": obj.patient.gender,
        }

    def get_bed(self, obj):
        if obj.bed:
            return {
                "id": str(obj.bed.id),
                "code": obj.bed.bed_code,
                "ward": obj.bed.ward.name,
                "department": obj.bed.ward.department.name,
            }
        return None


class TransferListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.get_full_name", read_only=True)
    patient_mrn = serializers.CharField(source="patient.mrn", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Transfer
        fields = [
            "id", "patient_name", "patient_mrn", "transfer_type",
            "status", "status_display", "from_department", "to_department",
            "requested_at", "completed_at"
        ]


class TransferDetailSerializer(serializers.ModelSerializer):
    patient = serializers.SerializerMethodField()
    admission = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    transfer_type_display = serializers.CharField(source="get_transfer_type_display", read_only=True)

    class Meta:
        model = Transfer
        fields = [
            "id", "patient", "admission", "transfer_type", "transfer_type_display",
            "status", "status_display", "from_department", "to_department",
            "from_bed", "to_bed", "requested_by", "requested_at",
            "reason", "transport_mode", "completed_at"
        ]

    def get_patient(self, obj):
        return {
            "id": str(obj.patient.id),
            "mrn": obj.patient.mrn,
            "name": obj.patient.get_full_name(),
        }

    def get_admission(self, obj):
        return {
            "id": str(obj.admission.id),
            "bed": obj.admission.bed.bed_code if obj.admission.bed else None,
            "admitted_at": obj.admission.admitted_at,
        }


class TransferCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transfer
        fields = [
            "admission", "to_department", "to_bed",
            "transfer_type", "reason", "transport_mode"
        ]