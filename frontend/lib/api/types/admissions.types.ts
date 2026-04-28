// BedFlow - Admission API Types
// Per requirements section 4.2 - Admissions and transfers

import { UUID } from './beds.types';
import { Bed } from './beds.types';

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export enum AdmissionSource {
  EMERGENCY = 'emergency',
  OUTPATIENT = 'outpatient',
  TRANSFER_INTERNAL = 'transfer_internal',
  TRANSFER_EXTERNAL = 'transfer_external',
  PLANNED_ADMISSION = 'planned_admission',
  DIRECT_ADMISSION = 'direct_admission',
  EHR_INTEGRATION = 'ehr_integration',
}

export enum AdmissionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  ASSIGNED = 'assigned',
  ADMITTED = 'admitted',
  DISCHARGED = 'discharged',
  CANCELLED = 'cancelled',
  TRANSFERRED = 'transferred',
}

export enum Priority {
  ROUTINE = 'routine',
  URGENT = 'urgent',
  EMERGENCY = 'emergency',
  STAT = 'stat',
}

export enum TransferType {
  INTRA_WARD = 'intra_ward',
  INTER_WARD = 'inter_ward',
  INTER_HOSPITAL = 'inter_hospital',
}

export enum TransferStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

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
  gender: 'M' | 'F' | 'O' | 'U';
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  is_active: boolean;
  is_currently_admitted: boolean;
  current_bed?: {
    id: UUID;
    code: string;
    ward: string;
  } | null;
}

export interface PatientDetail extends Patient {
  clinical_requirements: ClinicalRequirement[];
  current_admission?: Admission | null;
  allergies?: string;
  medical_history?: string;
}

export interface ClinicalRequirement {
  id: UUID;
  requirement_type: string;
  requirement_type_display: string;
  description: string;
  priority: string;
  priority_display: string;
  is_active: boolean;
  date_identified: string;
}

// ─────────────────────────────────────────────
// Admission Request Types
// ─────────────────────────────────────────────

export interface AdmissionRequest {
  id: UUID;
  patient?: Patient;
  patient_name?: string;
  patient_mrn?: string;
  admission_source: AdmissionSource;
  admission_source_display: string;
  request_date?: string;
  requires_isolation: boolean;
  requires_icu: boolean;
  required_bed_type: string;
  clinical_notes: string;
  priority: Priority;
  priority_display: string;
  preferred_hospital?: HospitalRef | null;
  preferred_department?: DepartmentRef | null;
  status: AdmissionStatus;
  status_display: string;
  reserved_bed?: BedRef | null;
  reserved_until?: string | null;
  assigned_bed?: BedRef | null;
  assigned_bed_code?: string;
  assigned_by_name?: string | null;
  assigned_at?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  cancelled_by_name?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  queue_position?: number;
  waiting_since: string;
  created_at: string;
  updated_at: string;
}

export interface HospitalRef {
  id: UUID;
  name: string;
  code: string;
}

export interface DepartmentRef {
  id: UUID;
  name: string;
  code: string;
}

export interface BedRef {
  id: UUID;
  bed_code: string;
  ward_name: string;
}

// ─────────────────────────────────────────────
// Admission Types
// ─────────────────────────────────────────────

export interface Admission {
  id: UUID;
  patient?: Patient;
  patient_name?: string;
  patient_mrn?: string;
  bed_code?: string | null;
  bed?: Bed | null;
  admission_request?: UUID;
  hospital?: HospitalRef;
  department?: DepartmentRef;
  admission_source: AdmissionSource;
  admission_source_display: string;
  admitted_at: string;
  admitted_by?: string;
  status: AdmissionStatus;
  status_display: string;
  diagnosis_code?: string;
  diagnosis_description?: string;
  clinical_notes?: string;
  is_isolation: boolean;
  isolation_reason?: string;
  expected_discharge_date?: string;
  discharged_at?: string;
  visit_number?: string;
  external_visit_id?: string;
  length_of_stay_days?: number;
  length_of_stay_hours?: number;
  created_at?: string;
  updated_at?: string;
}

// ─────────────────────────────────────────────
// Transfer Types
// ─────────────────────────────────────────────

export interface Transfer {
  id: UUID;
  admission: UUID;
  patient: Patient;
  transfer_type: TransferType;
  transfer_type_display: string;
  status: TransferStatus;
  status_display: string;
  from_hospital: HospitalRef;
  from_department: DepartmentRef;
  from_bed?: BedRef | null;
  to_hospital: HospitalRef;
  to_department: DepartmentRef;
  to_bed?: BedRef | null;
  requested_by_name?: string;
  requested_at: string;
  reason: string;
  approved_by_name?: string;
  approved_at?: string | null;
  initiated_by_name?: string;
  initiated_at?: string | null;
  completed_by_name?: string;
  completed_at?: string | null;
  transport_mode?: string;
  accompanying_personnel?: string;
  special_requirements?: string;
  rejected_by_name?: string;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ─────────────────────────────────────────────
// Request/Response Types
// ─────────────────────────────────────────────

export interface CreateAdmissionRequest {
  patient_id: UUID;
  hospital_id: UUID;
  admission_source: AdmissionSource;
  requires_isolation?: boolean;
  requires_icu?: boolean;
  required_bed_type?: string;
  clinical_notes?: string;
  priority?: Priority;
  department_id?: UUID;
}

export interface UpdateAdmissionRequest {
  admission_source?: AdmissionSource;
  requires_isolation?: boolean;
  requires_icu?: boolean;
  required_bed_type?: string;
  clinical_notes?: string;
  priority?: Priority;
  department_id?: UUID;
  hospital_id?: UUID;
}

export interface AssignBedRequest {
  bed_id: UUID;
}

export interface ReserveBedRequest {
  bed_id: UUID;
  reserved_until?: string;
  reason?: string;
}

export interface CreateTransferRequest {
  admission_id: UUID;
  transfer_type: TransferType;
  to_hospital_id: UUID;
  to_department_id: UUID;
  to_bed_id?: UUID;
  reason: string;
  transport_mode?: string;
  accompanying_personnel?: string;
  special_requirements?: string;
}

export interface UpdateTransferRequest {
  to_hospital_id?: UUID;
  to_department_id?: UUID;
  to_bed_id?: UUID;
  transport_mode?: string;
  accompanying_personnel?: string;
  special_requirements?: string;
  reason?: string;
}

export interface AdmissionUpdatePayload {
  diagnosis_code?: string;
  diagnosis_description?: string;
  clinical_notes?: string;
  is_isolation?: boolean;
  isolation_reason?: string;
  isolation_started_at?: string;
  isolation_ended_at?: string;
  expected_discharge_date?: string;
  visit_number?: string;
  external_visit_id?: string;
  status?: AdmissionStatus;
}

export interface CreatePatientRequest {
  mrn: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_of_birth: string; // YYYY-MM-DD
  gender: 'M' | 'F' | 'O' | 'U';
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  primary_hospital_id?: UUID;
}

// ─────────────────────────────────────────────
// Admission Queue Types
// ─────────────────────────────────────────────

export interface AdmissionQueueFilters {
  hospital?: UUID;
  status?: AdmissionStatus;
  priority?: Priority;
}

export interface AdmissionQueueStats {
  total_pending: number;
  emergency_count: number;
  urgent_count: number;
  routine_count: number;
  avg_wait_time_minutes: number;
}
