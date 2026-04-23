"""
Serializers for discharge models.
"""

from rest_framework import serializers

from src.discharges.models import Discharge


class DischargeListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.get_full_name", read_only=True)
    patient_mrn = serializers.CharField(source="patient.mrn", read_only=True)
    bed_code = serializers.CharField(source="bed.bed_code", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    discharge_type_display = serializers.CharField(source="get_discharge_type_display", read_only=True)
    expected_turnover = serializers.SerializerMethodField()

    def get_expected_turnover(self, obj):
        return obj.turnover_minutes

    class Meta:
        model = Discharge
        fields = [
            "id", "patient_name", "patient_mrn", "bed_code",
            "discharge_type", "discharge_type_display", "status", "status_display",
            "initiated_at", "destination", "expected_turnover"
        ]


class DischargeDetailSerializer(serializers.ModelSerializer):
    patient = serializers.SerializerMethodField()
    bed = serializers.SerializerMethodField()
    admission = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    discharge_type_display = serializers.CharField(source="get_discharge_type_display", read_only=True)
    destination_display = serializers.CharField(source="get_destination_display", read_only=True)

    class Meta:
        model = Discharge
        fields = [
            "id", "patient", "bed", "admission", "discharge_type", "discharge_type_display",
            "status", "status_display", "initiated_by", "initiated_at", "reason",
            "destination", "destination_display", "destination_details",
            "discharge_diagnosis", "discharge_summary", "medications",
            "follow_up_instructions", "follow_up_appointment",
            "completed_at", "turnover_minutes", "created_at"
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
                "ward": obj.bed.ward.name
            }
        return None

    def get_admission(self, obj):
        return {
            "id": str(obj.admission.id),
            "admitted_at": obj.admission.admitted_at,
            "clinical_notes": obj.admission.clinical_notes
        }