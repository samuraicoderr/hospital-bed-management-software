export type HospitalStaffRole =
  | "owner"
  | "system_administrator"
  | "bed_manager"
  | "nurse_supervisor"
  | "admission_staff"
  | "housekeeping_staff"
  | "executive_viewer"
  | "clinical_staff"
  | "ward_clerk";

export type HospitalType =
  | "general"
  | "specialty"
  | "teaching"
  | "children"
  | "psychiatric"
  | "rehabilitation";

export type DepartmentType =
  | "general_medicine"
  | "surgery"
  | "icu"
  | "emergency"
  | "maternity"
  | "pediatrics"
  | "psychiatry"
  | "oncology"
  | "orthopedics"
  | "cardiology"
  | "neurology"
  | "geriatrics"
  | "rehabilitation";

export type WardType = "single" | "double" | "multi" | "bay" | "icu" | "emergency";
export type GenderRestriction = "none" | "male_only" | "female_only";
export type HospitalInvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export interface Organization {
  id: string;
  name: string;
  code: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone: string;
  email: string;
  timezone: string;
  currency: string;
  date_format: string;
  allow_cross_hospital_transfers: boolean;
  allow_centralized_reporting: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Hospital {
  id: string;
  organization: string | Organization;
  organization_name: string;
  name: string;
  code: string;
  hospital_type: HospitalType;
  city: string;
  state: string;
  total_beds: number;
  available_beds: number;
  occupancy_rate: number;
  current_user_role: HospitalStaffRole | null;
  can_manage_organization: boolean;
  can_manage_structure: boolean;
  is_active: boolean;
  license_number?: string;
  tax_id?: string;
  address?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string;
  icu_beds?: number;
  emergency_beds?: number;
  cleaning_sla_minutes?: number;
  auto_assign_cleaning?: boolean;
  require_discharge_approval?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Building {
  id: string;
  hospital: string;
  name: string;
  code: string;
  description: string;
  floors: number;
  has_elevator: boolean;
  is_accessible: boolean;
  is_active: boolean;
}

export interface Department {
  id: string;
  hospital: string;
  building: string | null;
  name: string;
  code: string;
  description: string;
  department_type: DepartmentType;
  floor: string;
  wing: string;
  total_beds: number;
  available_beds_count: number;
  gender_restriction: GenderRestriction;
  extension: string;
  nurse_station_phone: string;
  is_active: boolean;
}

export interface Ward {
  id: string;
  department: string;
  name: string;
  code: string;
  description: string;
  ward_type: WardType;
  room_number: string;
  floor: string;
  capacity: number;
  has_bathroom: boolean;
  has_oxygen: boolean;
  has_suction: boolean;
  has_monitor: boolean;
  has_ventilator: boolean;
  is_isolation_capable: boolean;
  is_active: boolean;
}

export interface HospitalStaff {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  hospital: string;
  role: HospitalStaffRole;
  department: string | null;
  department_name: string | null;
  employee_id: string;
  is_primary_assignment: boolean;
  is_active: boolean;
  shift_start: string | null;
  shift_end: string | null;
  is_me: boolean;
}

export interface HospitalStaffInvitation {
  id: string;
  hospital: string;
  hospital_name: string;
  department: string | null;
  department_name: string | null;
  email: string;
  role: HospitalStaffRole;
  employee_id: string;
  message: string;
  token: string;
  status: HospitalInvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  invited_by: string | null;
  invited_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBuildingRequest {
  hospital: string;
  name: string;
  code: string;
  description?: string;
  floors?: number;
  has_elevator?: boolean;
  is_accessible?: boolean;
}

export interface CreateDepartmentRequest {
  hospital: string;
  building?: string | null;
  name: string;
  code: string;
  description?: string;
  department_type: DepartmentType;
  floor?: string;
  wing?: string;
  total_beds?: number;
  gender_restriction?: GenderRestriction;
  extension?: string;
  nurse_station_phone?: string;
}

export interface CreateWardRequest {
  department: string;
  name: string;
  code: string;
  description?: string;
  ward_type: WardType;
  room_number: string;
  floor?: string;
  capacity?: number;
  has_bathroom?: boolean;
  has_oxygen?: boolean;
  has_suction?: boolean;
  has_monitor?: boolean;
  has_ventilator?: boolean;
  is_isolation_capable?: boolean;
}

export interface InviteHospitalStaffRequest {
  email: string;
  role: HospitalStaffRole;
  department?: string | null;
  employee_id?: string;
  message?: string;
}

export interface UpdateHospitalStaffRequest {
  role?: HospitalStaffRole;
  department?: string | null;
  employee_id?: string;
  is_primary_assignment?: boolean;
  is_active?: boolean;
}
