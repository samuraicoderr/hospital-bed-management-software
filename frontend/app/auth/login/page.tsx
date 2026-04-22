"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useMemo, useState } from "react";
import AuthInput from "../components/AuthInput";
import SubmitButton from "../components/SubmitButton";
import AuthDivider from "../components/AuthDivider";
import OAuthButtons from "../components/OAuthButtons";
import { EyeIcon, EyeOffIcon } from "../components/AuthComponents";
import { useAuth, useAuthStore } from "@/lib/api/auth/authContext";
import { Routes } from "@/lib/api/FrontendRoutes";
import { OnboardingStatus } from "@/lib/api/types/auth";
import { interpretServerError } from "@/lib/utils";
import { getSafeNextPath } from "@/lib/api/auth/redirect";

interface FormErrors {
  email?: string;
  password?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, clearError, error } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    return getSafeNextPath(searchParams.get("next"), Routes.home);
  }, [searchParams]);

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!EMAIL_RE.test(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormMessage(null);
    clearError();

    if (!validate()) return;

    try {
      await login({ email: email.trim(), password });

      const currentUser = useAuthStore.getState().user;
      if (
        currentUser &&
        currentUser.onboarding_status === OnboardingStatus.COMPLETED
      ) {
        router.replace(nextPath);
      }
    } catch (err) {
      const serverErrors = interpretServerError(err);
      const fallback = error?.message || "Unable to sign in. Please try again.";
      setFormMessage(serverErrors[0] || fallback);
    }
  };

  return (
    <div>
      <h1 className="auth-heading">Welcome back</h1>
      <p className="auth-subheading">Sign in to continue to your workspace.</p>

      {formMessage && (
        <div className="auth-alert auth-alert--error" role="alert">
          <span>{formMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <AuthInput
          id="login-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          autoComplete="email"
          error={formErrors.email}
          required
          disabled={isLoading}
        />

        <AuthInput
          id="login-password"
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
          error={formErrors.password}
          required
          disabled={isLoading}
          rightElement={
            <button
              type="button"
              className="auth-input-icon"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          }
        />

        <div className="auth-forgot-row">
          <Link className="auth-link" href="/auth/forgot-password">
            Forgot password?
          </Link>
        </div>

        <SubmitButton
          label="Sign In"
          loading={isLoading}
          disabled={isLoading}
          type="submit"
        />
      </form>

      <AuthDivider />
      <div className="auth-oauth-grid">
        <OAuthButtons
          mode="login"
          onError={(message) => setFormMessage(message)}
        />
      </div>

      <p className="auth-footer">
        Don&apos;t have an account? <Link href={Routes.register}>Create one</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-subheading">Loading sign in...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
