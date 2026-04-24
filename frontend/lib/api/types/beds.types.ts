// BedFlow - Bed Management API Types
// Per requirements section 4.1 - Bed inventory and status management

export type UUID = string;

// ─────────────────────────────────────────────
// Enums (matching backend constants)
// ─────────────────────────────────────────────

export enum BedStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  OCCUPIED = 'occupied',
  CLEANING_REQUIRED = 'cleaning_required',
  CLEANING_IN_PROGRESS = 'cleaning_in_progress',
  UNDER_MAINTENANCE = 'under_maintenance',
  BLOCKED = 'blocked',
  ISOLATION = 'isolation',
}

export enum BedType {
  ICU = 'icu',
  GENERAL = 'general',
  ISOLATION = 'isolation',
  NICU = 'nicu',
  EMERGENCY = 'emergency',
  MATERNITY = 'maternity',
  PEDIATRIC = 'pediatric',
  BARIATRIC = 'bariatric',
  BURN = 'burn',
  PSYCHIATRIC = 'psychiatric',
  RECOVERY = 'recovery',
  OBSERVATION = 'observation',
}

export enum GenderRestriction {
  NONE = 'none',
  MALE_ONLY = 'male_only',
  FEMALE_ONLY = 'female_only',
}

// ─────────────────────────────────────────────
// Equipment Tag Types
// ─────────────────────────────────────────────

export interface EquipmentTag {
  id: UUID;
  name: string;
  code: string;
  description: string;
  category: string;
}

// ─────────────────────────────────────────────
// Ward/Department Types
// ─────────────────────────────────────────────

export interface Ward {
  id: UUID;
  name: string;
  room_number: string;
  department: {
    id: UUID;
    name: string;
  };
}

export interface Department {
  id: UUID;
  name: string;
  code: string;
  department_type: string;
  hospital: UUID;
}

export interface Hospital {
  id: UUID;
  name: string;
  code: string;
  hospital_type: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  timezone: string;
  total_beds: number;
  icu_beds: number;
  emergency_beds: number;
  cleaning_sla_minutes: number;
}

// ─────────────────────────────────────────────
// Bed Types
// ─────────────────────────────────────────────

export interface Bed {
  id: UUID;
  bed_code: string;
  bed_number: string;
  ward: Ward;
  ward_name: string;
  department_name: string;
  bed_type: BedType;
  bed_type_display: string;
  status: BedStatus;
  status_display: string;
  is_isolation: boolean;
  gender_restriction: GenderRestriction;
  is_active: boolean;
  equipment_tags?: EquipmentTag[];
  current_admission?: UUID | null;
  current_patient?: {
    id: UUID;
    mrn: string;
    name: string;
    admitted_at: string;
  } | null;
  status_changed_at: string;
  occupied_since: string | null;
  blocked_until: string | null;
  blocked_reason: string;
  max_patient_weight_kg: number;
  created_at: string;
  updated_at: string;
}

export interface BedListItem {
  id: UUID;
  bed_code: string;
  bed_number: string;
  ward_name: string;
  department_name: string;
  bed_type: BedType;
  bed_type_display: string;
  status: BedStatus;
  status_display: string;
  is_isolation: boolean;
  gender_restriction: GenderRestriction;
  is_active: boolean;
}

export interface BedDetail extends Bed {
  equipment_tags: EquipmentTag[];
  ward: Ward;
}

// ─────────────────────────────────────────────
// Bed Statistics
// ─────────────────────────────────────────────

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
  occupancy_rate: number;
}

// ─────────────────────────────────────────────
// Status History
// ─────────────────────────────────────────────

export interface BedStatusHistory {
  id: UUID;
  status: BedStatus;
  status_display: string;
  changed_by_name: string;
  changed_at: string;
  reason: string;
}

// ─────────────────────────────────────────────
// Request/Response Types
// ─────────────────────────────────────────────

export interface BedStatusUpdateRequest {
  status: BedStatus;
  reason?: string;
}

export interface BedBlockRequest {
  reason: string;
  until?: string;
}

export interface BedSearchRequest {
  hospital_id: UUID;
  bed_type?: BedType;
  requires_isolation?: boolean;
  patient_gender?: 'M' | 'F' | 'O' | 'U';
  equipment_required?: string[];
  department_id?: UUID;
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
}

export interface UpdateBedRequest {
  bed_number?: string;
  bed_type?: BedType;
  is_isolation?: boolean;
  gender_restriction?: GenderRestriction;
  equipment_tag_ids?: UUID[];
  is_active?: boolean;
}

// ─────────────────────────────────────────────
// Bed Grid/Visualization Types
// ─────────────────────────────────────────────

export interface BedGridFilter {
  hospital?: UUID;
  department?: UUID;
  ward?: UUID;
  status?: BedStatus;
  bed_type?: BedType;
  search?: string;
}

export interface BedGroup {
  department: string;
  ward: string;
  beds: Bed[];
}
