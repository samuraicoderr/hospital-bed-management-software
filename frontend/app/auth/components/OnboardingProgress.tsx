import React from "react";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export default function OnboardingProgress({
  currentStep,
  totalSteps,
}: OnboardingProgressProps) {
  return (
    <div
      className="onboarding-progress"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
    >
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`onboarding-step ${
            i < currentStep
              ? "onboarding-step--completed"
              : i === currentStep
                ? "onboarding-step--active"
                : ""
          }`}
        />
      ))}
    </div>
  );
}
