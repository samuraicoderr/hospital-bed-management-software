"use client";

import React from "react";
import { useRouter } from "next/navigation";
import SubmitButton from "../../components/SubmitButton";
import { CheckCircleIcon } from "../../components/AuthComponents";
import { useAuth } from "@/lib/api/auth/authContext";
import { Routes } from "@/lib/api/FrontendRoutes";

export default function CompletePage() {
  const router = useRouter();
  const { fetchCurrentUser } = useAuth();

  const goHome = async () => {
    try {
      await fetchCurrentUser();
    } catch {
      // Ignore fetch errors and proceed.
    }
    router.replace(Routes.home);
  };

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
      <SubmitButton label="Get Started" type="button" onClick={goHome} />
    </div>
  );
}
