"""
Hospital user roles for BedFlow - Role-Based Access Control (RBAC)
"""

from django.db import models


class HospitalRole(models.TextChoices):
    """System-level roles for hospital staff per requirements section 3.1"""
    SYSTEM_ADMINISTRATOR = "system_administrator", "System Administrator"
    BED_MANAGER = "bed_manager", "Bed Manager"
    NURSE_SUPERVISOR = "nurse_supervisor", "Nurse Supervisor"
    ADMISSION_STAFF = "admission_staff", "Admission Staff"
    HOUSEKEEPING_STAFF = "housekeeping_staff", "Housekeeping Staff"
    EXECUTIVE_VIEWER = "executive_viewer", "Executive / Viewer"
    CLINICAL_STAFF = "clinical_staff", "Clinical Staff"
    WARD_CLERK = "ward_clerk", "Ward Clerk"


class Permission(models.TextChoices):
    """
    Granular permissions for hospital operations.
    Used for role-based access control at the API level.
    """
    # Bed Management
    VIEW_BED_INVENTORY = "view_bed_inventory", "View Bed Inventory"
    MANAGE_BED_STATUS = "manage_bed_status", "Manage Bed Status"
    OVERRIDE_BED_ALLOCATION = "override_bed_allocation", "Override Bed Allocation Rules"
    BLOCK_BED = "block_bed", "Block/Unblock Bed"

    # Admission
    VIEW_ADMISSION_QUEUE = "view_admission_queue", "View Admission Queue"
    CREATE_ADMISSION = "create_admission", "Create Admission"
    ASSIGN_BED = "assign_bed", "Assign Bed to Patient"
    TRANSFER_PATIENT = "transfer_patient", "Transfer Patient"

    # Discharge
    INITIATE_DISCHARGE = "initiate_discharge", "Initiate Discharge"
    CONFIRM_DISCHARGE = "confirm_discharge", "Confirm Discharge"

    # Housekeeping
    VIEW_CLEANING_TASKS = "view_cleaning_tasks", "View Cleaning Tasks"
    ASSIGN_CLEANING_TASK = "assign_cleaning_task", "Assign Cleaning Task"
    UPDATE_CLEANING_STATUS = "update_cleaning_status", "Update Cleaning Status"

    # Patient
    VIEW_PATIENT_INFO = "view_patient_info", "View Patient Information"
    EDIT_PATIENT_INFO = "edit_patient_info", "Edit Patient Information"

    # Dashboard & Reports
    VIEW_DASHBOARD = "view_dashboard", "View Dashboard"
    VIEW_REPORTS = "view_reports", "View Reports"
    EXPORT_REPORTS = "export_reports", "Export Reports"
    SCHEDULE_REPORTS = "schedule_reports", "Schedule Reports"

    # Organization
    MANAGE_HOSPITAL_SETTINGS = "manage_hospital_settings", "Manage Hospital Settings"
    MANAGE_USERS = "manage_users", "Manage Users and Roles"
    MANAGE_INTEGRATIONS = "manage_integrations", "Manage Integrations"

    # Alerts
    CONFIGURE_ALERTS = "configure_alerts", "Configure Alerts"
    ACKNOWLEDGE_ALERTS = "acknowledge_alerts", "Acknowledge Alerts"

    # Audit
    VIEW_AUDIT_LOGS = "view_audit_logs", "View Audit Logs"
    EXPORT_AUDIT_LOGS = "export_audit_logs", "Export Audit Logs"

    # Multi-hospital
    VIEW_ALL_HOSPITALS = "view_all_hospitals", "View All Hospitals"
    MANAGE_ALL_HOSPITALS = "manage_all_hospitals", "Manage All Hospitals"


