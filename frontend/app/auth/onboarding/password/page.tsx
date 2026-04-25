"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthInput from "../../components/AuthInput";
import SubmitButton from "../../components/SubmitButton";
import OnboardingService from "@/lib/api/services/Onboarding.Service";
import { useAuth } from "@/lib/api/auth/authContext";
import { Routes } from "@/lib/api/FrontendRoutes";
import { interpretServerError } from "@/lib/utils";

export default function PasswordPage() {
  const router = useRouter();
  const { onboardingToken, partialUser, updatePartialUser } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await OnboardingService.setPassword({
        onboarding_token: token,
        password,
      });
      updatePartialUser({ onboarding_status: result.onboarding_status });
      router.replace(Routes.onboardingVerifyEmail);
    } catch (err) {
      const details = interpretServerError(err);
      setError(details[0] || "Could not set password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  return (
    <div>
      {error && <div className="auth-alert auth-alert--error">{error}</div>}

      <form onSubmit={submit} noValidate>
        <AuthInput
          id="password"
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          required
          disabled={loading}
          autoComplete="new-password"
          rightElement={
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="auth-input-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={loading}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          }
        />

        <AuthInput
          id="confirm-password"
          label="Confirm password"
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          required
          disabled={loading}
          autoComplete="new-password"
          rightElement={
            <button
              type="button"
              onClick={toggleConfirmPasswordVisibility}
              className="auth-input-toggle"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              disabled={loading}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          }
        />

        <div style={{ marginTop: "1.25rem" }}>
          <SubmitButton
            label="Continue"
            loading={loading}
            disabled={loading || !password || !confirmPassword}
          />
        </div>
      </form>
    </div>
  );
}
