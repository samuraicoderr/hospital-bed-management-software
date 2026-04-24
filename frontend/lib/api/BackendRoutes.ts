/**
 * BedFlow Backend API Routes
 * Maps to Django REST Framework endpoints
 */

const API_VERSION = '/api/v1';

export const BackendRoutes = {
  // Auth routes (from existing code)
  auth: {
    login: `${API_VERSION}/auth/login/`,
    register: `${API_VERSION}/auth/register/`,
    refresh: `${API_VERSION}/auth/login/refresh_token/`,
    logout: `${API_VERSION}/auth/logout/`,
    me: `${API_VERSION}/auth/me/`,
    password_reset: `${API_VERSION}/password_reset/`,
  },

  // Legacy aliases kept for compatibility with existing service modules.
  loginFirstFactor: `${API_VERSION}/auth/login/`,
  register: `${API_VERSION}/auth/register/`,
  refreshToken: `${API_VERSION}/auth/login/refresh_token/`,
  me: `${API_VERSION}/auth/me/`,

  getUsers: `${API_VERSION}/auth/users/`,
  getUser: (id: string) => `${API_VERSION}/auth/users/${id}/`,
  updatePassword: `${API_VERSION}/auth/change-password/`,
  requestQrCode: `${API_VERSION}/auth/2fa/request-qr-code/`,
  check2faOtp: `${API_VERSION}/auth/2fa/verify-otp/`,

  sendEmailOtp: `${API_VERSION}/auth/otp/send-email/`,
  sendPhoneOtp: `${API_VERSION}/auth/otp/send-phone/`,
  checkEmailOtp: `${API_VERSION}/auth/otp/check-email/`,
  checkPhoneOtp: `${API_VERSION}/auth/otp/check-phone/`,

  getOnboardingToken: `${API_VERSION}/auth/onboarding/token/`,
  onboardingSendEmailOtp: `${API_VERSION}/auth/onboarding/send-email-otp/`,
  onboardingCheckEmailOtp: `${API_VERSION}/auth/onboarding/check-email-otp/`,
  onboardingSetUsername: `${API_VERSION}/auth/onboarding/set-username/`,
  onboardingSetProfilePicture: `${API_VERSION}/auth/onboarding/set-profile-picture/`,
  checkUsername: `${API_VERSION}/auth/onboarding/check-username/`,

  oauthAuthorizeCode: (provider: string) => `${API_VERSION}/auth/oauth/${provider}/authorize-code/`,
  oauthLoginOrRegister: (provider: string) => `${API_VERSION}/auth/oauth/${provider}/login-or-register/`,
  oauthGetProviders: `${API_VERSION}/auth/oauth/providers/`,

  notifications: `${API_VERSION}/notifications/`,
  notificationsUnreadCount: `${API_VERSION}/notifications/unread-count/`,
  notificationMarkRead: (id: string) => `${API_VERSION}/notifications/${id}/mark-read/`,
  notificationsMarkAllRead: `${API_VERSION}/notifications/mark-all-read/`,

  // Organizations
  organizations: {
    base: `${API_VERSION}/organizations/`,
    hospitals: `${API_VERSION}/organizations/hospitals/`,
    departments: `${API_VERSION}/organizations/departments/`,
    wards: `${API_VERSION}/organizations/wards/`,
    staff: `${API_VERSION}/organizations/staff/`,
  },

  // Beds
  beds: {
    base: `${API_VERSION}/beds/beds/`,
    detail: (id: string) => `${API_VERSION}/beds/beds/${id}/`,
    updateStatus: (id: string) => `${API_VERSION}/beds/beds/${id}/update_status/`,
    block: (id: string) => `${API_VERSION}/beds/beds/${id}/block/`,
    unblock: (id: string) => `${API_VERSION}/beds/beds/${id}/unblock/`,
    searchAvailable: `${API_VERSION}/beds/beds/search_available/`,
    statistics: `${API_VERSION}/beds/beds/statistics/`,
    history: (id: string) => `${API_VERSION}/beds/beds/${id}/history/`,
    equipmentTags: `${API_VERSION}/beds/equipment-tags/`,
  },

  // Patients
  patients: {
    base: `${API_VERSION}/patients/patients/`,
    detail: (id: string) => `${API_VERSION}/patients/patients/${id}/`,
    requirements: (id: string) => `${API_VERSION}/patients/patients/${id}/requirements/`,
    search: `${API_VERSION}/patients/patients/search/`,
  },

  // Admissions
  admissions: {
    base: `${API_VERSION}/admissions/admission-requests/`,
    detail: (id: string) => `${API_VERSION}/admissions/admission-requests/${id}/`,
    assignBed: (id: string) => `${API_VERSION}/admissions/admission-requests/${id}/assign_bed/`,
    admit: (id: string) => `${API_VERSION}/admissions/admission-requests/${id}/admit/`,
    suggestBeds: (id: string) => `${API_VERSION}/admissions/admission-requests/${id}/suggest_beds/`,
    active: `${API_VERSION}/admissions/admissions/`,
    transfers: `${API_VERSION}/admissions/transfers/`,
    transferDetail: (id: string) => `${API_VERSION}/admissions/transfers/${id}/`,
    approveTransfer: (id: string) => `${API_VERSION}/admissions/transfers/${id}/approve/`,
    completeTransfer: (id: string) => `${API_VERSION}/admissions/transfers/${id}/complete/`,
  },

  // Discharges
  discharges: {
    base: `${API_VERSION}/discharges/discharges/`,
    detail: (id: string) => `${API_VERSION}/discharges/discharges/${id}/`,
    approve: (id: string) => `${API_VERSION}/discharges/discharges/${id}/approve/`,
    complete: (id: string) => `${API_VERSION}/discharges/discharges/${id}/complete/`,
    pending: `${API_VERSION}/discharges/discharges/pending/`,
  },

  // Housekeeping
  housekeeping: {
    tasks: `${API_VERSION}/housekeeping/cleaning-tasks/`,
    taskDetail: (id: string) => `${API_VERSION}/housekeeping/cleaning-tasks/${id}/`,
    assign: (id: string) => `${API_VERSION}/housekeeping/cleaning-tasks/${id}/assign/`,
    start: (id: string) => `${API_VERSION}/housekeeping/cleaning-tasks/${id}/start/`,
    complete: (id: string) => `${API_VERSION}/housekeeping/cleaning-tasks/${id}/complete/`,
    escalate: (id: string) => `${API_VERSION}/housekeeping/cleaning-tasks/${id}/escalate/`,
    qualityCheck: (id: string) => `${API_VERSION}/housekeeping/cleaning-tasks/${id}/quality_check/`,
    staff: `${API_VERSION}/housekeeping/staff/`,
    staffDetail: (id: string) => `${API_VERSION}/housekeeping/staff/${id}/`,
    dashboard: `${API_VERSION}/housekeeping/dashboard/`,
  },

  // Dashboard
  dashboard: {
    operational: `${API_VERSION}/dashboard/operational/`,
    occupancyTrend: `${API_VERSION}/dashboard/occupancy-trend/`,
    departmentStats: `${API_VERSION}/dashboard/department-stats/`,
  },

  // Alerts
  alerts: {
    base: `${API_VERSION}/alerts/alerts/`,
    detail: (id: string) => `${API_VERSION}/alerts/alerts/${id}/`,
    acknowledge: (id: string) => `${API_VERSION}/alerts/alerts/${id}/acknowledge/`,
    markRead: `${API_VERSION}/alerts/alerts/mark_read/`,
    stats: `${API_VERSION}/alerts/alerts/stats/`,
    preferences: `${API_VERSION}/alerts/preferences/`,
  },

  // Reports
  reports: {
    base: `${API_VERSION}/reports/reports/`,
    detail: (id: string) => `${API_VERSION}/reports/reports/${id}/`,
    generate: (id: string) => `${API_VERSION}/reports/reports/${id}/generate/`,
    download: (id: string) => `${API_VERSION}/reports/reports/${id}/download/`,
    schedules: `${API_VERSION}/reports/schedules/`,
    types: `${API_VERSION}/reports/types/`,
  },

  // Audit
  audit: {
    logs: `${API_VERSION}/audit/logs/`,
    logDetail: (id: string) => `${API_VERSION}/audit/logs/${id}/`,
    export: `${API_VERSION}/audit/logs/export/`,
  },

  // Realtime WebSocket
  realtime: {
    websocket: (token: string) => `ws://localhost:9000/ws/bedflow/?token=${token}`,
  },
} as const;

export default BackendRoutes;
