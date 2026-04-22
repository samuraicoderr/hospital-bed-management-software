"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SubmitButton from "../../components/SubmitButton";
import { UploadIcon } from "../../components/AuthComponents";
import OnboardingService from "@/lib/api/services/Onboarding.Service";
import { useAuth } from "@/lib/api/auth/authContext";
import { Routes } from "@/lib/api/FrontendRoutes";
import { interpretServerError } from "@/lib/utils";

export default function ProfilePicturePage() {
  const router = useRouter();
  const { onboardingToken, partialUser, updatePartialUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = useMemo(() => {
    return onboardingToken || partialUser?.onboarding_token || "";
  }, [onboardingToken, partialUser?.onboarding_token]);

  const onFile = (nextFile: File | null) => {
    if (!nextFile) return;
    if (!nextFile.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    setError(null);
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    onFile(e.dataTransfer.files[0] || null);
  };

  const submit = async () => {
    if (!token || !file) {
      setError("Please select an image first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await OnboardingService.setProfilePicture(token, file);
      updatePartialUser({
        onboarding_status: result.onboarding_status,
      });
      router.replace(Routes.onboardingComplete);
    } catch (err) {
      const details = interpretServerError(err);
      setError(details[0] || "Could not upload profile picture.");
    } finally {
      setLoading(false);
    }
  };

  const skip = () => {
    router.replace(Routes.onboardingComplete);
  };

  return (
    <div>
      {error && <div className="auth-alert auth-alert--error">{error}</div>}

      <div
        className={`auth-upload-area ${dragActive ? "auth-upload-area--active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        {preview ? (
          <img className="auth-avatar-preview" src={preview} alt="Profile preview" />
        ) : (
          <UploadIcon />
        )}

        <div className="auth-upload-text">
          <div>
            <strong>Click to upload</strong> or drag and drop
          </div>
          <div>PNG, JPG, WEBP up to 5MB</div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />
      </div>

      <SubmitButton
        label="Save and continue"
        loading={loading}
        disabled={loading || !file}
        onClick={submit}
        type="button"
      />

      <div style={{ marginTop: "0.75rem" }}>
        <SubmitButton
          label="Skip for now"
          variant="outline"
          onClick={skip}
          type="button"
          disabled={loading}
        />
      </div>
    </div>
  );
}
