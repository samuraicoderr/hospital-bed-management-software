"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SubmitButton from "../../components/SubmitButton";
import { CheckCircleIcon } from "../../components/AuthComponents";
import { useAuth } from "@/lib/api/auth/authContext";
import { Routes } from "@/lib/api/FrontendRoutes";
import { interpretServerError } from "@/lib/utils";

export default function CompletePage() {
  const router = useRouter();
  const { onboardingToken, exchangeOnboardingTokenForAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const completeOnboarding = async () => {
      if (!onboardingToken) {
        // No onboarding token, redirect to login
        router.replace(Routes.login);
        return;
      }

      try {
        await exchangeOnboardingTokenForAuth(onboardingToken);
        // Successfully exchanged tokens and logged in, redirect to home
        router.replace(Routes.home);
      } catch (err) {
        const details = interpretServerError(err);
        setError(details[0] || "Failed to complete onboarding. Please try logging in manually.");
        setLoading(false);
      }
    };

    completeOnboarding();
  }, [onboardingToken, exchangeOnboardingTokenForAuth, router]);

  const goHome = () => {
    router.replace(Routes.home);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div className="auth-confetti" aria-hidden="true" />
        <div className="auth-success-icon">
          <CheckCircleIcon />
        </div>
        <h2 className="auth-heading" style={{ marginBottom: "0.75rem" }}>
          Welcome to Bedflow!
        </h2>
        <p className="auth-subheading" style={{ marginBottom: "1.5rem" }}>
          Setting up your account...
        </p>
        <SubmitButton label="Loading..." disabled loading />
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div className="auth-confetti" aria-hidden="true" />
      <div className="auth-success-icon">
        <CheckCircleIcon />
      </div>
      <h2 className="auth-heading" style={{ marginBottom: "0.75rem" }}>
        Welcome to Bedflow!
      </h2>
      <p className="auth-subheading" style={{ marginBottom: "1.5rem" }}>
        Your account is ready. Let&apos;s get started.
      </p>
      {error && <div className="auth-alert auth-alert--error">{error}</div>}
      <SubmitButton label="Get Started" type="button" onClick={goHome} />
    </div>
  );
}