# Role-Permission Mapping
ROLE_PERMISSIONS = {
    HospitalRole.SYSTEM_ADMINISTRATOR: [
        Permission.VIEW_BED_INVENTORY,
        Permission.MANAGE_BED_STATUS,
        Permission.OVERRIDE_BED_ALLOCATION,
        Permission.BLOCK_BED,
        Permission.VIEW_ADMISSION_QUEUE,
        Permission.CREATE_ADMISSION,
        Permission.ASSIGN_BED,
        Permission.TRANSFER_PATIENT,
        Permission.INITIATE_DISCHARGE,
        Permission.CONFIRM_DISCHARGE,
        Permission.VIEW_CLEANING_TASKS,
        Permission.ASSIGN_CLEANING_TASK,
        Permission.UPDATE_CLEANING_STATUS,
        Permission.VIEW_PATIENT_INFO,
        Permission.EDIT_PATIENT_INFO,
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_REPORTS,
        Permission.EXPORT_REPORTS,
        Permission.SCHEDULE_REPORTS,
        Permission.MANAGE_HOSPITAL_SETTINGS,
        Permission.MANAGE_USERS,
        Permission.MANAGE_INTEGRATIONS,
        Permission.CONFIGURE_ALERTS,
        Permission.ACKNOWLEDGE_ALERTS,
        Permission.VIEW_AUDIT_LOGS,
        Permission.EXPORT_AUDIT_LOGS,
        Permission.VIEW_ALL_HOSPITALS,
        Permission.MANAGE_ALL_HOSPITALS,
    ],
    HospitalRole.BED_MANAGER: [
        Permission.VIEW_BED_INVENTORY,
        Permission.MANAGE_BED_STATUS,
        Permission.OVERRIDE_BED_ALLOCATION,
        Permission.BLOCK_BED,
        Permission.VIEW_ADMISSION_QUEUE,
        Permission.CREATE_ADMISSION,
        Permission.ASSIGN_BED,
        Permission.INITIATE_DISCHARGE,
        Permission.VIEW_PATIENT_INFO,
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_REPORTS,
        Permission.EXPORT_REPORTS,
        Permission.VIEW_CLEANING_TASKS,
        Permission.ACKNOWLEDGE_ALERTS,
        Permission.VIEW_AUDIT_LOGS,
    ],
    HospitalRole.NURSE_SUPERVISOR: [
        Permission.VIEW_BED_INVENTORY,
        Permission.MANAGE_BED_STATUS,
        Permission.VIEW_ADMISSION_QUEUE,
        Permission.CREATE_ADMISSION,
        Permission.ASSIGN_BED,
        Permission.TRANSFER_PATIENT,
        Permission.INITIATE_DISCHARGE,
        Permission.CONFIRM_DISCHARGE,
        Permission.VIEW_PATIENT_INFO,
        Permission.EDIT_PATIENT_INFO,
        Permission.VIEW_CLEANING_TASKS,
        Permission.ACKNOWLEDGE_ALERTS,
        Permission.VIEW_DASHBOARD,
    ],
    HospitalRole.ADMISSION_STAFF: [
        Permission.VIEW_BED_INVENTORY,
        Permission.VIEW_ADMISSION_QUEUE,
        Permission.CREATE_ADMISSION,
        Permission.ASSIGN_BED,
        Permission.VIEW_PATIENT_INFO,
        Permission.EDIT_PATIENT_INFO,
    ],
    HospitalRole.HOUSEKEEPING_STAFF: [
        Permission.VIEW_CLEANING_TASKS,
        Permission.UPDATE_CLEANING_STATUS,
    ],
    HospitalRole.EXECUTIVE_VIEWER: [
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_REPORTS,
        Permission.EXPORT_REPORTS,
        Permission.SCHEDULE_REPORTS,
        Permission.VIEW_AUDIT_LOGS,
    ],
    HospitalRole.CLINICAL_STAFF: [
        Permission.VIEW_BED_INVENTORY,
        Permission.TRANSFER_PATIENT,
        Permission.INITIATE_DISCHARGE,
        Permission.VIEW_PATIENT_INFO,
        Permission.EDIT_PATIENT_INFO,
        Permission.VIEW_DASHBOARD,
    ],
    HospitalRole.WARD_CLERK: [
        Permission.VIEW_BED_INVENTORY,
        Permission.VIEW_PATIENT_INFO,
        Permission.VIEW_ADMISSION_QUEUE,
        Permission.CREATE_ADMISSION,
    ],
}


def get_permissions_for_role(role):
    """Get all permissions for a given role."""
    return ROLE_PERMISSIONS.get(role, [])


def has_permission(user_role, permission):
    """Check if a role has a specific permission."""
    return permission in ROLE_PERMISSIONS.get(user_role, [])
