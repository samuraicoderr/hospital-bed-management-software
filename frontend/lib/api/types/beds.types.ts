export type UUID = string;

export enum BedStatus {
  AVAILABLE = "available",
  RESERVED = "reserved",
  OCCUPIED = "occupied",
  CLEANING_REQUIRED = "cleaning_required",
  CLEANING_IN_PROGRESS = "cleaning_in_progress",
  UNDER_MAINTENANCE = "under_maintenance",
  BLOCKED = "blocked",
}

export enum BedType {
  ICU = "icu",
  GENERAL = "general",
  ISOLATION = "isolation",
  NICU = "nicu",
  EMERGENCY = "emergency",
  MATERNITY = "maternity",
  PEDIATRIC = "pediatric",
  BARIATRIC = "bariatric",
  BURN = "burn",
  PSYCHIATRIC = "psychiatric",
  RECOVERY = "recovery",
  OBSERVATION = "observation",
}

export enum GenderRestriction {
  NONE = "none",
  MALE_ONLY = "male_only",
  FEMALE_ONLY = "female_only",
}

export interface EquipmentTag {
  id: UUID;
  name: string;
  code: string;
  description: string;
  category: string;
  is_active: boolean;
  created_at?: string;
}

export interface BedWardSummary {
  id: UUID;
  name: string;
  room_number: string;
  department: {
    id: UUID;
    name: string;
  };
  hospital?: {
    id: UUID;
    name: string;
  };
}

export interface BedMaintenanceRecord {
  id: UUID;
  bed: UUID;
  bed_code: string;
  issue_description: string;
  maintenance_type: "repair" | "preventive" | "inspection" | "replacement";
  severity: "low" | "medium" | "high" | "critical";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  reported_by?: UUID | null;
  reported_by_name?: string | null;
  reported_at: string;
  resolved_by?: UUID | null;
  resolved_by_name?: string | null;
  resolved_at?: string | null;
  resolution_notes: string;
}

export interface BedStatusHistory {
  id: UUID;
  status: BedStatus;
  status_display: string;
  changed_by_name?: string | null;
  changed_at: string;
  reason: string;
  linked_admission?: {
    id: UUID;
    patient_name: string;
    patient_mrn: string;
  } | null;
}

export interface BedListItem {
  id: UUID;
  bed_code: string;
  bed_number: string;
  hospital_id: UUID;
  hospital_name: string;
  department_id: UUID;
  department_name: string;
  ward_id: UUID;
  ward_name: string;
  bed_type: BedType;
  bed_type_display: string;
  status: BedStatus;
  status_display: string;
  is_isolation: boolean;
  gender_restriction: GenderRestriction;
  bed_size: string;
  max_patient_weight_kg: number;
  equipment_tags: EquipmentTag[];
  is_active: boolean;
  blocked_until?: string | null;
  status_changed_at: string;
  occupied_since?: string | null;
}

export interface Bed extends BedListItem {
  ward: BedWardSummary;
  current_admission?: UUID | null;
  current_patient?: {
    id: UUID;
    mrn: string;
    name: string;
    admitted_at: string;
  } | null;
  current_reservation?: {
    id: UUID;
    patient_name: string;
    patient_mrn: string;
    reserved_until: string;
  } | null;
  active_maintenance: BedMaintenanceRecord[];
  blocked_reason: string;
  under_maintenance_since?: string | null;
  maintenance_reason: string;
  status_reason: string;
  status_changed_by?: UUID | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface BedStatistics {
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  cleaning_required: number;
  cleaning_in_progress: number;
  maintenance: number;
  blocked: number;
  isolation: number;
  inactive: number;
  occupancy_rate: number;
}

export interface BedAnalytics {
  statistics: BedStatistics;
  utilization_by_type: Array<{
    bed_type: BedType;
    total: number;
    occupied: number;
    occupancy_rate: number;
  }>;
  isolation_usage: {
    total: number;
    occupied: number;
    available: number;
  };
  gender_allocation: Array<{
    gender_restriction: GenderRestriction;
    total: number;
    occupied: number;
  }>;
  average_turnover_minutes: number;
  average_cleaning_turnaround_minutes: number;
  maintenance_frequency: Array<{
    severity: "low" | "medium" | "high" | "critical";
    total: number;
    open: number;
  }>;
  admission_history: {
    total_admissions: number;
    currently_admitted: number;
    status_history_events: number;
  };
}

export interface BedStatusUpdateRequest {
  status: BedStatus;
  reason?: string;
}

export interface BedBlockRequest {
  reason: string;
  until?: string;
}

export interface BedReservationRequest {
  admission_request_id: UUID;
  reserved_until: string;
  reason?: string;
}

export interface BedAssignmentRequest {
  admission_id: UUID;
  reason?: string;
}

export interface BedReleaseRequest {
  reason?: string;
  trigger_cleaning?: boolean;
  cleaning_priority?: string;
}

export interface BedEligibilityRequest {
  patient_gender?: "M" | "F" | "O" | "U";
  requires_isolation?: boolean;
  equipment_required?: string[];
}

export interface BedEligibilityResponse {
  eligible: boolean;
  issues: string[];
}

export interface BedSearchRequest {
  hospital_id: UUID;
  bed_type?: BedType;
  requires_isolation?: boolean;
  patient_gender?: "M" | "F" | "O" | "U";
  equipment_required?: string[];
  department_id?: UUID;
  ward_id?: UUID;
}

export interface CreateBedRequest {
  ward_id: UUID;
  bed_number: string;
  bed_type: BedType;
  is_isolation?: boolean;
  gender_restriction?: GenderRestriction;
  equipment_tag_ids?: UUID[];
  bed_size?: string;
  max_patient_weight_kg?: number;
  is_active?: boolean;
}

export interface UpdateBedRequest {
  bed_number?: string;
  bed_type?: BedType;
  is_isolation?: boolean;
  gender_restriction?: GenderRestriction;
  equipment_tag_ids?: UUID[];
  bed_size?: string;
  max_patient_weight_kg?: number;
  is_active?: boolean;
}

export interface BedGridFilter {
  hospital?: UUID;
  department?: UUID;
  ward?: UUID;
  status?: BedStatus;
  bed_type?: BedType;
  gender_restriction?: GenderRestriction;
  is_isolation?: boolean;
  is_active?: boolean;
  equipment_tags?: UUID[];
  maintenance_severity?: string;
  search?: string;
  occupied_since_after?: string;
  occupied_since_before?: string;
  status_changed_at_after?: string;
  status_changed_at_before?: string;
}

export interface CreateEquipmentTagRequest {
  name: string;
  code: string;
  category: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateMaintenanceRecordRequest {
  bed: UUID;
  issue_description: string;
  maintenance_type: "repair" | "preventive" | "inspection" | "replacement";
  severity: "low" | "medium" | "high" | "critical";
}

export interface UpdateMaintenanceRecordRequest extends Partial<CreateMaintenanceRecordRequest> {
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  resolution_notes?: string;
}
