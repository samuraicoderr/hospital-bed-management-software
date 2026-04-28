"""
Serializers for patient models.
"""

from rest_framework import serializers

from src.patients.models import Patient, ClinicalRequirement


class PatientListSerializer(serializers.ModelSerializer):
    is_currently_admitted = serializers.SerializerMethodField()
    current_bed = serializers.SerializerMethodField()
    primary_hospital_name = serializers.CharField(source="primary_hospital.name", read_only=True)
    age = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            "id", "mrn", "first_name", "last_name", "date_of_birth",
            "gender", "phone", "email", "is_currently_admitted", "current_bed",
            "primary_hospital", "primary_hospital_name", "is_active", "is_deceased",
            "age"
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

    def get_age(self, obj):
        from datetime import date
        today = date.today()
        return today.year - obj.date_of_birth.year - (
            (today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day)
        )


class PatientDetailSerializer(serializers.ModelSerializer):
    clinical_requirements = serializers.SerializerMethodField()
    current_admission = serializers.SerializerMethodField()
    primary_hospital_name = serializers.CharField(source="primary_hospital.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)
    age = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            "id", "mrn", "first_name", "last_name", "middle_name",
            "date_of_birth", "gender", "phone", "email", "address",
            "city", "state", "postal_code", "country",
            "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relationship",
            "insurance_provider", "insurance_policy_number", "insurance_group_number",
            "allergies", "medical_history", "current_medications",
            "clinical_requirements", "current_admission",
            "is_active", "is_deceased", "deceased_date",
            "primary_hospital", "primary_hospital_name",
            "ehr_id", "external_source",
            "created_at", "updated_at", "created_by", "created_by_name",
            "age"
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
                "hospital_id": str(admission.hospital.id),
                "department": admission.department.name,
                "department_id": str(admission.department.id),
                "admitted_at": admission.admitted_at
            }
        return None

    def get_age(self, obj):
        from datetime import date
        today = date.today()
        return today.year - obj.date_of_birth.year - (
            (today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day)
        )


class PatientCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = [
            "mrn", "first_name", "last_name", "middle_name",
            "date_of_birth", "gender", "phone", "email", "address",
            "city", "state", "postal_code", "country",
            "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relationship",
            "insurance_provider", "insurance_policy_number", "insurance_group_number",
            "allergies", "medical_history", "current_medications",
            "primary_hospital", "ehr_id", "external_source"
        ]


class PatientUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = [
            "first_name", "last_name", "middle_name",
            "date_of_birth", "gender", "phone", "email", "address",
            "city", "state", "postal_code", "country",
            "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relationship",
            "insurance_provider", "insurance_policy_number", "insurance_group_number",
            "allergies", "medical_history", "current_medications",
            "primary_hospital", "is_active", "is_deceased", "deceased_date",
            "ehr_id", "external_source"
        ]


class ClinicalRequirementSerializer(serializers.ModelSerializer):
    requirement_type_display = serializers.CharField(source="get_requirement_type_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    patient_name = serializers.SerializerMethodField()
    patient_mrn = serializers.SerializerMethodField()

    class Meta:
        model = ClinicalRequirement
        fields = [
            "id", "patient", "patient_name", "patient_mrn",
            "requirement_type", "requirement_type_display",
            "description", "priority", "priority_display",
            "is_active", "date_identified", "resolved_at"
        ]

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_patient_mrn(self, obj):
        return obj.patient.mrn


class ClinicalRequirementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalRequirement
        fields = [
            "patient", "requirement_type", "description", "priority"
        ]


class ClinicalRequirementUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalRequirement
        fields = [
            "requirement_type", "description", "priority", "is_active"
        ]