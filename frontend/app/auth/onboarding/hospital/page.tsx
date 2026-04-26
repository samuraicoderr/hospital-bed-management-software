"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthInput from "../../components/AuthInput";
import SubmitButton from "../../components/SubmitButton";
import OnboardingService from "@/lib/api/services/Onboarding.Service";
import { useAuth, getOnboardingRoute } from "@/lib/api/auth/authContext";
import { Routes } from "@/lib/api/FrontendRoutes";
import { interpretServerError } from "@/lib/utils";

const HOSPITAL_CODE_RE = /^[A-Z0-9_]+$/;

type Mode = "create" | "join";

function generateHospitalCode(name: string): string {
  const normalized = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return normalized || "HOSPITAL";
}

export default function HospitalPage() {
  const router = useRouter();
  const { onboardingToken, partialUser, updatePartialUser, exchangeOnboardingTokenForAuth } = useAuth();
  const [mode, setMode] = useState<Mode>("create");
  const [invitationToken, setInvitationToken] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [hospitalType, setHospitalType] = useState("general");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [taxId, setTaxId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const token = useMemo(() => onboardingToken || partialUser?.onboarding_token || "", [onboardingToken, partialUser?.onboarding_token]);

  useEffect(() => {
    if (!token) {
      router.replace(Routes.login);
    }
  }, [token, router]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      router.replace(Routes.login);
      return;
    }

    if (mode === "join") {
      if (!invitationToken.trim()) {
        setError("Enter your invitation token.");
        return;
      }

      setLoading(true);
      try {
        const result = await OnboardingService.createOrJoinFirstHospital({
          onboarding_token: token,
          invitation_token: invitationToken.trim(),
        });
        updatePartialUser({ onboarding_status: result.onboarding_status });
        router.replace(Routes.onboardingComplete);
      } catch (err) {
        const details = interpretServerError(err);
        setError(details[0] || "Could not join hospital.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!name.trim()) {
      setError("Hospital name is required.");
      return;
    }
    if (code.trim() && !HOSPITAL_CODE_RE.test(code)) {
      setError("Hospital code must contain only uppercase letters, numbers, and underscores.");
      return;
    }
    if (email.trim() && !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setFieldErrors({});
    setError(null);
    try {
      const result = await OnboardingService.createOrJoinFirstHospital({
        onboarding_token: token,
        name: name.trim(),
        code: code.trim() ? code.trim().toUpperCase() : undefined,
        hospital_type: hospitalType,
        license_number: licenseNumber.trim() || undefined,
        tax_id: taxId.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        postal_code: postalCode.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      updatePartialUser({ onboarding_status: result.onboarding_status });
      
      // Check if onboarding is completed and auto-login
      if (result.onboarding_status === "completed") {
        await exchangeOnboardingTokenForAuth(token);
        router.replace(Routes.dashboard);
      } else if (result.onboarding_status) {
        const nextRoute = getOnboardingRoute(result.onboarding_status);
        router.replace(nextRoute);
      }
    } catch (err: any) {
      // Check for field-specific errors
      if (err?.response?.data) {
        const errorData = err.response.data;
        const newFieldErrors: Record<string, string> = {};
        
        // Handle errors in format { "field": ["error message"] }
        for (const [field, messages] of Object.entries(errorData)) {
          if (Array.isArray(messages) && messages.length > 0) {
            newFieldErrors[field] = messages[0];
          } else if (typeof messages === 'string') {
            newFieldErrors[field] = messages;
          }
        }
        
        if (Object.keys(newFieldErrors).length > 0) {
          setFieldErrors(newFieldErrors);
          setError("Please fix the errors below.");
        } else {
          const details = interpretServerError(err);
          setError(details[0] || "Could not create hospital.");
        }
      } else {
        const details = interpretServerError(err);
        setError(details[0] || "Could not create hospital.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div className="auth-alert auth-alert--error">{error}</div>}
      <div className="flex gap-1 mb-6">
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`flex-1 px-4 py-2 rounded-t-lg font-medium transition-all ${
            mode === "create"
              ? "bg-white text-primary border-b-0 shadow-sm"
              : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-b border-slate-200"
          }`}
          disabled={loading}
        >
          Create Hospital
        </button>
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`flex-1 px-4 py-2 rounded-t-lg font-medium transition-all ${
            mode === "join"
              ? "bg-white text-primary border-b-0 shadow-sm"
              : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-b border-slate-200"
          }`}
          disabled={loading}
        >
          Join with Invite
        </button>
      </div>

      <form onSubmit={submit} noValidate>
        {mode === "join" ? (
          <>
            <h3 className="auth-subheading" style={{ marginBottom: "1rem", textAlign: "center" }}>
              Join Existing Hospital
            </h3>
            <AuthInput
              id="invitation-token"
              label="Invitation token"
              value={invitationToken}
              onChange={(e) => setInvitationToken(e.target.value)}
              placeholder="Paste invitation token"
              required
              disabled={loading}
            />
            <div style={{ marginTop: "1.25rem" }}>
              <SubmitButton label="Join Hospital" loading={loading} disabled={loading} />
            </div>
          </>
        ) : (
          <>
            <h3 className="auth-subheading" style={{ marginBottom: "1rem", textAlign: "center" }}>
              Hospital Information
            </h3>

            <AuthInput
              id="hospital-name"
              label="Hospital name"
              value={name}
              onChange={(e) => {
                const nextName = e.target.value;
                setName(nextName);
                if (!codeTouched) {
                  setCode(generateHospitalCode(nextName));
                }
              }}
              placeholder="Enter hospital name"
              required
              disabled={loading}
              error={fieldErrors.name}
            />
            <AuthInput
              id="hospital-code"
              label="Hospital code (optional)"
              value={code}
              onChange={(e) => {
                setCodeTouched(true);
                setCode(e.target.value.toUpperCase());
              }}
              placeholder="Auto-generated from hospital name"
              disabled={loading}
              error={fieldErrors.code}
            />

            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="hospital-type" className="auth-label">Hospital type</label>
              <select id="hospital-type" className="auth-input" value={hospitalType} onChange={(e) => setHospitalType(e.target.value)} disabled={loading}>
                <option value="general">General Hospital</option>
                <option value="specialty">Specialty Hospital</option>
                <option value="teaching">Teaching Hospital</option>
                <option value="children">Children&apos;s Hospital</option>
                <option value="psychiatric">Psychiatric Hospital</option>
                <option value="rehabilitation">Rehabilitation Hospital</option>
              </select>
            </div>

            <AuthInput id="address" label="Address (optional)" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" disabled={loading} error={fieldErrors.address} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <AuthInput id="city" label="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" disabled={loading} error={fieldErrors.city} />
              <AuthInput id="state" label="State/Province (optional)" value={state} onChange={(e) => setState(e.target.value)} placeholder="State" disabled={loading} error={fieldErrors.state} />
            </div>
            <AuthInput id="postal-code" label="Postal/ZIP code (optional)" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Postal code" disabled={loading} error={fieldErrors.postal_code} />
            <AuthInput id="phone" label="Phone number (optional)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" disabled={loading} error={fieldErrors.phone} />
            <AuthInput id="email" label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hospital@example.com" disabled={loading} error={fieldErrors.email} />
            <div style={{ marginTop: "1.25rem" }}>
              <SubmitButton label="Create Hospital" loading={loading} disabled={loading} />
            </div>
          </>
        )}
      </form>
    </div>
  );
}
