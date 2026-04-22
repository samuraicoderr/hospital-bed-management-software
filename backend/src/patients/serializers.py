"""
Serializers for patient models.
"""

from rest_framework import serializers

from src.patients.models import Patient, ClinicalRequirement


class PatientListSerializer(serializers.ModelSerializer):
    is_currently_admitted = serializers.SerializerMethodField()
    current_bed = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            "id", "mrn", "first_name", "last_name", "date_of_birth",
            "gender", "phone", "is_currently_admitted", "current_bed"
        ]

    def get_is_currently_admitted(self, obj):
        return obj.is_currently_admitted()

    def get_current_bed(self, obj):
        admission = obj.get_current_admission()
        if admission and admission.bed:
            return {
                "id": str(admission.bed.id),
                "code": admission.bed.bed_code,
                "ward": admission.bed.ward.name
            }
        return None


class PatientDetailSerializer(serializers.ModelSerializer):
    clinical_requirements = serializers.SerializerMethodField()
    current_admission = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            "id", "mrn", "first_name", "last_name", "middle_name",
            "date_of_birth", "gender", "phone", "email", "address",
            "emergency_contact_name", "emergency_contact_phone",
            "allergies", "medical_history", "clinical_requirements",
            "current_admission", "is_active", "created_at"
        ]

    def get_clinical_requirements(self, obj):
        requirements = obj.clinical_requirements.filter(is_active=True)
        return ClinicalRequirementSerializer(requirements, many=True).data

    def get_current_admission(self, obj):
        admission = obj.get_current_admission()
        if admission:
            return {
                "id": str(admission.id),
                "bed": admission.bed.bed_code if admission.bed else None,
                "hospital": admission.hospital.name,
                "admitted_at": admission.admitted_at
            }
        return None


class PatientCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = [
            "mrn", "first_name", "last_name", "middle_name",
            "date_of_birth", "gender", "phone", "email", "address",
            "emergency_contact_name", "emergency_contact_phone",
            "primary_hospital"
        ]


class ClinicalRequirementSerializer(serializers.ModelSerializer):
    requirement_type_display = serializers.CharField(source="get_requirement_type_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)

    class Meta:
        model = ClinicalRequirement
        fields = [
            "id", "requirement_type", "requirement_type_display",
            "description", "priority", "priority_display",
            "is_active", "date_identified"
        ]