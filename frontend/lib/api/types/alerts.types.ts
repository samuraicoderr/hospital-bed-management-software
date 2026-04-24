// BedFlow - Alert API Types
// Per requirements section 4.6 - Notifications and alerts

import { UUID } from './beds.types';

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

export enum AlertType {
  BED_AVAILABLE = 'bed_available',
  BED_RESERVED = 'bed_reserved',
  CLEANING_SLA_BREACH = 'cleaning_sla_breach',
  ICU_OCCUPANCY_HIGH = 'icu_occupancy_high',
  ADMISSION_QUEUE_DEEP = 'admission_queue_deep',
  DISCHARGE_PENDING = 'discharge_pending',
  EQUIPMENT_ALERT = 'equipment_alert',
  BED_BLOCKED = 'bed_blocked',
  SYSTEM_ERROR = 'system_error',
}

export enum NotificationChannel {
  SMS = 'sms',
  EMAIL = 'email',
  IN_APP = 'in_app',
  PUSH = 'push',
}

// ─────────────────────────────────────────────
// Alert Types
// ─────────────────────────────────────────────

export interface Alert {
  id: UUID;
  alert_type: AlertType;
  alert_type_display: string;
  severity: AlertSeverity;
  severity_display: string;
  title: string;
  message: string;
  hospital?: HospitalRef;
  department?: DepartmentRef;
  bed?: BedRef;
  patient?: PatientRef;
  related_object_type?: string;
  related_object_id?: UUID;
  is_read: boolean;
  read_at?: string;
  read_by?: string;
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
}

export interface HospitalRef {
  id: UUID;
  name: string;
}

export interface DepartmentRef {
  id: UUID;
  name: string;
}

export interface BedRef {
  id: UUID;
  bed_code: string;
}

export interface PatientRef {
  id: UUID;
  mrn: string;
  name: string;
}

// ─────────────────────────────────────────────
// Notification Types
// ─────────────────────────────────────────────

export interface Notification {
  id: UUID;
  alert: UUID;
  channel: NotificationChannel;
  recipient: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  sent_at?: string;
  delivered_at?: string;
  error_message?: string;
  retry_count: number;
}

// ─────────────────────────────────────────────
// User Alert Preferences
// ─────────────────────────────────────────────

export interface AlertPreference {
  id: UUID;
  user: UUID;
  alert_type?: AlertType;
  severity_threshold: AlertSeverity;
  channels: NotificationChannel[];
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  is_enabled: boolean;
}

// ─────────────────────────────────────────────
// Request/Response Types
// ─────────────────────────────────────────────

export interface CreateAlertRequest {
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  hospital_id?: UUID;
  department_id?: UUID;
  bed_id?: UUID;
  patient_id?: UUID;
  related_object_type?: string;
  related_object_id?: UUID;
}

export interface MarkAlertReadRequest {
  alert_ids?: UUID[];
  mark_all?: boolean;
}

export interface AlertFilters {
  hospital?: UUID;
  severity?: AlertSeverity;
  alert_type?: AlertType;
  is_read?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface AlertStats {
  total: number;
  unread: number;
  by_severity: {
    info: number;
    warning: number;
    critical: number;
    emergency: number;
  };
}
