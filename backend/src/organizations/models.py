"""
Organization models for BedFlow - Multi-hospital support per section 4.7
"""

from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone

from src.common.constants import GenderRestriction
from src.lib.utils.uuid7 import uuid7


class HospitalType(models.TextChoices):
    GENERAL = "general", "General Hospital"
    SPECIALTY = "specialty", "Specialty Hospital"
    TEACHING = "teaching", "Teaching Hospital"
    CHILDREN = "children", "Children's Hospital"
    PSYCHIATRIC = "psychiatric", "Psychiatric Hospital"
    REHABILITATION = "rehabilitation", "Rehabilitation Hospital"


class DepartmentType(models.TextChoices):
    GENERAL_MEDICINE = "general_medicine", "General Medicine"
    SURGERY = "surgery", "Surgery"
    ICU = "icu", "ICU"
    EMERGENCY = "emergency", "Emergency"
    MATERNITY = "maternity", "Maternity"
    PEDIATRICS = "pediatrics", "Pediatrics"
    PSYCHIATRY = "psychiatry", "Psychiatry"
    ONCOLOGY = "oncology", "Oncology"
    ORTHOPEDICS = "orthopedics", "Orthopedics"
    CARDIOLOGY = "cardiology", "Cardiology"
    NEUROLOGY = "neurology", "Neurology"
    GERIATRICS = "geriatrics", "Geriatrics"
    REHABILITATION = "rehabilitation", "Rehabilitation"


class WardType(models.TextChoices):
    SINGLE = "single", "Single Room"
    DOUBLE = "double", "Double Room"
    MULTI = "multi", "Multi-bed Room"
    BAY = "bay", "Bay"
    ICU = "icu", "ICU Pod"
    EMERGENCY = "emergency", "Emergency Bay"


class HospitalStaffRole(models.TextChoices):
    OWNER = "owner", "Owner"
    SYSTEM_ADMINISTRATOR = "system_administrator", "System Administrator"
    BED_MANAGER = "bed_manager", "Bed Manager"
    NURSE_SUPERVISOR = "nurse_supervisor", "Nurse Supervisor"
    ADMISSION_STAFF = "admission_staff", "Admission Staff"
    HOUSEKEEPING_STAFF = "housekeeping_staff", "Housekeeping Staff"
    EXECUTIVE_VIEWER = "executive_viewer", "Executive / Viewer"
    CLINICAL_STAFF = "clinical_staff", "Clinical Staff"
    WARD_CLERK = "ward_clerk", "Ward Clerk"


class Organization(models.Model):
    """
    Top-level organization entity.
    Can contain multiple hospitals for hospital chains.
    """

    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    name = models.CharField(max_length=255)

    code = models.CharField(
        max_length=50,
        unique=True,
        validators=[
            RegexValidator(
                regex=r"^[A-Z0-9_]+$",
                message="Code must contain only uppercase letters, numbers, and underscores",
            )
        ],
    )

    description = models.TextField(blank=True)

    # Contact Information
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)

    # Settings
    timezone = models.CharField(max_length=50, default="UTC")
    currency = models.CharField(max_length=3, default="USD")
    date_format = models.CharField(max_length=20, default="YYYY-MM-DD")

    # Multi-hospital settings
    allow_cross_hospital_transfers = models.BooleanField(default=True)
    allow_centralized_reporting = models.BooleanField(default=True)

    # Status
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_organizations",
    )

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Hospital(models.Model):
    """
    Hospital entity within an organization.
    Per requirements section 4.1.1 - Hospital is top of bed hierarchy.
    """

    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="hospitals",
    )

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)

    # Hospital Details
    hospital_type = models.CharField(
        max_length=50,
        choices=HospitalType.choices,
        default=HospitalType.GENERAL,
    )

    license_number = models.CharField(max_length=100, blank=True)
    tax_id = models.CharField(max_length=100, blank=True)

    # Contact Information
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)

    # Location for mapping
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        null=True,
        blank=True,
    )

    longitude = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        null=True,
        blank=True,
    )

    # Hospital Settings
    timezone = models.CharField(max_length=50, default="UTC")
    total_beds = models.PositiveIntegerField(default=0)
    icu_beds = models.PositiveIntegerField(default=0)
    emergency_beds = models.PositiveIntegerField(default=0)

    # Operational Settings
    cleaning_sla_minutes = models.PositiveIntegerField(default=60)
    auto_assign_cleaning = models.BooleanField(default=True)
    require_discharge_approval = models.BooleanField(default=False)

    # Status
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_hospitals",
    )

    class Meta:
        ordering = ["name"]
        unique_together = ["organization", "code"]
        indexes = [
            models.Index(fields=["organization", "is_active"]),
            models.Index(fields=["code"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.code}"

    def get_available_beds_count(self):
        """Get count of available beds."""
        from src.beds.models import Bed

        return Bed.objects.filter(
            ward__department__hospital=self,
            status="available",
            is_active=True,
        ).count()

    def get_occupancy_rate(self):
        """Calculate current occupancy rate."""
        from src.beds.models import Bed

        total = Bed.objects.filter(
            ward__department__hospital=self,
            is_active=True,
        ).count()

        occupied = Bed.objects.filter(
            ward__department__hospital=self,
            status="occupied",
            is_active=True,
        ).count()

        return (occupied / total * 100) if total > 0 else 0


class Building(models.Model):
    """
    Building within a hospital.
    Optional hierarchy level.
    """

    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    hospital = models.ForeignKey(
        Hospital,
        on_delete=models.CASCADE,
        related_name="buildings",
    )

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)

    # Building Details
    floors = models.PositiveIntegerField(default=1)
    has_elevator = models.BooleanField(default=True)
    is_accessible = models.BooleanField(default=True)

    # Status
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = ["hospital", "code"]
        indexes = [
            models.Index(fields=["hospital", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.hospital.code})"


class Department(models.Model):
    """
    Department/Ward within a hospital.
    Per requirements section 4.1.1 - Ward is part of bed hierarchy.
    """

    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    hospital = models.ForeignKey(
        Hospital,
        on_delete=models.CASCADE,
        related_name="departments",
    )

    building = models.ForeignKey(
        Building,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="departments",
    )

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)

    # Department Type
    department_type = models.CharField(
        max_length=50,
        choices=DepartmentType.choices,
    )

    # Location
    floor = models.CharField(max_length=20, blank=True)
    wing = models.CharField(max_length=50, blank=True)

    # Capacity
    total_beds = models.PositiveIntegerField(default=0)

    # Gender restriction for wards with specific gender requirements
    gender_restriction = models.CharField(
        max_length=20,
        choices=GenderRestriction.choices,
        default=GenderRestriction.NONE,
    )

    # Contact
    extension = models.CharField(max_length=20, blank=True)
    nurse_station_phone = models.CharField(max_length=20, blank=True)

    # Status
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_departments",
    )

    class Meta:
        ordering = ["name"]
        unique_together = ["hospital", "code"]
        indexes = [
            models.Index(fields=["hospital", "is_active"]),
            models.Index(fields=["department_type"]),
            models.Index(fields=["gender_restriction"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.hospital.code})"

    def get_available_beds(self):
        """Get available beds in this department."""
        from src.beds.models import Bed

        return Bed.objects.filter(
            ward__department=self,
            status="available",
            is_active=True,
        )


class Ward(models.Model):
    """
    Ward/Room grouping within a department.
    Per requirements section 4.1.1 - Room is part of bed hierarchy.
    """

    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="wards",
    )

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)

    # Ward Type
    ward_type = models.CharField(
        max_length=50,
        choices=WardType.choices,
    )

    # Location
    room_number = models.CharField(max_length=20)
    floor = models.CharField(max_length=20, blank=True)

    # Capacity
    capacity = models.PositiveIntegerField(default=1)

    # Features
    has_bathroom = models.BooleanField(default=True)
    has_oxygen = models.BooleanField(default=False)
    has_suction = models.BooleanField(default=False)
    has_monitor = models.BooleanField(default=False)
    has_ventilator = models.BooleanField(default=False)
    is_isolation_capable = models.BooleanField(default=False)

    # Status
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = ["department", "code"]
        indexes = [
            models.Index(fields=["department", "is_active"]),
            models.Index(fields=["ward_type"]),
        ]

    def __str__(self):
        return f"{self.name} - Room {self.room_number}"


