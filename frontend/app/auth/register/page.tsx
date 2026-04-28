"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import AuthInput from "../components/AuthInput";
import SubmitButton from "../components/SubmitButton";
import AuthDivider from "../components/AuthDivider";
import OAuthButtons from "../components/OAuthButtons";
import { EyeIcon, EyeOffIcon } from "../components/AuthComponents";
import { useAuth, getOnboardingRoute } from "@/lib/api/auth/authContext";
import { Routes } from "@/lib/api/FrontendRoutes";
import { interpretServerError } from "@/lib/utils";

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

const STRENGTH_CLASSES: Record<number, string> = {
  0: "",
  1: "auth-password-strength-bar--weak",
  2: "auth-password-strength-bar--fair",
  3: "auth-password-strength-bar--good",
  4: "auth-password-strength-bar--strong",
};

function getStrengthClass(index: number, score: number): string {
  if (index >= score) return "";
  return STRENGTH_CLASSES[score] ?? "";
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, error, clearError, updatePartialUser, setOnboardingToken, isLoading } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const strength = useMemo(() => passwordStrength(password), [password]);

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!firstName.trim()) nextErrors.firstName = "First name is required.";
    if (!lastName.trim()) nextErrors.lastName = "Last name is required.";
    if (!EMAIL_RE.test(email.trim())) nextErrors.email = "Enter a valid email address.";
    if (password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
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
      const response = await register({
        email: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });

      if (response.onboarding_token) {
        setOnboardingToken(response.onboarding_token);
      }

      updatePartialUser({
        onboarding_status: response.onboarding_status,
        onboarding_flow: response.onboarding_flow,
        email: response.email,
        first_name: response.first_name,
        last_name: response.last_name,
        username: response.username,
        profile_picture: response.profile_picture,
      });

      const nextRoute = getOnboardingRoute(response.onboarding_status);
      router.replace(nextRoute);
    } catch (err) {
      const serverErrors = interpretServerError(err);
      const fallback = error?.message || "Unable to create account. Please try again.";
      setFormMessage(serverErrors[0] || fallback);
    }
  };

  return (
    <div>
      <h1 className="auth-heading">Create your account</h1>
      <p className="auth-subheading">Set up your profile in a few quick steps.</p>

      {formMessage && (
        <div className="auth-alert auth-alert--error" role="alert">
          <span>{formMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="auth-name-row">
          <AuthInput
            id="register-first-name"
            label="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Jane"
            autoComplete="given-name"
            error={formErrors.firstName}
            required
            disabled={isLoading}
          />
          <AuthInput
            id="register-last-name"
            label="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            autoComplete="family-name"
            error={formErrors.lastName}
            required
            disabled={isLoading}
          />
        </div>

        <AuthInput
          id="register-email"
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
          id="register-password"
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          autoComplete="new-password"
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

        <div className="auth-password-strength" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`auth-password-strength-bar ${getStrengthClass(i, strength)}`}
            />
          ))}
        </div>

        <AuthInput
          id="register-confirm-password"
          label="Confirm password"
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat your password"
          autoComplete="new-password"
          error={formErrors.confirmPassword}
          required
          disabled={isLoading}
          rightElement={
            <button
              type="button"
              className="auth-input-icon"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          }
        />

        <SubmitButton
          label="Create Account"
          loading={isLoading}
          disabled={isLoading}
          type="submit"
        />
      </form>

      <AuthDivider text="or sign up with" />
      <div className="auth-oauth-grid">
        <OAuthButtons
          mode="register"
          onError={(message) => setFormMessage(message)}
        />
      </div>

      <p className="auth-footer">
        Already have an account? <Link href={Routes.login}>Sign in</Link>
      </p>
    </div>
  );
}
