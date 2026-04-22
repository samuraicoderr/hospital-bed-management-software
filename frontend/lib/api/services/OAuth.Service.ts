import { apiClient } from "../ApiClient";
import { BackendRoutes } from "../BackendRoutes";
import type {
  OAuthCodeExchangeRequest,
  OAuthLoginResponse,
  OAuthProviderType,
  isAuthTokens,
  isMFARequired,
  isOnboardingRequired,
} from "../types/auth";

/* -------------------- TYPES -------------------- */

export interface OAuthProviderInfo {
  name: string;
  slug: string;
  enabled: boolean;
}

interface RawOAuthLoginResponse {
  access?: string;
  refresh?: string;
  access_token?: string;
  refresh_token?: string;
  access_expiry?: string;
  refresh_expiry?: string;
  onboarding_required?: boolean;
  onboarding_token?: string;
  onboarding_status?: OAuthLoginResponse["onboarding_status"];
  onboarding_flow?: OAuthLoginResponse["onboarding_flow"];
  mfa_required?: boolean;
  mfa_session_token?: string;
  available_mfa_methods?: string[];
  user?: OAuthLoginResponse["user"];
}

/* -------------------- CONFIG -------------------- */

const OAUTH_CLIENT_IDS: Record<string, string | undefined> = {
  google: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  github: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
  apple: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
  twitter: process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID,
};

const OAUTH_REDIRECT_URIS: Record<string, string | undefined> = {
  google: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI,
  github: process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI,
  apple: process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI,
  twitter: process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI,
};

const OAUTH_AUTH_URLS: Record<string, string> = {
  google: "https://accounts.google.com/o/oauth2/v2/auth",
  github: "https://github.com/login/oauth/authorize",
  apple: "https://appleid.apple.com/auth/authorize",
  twitter: "https://twitter.com/i/oauth2/authorize",
};

const OAUTH_SCOPES: Record<string, string> = {
  google: "openid email profile",
  github: "read:user user:email",
  apple: "name email",
  twitter: "users.read tweet.read offline.access",
};

/* -------------------- SERVICE -------------------- */

export class OAuthService {
  private static getJwtExp(token?: string): string | undefined {
    if (!token) return undefined;
    try {
      const [, payload] = token.split(".");
      if (!payload) return undefined;
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = JSON.parse(atob(normalized));
      if (typeof decoded?.exp === "number") {
        return String(decoded.exp);
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private static normalizeOAuthResponse(
    data: RawOAuthLoginResponse
  ): OAuthLoginResponse {
    const access = data.access ?? data.access_token;
    const refresh = data.refresh ?? data.refresh_token;

    return {
      // login tokens
      access,
      refresh,
      access_expiry: data.access_expiry ?? this.getJwtExp(access),
      refresh_expiry: data.refresh_expiry ?? this.getJwtExp(refresh),
      // onboarding tokens
      onboarding_required: data.onboarding_required || false,
      onboarding_token: data.onboarding_token,
      onboarding_status: data.onboarding_status ?? data.user?.onboarding_status,
      onboarding_flow: data.onboarding_flow ?? data.user?.onboarding_flow,
      // MFA tokens
      mfa_required: data.mfa_required || false,
      mfa_session_token: data.mfa_session_token,
      available_mfa_methods: data.available_mfa_methods,
      // user info (unlikely)
      user: data.user,
    };
  }

  static getRedirectUri(
    provider: OAuthProviderType,
    origin?: string
  ): string {
    const configured = OAUTH_REDIRECT_URIS[provider]?.trim();
    if (configured) {
      return configured;
    }

    const resolvedOrigin = origin || window.location.origin;
    return `${resolvedOrigin}/auth/oauth/callback/${provider}`;
  }

  /**
   * Exchange an authorization code for JWT tokens (or an onboarding token
   * if the user is new and needs onboarding).
   */
  static async loginOrRegister(
    provider: OAuthProviderType,
    data: OAuthCodeExchangeRequest
  ): Promise<OAuthLoginResponse> {
    try {
      const res = await apiClient.post<RawOAuthLoginResponse>(
        BackendRoutes.oauthAuthorizeCode(provider),
        data,
        { requiresAuth: false }
      );
      return this.normalizeOAuthResponse(res.data);
    } catch {
      // Compatibility fallback for older backend deployments.
      const fallback = await apiClient.post<RawOAuthLoginResponse>(
        BackendRoutes.oauthLoginOrRegister(provider),
        data,
        { requiresAuth: false }
      );
      return this.normalizeOAuthResponse(fallback.data);
    }
  }

  /** Get the list of available OAuth providers from the backend */
  static async getProviders(): Promise<OAuthProviderInfo[]> {
    const res = await apiClient.get<OAuthProviderInfo[]>(
      BackendRoutes.oauthGetProviders,
      { requiresAuth: false }
    );
    return res.data;
  }

  /**
   * Build the OAuth authorization URL for a given provider.
   * The user is redirected to this URL to begin the OAuth flow.
   */
  static getAuthorizationUrl(
    provider: OAuthProviderType,
    redirectUri?: string
  ): string | null {
    const clientId = OAUTH_CLIENT_IDS[provider];
    if (!clientId) return null;

    const baseAuthUrl = OAUTH_AUTH_URLS[provider];
    if (!baseAuthUrl) return null;

    const finalRedirectUri =
      redirectUri || this.getRedirectUri(provider, window.location.origin);

    // Generate state for CSRF protection
    const state = crypto.randomUUID();
    sessionStorage.setItem(`oauth_state_${provider}`, state);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: finalRedirectUri,
      response_type: "code",
      scope: OAUTH_SCOPES[provider] || "",
      state,
    });

    // Google-specific: request offline access for refresh token
    if (provider === "google") {
      params.set("access_type", "offline");
      params.set("prompt", "consent");
    }

    return `${baseAuthUrl}?${params.toString()}`;
  }

  static getOAuthUrl(
    provider: OAuthProviderType,
    redirectUri?: string
  ): string | null {
    return this.getAuthorizationUrl(provider, redirectUri);
  }

  /**
   * Validate that the returned state matches what we sent,
   * protecting against CSRF.
   */
  static validateState(provider: OAuthProviderType, state: string): boolean {
    const stored = sessionStorage.getItem(`oauth_state_${provider}`);
    sessionStorage.removeItem(`oauth_state_${provider}`);
    return stored === state;
  }

  /** Check if a provider has a client ID configured */
  static isProviderConfigured(provider: OAuthProviderType): boolean {
    return !!OAUTH_CLIENT_IDS[provider];
  }
}

export default OAuthService;
