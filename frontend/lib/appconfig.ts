
// ─────────────────────────────────────────────
// Plan Types
// ─────────────────────────────────────────────

export type PlanType = 'operator' | 'fundraising' | 'strategic';
export type ComponentType = 'kpi' | 'sheet' | 'chart' | 'statement' | 'calendar';

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
  planType: PlanType;
  description: string;
  componentCount: number;
  componentBreakdown: string; // e.g. "4 KPIs, 1 Sheet, 1 Chart, 1 Statement"
}

// ─────────────────────────────────────────────
// App Configuration
// ─────────────────────────────────────────────

const appConfig = {
  appName: 'Bedflow',
  tagline: 'Financial Planning Workspace',

  logos: {
    green: '/app-logos/bedflow-logo-green.png',
    dark: '/app-logos/bedflow-logo-black.png',
    white: '/app-logos/bedflow-logo-white.png',
    green_svg: '/app-logos/bedflow-logo-green.svg',
    dark_svg: '/app-logos/bedflow-logo-black.svg',
    white_svg: '/app-logos/bedflow-logo-white.svg',
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

  // ─── Plan type → visual mapping ───
  planTypeColors: {
    operator: {
      label: 'Operator',
      color: '#534AB7',
      bgColor: '#EEEDFE',
    },
    fundraising: {
      label: 'Fundraising',
      color: '#0F6E56',
      bgColor: '#E1F5EE',
    },
    strategic: {
      label: 'Strategic',
      color: '#854F0B',
      bgColor: '#FAEEDA',
    },
  } satisfies Record<PlanType, PlanTypeConfig>,

  // ─── Component type → visual mapping ───
  componentTypeColors: {
    kpi: { label: 'KPI', accent: '#534AB7', bg: '#EEEDFE' },
    sheet: { label: 'Sheet', accent: '#0F6E56', bg: '#E1F5EE' },
    chart: { label: 'Chart', accent: '#854F0B', bg: '#FAEEDA' },
    statement: { label: 'Statement', accent: '#993C1D', bg: '#FAECE7' },
    calendar: { label: 'Calendar', accent: '#993556', bg: '#FBEAF0' },
  } satisfies Record<ComponentType, ComponentTypeConfig>,

  // ─── Featured templates ───
  templates: [
    {
      key: 'saas_operator',
      name: 'SaaS Operator',
      planType: 'operator',
      description: 'Track burn, MRR, and runway month by month',
      componentCount: 8,
      componentBreakdown: '4 KPIs, 2 Sheets, 1 Chart, 1 Statement',
    },
    {
      key: 'seed_round',
      name: 'Seed Round Prep',
      planType: 'fundraising',
      description: '3-statement model ready for investor diligence',
      componentCount: 7,
      componentBreakdown: '3 KPIs, 3 Statements, 1 Chart',
    },
    {
      key: 'annual_plan',
      name: 'Annual Plan',
      planType: 'strategic',
      description: 'Full-year budget with headcount and forecast',
      componentCount: 9,
      componentBreakdown: '4 KPIs, 2 Sheets, 2 Charts, 1 Statement',
    },
    {
      key: 'board_meeting',
      name: 'Board Meeting Pack',
      planType: 'fundraising',
      description: 'Income statement, cash flow, and KPI summary',
      componentCount: 10,
      componentBreakdown: '6 KPIs, 2 Statements, 2 Charts',
    },
    {
      key: 'growth_model',
      name: 'Growth Model',
      planType: 'strategic',
      description: 'Revenue projections with scenario comparison',
      componentCount: 7,
      componentBreakdown: '3 KPIs, 2 Sheets, 2 Charts',
    },
    {
      key: 'pre_revenue',
      name: 'Pre-Revenue Startup',
      planType: 'operator',
      description: 'Cash tracking and expense management pre-launch',
      componentCount: 6,
      componentBreakdown: '3 KPIs, 1 Sheet, 1 Statement, 1 Chart',
    },
  ] satisfies TemplateConfig[],
} as const;

export default appConfig;