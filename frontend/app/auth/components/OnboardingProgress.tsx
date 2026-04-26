import React from "react";

interface StepMeta {
  route: string;
  statusKey: string;
  title: string;
  subtitle: string;
}

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  steps?: StepMeta[];
  onStepClick?: (stepIndex: number) => void;
}

export default function OnboardingProgress({
  currentStep,
  totalSteps,
  steps = [],
  onStepClick,
}: OnboardingProgressProps) {
  return (
    <div className="w-full mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500">
          Step {currentStep + 1} of {totalSteps}
        </span>
        <span className="text-xs font-medium text-[#0F6E56]">
          {Math.round(((currentStep + 1) / totalSteps) * 100)}% complete
        </span>
      </div>

      <div
        className="flex items-center gap-2"
        role="progressbar"
        aria-valuenow={currentStep + 1}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
      >
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = steps[i];
          const isCompleted = i < currentStep;
          const isActive = i === currentStep;
          const isClickable = !!onStepClick && i <= currentStep;

          return (
            <React.Fragment key={i}>
              {/* Step Bar */}
              <div className="flex-1 relative group">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStepClick(i)}
                  onKeyDown={(e) => {
                    if (isClickable && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onStepClick?.(i);
                    }
                  }}
                  aria-label={step?.title || `Step ${i + 1}`}
                  className={`
                    relative w-full rounded-full
                    transition-all duration-200 ease-in-out
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56]/40
                    ${
                      isCompleted
                        ? "bg-[#0F6E56]"
                        : isActive
                        ? "bg-[#0F6E56]/70"
                        : "bg-gray-200"
                    }
                    ${
                      isClickable
                        ? "cursor-pointer hover:h-5 hover:-translate-y-0.5 hover:shadow-md"
                        : "cursor-default"
                    }
                    ${isActive ? "shadow-sm" : ""}
                  `}
                  style={{ height: isActive ? "14px" : "10px" }}
                />

                {/* Tooltip */}
                {step && (
                  <div
                    className="
                      absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                      px-3 py-2 bg-gray-900 text-white text-xs rounded-lg
                      opacity-0 group-hover:opacity-100 pointer-events-none
                      transition-opacity duration-150
                      whitespace-nowrap z-20 shadow-lg
                    "
                  >
                    <div className="font-medium">{step.title}</div>
                    <div className="text-gray-300 mt-0.5">
                      {step.subtitle}
                    </div>
                    <div
                      className="
                        absolute top-full left-1/2 -translate-x-1/2
                        border-4 border-transparent border-t-gray-900
                      "
                    />
                  </div>
                )}
              </div>

              {/* Connector */}
              {i < totalSteps - 1 && (
                <div className="flex-1 h-[2px] relative">
                  <div className="absolute inset-0 bg-gray-200 rounded-full" />
                  {i < currentStep && (
                    <div className="absolute inset-0 bg-[#0F6E56] rounded-full transition-all duration-300" />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}