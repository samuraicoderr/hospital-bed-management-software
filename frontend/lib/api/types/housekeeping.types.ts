// BedFlow - Housekeeping API Types
// Per requirements section 4.3.2 - Cleaning workflow

import { UUID } from './beds.types';

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export enum CleaningStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
  ESCALATED = 'escalated',
}

export enum CleaningPriority {
  ROUTINE = 'routine',
  URGENT = 'urgent',
  STAT = 'stat',
  ISOLATION_CLEAN = 'isolation_clean',
}

// ─────────────────────────────────────────────
// Cleaning Task Types
// ─────────────────────────────────────────────

export interface CleaningTask {
  id: UUID;
  bed: {
    id: UUID;
    bed_code: string;
    ward_name: string;
    department_name: string;
  };
  discharge?: {
    id: UUID;
    patient_name: string;
    discharged_at: string;
  };
  priority: CleaningPriority;
  priority_display: string;
  status: CleaningStatus;
  status_display: string;
  assigned_to?: {
    id: UUID;
    name: string;
  } | null;
  assigned_by?: string;
  assigned_at?: string;
  sla_minutes: number;
  sla_deadline: string;
  sla_breached: boolean;
  sla_breach_minutes?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  instructions?: string;
  notes?: string;
  completion_notes?: string;
  quality_check_required: boolean;
  quality_checked: boolean;
  quality_checked_by?: string;
  quality_checked_at?: string;
  quality_check_passed: boolean;
  escalated: boolean;
  escalated_at?: string;
  escalated_to?: string;
}

// ─────────────────────────────────────────────
// Housekeeping Staff Types
// ─────────────────────────────────────────────

export interface HousekeepingStaff {
  id: UUID;
  user: {
    id: UUID;
    name: string;
    email: string;
  };
  hospital: UUID;
  employee_id: string;
  phone: string;
  shift_start: string;
  shift_end: string;
  max_tasks_per_shift: number;
  current_task_count: number;
  is_available: boolean;
  is_active: boolean;
  tasks_completed_today: number;
  average_cleaning_time_minutes?: number;
  sla_compliance_rate: number;
}

// ─────────────────────────────────────────────
// Request/Response Types
// ─────────────────────────────────────────────

export interface CreateCleaningTaskRequest {
  bed_id: UUID;
  priority: CleaningPriority;
  instructions?: string;
  discharge_id?: UUID;
}

export interface AssignCleaningTaskRequest {
  staff_id: UUID;
}

export interface CompleteCleaningTaskRequest {
  notes?: string;
  checklist_items?: { item_id: UUID; completed: boolean }[];
}

export interface QualityCheckRequest {
  passed: boolean;
  notes?: string;
}

// ─────────────────────────────────────────────
// Dashboard Types
// ─────────────────────────────────────────────

export interface CleaningDashboardStats {
  pending: number;
  in_progress: number;
  completed_today: number;
  overdue: number;
  escalated: number;
  avg_cleaning_time_minutes: number;
  sla_compliance_rate: number;
  staff_on_duty: number;
}

export interface CleaningTaskFilters {
  hospital?: UUID;
  status?: CleaningStatus;
  priority?: CleaningPriority;
  assigned_to?: UUID;
  overdue?: boolean;
}
