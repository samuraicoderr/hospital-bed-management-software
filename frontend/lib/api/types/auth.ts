// ─────────────────────────────────────────────
// Onboarding
// ─────────────────────────────────────────────

export const OnboardingStatus = {
  NEEDS_BASIC_INFORMATION: "needs_basic_information",
  NEEDS_PASSWORD: "needs_password",
  NEEDS_EMAIL_VERIFICATION: "needs_email_verification",
  NEEDS_PHONE_VERIFICATION: "needs_phone_verification",
  NEEDS_PROFILE_USERNAME: "needs_profile_username",
  NEEDS_PROFILE_PICTURE: "needs_profile_picture",
  NEEDS_HOSPITAL: "needs_hospital",
  COMPLETED: "completed",
} as const;

export type OnboardingStatusType =
  (typeof OnboardingStatus)[keyof typeof OnboardingStatus];

// ─────────────────────────────────────────────
// OAuth
// ─────────────────────────────────────────────

export const OAuthProviders = {
  GOOGLE: "google",
  GITHUB: "github",
  APPLE: "apple",
  TWITTER: "twitter",
} as const;

export type OAuthProviderType =
  (typeof OAuthProviders)[keyof typeof OAuthProviders];

export type OAuthProvider = OAuthProviderType;

// ─────────────────────────────────────────────
// User
// ─────────────────────────────────────────────

export interface UserType {
  id: string;
  username: string;
  email: string;
  phone_number: string | null;
  first_name: string;
  last_name: string;
  profile_picture: string | null;
  picture_url: string | null;
  is_email_verified: boolean;
  is_phone_number_verified: boolean;
  two_factor_enabled: boolean;
  onboarding_status: OnboardingStatusType;
  onboarding_flow: string[];
  onboarding_token?: string | null;
  // Legacy fields kept for backward compat
  tier?: number;
  is_liveness_check_verified?: boolean;
  is_bvn_verified?: boolean;
  is_staff?: boolean;
}

// ─────────────────────────────────────────────
// Auth Credentials
// ─────────────────────────────────────────────

export interface LoginCredentialsType {
  email: string;
  password: string;
}

export interface RegisterDataType {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
}

// ─────────────────────────────────────────────
// Registration Response
// ─────────────────────────────────────────────

export interface RegisterResponseType {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture: string | null;
  phone_number: string | null;
  onboarding_status: OnboardingStatusType;
  onboarding_flow: string[];
  onboarding_token: string;
  is_email_verified: boolean;
  is_phone_number_verified: boolean;
}

// ─────────────────────────────────────────────
// OAuth
// ─────────────────────────────────────────────

export interface OAuthCodeExchangeRequest {
  code: string;
  redirect_uri?: string;
  state?: string;
  code_verifier?: string;
}

// oauthloginresponse could also be this
// {
//     "mfa_required": true,
//     "mfa_session_token": "8qJNlW5Vm...qd3rC2b9A",
//     "tfa_token": "8qJNlW5Vm...qd3rC2b9A",
//     "available_methods": [
//         "email",
//         "totp"
//     ]
// }
export interface OAuthLoginResponse {
  // There are 3 possible response types the backend may return on successful login.
  // The backend may return JWT tokens directly or an onboarding response
  access?: string;
  refresh?: string;
  access_expiry?: string;
  refresh_expiry?: string;
  // If user needs onboarding
  onboarding_required?: boolean;
  onboarding_token?: string;
  onboarding_status?: OnboardingStatusType;
  onboarding_flow?: string[];
  // For MFA flows
  mfa_required?: boolean;
  mfa_session_token?: string;
  available_mfa_methods?: string[];
  // User info
  user?: UserType;
}

// ─────────────────────────────────────────────
// Onboarding API Types
// ─────────────────────────────────────────────

export interface GetOnboardingTokenRequest {
  email: string;
  password: string;
}

export interface GetOnboardingTokenResponse {
  onboarding_token: string;
}

export interface SetUsernameRequest {
  onboarding_token: string;
  new_username?: string;
}

export interface SetUsernameResponse {
  detail?: string;
  code?: string;
  onboarding_status?: OnboardingStatusType;
  user?: UserType;
}

export interface SetProfilePictureRequest {
  onboarding_token: string;
  profile_picture: File;
}

export interface EmailVerificationRequest {
  email: string;
  otp?: string;
}

export interface EmailVerificationResponse {
  detail: string;
  code: string;
  need_phone_verification?: boolean;
  onboarding_status?: OnboardingStatusType;
  user?: UserType;
}

export interface SetBasicInfoRequest {
  onboarding_token: string;
  first_name?: string;
  last_name?: string;
  password?: string;
}

export interface SetBasicInfoResponse {
  detail?: string;
  code?: string;
  onboarding_status?: OnboardingStatusType;
  user?: UserType;
}

export interface SetPasswordRequest {
  onboarding_token: string;
  password: string;
}

export interface SetPasswordResponse {
  detail?: string;
  code?: string;
  onboarding_status?: OnboardingStatusType;
  user?: UserType;
}

export interface ExchangeOnboardingTokensRequest {
  onboarding_token: string;
}

export interface ExchangeOnboardingTokensResponse {
  access: string;
  refresh: string;
  access_expiry?: string;
  refresh_expiry?: string;
  user?: UserType;
}

export interface CheckUsernameResponse {
  available: boolean;
  message?: string;
}

export interface CreateHospitalRequest {
  onboarding_token: string;
  invitation_token?: string;
  name?: string;
  code?: string;
  hospital_type?: string;
  license_number?: string;
  tax_id?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string;
  total_beds?: number;
  icu_beds?: number;
  emergency_beds?: number;
  cleaning_sla_minutes?: number;
  auto_assign_cleaning?: boolean;
  require_discharge_approval?: boolean;
  organization_id?: string | null;
}

export interface CreateHospitalResponse {
  detail?: string;
  code?: string;
  onboarding_status?: OnboardingStatusType;
  user?: UserType;
}

/* -------------------- TYPE GUARDS -------------------- */

export function isAuthTokens(
  response: OAuthLoginResponse
): response is OAuthLoginResponse & Required<Pick<OAuthLoginResponse, "access" | "refresh">> {
  return !!response.access && !!response.refresh;
}

export function isMFARequired(
  response: OAuthLoginResponse
): response is OAuthLoginResponse & Required<Pick<OAuthLoginResponse, "mfa_required" | "mfa_session_token">> {
  return !!response.mfa_required && !!response.mfa_session_token;
}

export function isOnboardingRequired(
  response: OAuthLoginResponse
): response is OAuthLoginResponse & Required<
  Pick<OAuthLoginResponse, "onboarding_token" | "onboarding_status">
> {
  return (
    response.onboarding_required === true &&
    typeof response.onboarding_token === "string" &&
    response.onboarding_token.length > 0 &&
    typeof response.onboarding_status === "string"
  );
}
