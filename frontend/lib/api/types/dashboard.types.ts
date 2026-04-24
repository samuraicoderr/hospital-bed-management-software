// BedFlow - Dashboard API Types
// Per requirements section 4.5 - Dashboard and analytics

import { UUID, type BedStatistics } from './beds.types';

// ─────────────────────────────────────────────
// Operational Dashboard Types
// ─────────────────────────────────────────────

export interface OperationalDashboard {
  bed_stats: BedStatistics;
  cleaning_backlog: number;
  admission_queue: number;
  average_los_days: number;
  updated_at: string;
}

export interface DashboardMetric {
  key: string;
  label: string;
  value: number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trend_value?: number;
  color: string;
  icon: string;
}

// ─────────────────────────────────────────────
// Occupancy Trend Types
// ─────────────────────────────────────────────

export interface OccupancyTrend {
  labels: string[];
  occupancy: number[];
  available: number[];
  occupied: number[];
}

export interface OccupancyTrendFilters {
  hospital: UUID;
  days?: number; // 7, 30, 90
}

// ─────────────────────────────────────────────
// Department Statistics
// ─────────────────────────────────────────────

export interface DepartmentStats {
  department_id: UUID;
  department_name: string;
  total_beds: number;
  available_beds: number;
  occupied_beds: number;
  occupancy_rate: number;
  avg_turnover_minutes: number;
}

// ─────────────────────────────────────────────
// Bed Availability Snapshot
// ─────────────────────────────────────────────

export interface BedAvailabilitySnapshot {
  id: UUID;
  hospital: UUID;
  snapshot_time: string;
  total_beds: number;
  available_beds: number;
  occupied_beds: number;
  occupancy_rate: number;
}

// ─────────────────────────────────────────────
// KPI Card Data
// ─────────────────────────────────────────────

export interface KPIData {
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  icu_occupancy_pct: number;
  cleaning_backlog: number;
  admission_queue: number;
  avg_length_of_stay: number;
  pending_discharges: number;
  critical_alerts: number;
}

// ─────────────────────────────────────────────
// Quick Status Overview
// ─────────────────────────────────────────────

export interface StatusOverview {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

// ─────────────────────────────────────────────
// Real-time Update Types
// ─────────────────────────────────────────────

export interface BedStatusUpdate {
  bed_id: UUID;
  bed_code: string;
  old_status: string;
  new_status: string;
  changed_by: string;
  changed_at: string;
  reason?: string;
}

export interface DashboardUpdate {
  type: 'bed_status' | 'admission' | 'discharge' | 'cleaning' | 'alert';
  data: unknown;
  timestamp: string;
}
