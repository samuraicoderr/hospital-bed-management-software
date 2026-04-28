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
    preferred_hospital_name = serializers.CharField(source="preferred_hospital.name", read_only=True)

    class Meta:
        model = AdmissionRequest
        fields = [
            "id", "patient_name", "patient_mrn", "priority", "priority_display",
            "status", "status_display", "requires_isolation", "requires_icu",
            "assigned_bed_code", "preferred_hospital_name", "queue_position",
            "waiting_since", "created_at"
        ]


class AdmissionRequestDetailSerializer(serializers.ModelSerializer):
    patient = serializers.SerializerMethodField()
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    admission_source_display = serializers.CharField(source="get_admission_source_display", read_only=True)
    assigned_bed = serializers.SerializerMethodField()
    reserved_bed = serializers.SerializerMethodField()
    preferred_hospital = serializers.SerializerMethodField()
    preferred_department = serializers.SerializerMethodField()
    assigned_by_name = serializers.CharField(source="assigned_by.get_full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)
    cancelled_by_name = serializers.CharField(source="cancelled_by.get_full_name", read_only=True)

    class Meta:
        model = AdmissionRequest
        fields = [
            "id", "patient", "admission_source", "admission_source_display",
            "priority", "priority_display", "status", "status_display",
            "requires_isolation", "requires_icu", "required_bed_type", "clinical_notes",
            "preferred_hospital", "preferred_department",
            "reserved_bed", "reserved_until",
            "assigned_bed", "assigned_by_name", "assigned_at",
            "approved_by_name", "approved_at",
            "queue_position", "waiting_since",
            "cancelled_by_name", "cancelled_at", "cancellation_reason",
            "created_at", "updated_at"
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

    def get_reserved_bed(self, obj):
        if obj.reserved_bed:
            return {
                "id": str(obj.reserved_bed.id),
                "code": obj.reserved_bed.bed_code,
                "ward": obj.reserved_bed.ward.name,
                "department": obj.reserved_bed.ward.department.name,
            }
        return None

    def get_preferred_hospital(self, obj):
        if obj.preferred_hospital:
            return {
                "id": str(obj.preferred_hospital.id),
                "name": obj.preferred_hospital.name,
                "code": obj.preferred_hospital.code,
            }
        return None

    def get_preferred_department(self, obj):
        if obj.preferred_department:
            return {
                "id": str(obj.preferred_department.id),
                "name": obj.preferred_department.name,
                "code": obj.preferred_department.code,
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
    hospital_name = serializers.CharField(source="hospital.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Admission
        fields = [
            "id", "patient_name", "patient_mrn", "bed_code",
            "status", "status_display", "hospital_name", "department_name",
            "admitted_at", "expected_discharge_date"
        ]


class AdmissionDetailSerializer(serializers.ModelSerializer):
    patient = serializers.SerializerMethodField()
    bed = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    admission_source_display = serializers.CharField(source="get_admission_source_display", read_only=True)
    length_of_stay_days = serializers.IntegerField(source="get_length_of_stay", read_only=True)
    length_of_stay_hours = serializers.FloatField(source="get_length_of_stay_hours", read_only=True)
    hospital = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    admitted_by_name = serializers.CharField(source="admitted_by.get_full_name", read_only=True)
    discharged_by_name = serializers.CharField(source="discharged_by.get_full_name", read_only=True)

    class Meta:
        model = Admission
        fields = [
            "id", "patient", "bed", "hospital", "department",
            "admission_source", "admission_source_display",
            "status", "status_display", "admitted_at", "admitted_by_name",
            "discharged_at", "discharged_by_name",
            "diagnosis_code", "diagnosis_description", "clinical_notes",
            "is_isolation", "isolation_reason", "isolation_started_at", "isolation_ended_at",
            "expected_discharge_date", "visit_number", "external_visit_id",
            "length_of_stay_days", "length_of_stay_hours",
            "created_at", "updated_at"
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

    def get_hospital(self, obj):
        return {
            "id": str(obj.hospital.id),
            "name": obj.hospital.name,
            "code": obj.hospital.code,
        }

    def get_department(self, obj):
        return {
            "id": str(obj.department.id),
            "name": obj.department.name,
            "code": obj.department.code,
        }


class AdmissionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Admission
        fields = [
            "diagnosis_code",
            "diagnosis_description",
            "clinical_notes",
            "is_isolation",
            "isolation_reason",
            "isolation_started_at",
            "isolation_ended_at",
            "expected_discharge_date",
            "visit_number",
            "external_visit_id",
            "status",
        ]


class TransferListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.get_full_name", read_only=True)
    patient_mrn = serializers.CharField(source="patient.mrn", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    transfer_type_display = serializers.CharField(source="get_transfer_type_display", read_only=True)
    from_hospital_name = serializers.CharField(source="from_hospital.name", read_only=True)
    to_hospital_name = serializers.CharField(source="to_hospital.name", read_only=True)

    class Meta:
        model = Transfer
        fields = [
            "id", "patient_name", "patient_mrn", "transfer_type",
            "transfer_type_display", "status", "status_display",
            "from_hospital_name", "to_hospital_name",
            "from_department", "to_department", "requested_at", "completed_at"
        ]


class TransferDetailSerializer(serializers.ModelSerializer):
    patient = serializers.SerializerMethodField()
    admission = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    transfer_type_display = serializers.CharField(source="get_transfer_type_display", read_only=True)
    from_hospital = serializers.SerializerMethodField()
    to_hospital = serializers.SerializerMethodField()
    from_department = serializers.SerializerMethodField()
    to_department = serializers.SerializerMethodField()
    from_bed = serializers.SerializerMethodField()
    to_bed = serializers.SerializerMethodField()
    requested_by_name = serializers.CharField(source="requested_by.get_full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)
    initiated_by_name = serializers.CharField(source="initiated_by.get_full_name", read_only=True)
    completed_by_name = serializers.CharField(source="completed_by.get_full_name", read_only=True)
    rejected_by_name = serializers.CharField(source="rejected_by.get_full_name", read_only=True)

    class Meta:
        model = Transfer
        fields = [
            "id", "patient", "admission", "transfer_type", "transfer_type_display",
            "status", "status_display",
            "from_hospital", "from_department", "from_bed",
            "to_hospital", "to_department", "to_bed",
            "requested_by_name", "requested_at",
            "approved_by_name", "approved_at",
            "initiated_by_name", "initiated_at",
            "completed_by_name", "completed_at",
            "rejected_by_name", "rejected_at", "rejection_reason",
            "reason", "transport_mode", "accompanying_personnel", "special_requirements",
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

    def get_from_hospital(self, obj):
        return {
            "id": str(obj.from_hospital.id),
            "name": obj.from_hospital.name,
            "code": obj.from_hospital.code,
        }

    def get_to_hospital(self, obj):
        return {
            "id": str(obj.to_hospital.id),
            "name": obj.to_hospital.name,
            "code": obj.to_hospital.code,
        }

    def get_from_department(self, obj):
        return {
            "id": str(obj.from_department.id),
            "name": obj.from_department.name,
            "code": obj.from_department.code,
        }

    def get_to_department(self, obj):
        return {
            "id": str(obj.to_department.id),
            "name": obj.to_department.name,
            "code": obj.to_department.code,
        }

    def get_from_bed(self, obj):
        if obj.from_bed:
            return {
                "id": str(obj.from_bed.id),
                "code": obj.from_bed.bed_code,
                "ward": obj.from_bed.ward.name,
                "department": obj.from_bed.ward.department.name,
            }
        return None

    def get_to_bed(self, obj):
        if obj.to_bed:
            return {
                "id": str(obj.to_bed.id),
                "code": obj.to_bed.bed_code,
                "ward": obj.to_bed.ward.name,
                "department": obj.to_bed.ward.department.name,
            }
        return None


class TransferCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transfer
        fields = [
            "admission", "to_hospital", "to_department", "to_bed",
            "transfer_type", "reason", "transport_mode",
            "accompanying_personnel", "special_requirements"
        ]

    def create(self, validated_data):
        admission = validated_data["admission"]
        return Transfer.objects.create(
            admission=admission,
            patient=admission.patient,
            from_hospital=admission.hospital,
            from_department=admission.department,
            from_bed=admission.bed,
            requested_by=self.context.get("request").user if self.context.get("request") else None,
            **validated_data,
        )


class TransferUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transfer
        fields = [
            "to_hospital",
            "to_department",
            "to_bed",
            "transport_mode",
            "accompanying_personnel",
            "special_requirements",
            "reason",
        ]