export const baseURL = "";

/** Derive the WebSocket base URL from the REST API URL at runtime. */
export function getWsBaseUrl(): string {
  const apiUrl =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
    "http://localhost:9000/api/v1";
  try {
    const parsed = new URL(apiUrl);
    const scheme = parsed.protocol === "https:" ? "wss:" : "ws:";
    return `${scheme}//${parsed.host}`;
  } catch {
    return "ws://localhost:9000";
  }
}

export const BackendRoutes = {
  /* ----------------------------- AUTH ----------------------------- */
  health: `${baseURL}/health/`,
  login: `${baseURL}/auth/login/`,
  refreshToken: `${baseURL}/auth/login/refresh_token/`,
  register: `${baseURL}/auth/register/`,
  joinWaitlist: `${baseURL}/auth/join_waitlist/`,

  /** @deprecated use `login` instead — old 1st/2nd factor split is replaced by MFA challenge flow */
  loginFirstFactor: `${baseURL}/auth/login/`,
  /** @deprecated use `mfaVerify` instead */
  loginSecondFactor: `${baseURL}/auth/mfa/verify/`,

  /* ----------------------------- PASSWORD RESET ----------------------------- */
  passwordReset: `${baseURL}/reset/`,
  passwordResetConfirm: `${baseURL}/reset/confirm/`,
  passwordResetRenderPage: `${baseURL}/reset/confirm/render_reset_page/`,
  passwordResetValidateToken: `${baseURL}/reset/validate_token/`,

  /* ----------------------------- SECURITY / PASSWORD ----------------------------- */
  updatePassword: `${baseURL}/security/password/`,
  resetForgotPassword: `${baseURL}/security/password/reset_forgot_password/`,
  sendForgotPasswordOtp: `${baseURL}/security/password/send_forgot_password_otp/`,
  resetRecoveryCodes: `${baseURL}/security/2fa/reset_recovery_codes/`,

  /* ----------------------------- MFA ----------------------------- */
  mfaMethods: `${baseURL}/auth/mfa/methods/`,
  mfaChallenge: `${baseURL}/auth/mfa/challenge/`,
  mfaVerify: `${baseURL}/auth/mfa/verify/`,
  mfaSetupTotp: `${baseURL}/auth/mfa/setup/totp/`,
  mfaVerifyTotp: `${baseURL}/auth/mfa/verify/totp/`,
  mfaSetupWebauthn: `${baseURL}/auth/mfa/setup/webauthn/`,
  mfaVerifyWebauthn: `${baseURL}/auth/mfa/verify/webauthn/`,
  mfaPushRegisterDevice: `${baseURL}/auth/mfa/push/register-device/`,
  mfaRequestQrCode: `${baseURL}/auth/mfa/authapp/request_qr_code/`,
  mfaQrImage: (token: string) =>
    `${baseURL}/auth/mfa/authapp/qr-image/${token}/`,

  /** @deprecated use `mfaVerifyTotp` instead */
  check2faOtp: `${baseURL}/auth/mfa/verify/totp/`,
  /** @deprecated use `mfaRequestQrCode` instead */
  requestQrCode: `${baseURL}/auth/mfa/authapp/request_qr_code/`,
  /** @deprecated use `mfaQrImage` instead */
  qrImageFor2FA: (token: string) =>
    `${baseURL}/auth/mfa/authapp/qr-image/${token}/`,
  /** @deprecated use `mfaChallenge` with method 'totp' instead */
  send2faOtp: `${baseURL}/auth/mfa/challenge/`,

  /* ----------------------------- ONBOARDING ----------------------------- */
  getOnboardingToken: `${baseURL}/auth/onboarding/get_onboarding_token/`,
  onboardingSendEmailOtp: `${baseURL}/auth/onboarding/email/send_email_verification_otp/`,
  onboardingCheckEmailOtp: `${baseURL}/auth/onboarding/email/check_email_verification_otp/`,
  onboardingSendPhoneOtp: `${baseURL}/auth/onboarding/phone/send_phone_verification_otp/`,
  onboardingCheckPhoneOtp: `${baseURL}/auth/onboarding/phone/check_phone_verification_otp/`,
  onboardingSetUsername: `${baseURL}/auth/onboarding/set_username/`,
  onboardingSetProfilePicture: `${baseURL}/auth/onboarding/set_profile_picture/`,

  /** @deprecated use `onboardingCheckEmailOtp` instead */
  checkEmailOtp: `${baseURL}/auth/onboarding/email/check_email_verification_otp/`,
  /** @deprecated use `onboardingCheckPhoneOtp` instead */
  checkPhoneOtp: `${baseURL}/auth/onboarding/phone/check_phone_verification_otp/`,
  /** @deprecated use `onboardingSendEmailOtp` instead */
  sendEmailOtp: `${baseURL}/auth/onboarding/email/send_email_verification_otp/`,
  /** @deprecated use `onboardingSendPhoneOtp` instead */
  sendPhoneOtp: `${baseURL}/auth/onboarding/phone/send_phone_verification_otp/`,

  /* ----------------------------- NOTIFICATIONS ----------------------------- */
  notifications: `${baseURL}/notifications/`,
  notification: (id: string) => `${baseURL}/notifications/${id}/`,
  notificationMarkRead: (id: string) => `${baseURL}/notifications/${id}/read/`,
  notificationsMarkAllRead: `${baseURL}/notifications/mark-all-read/`,
  notificationsUnreadCount: `${baseURL}/notifications/unread-count/`,
  notificationsWs: (token: string) =>
    `${getWsBaseUrl()}/ws/notifications/?token=${encodeURIComponent(token)}`,

  /* ----------------------------- USERS ----------------------------- */
  me: `${baseURL}/users/me/`,
  updateMe: `${baseURL}/users/update_me/`,
  deleteMe: `${baseURL}/users/delete_me/`,

  /** @deprecated endpoint removed from backend */
  getUsers: `${baseURL}/users/`,
  /** @deprecated endpoint removed from backend */
  getUser: (id: string) => `${baseURL}/users/${id}/`,
  /** @deprecated endpoint removed from backend */
  checkUsername: `${baseURL}/auth/check_username/`,

  /* ----------------------------- OAUTH ----------------------------- */
  oauthGetProviders: `${baseURL}/oauth/get_providers/`,
  oauthLoginOrRegister: (provider: string) =>
    `${baseURL}/oauth/${provider}/login-or-register/`,
  oauthCallback: (provider: string) =>
    `${baseURL}/oauth/${provider}/callback/`,

  /** @deprecated use `oauthLoginOrRegister` instead */
  oauthAuthorizeCode: (provider: string) =>
    `${baseURL}/oauth/${provider}/login-or-register/`,

  /* ----------------------------- ORGANIZATIONS ----------------------------- */
  organizations: `${baseURL}/organizations/`,
  organization: (id: string) => `${baseURL}/organizations/${id}/`,

  /* --- Audit Logs --- */
  orgAuditLogs: (orgId: string) =>
    `${baseURL}/organizations/${orgId}/audit-logs/`,
  orgAuditLog: (orgId: string, id: string) =>
    `${baseURL}/organizations/${orgId}/audit-logs/${id}/`,

  /* --- Invitations --- */
  orgInvitations: (orgId: string) =>
    `${baseURL}/organizations/${orgId}/invitations/`,
  orgInvitation: (orgId: string, id: string) =>
    `${baseURL}/organizations/${orgId}/invitations/${id}/`,
  orgInvitationAccept: (orgId: string, id: string) =>
    `${baseURL}/organizations/${orgId}/invitations/${id}/accept/`,
  orgInvitationDecline: (orgId: string, id: string) =>
    `${baseURL}/organizations/${orgId}/invitations/${id}/decline/`,
  orgInvitationResend: (orgId: string, id: string) =>
    `${baseURL}/organizations/${orgId}/invitations/${id}/resend/`,
  orgInvitationRevoke: (orgId: string, id: string) =>
    `${baseURL}/organizations/${orgId}/invitations/${id}/revoke/`,
  orgInvitationAcceptByToken: (orgId: string) =>
    `${baseURL}/organizations/${orgId}/invitations/accept-by-token/`,
  orgInvitationDeclineByToken: (orgId: string) =>
    `${baseURL}/organizations/${orgId}/invitations/decline-by-token/`,

  /* --- Memberships --- */
  orgMemberships: (orgId: string) =>
    `${baseURL}/organizations/${orgId}/memberships/`,
  orgMembership: (orgId: string, id: string) =>
    `${baseURL}/organizations/${orgId}/memberships/${id}/`,

  /* --- Resources --- */
  orgResources: (orgId: string) =>
    `${baseURL}/organizations/${orgId}/resources/`,
  orgResource: (orgId: string, id: string) =>
    `${baseURL}/organizations/${orgId}/resources/${id}/`,

  /* --- Roles --- */
  orgRoles: (orgId: string) =>
    `${baseURL}/organizations/${orgId}/roles/`,
  orgRole: (orgId: string, id: string) =>
    `${baseURL}/organizations/${orgId}/roles/${id}/`,

  /* --- Settings --- */
  orgSettings: (orgId: string) =>
    `${baseURL}/organizations/${orgId}/settings/`,
  orgSetting: (orgId: string, id: string) =>
    `${baseURL}/organizations/${orgId}/settings/${id}/`,
};