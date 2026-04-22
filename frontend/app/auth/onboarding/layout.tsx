"use client";

import React, { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import OnboardingProgress from "../components/OnboardingProgress";
import { useAuth } from "@/lib/api/auth/authContext";
import { Routes } from "@/lib/api/FrontendRoutes";
import { OnboardingStatus } from "@/lib/api/types/auth";
import appConfig from "@/lib/appconfig";

const STEP_META: Record<string, { title: string; subtitle: string; step: number }> = {
  [Routes.onboardingVerifyEmail]: {
    title: "Verify your email",
    subtitle: "Enter the 6-digit code we sent to your inbox.",
    step: 1,
  },
  [Routes.onboardingUsername]: {
    title: "Choose a username",
    subtitle: "This is how other people will find you.",
    step: 2,
  },
  [Routes.onboardingProfilePicture]: {
    title: "Add a profile picture",
    subtitle: "A photo helps your profile feel more personal.",
    step: 3,
  },
  [Routes.onboardingComplete]: {
    title: "You\u2019re all set",
    subtitle: `Welcome to ${appConfig.appName}.`,
    step: 4,
  },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { onboardingToken, user, partialUser, isLoading } = useAuth();

  const meta = useMemo(() => {
    return (
      STEP_META[pathname] || {
        title: "Complete setup",
        subtitle: "A few final steps before you continue.",
        step: 1,
      }
    );
  }, [pathname]);

  useEffect(() => {
    if (isLoading) return;

    const hasOnboardingIdentity = Boolean(
      onboardingToken || partialUser?.onboarding_token || partialUser?.email || user?.email
    );

    if (!hasOnboardingIdentity) {
      router.replace(Routes.login);
      return;
    }

    if (user?.onboarding_status === OnboardingStatus.COMPLETED) {
      router.replace(Routes.home);
    }
  }, [isLoading, onboardingToken, partialUser, user, router]);

  return (
    <div>
      <OnboardingProgress currentStep={meta.step} totalSteps={4} />
      <h1 className="auth-heading">{meta.title}</h1>
      <p className="auth-subheading">{meta.subtitle}</p>
      {children}
    </div>
  );
}
