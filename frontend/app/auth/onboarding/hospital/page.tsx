"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthInput from "../../components/AuthInput";
import SubmitButton from "../../components/SubmitButton";
import OnboardingService from "@/lib/api/services/Onboarding.Service";
import { useAuth } from "@/lib/api/auth/authContext";
import { Routes } from "@/lib/api/FrontendRoutes";
import { interpretServerError } from "@/lib/utils";

const HOSPITAL_CODE_RE = /^[A-Z0-9_]+$/;

export default function HospitalPage() {
  const router = useRouter();
  const { onboardingToken, partialUser, updatePartialUser } = useAuth();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [hospitalType, setHospitalType] = useState("general");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  
  // Optional fields
  const [licenseNumber, setLicenseNumber] = useState("");
  const [taxId, setTaxId] = useState("");
  const [website, setWebsite] = useState("");
  const [totalBeds, setTotalBeds] = useState("0");
  const [icuBeds, setIcuBeds] = useState("0");
  const [emergencyBeds, setEmergencyBeds] = useState("0");

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

    // Validate required fields
    if (!name.trim() || !code.trim() || !address.trim() || 
        !city.trim() || !state.trim() || !postalCode.trim() || 
        !phone.trim() || !email.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!HOSPITAL_CODE_RE.test(code)) {
      setError("Hospital code must contain only uppercase letters, numbers, and underscores.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const result = await OnboardingService.createOrJoinFirstHospital({
        onboarding_token: token,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        hospital_type: hospitalType,
        license_number: licenseNumber.trim() || undefined,
        tax_id: taxId.trim() || undefined,
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        postal_code: postalCode.trim(),
        phone: phone.trim(),
        email: email.trim(),
        website: website.trim() || undefined,
        total_beds: parseInt(totalBeds, 10) || 0,
        icu_beds: parseInt(icuBeds, 10) || 0,
        emergency_beds: parseInt(emergencyBeds, 10) || 0,
      });
      updatePartialUser({ onboarding_status: result.onboarding_status });
      router.replace(Routes.onboardingComplete);
    } catch (err) {
      const details = interpretServerError(err);
      setError(details[0] || "Could not create hospital. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div className="auth-alert auth-alert--error">{error}</div>}

      <form onSubmit={submit} noValidate>
        <h3 className="auth-subheading" style={{ marginBottom: "1rem", textAlign: "center" }}>
          Hospital Information
        </h3>

        <AuthInput
          id="hospital-name"
          label="Hospital name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter hospital name"
          required
          disabled={loading}
        />

        <AuthInput
          id="hospital-code"
          label="Hospital code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="HOSPITAL_CODE"
          required
          disabled={loading}
        />

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="hospital-type" className="auth-label">
            Hospital type
          </label>
          <select
            id="hospital-type"
            className="auth-input"
            value={hospitalType}
            onChange={(e) => setHospitalType(e.target.value)}
            disabled={loading}
          >
            <option value="general">General Hospital</option>
            <option value="specialty">Specialty Hospital</option>
            <option value="teaching">Teaching Hospital</option>
            <option value="children">Children's Hospital</option>
            <option value="psychiatric">Psychiatric Hospital</option>
            <option value="rehabilitation">Rehabilitation Hospital</option>
          </select>
        </div>

        <AuthInput
          id="address"
          label="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street address"
          required
          disabled={loading}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <AuthInput
            id="city"
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            required
            disabled={loading}
          />

          <AuthInput
            id="state"
            label="State/Province"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="State"
            required
            disabled={loading}
          />
        </div>

        <AuthInput
          id="postal-code"
          label="Postal/ZIP code"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="Postal code"
          required
          disabled={loading}
        />

        <AuthInput
          id="phone"
          label="Phone number"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (555) 000-0000"
          required
          disabled={loading}
        />

        <AuthInput
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="hospital@example.com"
          required
          disabled={loading}
        />

        <AuthInput
          id="website"
          label="Website (optional)"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://hospital.com"
          disabled={loading}
        />

        <h3 className="auth-subheading" style={{ marginBottom: "1rem", marginTop: "1.5rem", textAlign: "center" }}>
          Capacity (optional)
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
          <AuthInput
            id="total-beds"
            label="Total beds"
            type="number"
            value={totalBeds}
            onChange={(e) => setTotalBeds(e.target.value)}
            placeholder="0"
            min="0"
            disabled={loading}
          />

          <AuthInput
            id="icu-beds"
            label="ICU beds"
            type="number"
            value={icuBeds}
            onChange={(e) => setIcuBeds(e.target.value)}
            placeholder="0"
            min="0"
            disabled={loading}
          />

          <AuthInput
            id="emergency-beds"
            label="Emergency beds"
            type="number"
            value={emergencyBeds}
            onChange={(e) => setEmergencyBeds(e.target.value)}
            placeholder="0"
            min="0"
            disabled={loading}
          />
        </div>

        <div style={{ marginTop: "1.25rem" }}>
          <SubmitButton
            label="Create Hospital"
            loading={loading}
            disabled={loading}
          />
        </div>
      </form>
    </div>
  );
}
