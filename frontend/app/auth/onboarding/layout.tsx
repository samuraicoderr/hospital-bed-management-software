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

// Static mapping of all possible onboarding steps to their metadata
const STEP_METADATA: Record<string, StepMeta> = {
  needs_basic_information: {
    route: Routes.onboardingBasicInfo,
    statusKey: "needs_basic_information",
    title: "Tell us about yourself",
    subtitle: "We just need a few basic details to get started.",
  },
  needs_password: {
    route: Routes.onboardingPassword,
    statusKey: "needs_password",
    title: "Create a password",
    subtitle: "Choose a secure password for your account.",
  },
  needs_email_verification: {
    route: Routes.onboardingVerifyEmail,
    statusKey: "needs_email_verification",
    title: "Verify your email",
    subtitle: "Enter the 6-digit code we sent to your inbox.",
  },
  needs_phone_verification: {
    route: Routes.onboardingUsername,
    statusKey: "needs_phone_verification",
    title: "Verify your phone",
    subtitle: "Enter the code we sent to your phone.",
  },
  needs_profile_username: {
    route: Routes.onboardingUsername,
    statusKey: "needs_profile_username",
    title: "Choose a username",
    subtitle: "This is how other people will find you.",
  },
  needs_profile_picture: {
    route: Routes.onboardingProfilePicture,
    statusKey: "needs_profile_picture",
    title: "Add a profile picture",
    subtitle: "A photo helps your profile feel more personal.",
  },
  needs_hospital: {
    route: Routes.onboardingHospital,
    statusKey: "needs_hospital",
    title: "Set up your hospital",
    subtitle: "Configure your hospital information to get started.",
  },
  completed: {
    route: Routes.onboardingComplete,
    statusKey: "completed",
    title: "You're all set",
    subtitle: `Welcome to ${appConfig.appName}.`,
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
  const hasRedirected = useRef(false);

  /**
   * Build dynamic step config from backend's onboarding_flow
   */
  const stepConfig = useMemo(() => {
    const flow = partialUser?.onboarding_flow || [];
    // Filter flow to only include steps we have metadata for
    const validSteps = flow.filter((status) => STEP_METADATA[status]);
    // Map status keys to step metadata
    return validSteps.map((status) => STEP_METADATA[status]);
  }, [partialUser?.onboarding_flow]);

  /**
   * Determine active step from backend status
   */
  const activeStepIndex = useMemo(() => {
    if (!partialUser?.onboarding_status) return 0;

    const index = stepConfig.findIndex(
      (step) => step.statusKey === partialUser.onboarding_status
    );

    return index >= 0 ? index : 0;
  }, [partialUser, stepConfig]);

  const totalSteps = stepConfig.length;
  const activeStep = stepConfig[activeStepIndex];

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

    // Check if current pathname is a valid step in the flow
    const isValidStep = stepConfig.some((step) => step.route === pathname);

    // Only redirect if pathname is not a valid step in the flow
    if (!isValidStep && activeStep) {
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
    stepConfig,
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

  /**
   * Handle navigation to a specific step
   */
  const handleStepClick = (stepIndex: number) => {
    // Only allow navigation to previous steps or current step
    if (stepIndex <= activeStepIndex) {
      const targetStep = stepConfig[stepIndex];
      if (targetStep) {
        router.replace(targetStep.route);
      }
    }
  };

  return (
    <div
      className="max-w-xl mx-auto px-4 py-10"
      aria-live="polite"
    >
      <OnboardingProgress
        currentStep={activeStepIndex}
        totalSteps={totalSteps}
        steps={stepConfig}
        onStepClick={handleStepClick}
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