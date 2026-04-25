/**
 * Frontend Route Definitions
 * Centralized route management for BedFlow
 */

export const FrontendRoutes = {
  home: '/',
  dashboard: '/dashboard',

  // Auth routes
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    onboarding: '/auth/onboarding',
    basicInfo: '/auth/onboarding/basic-info',
    verifyEmail: '/auth/onboarding/verify-email',
    username: '/auth/onboarding/username',
    profilePicture: '/auth/onboarding/profile-picture',
    complete: '/auth/onboarding/complete',
    oauthCallback: (provider: string) => `/auth/oauth/callback/${provider}`,
  },

  // Legacy aliases kept for compatibility with existing auth/onboarding code.
  login: '/auth/login',
  register: '/auth/register',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  loginSecondFactor: '/auth/login',
  onboardingBasicInfo: '/auth/onboarding/basic-info',
  onboardingVerifyEmail: '/auth/onboarding/verify-email',
  onboardingUsername: '/auth/onboarding/username',
  onboardingProfilePicture: '/auth/onboarding/profile-picture',
  onboardingComplete: '/auth/onboarding/complete',

  // Main application routes
  beds: {
    root: '/beds',
    detail: (id: string) => `/beds/${id}`,
    grid: '/beds/grid',
    map: '/beds/map',
  },

  admissions: {
    root: '/admissions',
    new: '/admissions/new',
    detail: (id: string) => `/admissions/${id}`,
    queue: '/admissions/queue',
  },

  patients: {
    root: '/patients',
    new: '/patients/new',
    detail: (id: string) => `/patients/${id}`,
    search: '/patients/search',
  },

  transfers: {
    root: '/transfers',
    new: '/transfers/new',
    detail: (id: string) => `/transfers/${id}`,
  },

  discharges: {
    root: '/discharges',
    pending: '/discharges/pending',
  },

  housekeeping: {
    root: '/housekeeping',
    tasks: '/housekeeping/tasks',
    staff: '/housekeeping/staff',
  },

  reports: {
    root: '/reports',
    daily: '/reports/daily',
    utilization: '/reports/utilization',
    turnover: '/reports/turnover',
  },

  alerts: {
    root: '/alerts',
    settings: '/alerts/settings',
  },

  settings: {
    root: '/settings',
    hospital: '/settings/hospital',
    users: '/settings/users',
    integrations: '/settings/integrations',
  },

  organization: '/organization',
  trash: '/trash',
} as const;

export const Routes = FrontendRoutes;

export default FrontendRoutes;
