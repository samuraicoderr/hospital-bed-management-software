"""
Common constants for BedFlow Hospital Bed Management System
"""

from django.db import models


class BedStatus(models.TextChoices):
    """Bed status per requirements section 4.1.2"""
    AVAILABLE = "available", "Available"
    RESERVED = "reserved", "Reserved"
    OCCUPIED = "occupied", "Occupied"
    CLEANING_REQUIRED = "cleaning_required", "Cleaning Required"
    CLEANING_IN_PROGRESS = "cleaning_in_progress", "Cleaning In Progress"
    UNDER_MAINTENANCE = "under_maintenance", "Under Maintenance"
    BLOCKED = "blocked", "Blocked"
    ISOLATION = "isolation", "Isolation"


class BedType(models.TextChoices):
    """Types of hospital beds"""
    ICU = "icu", "ICU"
    GENERAL = "general", "General"
    ISOLATION = "isolation", "Isolation"
    NICU = "nicu", "NICU"
    EMERGENCY = "emergency", "Emergency"
    MATERNITY = "maternity", "Maternity"
    PEDIATRIC = "pediatric", "Pediatric"
    BARIATRIC = "bariatric", "Bariatric"
    BURN = "burn", "Burn Unit"
    PSYCHIATRIC = "psychiatric", "Psychiatric"
    RECOVERY = "recovery", "Recovery"
    OBSERVATION = "observation", "Observation"


class GenderRestriction(models.TextChoices):
    """Gender restrictions for beds"""
    NONE = "none", "None"
    MALE_ONLY = "male_only", "Male Only"
    FEMALE_ONLY = "female_only", "Female Only"


class AdmissionSource(models.TextChoices):
    """Source of admission"""
    EMERGENCY = "emergency", "Emergency Department"
    OUTPATIENT = "outpatient", "Outpatient Clinic"
    TRANSFER_INTERNAL = "transfer_internal", "Internal Transfer"
    TRANSFER_EXTERNAL = "transfer_external", "External Transfer"
    PLANNED_ADMISSION = "planned_admission", "Planned Admission"
    DIRECT_ADMISSION = "direct_admission", "Direct Admission"
    EHR_INTEGRATION = "ehr_integration", "EHR Integration"


class AdmissionStatus(models.TextChoices):
    """Status of admission request"""
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    ASSIGNED = "assigned", "Assigned"
    ADMITTED = "admitted", "Admitted"
    DISCHARGED = "discharged", "Discharged"
    CANCELLED = "cancelled", "Cancelled"
    TRANSFERRED = "transferred", "Transferred"


class TransferType(models.TextChoices):
    """Types of patient transfers"""
    INTRA_WARD = "intra_ward", "Intra-ward Transfer"
    INTER_WARD = "inter_ward", "Inter-ward Transfer"
    INTER_HOSPITAL = "inter_hospital", "Inter-hospital Transfer"


class TransferStatus(models.TextChoices):
    """Status of transfer"""
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"
    REJECTED = "rejected", "Rejected"


class DischargeStatus(models.TextChoices):
    """Status of discharge"""
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class DischargeDestination(models.TextChoices):
    """Destination after discharge"""
    HOME = "home", "Home"
    OTHER_HOSPITAL = "other_hospital", "Other Hospital"
    REHABILITATION = "rehabilitation", "Rehabilitation Facility"
    NURSING_HOME = "nursing_home", "Nursing Home"
    HOSPICE = "hospice", "Hospice"
    DECEASED = "deceased", "Deceased"


class CleaningStatus(models.TextChoices):
    """Status of cleaning task per requirements section 4.3.2"""
    PENDING = "pending", "Pending"
    ASSIGNED = "assigned", "Assigned"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    OVERDUE = "overdue", "Overdue"
    ESCALATED = "escalated", "Escalated"


class CleaningPriority(models.TextChoices):
    """Priority of cleaning task"""
    ROUTINE = "routine", "Routine"
    URGENT = "urgent", "Urgent"
    STAT = "stat", "STAT"
    ISOLATION_CLEAN = "isolation_clean", "Isolation Clean"


