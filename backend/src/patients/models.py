"""
Patient models for BedFlow - Patient records per section 4.2
"""

from django.db import models, transaction
from django.conf import settings
from django.utils import timezone

from src.lib.utils.uuid7 import uuid7


class Patient(models.Model):
    """
    Patient master record.
    Per requirements section 4.2.1 - Patient data including MRN.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    # Medical Record Number - unique identifier
    mrn = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        verbose_name="Medical Record Number"
    )

    # Personal Information
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField()
    gender = models.CharField(
        max_length=10,
        choices=[
            ("M", "Male"),
            ("F", "Female"),
            ("O", "Other"),
            ("U", "Unknown"),
        ]
    )

    # Contact Information
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, default="US")

    # Emergency Contact
    emergency_contact_name = models.CharField(max_length=200, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    emergency_contact_relationship = models.CharField(max_length=50, blank=True)

    # Insurance
    insurance_provider = models.CharField(max_length=200, blank=True)
    insurance_policy_number = models.CharField(max_length=100, blank=True)
    insurance_group_number = models.CharField(max_length=100, blank=True)

    # Clinical Information
    allergies = models.TextField(blank=True)
    medical_history = models.TextField(blank=True)
    current_medications = models.TextField(blank=True)

    # Status
    is_active = models.BooleanField(default=True)
    is_deceased = models.BooleanField(default=False)
    deceased_date = models.DateField(null=True, blank=True)

    # Hospital
    primary_hospital = models.ForeignKey(
        "organizations.Hospital",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patients"
    )

    # External ID (for EHR integration)
    ehr_id = models.CharField(max_length=100, blank=True, db_index=True)
    external_source = models.CharField(max_length=100, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_patients"
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["mrn"]),
            models.Index(fields=["ehr_id"]),
            models.Index(fields=["last_name", "first_name"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["primary_hospital"]),
        ]

    def __str__(self):
        return f"{self.mrn} - {self.get_full_name()}"

    def get_full_name(self):
        """Return patient's full name."""
        if self.middle_name:
            return f"{self.first_name} {self.middle_name} {self.last_name}"
        return f"{self.first_name} {self.last_name}"

    def get_current_admission(self):
        """Get current active admission if any."""
        return self.admissions.filter(
            status__in=["admitted", "assigned"]
        ).first()

    def is_currently_admitted(self):
        """Check if patient is currently admitted."""
        return self.admissions.filter(
            status__in=["admitted", "assigned"]
        ).exists()

    def get_admission_history(self):
        """Get all past admissions."""
        return self.admissions.filter(status="discharged").order_by("-discharged_at")


class ClinicalRequirement(models.Model):
    """
    Clinical requirements for patient bed assignment.
    Per requirements 4.2.1 - Clinical requirements for admission.
    """
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="clinical_requirements"
    )

    # Requirement Type
    requirement_type = models.CharField(
        max_length=50,
        choices=[
            ("isolation", "Isolation Required"),
            ("icu", "ICU Required"),
            ("oxygen", "Oxygen Required"),
            ("ventilator", "Ventilator Required"),
            ("cardiac_monitor", "Cardiac Monitor Required"),
            ("bariatric", "Bariatric Bed Required"),
            ("fall_risk", "Fall Risk Precautions"),
            ("infection_control", "Infection Control"),
            ("dietary", "Dietary Restrictions"),
            ("mobility", "Mobility Assistance"),
        ]
    )

    # Details
    description = models.TextField(blank=True)
    priority = models.CharField(
        max_length=20,
        choices=[
            ("low", "Low"),
            ("medium", "Medium"),
            ("high", "High"),
            ("critical", "Critical"),
        ],
        default="medium"
    )

    # Status
    is_active = models.BooleanField(default=True)
    date_identified = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    # Identified by
    identified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="identified_requirements"
    )

    class Meta:
        ordering = ["-priority", "-date_identified"]
        indexes = [
            models.Index(fields=["patient", "is_active"]),
            models.Index(fields=["requirement_type"]),
        ]

    def __str__(self):
        return f"{self.patient.mrn}: {self.requirement_type}"

    def resolve(self, user=None):
        """Mark requirement as resolved."""
        self.is_active = False
        self.resolved_at = timezone.now()
        self.save()
