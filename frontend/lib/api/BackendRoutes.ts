/**
 * BedFlow Backend API Routes
 * Maps exactly to Django REST Framework endpoints (OAS 3.0 spec)
 */

const API_VERSION = '/api/v1';

export const BackendRoutes = {
  /* =========================
   AUTH
  ========================== */
  auth: {
    login: `${API_VERSION}/auth/login/`,
    refresh: `${API_VERSION}/auth/login/refresh_token/`,
    register: `${API_VERSION}/auth/register/`,
    checkUsername: `${API_VERSION}/auth/check_username/`,
    joinWaitlist: `${API_VERSION}/auth/join_waitlist/`,

    me: `${API_VERSION}/users/me/`,
    updateMe: `${API_VERSION}/users/update_me/`,
    deleteMe: `${API_VERSION}/users/delete_me/`,

    changePassword: `${API_VERSION}/security/password/`,
    sendForgotPasswordOtp: `${API_VERSION}/security/password/send_forgot_password_otp/`,
    resetForgotPassword: `${API_VERSION}/security/password/reset_forgot_password/`,

    requestQrCode: `${API_VERSION}/auth/request_qr_code/`,
    check2faOtp: `${API_VERSION}/auth/check_2fa_otp/`,
    sendEmailOtp: `${API_VERSION}/auth/send_email_verification_otp/`,
    sendPhoneOtp: `${API_VERSION}/auth/send_phone_verification_otp/`,
    checkEmailOtp: `${API_VERSION}/auth/check_email_verification_otp/`,
    checkPhoneOtp: `${API_VERSION}/auth/check_phone_verification_otp/`,
    getOnboardingToken: `${API_VERSION}/auth/get_onboarding_token/`,
    setUsername: `${API_VERSION}/auth/set_username/`,
    setProfilePicture: `${API_VERSION}/auth/set_profile_picture/`,
  },

  /* =========================
   OAUTH
  ========================== */
  oauth: {
    callback: (provider: string) => `${API_VERSION}/oauth/${provider}/callback/`,
    loginOrRegister: (provider: string) =>
      `${API_VERSION}/oauth/${provider}/login-or-register/`,
    providers: `${API_VERSION}/oauth/get_providers/`,
  },

  /* =========================
   ORGANIZATIONS
  ========================== */
  organizations: {
    base: `${API_VERSION}/organizations/`,
    detail: (id: string) => `${API_VERSION}/organizations/${id}/`,

    hospitals: `${API_VERSION}/hospitals/`,
    hospitalDetail: (id: string) => `${API_VERSION}/hospitals/${id}/`,
    hospitalBuildings: (id: string) => `${API_VERSION}/hospitals/${id}/buildings/`,
    hospitalDepartments: (id: string) => `${API_VERSION}/hospitals/${id}/departments/`,
    hospitalStaff: (id: string) => `${API_VERSION}/hospitals/${id}/staff/`,

    buildings: `${API_VERSION}/buildings/`,
    buildingDetail: (id: string) => `${API_VERSION}/buildings/${id}/`,

    departments: `${API_VERSION}/departments/`,
    departmentDetail: (id: string) => `${API_VERSION}/departments/${id}/`,
    departmentAvailableBeds: (id: string) =>
      `${API_VERSION}/departments/${id}/available_beds/`,
    departmentWards: (id: string) => `${API_VERSION}/departments/${id}/wards/`,

    wards: `${API_VERSION}/wards/`,
    wardDetail: (id: string) => `${API_VERSION}/wards/${id}/`,

    hospitalStaffList: `${API_VERSION}/hospital-staff/`,
    hospitalStaffListDetail: (id: string) => `${API_VERSION}/hospital-staff/${id}/`,
  },

  /* =========================
   BEDS
  ========================== */
  beds: {
    base: `${API_VERSION}/beds/`,
    detail: (id: string) => `${API_VERSION}/beds/${id}/`,
    block: (id: string) => `${API_VERSION}/beds/${id}/block/`,
    unblock: (id: string) => `${API_VERSION}/beds/${id}/unblock/`,
    updateStatus: (id: string) => `${API_VERSION}/beds/${id}/update_status/`,
    history: (id: string) => `${API_VERSION}/beds/${id}/history/`,
    searchAvailable: `${API_VERSION}/beds/search_available/`,
    statistics: `${API_VERSION}/beds/statistics/`,

    equipmentTags: `${API_VERSION}/equipment-tags/`,
    equipmentTagDetail: (id: string) => `${API_VERSION}/equipment-tags/${id}/`,
  },

  /* =========================
   PATIENTS
  ========================== */
  patients: {
    base: `${API_VERSION}/patients/`,
    detail: (id: string) => `${API_VERSION}/patients/${id}/`,
    admissionHistory: (id: string) =>
      `${API_VERSION}/patients/${id}/admission_history/`,
    clinicalRequirements: (id: string) =>
      `${API_VERSION}/patients/${id}/clinical_requirements/`,

    search: `${API_VERSION}/patients/search/`,
  },

  clinicalRequirements: {
    base: `${API_VERSION}/clinical-requirements/`,
    detail: (id: string) => `${API_VERSION}/clinical-requirements/${id}/`,
  },

  /* =========================
   ADMISSIONS
  ========================== */
  admissions: {
    requests: `${API_VERSION}/admission-requests/`,
    requestDetail: (id: string) => `${API_VERSION}/admission-requests/${id}/`,
    admit: (id: string) => `${API_VERSION}/admission-requests/${id}/admit/`,
    assignBed: (id: string) =>
      `${API_VERSION}/admission-requests/${id}/assign_bed/`,
    suggestBeds: (id: string) =>
      `${API_VERSION}/admission-requests/${id}/suggest_beds/`,

    admissions: `${API_VERSION}/admissions/`,
    admissionDetail: (id: string) => `${API_VERSION}/admissions/${id}/`,

    transfers: `${API_VERSION}/transfers/`,
    transferDetail: (id: string) => `${API_VERSION}/transfers/${id}/`,
    approveTransfer: (id: string) => `${API_VERSION}/transfers/${id}/approve/`,
    completeTransfer: (id: string) =>
      `${API_VERSION}/transfers/${id}/complete/`,

    active: `${API_VERSION}/admissions/active/`,
  },

  /* =========================
   DISCHARGES
  ========================== */
  discharges: {
    base: `${API_VERSION}/discharges/`,
    detail: (id: string) => `${API_VERSION}/discharges/${id}/`,
    approve: (id: string) => `${API_VERSION}/discharges/${id}/approve/`,
    complete: (id: string) => `${API_VERSION}/discharges/${id}/complete/`,
    pending: `${API_VERSION}/discharges/pending/`,
  },

  /* =========================
   HOUSEKEEPING
  ========================== */
  housekeeping: {
    tasks: `${API_VERSION}/cleaning-tasks/`,
    taskDetail: (id: string) => `${API_VERSION}/cleaning-tasks/${id}/`,
    assign: (id: string) => `${API_VERSION}/cleaning-tasks/${id}/assign/`,
    start: (id: string) => `${API_VERSION}/cleaning-tasks/${id}/start/`,
    complete: (id: string) => `${API_VERSION}/cleaning-tasks/${id}/complete/`,
    backlog: `${API_VERSION}/cleaning-tasks/backlog/`,
    myTasks: `${API_VERSION}/cleaning-tasks/my_tasks/`,

    staff: `${API_VERSION}/housekeeping-staff/`,
    staffDetail: (id: string) =>
      `${API_VERSION}/housekeeping-staff/${id}/`,

    escalate: (id: string) => `${API_VERSION}/cleaning-tasks/${id}/escalate/`,
    qualityCheck: (id: string) => `${API_VERSION}/cleaning-tasks/${id}/quality-check/`,
    dashboard: `${API_VERSION}/cleaning-tasks/dashboard/`,
  },

  /* =========================
   ALERTS
  ========================== */
  alerts: {
    base: `${API_VERSION}/alerts/`,
    detail: (id: string) => `${API_VERSION}/alerts/${id}/`,
    acknowledge: (id: string) =>
      `${API_VERSION}/alerts/${id}/acknowledge/`,
    resolve: (id: string) => `${API_VERSION}/alerts/${id}/resolve/`,
    myAlerts: `${API_VERSION}/alerts/my_alerts/`,

    markRead: `${API_VERSION}/alerts/mark-read/`,
    stats: `${API_VERSION}/alerts/stats/`,

    configurations: `${API_VERSION}/alert-configurations/`,
    configurationDetail: (id: string) =>
      `${API_VERSION}/alert-configurations/${id}/`,

    preferences: `${API_VERSION}/alert-preferences/`,
    preferenceDetail: (id: string) =>
      `${API_VERSION}/alert-preferences/${id}/`,
  },

  /* =========================
   DASHBOARD
  ========================== */
  dashboard: {
    occupancyTrend: `${API_VERSION}/dashboard/occupancy_trend/`,
    operational: `${API_VERSION}/dashboard/operational/`,
    departmentStats: `${API_VERSION}/dashboard/department-stats/`,
  },

  /* =========================
   REPORTS
  ========================== */
  reports: {
    templates: `${API_VERSION}/report-templates/`,
    templateDetail: (id: string) =>
      `${API_VERSION}/report-templates/${id}/`,
    generate: (id: string) =>
      `${API_VERSION}/report-templates/${id}/generate/`,

    runs: `${API_VERSION}/report-runs/`,
    runDetail: (id: string) => `${API_VERSION}/report-runs/${id}/`,
    download: (id: string) =>
      `${API_VERSION}/report-runs/${id}/download/`,
  },

  /* =========================
   PASSWORD RESET (DJANGO)
  ========================== */
  passwordReset: {
    request: `${API_VERSION}/reset/`,
    confirm: `${API_VERSION}/reset/confirm/`,
    validateToken: `${API_VERSION}/reset/validate_token/`,
  },

  /* =========================
   REALTIME
  ========================== */
  realtime: {
    websocket: (token: string) =>
      `ws://localhost:9000/ws/bedflow/?token=${token}`,
  },

  /* =========================
   FLAT ALIASES (backward compat)
  ========================== */
  me: `${API_VERSION}/users/me/`,
  loginFirstFactor: `${API_VERSION}/auth/login/`,
  refreshToken: `${API_VERSION}/auth/login/refresh_token/`,
  register: `${API_VERSION}/auth/register/`,
  checkUsername: `${API_VERSION}/auth/check_username/`,
  joinWaitlist: `${API_VERSION}/auth/join_waitlist/`,
  updateMe: `${API_VERSION}/users/update_me/`,
  deleteMe: `${API_VERSION}/users/delete_me/`,
  changePassword: `${API_VERSION}/security/password/`,
  sendForgotPasswordOtp: `${API_VERSION}/security/password/send_forgot_password_otp/`,
  resetForgotPassword: `${API_VERSION}/security/password/reset_forgot_password/`,

  getUsers: `${API_VERSION}/users/`,
  getUser: (id: string) => `${API_VERSION}/users/${id}/`,
  updatePassword: `${API_VERSION}/security/password/`,
  requestQrCode: `${API_VERSION}/auth/request_qr_code/`,
  check2faOtp: `${API_VERSION}/auth/check_2fa_otp/`,
  sendEmailOtp: `${API_VERSION}/auth/send_email_verification_otp/`,
  sendPhoneOtp: `${API_VERSION}/auth/send_phone_verification_otp/`,
  checkEmailOtp: `${API_VERSION}/auth/check_email_verification_otp/`,
  checkPhoneOtp: `${API_VERSION}/auth/check_phone_verification_otp/`,
  getOnboardingToken: `${API_VERSION}/auth/get_onboarding_token/`,
  onboardingSendEmailOtp: `${API_VERSION}/auth/send_email_verification_otp/`,
  onboardingCheckEmailOtp: `${API_VERSION}/auth/check_email_verification_otp/`,
  onboardingSetUsername: `${API_VERSION}/auth/set_username/`,
  onboardingSetProfilePicture: `${API_VERSION}/auth/set_profile_picture/`,

  oauthAuthorizeCode: (provider: string) => `${API_VERSION}/oauth/${provider}/login-or-register/`,
  oauthLoginOrRegister: (provider: string) => `${API_VERSION}/oauth/${provider}/login-or-register/`,
  oauthGetProviders: `${API_VERSION}/oauth/get_providers/`,

  notifications: `${API_VERSION}/notifications/`,
  notificationsUnreadCount: `${API_VERSION}/notifications/unread-count/`,
  notificationMarkRead: (id: string) => `${API_VERSION}/notifications/${id}/read/`,
  notificationsMarkAllRead: `${API_VERSION}/notifications/mark-all-read/`,
} as const;

export default BackendRoutes;