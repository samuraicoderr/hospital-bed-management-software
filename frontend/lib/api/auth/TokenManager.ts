/**
 * Token Management with Zustand
 * Handles JWT token lifecycle with proper state management
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { BackendRoutes } from "../BackendRoutes";
import { AUTH_PRESENCE_COOKIE } from "@/lib/api/auth/redirect";
// Types
export interface TokenResponse {
  access: string;
  refresh: string;
  access_expiry?: string;
  refresh_expiry?: string;
}

export interface FirstFactorTokenResponse {
  tfa_token: string;
}

export interface DecodedToken {
  token_type: string;
  exp: number;
  iat: number;
  jti: string;
  user_id: string;
}

interface TokenState {
  // State
  access: string | null;
  refresh: string | null;
  accessExpiry: number | null;
  refreshExpiry: number | null;
  isRefreshing: boolean;
  failedRefreshAttempts: number;

  // Actions
  setTokens: (tokenResponse: TokenResponse) => void;
  clearTokens: () => void;
  setRefreshing: (isRefreshing: boolean) => void;
  incrementFailedAttempts: () => void;
  resetFailedAttempts: () => void;

  // Getters (computed values)
  isAccessTokenValid: () => boolean;
  isRefreshTokenValid: () => boolean;
  shouldRefreshToken: () => boolean;
  getTimeUntilExpiry: () => number | null;
}

// Configuration
const TOKEN_CONFIG = {
  REFRESH_BUFFER_MS: 5 * 60 * 1000, // 5 minutes
  MAX_REFRESH_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
} as const;

const baseURL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api/v1";

function buildURL(endpoint: string): string {
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;

  // Remove trailing slash from baseURL if present
  const cleanBaseURL = baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;

  return `${cleanBaseURL}/${cleanEndpoint}`;
}

function setAuthPresenceCookie(isAuthenticated: boolean): void {
  if (typeof document === "undefined") {
    return;
  }

  if (!isAuthenticated) {
    document.cookie = `${AUTH_PRESENCE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    return;
  }

  document.cookie = `${AUTH_PRESENCE_COOKIE}=1; Path=/; SameSite=Lax`;
}

// Create Zustand store with persistence
export const useTokenStore = create<TokenState>()(
  persist(
    (set, get) => ({
      // Initial State
      access: null,
      refresh: null,
      accessExpiry: null,
      refreshExpiry: null,
      isRefreshing: false,
      failedRefreshAttempts: 0,

      // Actions
      setTokens: (tokenResponse: TokenResponse) => {
        const accessExpiry = tokenResponse.access_expiry
          ? parseInt(tokenResponse.access_expiry, 10)
          : Math.floor(Date.now() / 1000) + 3600; // Default to 1 hour if not provided
        const refreshExpiry = tokenResponse.refresh_expiry
          ? parseInt(tokenResponse.refresh_expiry, 10)
          : Math.floor(Date.now() / 1000) + 86400; // Default to 24 hours if not provided

        // Validate expiry times
        const now = Math.floor(Date.now() / 1000);
        if (accessExpiry <= now || refreshExpiry <= now) {
          console.error("[TokenStore] Received expired tokens");
          throw new Error("Received expired tokens");
        }

        set({
          access: tokenResponse.access,
          refresh: tokenResponse.refresh,
          accessExpiry,
          refreshExpiry,
          failedRefreshAttempts: 0,
        });

        setAuthPresenceCookie(true);

        console.log("[TokenStore] Tokens set successfully");

        // Schedule automatic refresh
        tokenManager.scheduleTokenRefresh();
      },

      clearTokens: () => {
        set({
          access: null,
          refresh: null,
          accessExpiry: null,
          refreshExpiry: null,
          isRefreshing: false,
          failedRefreshAttempts: 0,
        });

        // Clear scheduled refresh
        tokenManager.clearRefreshTimer();
        setAuthPresenceCookie(false);

        console.log("[TokenStore] Tokens cleared");
      },

      setRefreshing: (isRefreshing: boolean) => {
        set({ isRefreshing });
      },

      incrementFailedAttempts: () => {
        set((state) => ({
          failedRefreshAttempts: state.failedRefreshAttempts + 1,
        }));
      },

      resetFailedAttempts: () => {
        set({ failedRefreshAttempts: 0 });
      },

      // Computed Getters
      isAccessTokenValid: () => {
        const { access, accessExpiry } = get();
        if (!access || !accessExpiry) return false;

        const now = Math.floor(Date.now() / 1000);
        return accessExpiry > now;
      },

      isRefreshTokenValid: () => {
        const { refresh, refreshExpiry } = get();
        if (!refresh || !refreshExpiry) return false;

        const now = Math.floor(Date.now() / 1000);
        return refreshExpiry > now;
      },

      shouldRefreshToken: () => {
        const { accessExpiry } = get();
        if (!accessExpiry) return false;

        const now = Math.floor(Date.now() / 1000);
        const bufferSeconds = Math.floor(TOKEN_CONFIG.REFRESH_BUFFER_MS / 1000);

        return accessExpiry - now <= bufferSeconds;
      },

      getTimeUntilExpiry: () => {
        const { accessExpiry } = get();
        if (!accessExpiry) return null;

        const now = Math.floor(Date.now() / 1000);
        return Math.max(0, accessExpiry - now);
      },
    }),
    {
      name: "auth-token-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        access: state.access,
        refresh: state.refresh,
        accessExpiry: state.accessExpiry,
        refreshExpiry: state.refreshExpiry,
      }),
    }
  )
);

/**
 * Token Manager Class
 * Handles token refresh logic and scheduling
 */
