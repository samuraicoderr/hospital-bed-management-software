"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthInput from "../../components/AuthInput";
import SubmitButton from "../../components/SubmitButton";
import OnboardingService from "@/lib/api/services/Onboarding.Service";
import { useAuth } from "@/lib/api/auth/authContext";
import { Routes } from "@/lib/api/FrontendRoutes";
import { interpretServerError } from "@/lib/utils";

export default function BasicInfoPage() {
  const router = useRouter();
  const { onboardingToken, partialUser, updatePartialUser } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
      updatePartialUser({ onboarding_status: result.onboarding_status });
      router.replace(Routes.onboardingPassword);
    } catch (err) {
      const details = interpretServerError(err);
      setError(details[0] || "Could not save your information. Please try again.");
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
