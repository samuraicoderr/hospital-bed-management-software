
// BedFlow - Hospital Bed Management System Configuration
// Per requirements: Clinical, operational, trustworthy UI

// ─────────────────────────────────────────────
// Bed Status Types
// ─────────────────────────────────────────────
export type BedStatus =
  | 'available'
  | 'occupied'
  | 'reserved'
  | 'cleaning_required'
  | 'cleaning_in_progress'
  | 'maintenance'
  | 'blocked'
  | 'isolation';

export type BedType =
  | 'icu'
  | 'general'
  | 'isolation'
  | 'nicu'
  | 'emergency'
  | 'maternity'
  | 'pediatric'
  | 'bariatric';

export type AdmissionStatus =
  | 'pending'
  | 'approved'
  | 'assigned'
  | 'admitted'
  | 'discharged'
  | 'cancelled';

export type CleaningStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'escalated';

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

export type PlanType = 'operator' | 'fundraising' | 'strategic';

export type ComponentType = 'kpi' | 'sheet' | 'chart' | 'statement';

// ─────────────────────────────────────────────
// Status Configuration (Color-coded per requirements 4.1.2)
// ─────────────────────────────────────────────
export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

export interface PlanTypeConfig {
  label: string;
  color: string;
  bgColor: string;
}

export interface ComponentTypeConfig {
  label: string;
  accent: string;
  bg: string;
}

export interface TemplateConfig {
  key: string;
  name: string;
  description: string;
  planType: PlanType;
  componentCount: number;
}

// ─────────────────────────────────────────────
// App Configuration
// ─────────────────────────────────────────────