class HospitalStaff(models.Model):
    """
    Links users to hospitals with specific roles.
    A user can be staff at multiple hospitals.
    """

    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="hospital_staff_roles",
    )

    hospital = models.ForeignKey(
        Hospital,
        on_delete=models.CASCADE,
        related_name="staff",
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="department_staff",
    )

    # Role
    role = models.CharField(
        max_length=50,
        choices=HospitalStaffRole.choices,
    )

    # Permissions override
    additional_permissions = models.JSONField(default=dict, blank=True)
    restricted_permissions = models.JSONField(default=list, blank=True)

    # Employment
    employee_id = models.CharField(max_length=100, blank=True)
    is_primary_assignment = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    # Schedule
    shift_start = models.TimeField(null=True, blank=True)
    shift_end = models.TimeField(null=True, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_staff",
    )

    class Meta:
        ordering = ["-is_primary_assignment", "user__last_name"]
        unique_together = [
            ["user", "hospital", "department", "role"],
        ]
        indexes = [
            models.Index(fields=["hospital", "role"]),
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["role", "is_active"]),
        ]
        verbose_name_plural = "Hospital Staff"

    def __str__(self):
        return f"{self.user.get_name()} - {self.get_role_display()} at {self.hospital.code}"

    def has_permission(self, permission):
        """Check if staff member has a specific permission."""
        from src.users.enums.hospital_roles import ROLE_PERMISSIONS

        role_perms = ROLE_PERMISSIONS.get(self.role, [])
        role_perm_values = [p.value for p in role_perms]

        # Check if permission is restricted
        if permission in self.restricted_permissions:
            return False

        # Check additional permissions
        if permission in self.additional_permissions.get("permissions", []):
            return True

        return permission in role_perm_values


class HospitalStaffInvitationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    REVOKED = "revoked", "Revoked"
    EXPIRED = "expired", "Expired"


class HospitalStaffInvitation(models.Model):
    """
    Invitation lifecycle for adding staff members to a hospital.
    Supports both already-onboarded users and users still completing onboarding.
    """

    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)

    hospital = models.ForeignKey(
        Hospital,
        on_delete=models.CASCADE,
        related_name="staff_invitations",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="staff_invitations",
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_hospital_staff_invitations",
    )
    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accepted_hospital_staff_invitations",
    )

    email = models.EmailField()
    role = models.CharField(
        max_length=50,
        choices=HospitalStaffRole.choices,
    )
    employee_id = models.CharField(max_length=100, blank=True)
    message = models.CharField(max_length=255, blank=True)

    token = models.CharField(max_length=64, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=HospitalStaffInvitationStatus.choices,
        default=HospitalStaffInvitationStatus.PENDING,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["hospital", "status"]),
            models.Index(fields=["email", "status"]),
            models.Index(fields=["expires_at"]),
        ]

    def __str__(self):
        return f"{self.email} invited to {self.hospital.code} ({self.role})"

    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at
