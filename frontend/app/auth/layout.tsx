import type { Metadata } from "next";
import Link from "next/link";
import appConfig from "@/lib/appconfig";
import "./auth.css";

export const metadata: Metadata = {
  title: "Bedflow — Sign In",
  description:
    "Sign in or create your Bedflow account to manage your financial plans.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout">
      {/* Branding panel — visible on desktop only */}
      <div className="auth-branding-panel">
        <div className="auth-branding-content">
          <Link href="/" className="auth-logo-link cursor-pointer">
            <div className="auth-logo">
              <img
                src={appConfig.logos.white_svg}
                alt={appConfig.appName}
                className="auth-logo-icon"
              />
              <span className="auth-logo-text-nofontfamily logo-text-font">
                {appConfig.appName}
              </span>
            </div>
          </Link>
          <h1 className="auth-branding-title">
            Smarter bed flow.
            <br />
            Better care.
          </h1>
          <p className="auth-branding-subtitle">
            Optimize capacity, reduce wait times, and improve hospital performance.
          </p>
          <div className="auth-branding-decoration">
            <div className="auth-branding-orb auth-branding-orb-1" />
            <div className="auth-branding-orb auth-branding-orb-2" />
            <div className="auth-branding-orb auth-branding-orb-3" />
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          {/* Mobile logo — hidden on desktop */}
          <Link href="/" className="auth-mobile-logo-link cursor-pointer">
            <div className="auth-mobile-logo">
              <img
                src={appConfig.logos.green_svg}
                alt={appConfig.appName}
                className="auth-mobile-logo-icon"
              />
              <span className="auth-mobile-logo-text logo-text-font">
                {appConfig.appName}
              </span>
            </div>
          </Link>

          <div className="auth-fade-in">{children}</div>
        </div>
      </div>
    </div>
  );
}
