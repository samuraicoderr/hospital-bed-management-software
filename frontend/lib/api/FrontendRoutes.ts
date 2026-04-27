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
    password: '/auth/onboarding/password',
    verifyEmail: '/auth/onboarding/verify-email',
    username: '/auth/onboarding/username',
    profilePicture: '/auth/onboarding/profile-picture',
    hospital: '/auth/onboarding/hospital',
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
  onboardingPassword: '/auth/onboarding/password',
  onboardingVerifyEmail: '/auth/onboarding/verify-email',
  onboardingUsername: '/auth/onboarding/username',
  onboardingProfilePicture: '/auth/onboarding/profile-picture',
  onboardingHospital: '/auth/onboarding/hospital',
  onboardingComplete: '/auth/onboarding/complete',

  // Main application routes
  departments: '/dashboard/departments',
  wards: '/dashboard/wards',
  beds: {
    root: '/dashboard/beds',
    detail: (id: string) => `/dashboard/beds/${id}`,
    grid: '/dashboard/beds/grid',
    map: '/dashboard/beds/map',
  },

  admissions: {
    root: '/dashboard/admissions',
    new: '/dashboard/admissions/new',
    detail: (id: string) => `/dashboard/admissions/${id}`,
    queue: '/dashboard/admissions/queue',
  },

  patients: {
    root: '/dashboard/patients',
    new: '/dashboard/patients/new',
    detail: (id: string) => `/dashboard/patients/${id}`,
    search: '/dashboard/patients/search',
  },

  transfers: {
    root: '/dashboard/transfers',
    new: '/dashboard/transfers/new',
    detail: (id: string) => `/dashboard/transfers/${id}`,
  },

  discharges: {
    root: '/dashboard/discharges',
    pending: '/dashboard/discharges/pending',
  },

  housekeeping: {
    root: '/dashboard/housekeeping',
    tasks: '/dashboard/housekeeping/tasks',
    staff: '/dashboard/housekeeping/staff',
  },

  reports: {
    root: '/dashboard/reports',
    daily: '/dashboard/reports/daily',
    utilization: '/dashboard/reports/utilization',
    turnover: '/dashboard/reports/turnover',
  },

  alerts: {
    root: '/dashboard/alerts',
    settings: '/dashboard/alerts/settings',
  },

  settings: {
    root: '/dashboard/settings',
    hospital: '/dashboard/settings/hospital',
    users: '/dashboard/settings/users',
    integrations: '/dashboard/settings/integrations',
  },

  organization: '/dashboard/organization',
  trash: '/dashboard/trash',
} as const;

export const Routes = FrontendRoutes;

export default FrontendRoutes;