class AlertSeverity(models.TextChoices):
    """Severity levels for alerts"""
    INFO = "info", "Information"
    WARNING = "warning", "Warning"
    CRITICAL = "critical", "Critical"
    EMERGENCY = "emergency", "Emergency"


class AlertType(models.TextChoices):
    """Types of alerts per requirements section 4.6"""
    BED_AVAILABLE = "bed_available", "Bed Available"
    BED_RESERVED = "bed_reserved", "Bed Reserved"
    CLEANING_SLA_BREACH = "cleaning_sla_breach", "Cleaning SLA Breach"
    ICU_OCCUPANCY_HIGH = "icu_occupancy_high", "ICU Occupancy High"
    ADMISSION_QUEUE_DEEP = "admission_queue_deep", "Admission Queue Deep"
    DISCHARGE_PENDING = "discharge_pending", "Discharge Pending"
    EQUIPMENT_ALERT = "equipment_alert", "Equipment Alert"
    BED_BLOCKED = "bed_blocked", "Bed Blocked"
    SYSTEM_ERROR = "system_error", "System Error"


class NotificationChannel(models.TextChoices):
    """Notification channels per requirements section 4.6"""
    SMS = "sms", "SMS"
    EMAIL = "email", "Email"
    IN_APP = "in_app", "In-App Alert"
    PUSH = "push", "Push Notification"


class AuditAction(models.TextChoices):
    """Types of audit actions"""
    CREATE = "create", "Create"
    UPDATE = "update", "Update"
    DELETE = "delete", "Delete"
    STATUS_CHANGE = "status_change", "Status Change"
    LOGIN = "login", "Login"
    LOGOUT = "logout", "Logout"
    FAILED_LOGIN = "failed_login", "Failed Login"
    ROLE_CHANGE = "role_change", "Role Change"
    CONFIG_CHANGE = "config_change", "Configuration Change"


class IntegrationType(models.TextChoices):
    """Types of external integrations"""
    FHIR = "fhir", "FHIR API"
    HL7 = "hl7", "HL7 v2"
    ADT = "adt", "ADT Feed"
    WEBHOOK = "webhook", "Webhook"
    SMS_GATEWAY = "sms_gateway", "SMS Gateway"
    EMAIL_GATEWAY = "email_gateway", "Email Gateway"
    IDENTITY_PROVIDER = "identity_provider", "Identity Provider"
    ANALYTICS = "analytics", "Analytics Platform"


class IntegrationStatus(models.TextChoices):
    """Status of integration"""
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"
    ERROR = "error", "Error"
    CONFIGURATION_PENDING = "configuration_pending", "Configuration Pending"


class ReportFormat(models.TextChoices):
    """Export formats for reports"""
    PDF = "pdf", "PDF"
    CSV = "csv", "CSV"
    EXCEL = "excel", "Excel"
    JSON = "json", "JSON"


class ReportType(models.TextChoices):
    """Types of reports"""
    DAILY_CENSUS = "daily_census", "Daily Census"
    BED_UTILIZATION = "bed_utilization", "Bed Utilization"
    TURNOVER_TIME = "turnover_time", "Turnover Time"
    OCCUPANCY_TREND = "occupancy_trend", "Occupancy Trend"
    DEPARTMENTAL_PERFORMANCE = "departmental_performance", "Departmental Performance"
    CLEANING_PERFORMANCE = "cleaning_performance", "Cleaning Performance"
    ADMISSION_DISCHARGE = "admission_discharge", "Admission/Discharge Summary"


# Constants for SLA calculations
CLEANING_SLA_MINUTES = {
    CleaningPriority.ROUTINE: 60,
    CleaningPriority.URGENT: 30,
    CleaningPriority.STAT: 15,
    CleaningPriority.ISOLATION_CLEAN: 90,
}

# ICU occupancy threshold for alerts
ICU_OCCUPANCY_THRESHOLD = 90  # percentage

# Deep admission queue threshold
ADMISSION_QUEUE_THRESHOLD = 10  # number of pending admissions

# Data retention periods (in days)
DATA_RETENTION_YEARS = 7
AUDIT_LOG_RETENTION_YEARS = 7
