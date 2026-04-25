"use client";

import React from "react";

interface AuthInputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  autoComplete?: string;
  rightElement?: React.ReactNode;
  required?: boolean;
}

export default function AuthInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  disabled,
  autoComplete,
  rightElement,
  required,
  className,
}: AuthInputProps) {
  return (
    <div className="auth-input-group">
      <label htmlFor={id} className="auth-label">
        {label}
      </label>
      <div className="auth-input-wrapper">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`auth-input ${className || ""} ${error ? "auth-input--error" : ""}`}
          disabled={disabled}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {rightElement}
      </div>
      {error && (
        <p id={`${id}-error`} className="auth-error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
