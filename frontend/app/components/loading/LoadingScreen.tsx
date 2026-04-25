"use client";

import React, { useState, useEffect } from "react";
import appConfig from "@/lib/appconfig";

interface LoadingScreenProps {
  /** Minimum display duration in ms (default 1200) */
  minDuration?: number;
}

export default function LoadingScreen({ minDuration = 1200 }: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFading(true);
      setTimeout(() => setIsVisible(false), 400);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration]);

  if (!isVisible) return null;

  return (
    <>
      {/* Inject keyframes directly so they always work */}
      <style jsx global>{`
        @keyframes loading-bar {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 60%;
            margin-left: 20%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }

        @keyframes logo-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.7;
          }
        }

        @keyframes fade-out {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        .loading-bar-animate {
          animation: loading-bar 1.4s ease-in-out infinite;
        }

        .logo-pulse-animate {
          animation: logo-pulse 1.8s ease-in-out infinite;
        }

        .fade-out-animate {
          animation: fade-out 0.4s ease-out forwards;
        }
      `}</style>

      <div
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white ${
          isFading ? "fade-out-animate" : ""
        }`}
      >
        {/* Subtle radial gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#E1F5EE_0%,#ffffff_70%)] opacity-60" />

        {/* Logo with pulse animation */}
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="logo-pulse-animate">
            <img
              src={appConfig.logos.green}
              alt={appConfig.appName}
              className="w-20 h-20 object-contain"
            />
          </div>

          {/* Loading bar */}
          <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#0F6E56] rounded-full loading-bar-animate" />
          </div>

          {/* Tagline */}
          <p className="text-sm text-gray-400 font-medium tracking-wide">
            Loading hospital data...
          </p>
        </div>
      </div>
    </>
  );
}