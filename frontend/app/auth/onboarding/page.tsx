"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, getOnboardingRoute } from "@/lib/api/auth/authContext";
import { Routes } from "@/lib/api/FrontendRoutes";

export default function OnboardingEntryPage() {
  const router = useRouter();
  const { user, partialUser } = useAuth();

  useEffect(() => {
    if (user?.onboarding_status) {
      router.replace(getOnboardingRoute(user.onboarding_status));
      return;
    }

    if (partialUser?.onboarding_status) {
      router.replace(getOnboardingRoute(partialUser.onboarding_status));
      return;
    }

    router.replace(Routes.onboardingVerifyEmail);
  }, [router, user?.onboarding_status, partialUser?.onboarding_status]);

  return null;
}
