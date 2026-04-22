"use client";

import React from "react";

interface SubmitButtonProps {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "outline";
}

export default function SubmitButton({
  label,
  loading,
  disabled,
  onClick,
  type = "submit",
  variant = "primary",
}: SubmitButtonProps) {
  const className =
    variant === "primary"
      ? "auth-btn-primary"
      : variant === "secondary"
        ? "auth-btn-secondary"
        : "auth-btn-outline";

  return (
    <button
      type={type}
      className={className}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && (
        <div
          className={`auth-spinner ${variant !== "primary" ? "auth-spinner--dark" : ""}`}
        />
      )}
      {label}
    </button>
  );
}
