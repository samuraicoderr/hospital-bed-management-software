import type { Metadata } from "next";
import appConfig from "@/lib/appconfig";
import "./auth.css";

export const metadata: Metadata = {
  title: "Bedflow — Sign In",
  description: "Sign in or create your Bedflow account to manage your financial plans.",
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
          <div className="auth-logo">
            <img
              src={appConfig.logos.white_svg}
              alt={appConfig.appName}
              className="auth-logo-icon"
            />
            <span className="auth-logo-text-nofontfamily logo-text-font">{appConfig.appName}</span>
          </div>
          <h1 className="auth-branding-title">
            Plan smarter.
            <br />
            Grow faster.
          </h1>
          <p className="auth-branding-subtitle">
            Your all-in-one financial planning workspace for founders and teams.
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

          <div className="auth-fade-in">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
