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
  const { onboardingToken, partialUser, updatePartialUser } = useAuth();

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
  }, [token, router]);

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
      if (result.onboarding_status) {
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

        <div style={{ marginTop: "1.25rem" }} className="flex gap-3">
          <div className="flex-1">
            <SubmitButton
              label="Continue"
              loading={loading}
              disabled={loading || !firstName || !lastName}
            />
          </div>
          <button
            type="button"
            onClick={skip}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip
          </button>
        </div>
      </form>
    </div>
  );
}