class TokenManager {
  private refreshPromise: Promise<string> | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private onTokenExpiredCallback?: () => void;

  /**
   * Initialize tokens from auth response
   */
  setTokens(tokenResponse: TokenResponse): void {
    useTokenStore.getState().setTokens(tokenResponse);
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string | null> {
    const state = useTokenStore.getState();

    if (!state.access) {
      console.warn("[TokenManager] No access token found");
      return null;
    }

    // Check if token needs refresh
    if (state.shouldRefreshToken()) {
      return await this.refreshAccessToken();
    }

    return state.access;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string> {
    console.log("REFRESHING TOKEN...");
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async performTokenRefresh(): Promise<string> {
    console.log("PERFORMING TOKEN REFRESH...");
    const state = useTokenStore.getState();

    if (state.isRefreshing) {
      throw new Error("Token refresh already in progress");
    }

    state.setRefreshing(true);

    try {
      if (!state.refresh || !state.isRefreshTokenValid()) {
        throw new Error("No valid refresh token available");
      }

      // Call your refresh endpoint
      const response = await fetch(buildURL(BackendRoutes.refreshToken), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh: state.refresh,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      console.log("✅ TOKEN REFERESHED");
      const data: TokenResponse = await response.json();

      // Update tokens in store
      this.setTokens(data);

      console.log("[TokenManager] Token refreshed successfully");
      return data.access;
    } catch (error) {
      console.error("[TokenManager] Token refresh failed:", error);

      state.incrementFailedAttempts();

      // If max retries exceeded or refresh token invalid, trigger logout
      if (
        state.failedRefreshAttempts >= TOKEN_CONFIG.MAX_REFRESH_RETRIES ||
        !state.isRefreshTokenValid()
      ) {
        this.handleTokenExpiration();
        throw new Error("Authentication session expired");
      }

      // Retry after delay
      await this.delay(TOKEN_CONFIG.RETRY_DELAY_MS);
      return this.performTokenRefresh();
    } finally {
      state.setRefreshing(false);
    }
  }

  /**
   * Schedule automatic token refresh
   */
  scheduleTokenRefresh(): void {
    this.clearRefreshTimer();

    const state = useTokenStore.getState();

    if (!state.accessExpiry) return;

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = state.accessExpiry - now;

    // Schedule refresh before token expires (with buffer)
    const refreshIn = Math.max(
      0,
      expiresIn * 1000 - TOKEN_CONFIG.REFRESH_BUFFER_MS
    );

    this.refreshTimer = setTimeout(() => {
      this.refreshAccessToken().catch((error) => {
        console.error("[TokenManager] Scheduled refresh failed:", error);
        this.handleTokenExpiration();
      });
    }, refreshIn);

    console.log(
      `[TokenManager] Token refresh scheduled in ${Math.floor(
        refreshIn / 1000
      )}s`
    );
  }

  /**
   * Clear refresh timer
   */
  clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Clear all tokens and logout
   */
  clearTokens(): void {
    useTokenStore.getState().clearTokens();
  }

  syncAuthPresenceCookie(): void {
    const state = useTokenStore.getState();
    const hasTokens = Boolean(state.access && state.refresh);
    setAuthPresenceCookie(hasTokens);
  }

  /**
   * Set callback for when token expires
   */
  onTokenExpired(callback: () => void): void {
    this.onTokenExpiredCallback = callback;
  }

  /**
   * Handle token expiration
   */
  private handleTokenExpiration(): void {
    console.warn("[TokenManager] Authentication session expired");
    this.clearTokens();

    if (this.onTokenExpiredCallback) {
      this.onTokenExpiredCallback();
    }
  }

  /**
   * Decode JWT token without verification
   */
  decodeToken(token: string): DecodedToken | null {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("[TokenManager] Failed to decode token:", error);
      return null;
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const tokenManager = new TokenManager();

// Export utility functions
export const authUtils = {
  /**
   * Get authorization header for API requests
   */
  async getAuthHeader(): Promise<{ Authorization: string } | Record<string, never>> {
    const token = await tokenManager.getAccessToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return useTokenStore.getState().isAccessTokenValid();
  },

  /**
   * Initialize auth from login response
   */
  initializeAuth(tokenResponse: TokenResponse): void {
    tokenManager.setTokens(tokenResponse);
  },

  /**
   * Logout user
   */
  logout(): void {
    tokenManager.clearTokens();
  },

  /**
   * Get current tokens (for debugging)
   */
  getTokens(): {
    access: string | null;
    refresh: string | null;
    accessExpiry: number | null;
    refreshExpiry: number | null;
  } {
    const state = useTokenStore.getState();
    return {
      access: state.access,
      refresh: state.refresh,
      accessExpiry: state.accessExpiry,
      refreshExpiry: state.refreshExpiry,
    };
  },
};
