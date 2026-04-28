// BedFlow - Patient API Types
// Per requirements section 4.2 - Patient records

import { UUID } from './beds.types';

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export type PatientGender = 'M' | 'F' | 'O' | 'U';

export type RequirementType =
  | 'isolation'
  | 'icu'
  | 'oxygen'
  | 'ventilator'
  | 'cardiac_monitor'
  | 'bariatric'
  | 'fall_risk'
  | 'infection_control'
  | 'dietary'
  | 'mobility';

export type RequirementPriority = 'low' | 'medium' | 'high' | 'critical';

// ─────────────────────────────────────────────
// Patient Types
// ─────────────────────────────────────────────

export interface Patient {
  id: UUID;
  mrn: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_of_birth: string;
  gender: PatientGender;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  insurance_group_number?: string;
  allergies?: string;
  medical_history?: string;
  current_medications?: string;
  is_active: boolean;
  is_deceased: boolean;
  deceased_date?: string | null;
  primary_hospital?: UUID | null;
  primary_hospital_name?: string;
  ehr_id?: string;
  external_source?: string;
  created_at: string;
  updated_at: string;
  created_by?: UUID | null;
  created_by_name?: string;
  age?: number;
}

export interface PatientListItem {
  id: UUID;
  mrn: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: PatientGender;
  phone?: string;
  email?: string;
  is_currently_admitted: boolean;
  current_bed?: {
    id: UUID;
    code: string;
    ward: string;
  } | null;
  primary_hospital?: UUID | null;
  primary_hospital_name?: string;
  is_active: boolean;
  is_deceased: boolean;
  age?: number;
}

export interface PatientDetail extends Patient {
  clinical_requirements: ClinicalRequirement[];
  current_admission?: CurrentAdmission | null;
}

export interface CurrentAdmission {
  id: UUID;
  bed?: string | null;
  hospital: string;
  hospital_id: UUID;
  department: string;
  department_id: UUID;
  admitted_at: string;
  status: string;
}

export interface AdmissionHistoryEntry {
  id: UUID;
  admitted_at: string;
  discharged_at?: string | null;
  bed?: string | null;
  hospital: string;
  department: string;
}

export interface AdmissionStatus {
  is_currently_admitted: boolean;
  current_admission_id?: UUID | null;
}

// ─────────────────────────────────────────────
// Clinical Requirement Types
// ─────────────────────────────────────────────

export interface ClinicalRequirement {
  id: UUID;
  patient: UUID;
  patient_name: string;
  patient_mrn: string;
  requirement_type: RequirementType;
  requirement_type_display: string;
  description: string;
  priority: RequirementPriority;
  priority_display: string;
  is_active: boolean;
  date_identified: string;
  resolved_at?: string | null;
}

// ─────────────────────────────────────────────
// Request/Response Types
// ─────────────────────────────────────────────

export interface CreatePatientRequest {
  mrn: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_of_birth: string; // YYYY-MM-DD
  gender: PatientGender;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  insurance_group_number?: string;
  allergies?: string;
  medical_history?: string;
  current_medications?: string;
  primary_hospital?: UUID;
  ehr_id?: string;
  external_source?: string;
}

export interface UpdatePatientRequest {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  date_of_birth?: string;
  gender?: PatientGender;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  insurance_group_number?: string;
  allergies?: string;
  medical_history?: string;
  current_medications?: string;
  primary_hospital?: UUID;
  is_active?: boolean;
  is_deceased?: boolean;
  deceased_date?: string;
  ehr_id?: string;
  external_source?: string;
}

export interface MarkDeceasedRequest {
  deceased_date?: string; // YYYY-MM-DD, defaults to today if not provided
}

export interface CreateClinicalRequirementRequest {
  patient: UUID;
  requirement_type: RequirementType;
  description?: string;
  priority?: RequirementPriority;
}

export interface UpdateClinicalRequirementRequest {
  requirement_type?: RequirementType;
  description?: string;
  priority?: RequirementPriority;
  is_active?: boolean;
}

// ─────────────────────────────────────────────
// Filter Types
// ─────────────────────────────────────────────

export interface PatientFilters {
  search?: string;
  gender?: PatientGender;
  primary_hospital?: UUID;
  is_active?: boolean;
  is_deceased?: boolean;
  admitted?: boolean;
}

export interface ClinicalRequirementFilters {
  patient?: UUID;
  requirement_type?: RequirementType;
  priority?: RequirementPriority;
  is_active?: boolean;
}