const appConfig = {
  appName: 'BedFlow',
  tagline: 'Hospital Bed Management System',

  logos: {
    green: '/app-logos/bedflow-logo-green.png',
    dark: '/app-logos/bedflow-logo-black.png',
    white: '/app-logos/bedflow-logo-white.png',
    green_svg: '/app-logos/bedflow-logo-green.svg',
    dark_svg: '/app-logos/bedflow-logo-black.svg',
    white_svg: '/app-logos/bedflow-logo-white.png',
    favicons: {
      green: '/app-logos/favicons/bedflow-logo-green.ico',
      dark: '/app-logos/favicons/bedflow-logo-black.ico',
      white: '/app-logos/favicons/bedflow-logo-white.ico',
    },
  },

  media: {
    avatarExample: '/media/avatars/samuraicoderr.png',
    defaultAvatar: '/media/avatars/default-avatar.png',
  },

  fonts: {
    logoFont: '/fonts/Bobbleboddy.ttf',
  },

  // ─── Bed Status → visual mapping per requirements ───
  bedStatusColors: {
    available: {
      label: 'Available',
      color: '#0F6E56',
      bgColor: '#E1F5EE',
      borderColor: '#0F6E56',
      icon: 'CheckCircle',
    },
    occupied: {
      label: 'Occupied',
      color: '#534AB7',
      bgColor: '#EEEDFE',
      borderColor: '#534AB7',
      icon: 'User',
    },
    reserved: {
      label: 'Reserved',
      color: '#854F0B',
      bgColor: '#FAEEDA',
      borderColor: '#854F0B',
      icon: 'Bookmark',
    },
    cleaning_required: {
      label: 'Cleaning Required',
      color: '#993C1D',
      bgColor: '#FAECE7',
      borderColor: '#993C1D',
      icon: 'AlertTriangle',
    },
    cleaning_in_progress: {
      label: 'Cleaning In Progress',
      color: '#993556',
      bgColor: '#FBEAF0',
      borderColor: '#993556',
      icon: 'Sparkles',
    },
    maintenance: {
      label: 'Under Maintenance',
      color: '#52525B',
      bgColor: '#F4F4F5',
      borderColor: '#52525B',
      icon: 'Wrench',
    },
    blocked: {
      label: 'Blocked',
      color: '#18181B',
      bgColor: '#E4E4E7',
      borderColor: '#18181B',
      icon: 'Ban',
    },
    isolation: {
      label: 'Isolation',
      color: '#BE123C',
      bgColor: '#FEE2E2',
      borderColor: '#BE123C',
      icon: 'ShieldAlert',
    },
  } satisfies Record<BedStatus, StatusConfig>,

  // ─── Bed Type → visual mapping ───
  bedTypeColors: {
    icu: {
      label: 'ICU',
      color: '#BE123C',
      bgColor: '#FEE2E2',
      borderColor: '#BE123C',
      icon: 'HeartPulse',
    },
    general: {
      label: 'General',
      color: '#0F6E56',
      bgColor: '#E1F5EE',
      borderColor: '#0F6E56',
      icon: 'Bed',
    },
    isolation: {
      label: 'Isolation',
      color: '#854F0B',
      bgColor: '#FAEEDA',
      borderColor: '#854F0B',
      icon: 'ShieldAlert',
    },
    nicu: {
      label: 'NICU',
      color: '#534AB7',
      bgColor: '#EEEDFE',
      borderColor: '#534AB7',
      icon: 'Baby',
    },
    emergency: {
      label: 'Emergency',
      color: '#993C1D',
      bgColor: '#FAECE7',
      borderColor: '#993C1D',
      icon: 'Zap',
    },
    maternity: {
      label: 'Maternity',
      color: '#993556',
      bgColor: '#FBEAF0',
      borderColor: '#993556',
      icon: 'Baby',
    },
    pediatric: {
      label: 'Pediatric',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      borderColor: '#F59E0B',
      icon: 'Smile',
    },
    bariatric: {
      label: 'Bariatric',
      color: '#6366F1',
      bgColor: '#E0E7FF',
      borderColor: '#6366F1',
      icon: 'Scale',
    },
  } satisfies Record<BedType, StatusConfig>,

  // ─── Admission Status → visual mapping ───
  admissionStatusColors: {
    pending: {
      label: 'Pending',
      color: '#854F0B',
      bgColor: '#FAEEDA',
      borderColor: '#854F0B',
      icon: 'Clock',
    },
    approved: {
      label: 'Approved',
      color: '#0F6E56',
      bgColor: '#E1F5EE',
      borderColor: '#0F6E56',
      icon: 'CheckCircle',
    },
    assigned: {
      label: 'Assigned',
      color: '#534AB7',
      bgColor: '#EEEDFE',
      borderColor: '#534AB7',
      icon: 'MapPin',
    },
    admitted: {
      label: 'Admitted',
      color: '#0F6E56',
      bgColor: '#E1F5EE',
      borderColor: '#0F6E56',
      icon: 'UserCheck',
    },
    discharged: {
      label: 'Discharged',
      color: '#52525B',
      bgColor: '#F4F4F5',
      borderColor: '#52525B',
      icon: 'LogOut',
    },
    cancelled: {
      label: 'Cancelled',
      color: '#DC2626',
      bgColor: '#FEE2E2',
      borderColor: '#DC2626',
      icon: 'XCircle',
    },
  } satisfies Record<AdmissionStatus, StatusConfig>,

  // ─── Cleaning Status → visual mapping ───
  cleaningStatusColors: {
    pending: {
      label: 'Pending',
      color: '#854F0B',
      bgColor: '#FAEEDA',
      borderColor: '#854F0B',
      icon: 'Clock',
    },
    assigned: {
      label: 'Assigned',
      color: '#534AB7',
      bgColor: '#EEEDFE',
      borderColor: '#534AB7',
      icon: 'User',
    },
    in_progress: {
      label: 'In Progress',
      color: '#993556',
      bgColor: '#FBEAF0',
      borderColor: '#993556',
      icon: 'Loader',
    },
    completed: {
      label: 'Completed',
      color: '#0F6E56',
      bgColor: '#E1F5EE',
      borderColor: '#0F6E56',
      icon: 'CheckCircle',
    },
    overdue: {
      label: 'Overdue',
      color: '#DC2626',
      bgColor: '#FEE2E2',
      borderColor: '#DC2626',
      icon: 'AlertTriangle',
    },
    escalated: {
      label: 'Escalated',
      color: '#7C3AED',
      bgColor: '#EDE9FE',
      borderColor: '#7C3AED',
      icon: 'AlertOctagon',
    },
  } satisfies Record<CleaningStatus, StatusConfig>,

  // ─── Alert Severity → visual mapping ───
  alertSeverityColors: {
    info: {
      label: 'Information',
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      borderColor: '#3B82F6',
      icon: 'Info',
    },
    warning: {
      label: 'Warning',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      borderColor: '#F59E0B',
      icon: 'AlertTriangle',
    },
    critical: {
      label: 'Critical',
      color: '#DC2626',
      bgColor: '#FEE2E2',
      borderColor: '#DC2626',
      icon: 'AlertCircle',
    },
    emergency: {
      label: 'Emergency',
      color: '#7C3AED',
      bgColor: '#EDE9FE',
      borderColor: '#7C3AED',
      icon: 'Siren',
    },
  } satisfies Record<AlertSeverity, StatusConfig>,

  // ─── Plan UI mappings ───
  planTypeColors: {
    operator: {
      label: 'Operating',
      color: '#0F6E56',
      bgColor: '#E1F5EE',
    },
    fundraising: {
      label: 'Fundraising',
      color: '#534AB7',
      bgColor: '#EEEDFE',
    },
    strategic: {
      label: 'Strategic',
      color: '#854F0B',
      bgColor: '#FAEEDA',
    },
  } satisfies Record<PlanType, PlanTypeConfig>,

  componentTypeColors: {
    kpi: {
      label: 'KPI',
      accent: '#0F6E56',
      bg: '#E1F5EE',
    },
    sheet: {
      label: 'Sheet',
      accent: '#534AB7',
      bg: '#EEEDFE',
    },
    chart: {
      label: 'Chart',
      accent: '#F59E0B',
      bg: '#FEF3C7',
    },
    statement: {
      label: 'Statement',
      accent: '#52525B',
      bg: '#F4F4F5',
    },
  } satisfies Record<ComponentType, ComponentTypeConfig>,

  templates: [
    {
      key: 'saas_operator',
      name: 'SaaS Operator Dashboard',
      description: 'Track core revenue and retention metrics with monthly operating views.',
      planType: 'operator',
      componentCount: 8,
    },
    {
      key: 'seed_round',
      name: 'Seed Round Model',
      description: 'Plan runway, burn, and use-of-funds scenarios for early-stage fundraising.',
      planType: 'fundraising',
      componentCount: 7,
    },
    {
      key: 'annual_plan',
      name: 'Annual Operating Plan',
      description: 'Set yearly goals with budget snapshots and quarterly checkpoints.',
      planType: 'strategic',
      componentCount: 9,
    },
    {
      key: 'board_meeting',
      name: 'Board Meeting Pack',
      description: 'Summarize KPI trends, financial statements, and performance highlights.',
      planType: 'strategic',
      componentCount: 10,
    },
    {
      key: 'growth_model',
      name: 'Growth Scenario Model',
      description: 'Compare baseline and upside assumptions for hiring and revenue planning.',
      planType: 'operator',
      componentCount: 8,
    },
    {
      key: 'pre_revenue',
      name: 'Pre-Revenue Forecast',
      description: 'Model costs, runway, and milestone timing before first revenue.',
      planType: 'fundraising',
      componentCount: 6,
    },
  ] satisfies readonly TemplateConfig[],

  // ─── Navigation Items ───
  navigationItems: [
    { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
    { key: 'beds', label: 'Bed Management', icon: 'Bed', path: '/beds' },
    { key: 'admissions', label: 'Admissions', icon: 'UserPlus', path: '/admissions' },
    { key: 'transfers', label: 'Transfers', icon: 'ArrowRightLeft', path: '/transfers' },
    { key: 'discharges', label: 'Discharges', icon: 'LogOut', path: '/discharges' },
    { key: 'housekeeping', label: 'Housekeeping', icon: 'Sparkles', path: '/housekeeping' },
    { key: 'patients', label: 'Patients', icon: 'Users', path: '/patients' },
    { key: 'reports', label: 'Reports', icon: 'BarChart3', path: '/reports' },
    { key: 'alerts', label: 'Alerts', icon: 'Bell', path: '/alerts' },
  ],

  // ─── Dashboard KPI Cards ───
  dashboardMetrics: [
    { key: 'total_beds', label: 'Total Beds', icon: 'Bed', color: '#0F6E56' },
    { key: 'occupied_beds', label: 'Occupied', icon: 'User', color: '#534AB7' },
    { key: 'available_beds', label: 'Available', icon: 'CheckCircle', color: '#0F6E56' },
    { key: 'icu_occupancy', label: 'ICU Occupancy', icon: 'HeartPulse', color: '#BE123C' },
    { key: 'cleaning_backlog', label: 'Cleaning Backlog', icon: 'Sparkles', color: '#854F0B' },
    { key: 'admission_queue', label: 'Admission Queue', icon: 'Clock', color: '#F59E0B' },
    { key: 'avg_los', label: 'Avg Length of Stay', icon: 'Calendar', color: '#52525B' },
  ],

  // ─── Quick Actions ───
  quickActions: [
    { key: 'admit_patient', label: 'Admit Patient', icon: 'UserPlus', color: '#0F6E56' },
    { key: 'transfer_patient', label: 'Transfer', icon: 'ArrowRightLeft', color: '#534AB7' },
    { key: 'discharge_patient', label: 'Discharge', icon: 'LogOut', color: '#52525B' },
    { key: 'mark_cleaning', label: 'Start Cleaning', icon: 'Sparkles', color: '#854F0B' },
    { key: 'block_bed', label: 'Block Bed', icon: 'Ban', color: '#DC2626' },
  ],

  // ─── SLA Thresholds (minutes) ───
  slaThresholds: {
    routine_cleaning: 60,
    urgent_cleaning: 30,
    stat_cleaning: 15,
    isolation_cleaning: 90,
  },

  // ─── Occupancy Thresholds ───
  occupancyThresholds: {
    icu_critical: 90,
    icu_warning: 80,
    general_critical: 95,
    general_warning: 85,
  },
} as const;

export default appConfig;