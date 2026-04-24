"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import OAuthService from "@/lib/api/services/OAuth.Service";
import { authUtils, TokenResponse } from "@/lib/api/auth/TokenManager";
import {
  useAuth,
  useAuthStore,
  getOnboardingRoute,
} from "@/lib/api/auth/authContext";
import { Routes } from "@/lib/api/FrontendRoutes";
import { OAuthProviders, type OAuthProviderType } from "@/lib/api/types/auth";
import { interpretServerError } from "@/lib/utils";
import {
  isMFARequired,
  isAuthTokens,
  isOnboardingRequired,
} from "@/lib/api/types/auth";

function isOAuthProvider(value: string): value is OAuthProviderType {
  return Object.values(OAuthProviders).includes(value as OAuthProviderType);
}

function OAuthCallbackPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ provider: string }>();
  const providerParam = params.provider;
  const { fetchCurrentUser, setOnboardingToken, updatePartialUser } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const provider = useMemo(() => {
    if (!providerParam || !isOAuthProvider(providerParam)) {
      return null;
    }
    return providerParam;
  }, [providerParam]);

  const handleOAuthCallback = useCallback(async () => {
    // Validate provider from URL path
    if (!provider) {
      setError("Unknown or unsupported OAuth provider.");
      setIsLoading(false);
      return;
    }

    // Extract OAuth params from query string
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const oauthError = searchParams.get("error");
    console.log("OAuth callback received with code:", code, "state:", state, "error:", oauthError);

    // Clean OAuth params from URL immediately
    // window.history.replaceState({}, "", window.location.pathname);
    // console.log("cleaned url removed ?... part", window.location.search);

    // Provider returned an error (e.g. user denied access)
    if (oauthError) {
      const description = searchParams.get("error_description") || oauthError;
      setError(description);
      setIsLoading(false);
      return;
    }

    // No authorization code means this isn't a valid callback
    if (!code) {
      setError(
        "No authorization code received from provider. Please try again.",
      );
      setIsLoading(false);
      return;
    }

    // Validate state (CSRF protection)
    if (state && !OAuthService.validateState(provider, state)) {
      setError(
        "OAuth state mismatch — possible CSRF attack. Please try again.",
      );
      setIsLoading(false);
      return;
    }

    try {
      const redirectUri = OAuthService.getRedirectUri(
        provider,
        window.location.origin,
      );

      const response = await OAuthService.loginOrRegister(provider, {
        code,
        state: state || undefined,
        redirect_uri: redirectUri,
      });

      // --- Normal auth (JWT tokens) ---
      if (isAuthTokens(response)) {
        authUtils.initializeAuth({
          access: response.access,
          refresh: response.refresh,
          access_expiry: response.access_expiry || "",
          refresh_expiry: response.refresh_expiry || "",
        });
        await fetchCurrentUser();
        router.replace(Routes.home);
        return;
      }

      // --- Onboarding (new user, incomplete profile) ---
      if (isOnboardingRequired(response)) {
        setOnboardingToken(response.onboarding_token);
        updatePartialUser({
          onboarding_status: response.onboarding_status,
          onboarding_flow: response.onboarding_flow,
          onboarding_token: response.onboarding_token,
        });

        const onboardingRoute = getOnboardingRoute(response.onboarding_status);
        router.replace(onboardingRoute);
        return;
      }

      // --- MFA required ---
      if (isMFARequired(response)) {
        // Store session token so the MFA verification page can use it
        sessionStorage.setItem("mfa_session_token", response.mfa_session_token);
        router.replace(Routes.auth.login);
        return;
      }

      // None of the expected shapes matched
      setError("Unexpected response from server. Please try again.");
    } catch (err: any) {
      const message =
        interpretServerError(err) ||
        err?.response?.data?.details ||
        err?.response?.data?.error ||
        "OAuth authentication failed. Please try again.";
      setError(String(message));
    } finally {
      sessionStorage.removeItem("oauth_provider");
      setIsLoading(false);
    }
  }, [
    provider,
    searchParams,
    router,
    fetchCurrentUser,
    setOnboardingToken,
    updatePartialUser,
  ]);

  useEffect(() => {
    handleOAuthCallback();
  }, [handleOAuthCallback]);

  // Invalid provider in URL
  if (!provider) {
    return (
      <div>
        <h1 className="auth-heading">Invalid Provider</h1>
        <div className="auth-alert auth-alert--error">
          Unknown OAuth provider: &quot;{providerParam}&quot;
        </div>
        <button
          className="auth-oauth-btn"
          onClick={() => router.replace(Routes.auth.login)}
        >
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="auth-heading">Finishing sign-in</h1>
      <p className="auth-subheading">
        We are connecting your {provider} account.
      </p>
      {error ? (
        <>
          <div className="auth-alert auth-alert--error">{error}</div>
          <button
            className="auth-oauth-btn"
            style={{ marginTop: "1rem" }}
            onClick={() => router.replace(Routes.auth.login)}
          >
            Back to login
          </button>
        </>
      ) : (
        <div className="auth-alert auth-alert--info">
          {isLoading ? "Please wait..." : "Redirecting..."}
        </div>
      )}
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-subheading">Finishing OAuth sign in...</div>
      }
    >
      <OAuthCallbackPageContent />
    </Suspense>
  );
}
