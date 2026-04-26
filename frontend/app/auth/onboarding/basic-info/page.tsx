"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthInput from "../../components/AuthInput";
import SubmitButton from "../../components/SubmitButton";
import OnboardingService from "@/lib/api/services/Onboarding.Service";
import { useAuth, getOnboardingRoute } from "@/lib/api/auth/authContext";
import { Routes } from "@/lib/api/FrontendRoutes";
import { interpretServerError } from "@/lib/utils";

export default function BasicInfoPage() {
  const router = useRouter();
  const { onboardingToken, partialUser, updatePartialUser, exchangeOnboardingTokenForAuth } = useAuth();

  const [firstName, setFirstName] = useState(partialUser?.first_name || "");
  const [lastName, setLastName] = useState(partialUser?.last_name || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = useMemo(() => {
    return onboardingToken || partialUser?.onboarding_token || "";
  }, [onboardingToken, partialUser?.onboarding_token]);

  useEffect(() => {
    if (!token) {
      router.replace(Routes.login);
      return;
    }

    // Fetch latest user data from backend
    const fetchUserData = async () => {
      try {
        const userData = await OnboardingService.getUserData(token);
        updatePartialUser({
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          username: userData.username,
          profile_picture: userData.profile_picture,
          onboarding_status: userData.onboarding_status,
          onboarding_flow: userData.onboarding_flow,
        });
        // Update form fields with fetched data
        if (userData.first_name) setFirstName(userData.first_name);
        if (userData.last_name) setLastName(userData.last_name);
      } catch (err) {
        // Silently fail - we'll use partialUser data as fallback
        console.error("Failed to fetch user data:", err);
      }
    };

    fetchUserData();
  }, [token, router, updatePartialUser]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      router.replace(Routes.login);
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }

    setLoading(true);
    try {
      const result = await OnboardingService.setBasicInfo({
        onboarding_token: token,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      updatePartialUser({ 
        onboarding_status: result.onboarding_status,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      
      // Check if onboarding is completed and auto-login
      if (result.onboarding_status === "completed") {
        await exchangeOnboardingTokenForAuth(token);
        router.replace(Routes.dashboard);
      } else if (result.onboarding_status) {
        const nextRoute = getOnboardingRoute(result.onboarding_status);
        router.replace(nextRoute);
      }
    } catch (err) {
      const details = interpretServerError(err);
      setError(details[0] || "Could not save your information. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const skip = async () => {
    setLoading(true);
    try {
      const result = await OnboardingService.setBasicInfo({
        onboarding_token: token,
        first_name: partialUser?.first_name || "",
        last_name: partialUser?.last_name || "",
      });
      updatePartialUser({ onboarding_status: result.onboarding_status });
      if (result.onboarding_status) {
        const nextRoute = getOnboardingRoute(result.onboarding_status);
        router.replace(nextRoute);
      }
    } catch (err) {
      const details = interpretServerError(err);
      setError(details[0] || "Could not skip this step. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div className="auth-alert auth-alert--error">{error}</div>}

      <form onSubmit={submit} noValidate>
        <AuthInput
          id="first-name"
          label="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Enter your first name"
          required
          disabled={loading}
        />

        <AuthInput
          id="last-name"
          label="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Enter your last name"
          required
          disabled={loading}
        />

        <div style={{ marginTop: "1.25rem" }}>
          <SubmitButton
            label="Continue"
            loading={loading}
            disabled={loading || !firstName || !lastName}
          />
        </div>
      </form>
    </div>
  );
}
