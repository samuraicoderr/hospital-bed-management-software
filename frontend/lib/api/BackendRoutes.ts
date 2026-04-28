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

    // MFA routes
    mfa: {
      qrImage: (token: string) => `${API_VERSION}/auth/mfa/authapp/qr-image/${token}/`,
      requestQrCode: `${API_VERSION}/auth/mfa/authapp/request_qr_code/`,
      challenge: `${API_VERSION}/auth/mfa/challenge/`,
      methods: `${API_VERSION}/auth/mfa/methods/`,
      pushRegisterDevice: `${API_VERSION}/auth/mfa/push/register-device/`,
      setupTotp: `${API_VERSION}/auth/mfa/setup/totp/`,
      setupWebauthn: `${API_VERSION}/auth/mfa/setup/webauthn/`,
      verify: `${API_VERSION}/auth/mfa/verify/`,
      verifyTotp: `${API_VERSION}/auth/mfa/verify/totp/`,
      verifyWebauthn: `${API_VERSION}/auth/mfa/verify/webauthn/`,
    },

    // Onboarding routes
    onboarding: {
      sendEmailOtp: `${API_VERSION}/auth/onboarding/email/send_email_verification_otp/`,
      checkEmailOtp: `${API_VERSION}/auth/onboarding/email/check_email_verification_otp/`,
      sendPhoneOtp: `${API_VERSION}/auth/onboarding/phone/send_phone_verification_otp/`,
      checkPhoneOtp: `${API_VERSION}/auth/onboarding/phone/check_phone_verification_otp/`,
      getOnboardingToken: `${API_VERSION}/auth/onboarding/get_onboarding_token/`,
      setUserBasicInfo: `${API_VERSION}/auth/onboarding/set_user_basic_info/`,
      setPassword: `${API_VERSION}/auth/onboarding/set_password/`,
      setUsername: `${API_VERSION}/auth/onboarding/set_username/`,
      setProfilePicture: `${API_VERSION}/auth/onboarding/set_profile_picture/`,
      createOrJoinFirstHospital: `${API_VERSION}/auth/onboarding/create_or_join_first_hospital/`,
      exchangeTokens: `${API_VERSION}/auth/onboarding/exchange_onboarding_tokens_for_login_tokens/`,
    },

    // Legacy flat aliases for backward compatibility
    requestQrCode: `${API_VERSION}/auth/mfa/authapp/request_qr_code/`,
    check2faOtp: `${API_VERSION}/auth/mfa/verify/`,
    sendEmailOtp: `${API_VERSION}/auth/onboarding/email/send_email_verification_otp/`,
    sendPhoneOtp: `${API_VERSION}/auth/onboarding/phone/send_phone_verification_otp/`,
    checkEmailOtp: `${API_VERSION}/auth/onboarding/email/check_email_verification_otp/`,
    checkPhoneOtp: `${API_VERSION}/auth/onboarding/phone/check_phone_verification_otp/`,
    getOnboardingToken: `${API_VERSION}/auth/onboarding/get_onboarding_token/`,
    setBasicInfo: `${API_VERSION}/auth/onboarding/set_user_basic_info/`,
    setPassword: `${API_VERSION}/auth/onboarding/set_password/`,
    setUsername: `${API_VERSION}/auth/onboarding/set_username/`,
    setProfilePicture: `${API_VERSION}/auth/onboarding/set_profile_picture/`,
    createOrJoinFirstHospital: `${API_VERSION}/auth/onboarding/create_or_join_first_hospital/`,
    exchangeOnboardingTokens: `${API_VERSION}/auth/onboarding/exchange_onboarding_tokens_for_login_tokens/`,
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
    hospitalInviteStaff: (id: string) => `${API_VERSION}/hospitals/${id}/invite_staff/`,
    hospitalPendingInvites: (id: string) => `${API_VERSION}/hospitals/${id}/pending_invites/`,

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
    hospitalStaffAcceptInvitation: `${API_VERSION}/hospital-staff/accept_invitation/`,
    hospitalStaffInvitations: `${API_VERSION}/hospital-staff-invitations/`,
    hospitalStaffInvitationDetail: (id: string) => `${API_VERSION}/hospital-staff-invitations/${id}/`,
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
    markForCleaning: (id: string) => `${API_VERSION}/beds/${id}/mark_for_cleaning/`,
    reserve: (id: string) => `${API_VERSION}/beds/${id}/reserve/`,
    clearReservation: (id: string) => `${API_VERSION}/beds/${id}/clear_reservation/`,
    assign: (id: string) => `${API_VERSION}/beds/${id}/assign/`,
    release: (id: string) => `${API_VERSION}/beds/${id}/release/`,
    eligible: (id: string) => `${API_VERSION}/beds/${id}/eligible/`,
    history: (id: string) => `${API_VERSION}/beds/${id}/history/`,
    searchAvailable: `${API_VERSION}/beds/search_available/`,
    statistics: `${API_VERSION}/beds/statistics/`,
    analytics: `${API_VERSION}/beds/analytics/`,

    equipmentTags: `${API_VERSION}/equipment-tags/`,
    equipmentTagDetail: (id: string) => `${API_VERSION}/equipment-tags/${id}/`,
    maintenanceRecords: `${API_VERSION}/bed-maintenance-records/`,
    maintenanceRecordDetail: (id: string) => `${API_VERSION}/bed-maintenance-records/${id}/`,
    resolveMaintenanceRecord: (id: string) => `${API_VERSION}/bed-maintenance-records/${id}/resolve/`,
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
    currentAdmission: (id: string) =>
      `${API_VERSION}/patients/${id}/current_admission/`,
    admissionStatus: (id: string) =>
      `${API_VERSION}/patients/${id}/admission_status/`,
    deactivate: (id: string) =>
      `${API_VERSION}/patients/${id}/deactivate/`,
    markDeceased: (id: string) =>
      `${API_VERSION}/patients/${id}/mark_deceased/`,
  },

  /* =========================
   CLINICAL REQUIREMENTS
  ========================== */
  clinicalRequirements: {
    base: `${API_VERSION}/clinical-requirements/`,
    detail: (id: string) => `${API_VERSION}/clinical-requirements/${id}/`,
    resolve: (id: string) => `${API_VERSION}/clinical-requirements/${id}/resolve/`,
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
    renderResetPage: `${API_VERSION}/reset/confirm/render_reset_page/`,
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
  resetRecoveryCodes: `${API_VERSION}/security/2fa/reset_recovery_codes/`,

  // MFA flat aliases
  requestQrCode: `${API_VERSION}/auth/mfa/authapp/request_qr_code/`,
  check2faOtp: `${API_VERSION}/auth/mfa/verify/`,

  // Onboarding flat aliases
  sendEmailOtp: `${API_VERSION}/auth/onboarding/email/send_email_verification_otp/`,
  sendPhoneOtp: `${API_VERSION}/auth/onboarding/phone/send_phone_verification_otp/`,
  checkEmailOtp: `${API_VERSION}/auth/onboarding/email/check_email_verification_otp/`,
  checkPhoneOtp: `${API_VERSION}/auth/onboarding/phone/check_phone_verification_otp/`,
  getOnboardingToken: `${API_VERSION}/auth/onboarding/get_onboarding_token/`,
  onboardingSendEmailOtp: `${API_VERSION}/auth/onboarding/email/send_email_verification_otp/`,
  onboardingCheckEmailOtp: `${API_VERSION}/auth/onboarding/email/check_email_verification_otp/`,
  onboardingSendPhoneOtp: `${API_VERSION}/auth/onboarding/phone/send_phone_verification_otp/`,
  onboardingCheckPhoneOtp: `${API_VERSION}/auth/onboarding/phone/check_phone_verification_otp/`,
  onboardingSetUserBasicInfo: `${API_VERSION}/auth/onboarding/set_user_basic_info/`,
  onboardingSetPassword: `${API_VERSION}/auth/onboarding/set_password/`,
  onboardingSetUsername: `${API_VERSION}/auth/onboarding/set_username/`,
  onboardingSetProfilePicture: `${API_VERSION}/auth/onboarding/set_profile_picture/`,
  onboardingCreateOrJoinFirstHospital: `${API_VERSION}/auth/onboarding/create_or_join_first_hospital/`,
  onboardingGetUserData: `${API_VERSION}/auth/onboarding/get_user_data/`,
  onboardingExchangeTokens: `${API_VERSION}/auth/onboarding/exchange_onboarding_tokens_for_login_tokens/`,

  oauthAuthorizeCode: (provider: string) => `${API_VERSION}/oauth/${provider}/login-or-register/`,
  oauthLoginOrRegister: (provider: string) => `${API_VERSION}/oauth/${provider}/login-or-register/`,
  oauthGetProviders: `${API_VERSION}/oauth/get_providers/`,

  notifications: `${API_VERSION}/notifications/`,
  notificationsUnreadCount: `${API_VERSION}/notifications/unread-count/`,
  notificationMarkRead: (id: string) => `${API_VERSION}/notifications/${id}/read/`,
  notificationsMarkAllRead: `${API_VERSION}/notifications/mark-all-read/`,
} as const;

export default BackendRoutes;
