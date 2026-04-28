// BedFlow - API Types Index

export * from './beds.types';
export * from './admissions.types';
export * from './housekeeping.types';
export * from './dashboard.types';
export type {
  PatientGender,
  RequirementType,
  RequirementPriority,
  Patient,
  PatientListItem,
  PatientDetail,
  CurrentAdmission,
  AdmissionHistoryEntry,
  AdmissionStatus as PatientAdmissionStatus,
  ClinicalRequirement as PatientClinicalRequirement,
  CreatePatientRequest as CreatePatientRecordRequest,
  UpdatePatientRequest,
  MarkDeceasedRequest,
  CreateClinicalRequirementRequest,
  UpdateClinicalRequirementRequest,
  PatientFilters,
  ClinicalRequirementFilters,
} from './patients.types';
export {
	AlertSeverity,
	AlertType,
	NotificationChannel,
} from './alerts.types';
export type {
	Alert,
	Notification,
	AlertPreference,
	CreateAlertRequest,
	MarkAlertReadRequest,
	AlertFilters,
	AlertStats,
} from './alerts.types';
export * from './auth';
export * from './common.types';
export type {
  HospitalStaffRole,
  HospitalType,
  DepartmentType,
  WardType,
  HospitalInvitationStatus,
  Organization,
  Hospital,
  Building,
  Department,
  Ward,
  HospitalStaff,
  HospitalStaffInvitation,
  CreateBuildingRequest,
  CreateDepartmentRequest,
  CreateWardRequest,
  InviteHospitalStaffRequest,
  UpdateHospitalStaffRequest,
} from './organizations.types';
