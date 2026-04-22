// These are routes to basically every view in app

// Development Routes
export const Routes = {
  home: "/",
  profile: "/settings",
  organization: "/organization",
  trash: "/trash",

  // Auth
  login: "/auth/login",
  register: "/auth/register",
  loginSecondFactor: "/auth/login/2fa",
  oauthCallback: (provider: string) => `/auth/oauth/callback/${provider}`,
  mfaVerify: "/auth/mfa/verify",

  // Onboarding
  onboarding: "/auth/onboarding",
  onboardingVerifyEmail: "/auth/onboarding/verify-email",
  onboardingUsername: "/auth/onboarding/username",
  onboardingProfilePicture: "/auth/onboarding/profile-picture",
  onboardingComplete: "/auth/onboarding/complete",
};

export const FrontendRoutes = Routes;