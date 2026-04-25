"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import OnboardingProgress from "../components/OnboardingProgress";
import { useAuth } from "@/lib/api/auth/authContext";
import { Routes } from "@/lib/api/FrontendRoutes";
import { OnboardingStatus } from "@/lib/api/types/auth";
import appConfig from "@/lib/appconfig";

type StepMeta = {
  route: string;
  statusKey: string;
  title: string;
  subtitle: string;
};

const STEP_CONFIG: StepMeta[] = [
  {
    route: Routes.onboardingBasicInfo,
    statusKey: "needs_basic_information",
    title: "Tell us about yourself",
    subtitle: "We just need a few basic details to get started.",
  },
  {
    route: Routes.onboardingVerifyEmail,
    statusKey: "needs_email_verification",
    title: "Verify your email",
    subtitle: "Enter the 6-digit code we sent to your inbox.",
  },
  {
    route: Routes.onboardingUsername,
    statusKey: "needs_profile_username",
    title: "Choose a username",
    subtitle: "This is how other people will find you.",
  },
  {
    route: Routes.onboardingProfilePicture,
    statusKey: "needs_profile_picture",
    title: "Add a profile picture",
    subtitle: "A photo helps your profile feel more personal.",
  },
  {
    route: Routes.onboardingComplete,
    statusKey: "completed",
    title: "You’re all set",
    subtitle: `Welcome to ${appConfig.appName}.`,
  },
];

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { onboardingToken, user, partialUser, isLoading } = useAuth();
  const hasRedirected = useRef(false);

  /**
   * Determine active step from backend status
   */
  const activeStepIndex = useMemo(() => {
    if (!partialUser?.onboarding_status) return 0;

    const index = STEP_CONFIG.findIndex(
      (step) => step.statusKey === partialUser.onboarding_status
    );

    return index >= 0 ? index : 0;
  }, [partialUser]);

  const totalSteps = STEP_CONFIG.length;
  const activeStep = STEP_CONFIG[activeStepIndex];

  /**
   * Smart Redirect & Guard
   */
  useEffect(() => {
    if (isLoading || hasRedirected.current) return;

    const hasIdentity = Boolean(
      onboardingToken ||
        partialUser?.onboarding_token ||
        partialUser?.email ||
        user?.email
    );

    if (!hasIdentity) {
      hasRedirected.current = true;
      router.replace(Routes.login);
      return;
    }

    // Fully completed → go home
    if (user?.onboarding_status === OnboardingStatus.COMPLETED) {
      hasRedirected.current = true;
      router.replace(Routes.home);
      return;
    }

    // Enforce correct step
    if (activeStep && pathname !== activeStep.route) {
      hasRedirected.current = true;
      router.replace(activeStep.route);
    }
  }, [
    isLoading,
    onboardingToken,
    partialUser,
    user,
    pathname,
    activeStep,
    router,
  ]);

  /**
   * Loading State (Prevents Flicker)
   */
  if (isLoading || !partialUser ) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">
          <img src={appConfig.logos.grey} alt={appConfig.appName} className="h-30 mx-auto mb-4" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="max-w-xl mx-auto px-4 py-10"
      aria-live="polite"
    >
      <OnboardingProgress
        currentStep={activeStepIndex}
        totalSteps={totalSteps}
      />

      <header className="mt-8 mb-6">
        <h1 className="text-2xl font-semibold">
          {activeStep.title}
        </h1>
        <p className="text-muted-foreground mt-2">
          {activeStep.subtitle}
        </p>
      </header>

      <main>{children}</main>
    </div>
  );
}