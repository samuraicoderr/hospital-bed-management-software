"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Camera,
  Check,
  ChevronRight,
  KeyRound,
  Laptop,
  LockKeyhole,
  Mail,
  MessageSquare,
  MonitorCog,
  Moon,
  Palette,
  Plug,
  Shield,
  Smartphone,
  Sun,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import appConfig from "@/lib/appconfig";
import { FrontendRoutes } from "@/lib/api/FrontendRoutes";
import { ProtectedRoute } from "@/lib/api/auth/authContext";

type SettingsTab = "profile" | "security" | "notifications" | "appearance" | "integrations";
type ThemeOption = "light" | "dark" | "system";
type AccountingBasis = "cash" | "accrual";

type NavItem = {
  id: SettingsTab;
  label: string;
  icon: LucideIcon;
  description: string;
};

type IntegrationType = {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  scopes: string[];
};

const navItems: NavItem[] = [
  {
    id: "profile",
    label: "Profile",
    icon: User,
    description: "Personal info & avatar",
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    description: "MFA & recovery",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Alerts & channels",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    description: "Theme & display",
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Plug,
    description: "Connected apps",
  },
];

const jobTitleOptions = [
  "Founder",
  "Co-Founder",
  "CEO",
  "COO",
  "CFO",
  "Head of Operations",
  "Finance Lead",
  "Product Lead",
] as const;

const themeOptions: Array<{
  id: ThemeOption;
  label: string;
  description: string;
  Icon: LucideIcon;
}> = [
  {
    id: "light",
    label: "Light",
    description: "Clean and crisp",
    Icon: Sun,
  },
  {
    id: "dark",
    label: "Dark",
    description: "Easy on the eyes",
    Icon: Moon,
  },
  {
    id: "system",
    label: "System",
    description: "Follows your OS",
    Icon: MonitorCog,
  },
];

const integrationsSeed: IntegrationType[] = [
  {
    id: "slack",
    name: "Slack",
    description: "Get notifications and login with Slack",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/slack/slack-original.svg",
    connected: true,
    scopes: ["notifications", "login"],
  },
  {
    id: "google",
    name: "Google",
    description: "Login with Google and sync calendar",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg",
    connected: true,
    scopes: ["login", "calendar"],
  },
  {
    id: "github",
    name: "GitHub",
    description: "Connect repositories and track issues",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg",
    connected: false,
    scopes: ["repositories", "issues"],
  },
  {
    id: "notion",
    name: "Notion",
    description: "Sync documentation and notes",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/notion/notion-original.svg",
    connected: false,
    scopes: ["pages", "databases"],
  },
];

function SettingsHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/50 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Link href={FrontendRoutes.home}>
              <img
                src={appConfig.logos.green}
                alt={appConfig.appName}
                className="h-7 w-7 object-contain"
              />
            </Link>
            <Link href={FrontendRoutes.home} className="underline-offset-4">
              <span className="logo-text-font hidden text-lg tracking-tight text-gray-900 sm:inline sm:text-xl">
                {appConfig.appName}
              </span>
            </Link>
          </div>
          <span className="font-semibold text-gray-400">/ Settings</span>
        </div>

        <Link
          href={FrontendRoutes.home}
          className="group flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          <ChevronRight className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-1" />
          <span className="hidden sm:inline">Go Back</span>
        </Link>
      </div>
    </header>
  );
}

function ToggleSwitch({
  enabled,
  onChange,
  ariaLabel,
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors duration-300",
        enabled ? "bg-[#0F6E56]" : "bg-gray-200",
      )}
    >
      <span
        className={cn(
          "absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300",
          enabled ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

function CardSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-gray-200 bg-white p-6 shadow-sm", className)}>
      {title ? (
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-900">{title}</h3>
      ) : null}
      {children}
    </section>
  );
}

function TextInput({
  label,
  type = "text",
  defaultValue,
  disabled = false,
}: {
  label: string;
  type?: string;
  defaultValue: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition-all focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20 disabled:cursor-not-allowed"
      />
    </div>
  );
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#fafafa]">
        <SettingsHeader />

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            <nav className="lg:w-72 lg:flex-shrink-0">
              <div className="sticky top-24">
                <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/60 shadow-xl shadow-gray-200/20 backdrop-blur-2xl">
                  <div className="space-y-1 p-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveTab(item.id)}
                          className={cn(
                            "group relative flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-300",
                            isActive
                              ? "bg-[#0F6E56]/10 text-[#0F6E56]"
                              : "text-gray-600 hover:bg-white/60 hover:text-gray-900",
                          )}
                        >
                          {isActive ? (
                            <motion.div
                              layoutId="activeSettingsTab"
                              className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0F6E56]/10 to-[#0F6E56]/5"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                          ) : null}

                          <div
                            className={cn(
                              "relative z-10 flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300",
                              isActive
                                ? "bg-[#0F6E56] text-white shadow-lg shadow-[#0F6E56]/25"
                                : "bg-gray-100/80 group-hover:bg-white group-hover:shadow-md",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>

                          <div className="relative z-10 flex-1">
                            <div
                              className={cn(
                                "text-sm font-medium transition-colors",
                                isActive ? "text-[#0F6E56]" : "text-gray-900",
                              )}
                            >
                              {item.label}
                            </div>
                            <div className="mt-0.5 text-xs text-gray-500">{item.description}</div>
                          </div>

                          <ChevronRight
                            className={cn(
                              "relative z-10 h-4 w-4 transition-all duration-300",
                              isActive
                                ? "translate-x-0.5 text-[#0F6E56]"
                                : "text-gray-400 opacity-0 group-hover:opacity-100",
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>

                  <div className="mx-4 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

                  <div className="p-4">
                    <div className="text-center text-xs text-gray-400">Personal settings for your account</div>
                  </div>
                </div>
              </div>
            </nav>

            <main className="min-w-0 flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {activeTab === "profile" ? <ProfileSettings /> : null}
                  {activeTab === "security" ? <SecuritySettings /> : null}
                  {activeTab === "notifications" ? <NotificationSettings /> : null}
                  {activeTab === "appearance" ? <AppearanceSettings /> : null}
                  {activeTab === "integrations" ? <IntegrationSettings /> : null}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function ProfileSettings() {
  const [avatar, setAvatar] = useState<string>(appConfig.media.defaultAvatar);
  const [jobTitle, setJobTitle] = useState<(typeof jobTitleOptions)[number]>("Product Lead");
  const [timezone, setTimezone] = useState("UTC");
  const [language, setLanguage] = useState("English (US)");
  const [accountingBasis, setAccountingBasis] = useState<AccountingBasis>("accrual");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your personal information and profile defaults.
          </p>
        </div>
      </div>

      <CardSection>
        <div className="flex items-start gap-6">
          <div className="group relative">
            <button
              type="button"
              onClick={() => setAvatar(appConfig.media.avatarExample)}
              className="h-24 w-24 overflow-hidden rounded-full bg-gray-100 p-1.5 transition-colors hover:border-[#0F6E56]/30"
              aria-label="Update avatar"
            >
              <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
            </button>
            <button
              type="button"
              onClick={() => setAvatar(appConfig.media.avatarExample)}
              className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F6E56] text-white shadow-lg shadow-[#0F6E56]/30 transition-colors hover:bg-[#0a5a44]"
              aria-label="Upload avatar"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-4">
            <TextInput label="Display Name" defaultValue="Alex Chen" />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Job Title</label>
              <select
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value as (typeof jobTitleOptions)[number])}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition-all focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
              >
                {jobTitleOptions.map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </CardSection>

      <CardSection title="Personal Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Email" type="email" defaultValue="alex@bedflow.io" disabled />
          <TextInput label="Phone" type="tel" defaultValue="+1 (555) 123-4567" disabled />
        </div>
      </CardSection>

      <CardSection title="Preferences">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Timezone</label>
            <select
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition-all focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
            >
              <option value="UTC">UTC</option>
              <option value="Pacific Time (PT)">Pacific Time (PT)</option>
              <option value="Eastern Time (ET)">Eastern Time (ET)</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Language</label>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition-all focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
            >
              <option value="English (US)">English (US)</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
            </select>
          </div>
        </div>
      </CardSection>

      <CardSection title="Plan Defaults">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Default Accounting Basis</label>
            <select
              value={accountingBasis}
              onChange={(event) => setAccountingBasis(event.target.value as AccountingBasis)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition-all focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
            >
              <option value="accrual">Accrual</option>
              <option value="cash">Cash</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              This preselects statement views for new plans.
            </p>
          </div>
        </div>
      </CardSection>

      <div className="flex justify-end gap-3">
        <button type="button" className="px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900">
          Cancel
        </button>
        <button
          type="button"
          className="rounded-lg bg-[#0F6E56] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0a5a44]"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

function SecuritySettings() {
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Security</h1>
        <p className="mt-1 text-sm text-gray-500">
          Protect your account with advanced security features.
        </p>
      </div>

      <CardSection>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
              <LockKeyhole className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Password</h3>
              <p className="text-xs text-gray-500">Last changed 3 months ago</p>
            </div>
          </div>
          <button type="button" className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#0F6E56] transition-colors hover:bg-[#E1F5EE]">
            Change
          </button>
        </div>
      </CardSection>

      <CardSection>
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E1F5EE]">
              <Shield className="h-5 w-5 text-[#0F6E56]" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
              <p className="text-xs text-gray-500">Secure your account with verified methods.</p>
            </div>
          </div>
          <ToggleSwitch
            enabled={mfaEnabled}
            onChange={setMfaEnabled}
            ariaLabel="Toggle two-factor authentication"
          />
        </div>

        {mfaEnabled ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 space-y-3 border-t border-gray-100 pt-4"
          >
            {[
              {
                name: "SMS",
                description: "Configure SMS-based 2FA with your mobile number",
                Icon: Smartphone,
              },
              {
                name: "Email",
                description: "Configure email-based 2FA with your email address",
                Icon: Mail,
              },
              {
                name: "Authenticator App",
                description: "Google Authenticator configured",
                Icon: KeyRound,
              },
            ].map(({ name, description, Icon }) => (
              <div key={name} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                    <Icon className="h-4 w-4 text-gray-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{name}</p>
                    <p className="text-xs text-gray-500">{description}</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#E1F5EE] px-2 py-1 text-xs font-medium text-[#0F6E56]">
                  Active
                </span>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setShowRecoveryCodes((prev) => !prev)}
              className="text-sm font-medium text-[#0F6E56] hover:text-[#0a5a44]"
            >
              {showRecoveryCodes ? "Hide" : "View"} Recovery Codes
            </button>

            {showRecoveryCodes ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg border border-amber-200 bg-amber-50 p-4"
              >
                <p className="mb-2 text-xs font-medium text-amber-800">
                  Save these codes in a secure location.
                </p>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs text-amber-900">
                  {["XXXX-XXXX-XXXX", "XXXX-XXXX-XXXX", "XXXX-XXXX-XXXX", "XXXX-XXXX-XXXX"].map((code) => (
                    <div key={code} className="rounded border border-amber-200/50 bg-white/50 px-2 py-1.5">
                      {code}
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </motion.div>
        ) : null}
      </CardSection>

      <CardSection>
        <h3 className="mb-4 font-medium text-gray-900">Active Sessions</h3>
        <div className="space-y-3">
          {[
            { device: "MacBook Pro", location: "San Francisco, CA", current: true },
            { device: "iPhone 15", location: "San Francisco, CA", current: false },
          ].map((session) => (
            <div
              key={session.device}
              className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                  <Laptop className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    {session.device}
                    {session.current ? (
                      <span className="rounded-full bg-[#E1F5EE] px-1.5 py-0.5 text-[10px] text-[#0F6E56]">
                        Current
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-gray-500">{session.location}</p>
                </div>
              </div>

              {!session.current ? (
                <button type="button" className="text-xs font-medium text-red-600 hover:text-red-700">
                  Revoke
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </CardSection>
    </div>
  );
}

function NotificationSettings() {
  const [channels, setChannels] = useState({
    email: { enabled: true, address: "alex@bedflow.io" },
    mobile: { enabled: false, number: "+1 (555) 123-4567" },
    slack: { enabled: true, workspace: "Bedflow HQ" },
  });

  const [preferences, setPreferences] = useState({
    mentions: true,
    updates: true,
    reports: false,
    marketing: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
        <p className="mt-1 text-sm text-gray-500">Choose how and when you want to be notified.</p>
      </div>

      <CardSection title="Notification Channels" className="space-y-4">
        {[
          {
            key: "email",
            title: "Email",
            subtitle: channels.email.address,
            Icon: Mail,
          },
          {
            key: "mobile",
            title: "Mobile Push",
            subtitle: channels.mobile.number,
            Icon: Smartphone,
          },
          {
            key: "slack",
            title: "Slack",
            subtitle: channels.slack.workspace,
            Icon: MessageSquare,
          },
        ].map((channel) => (
          <div key={channel.key} className="flex items-start justify-between rounded-xl bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                <channel.Icon className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{channel.title}</p>
                <p className="text-sm text-gray-500">{channel.subtitle}</p>
              </div>
            </div>

            <ToggleSwitch
              enabled={channels[channel.key as keyof typeof channels].enabled}
              onChange={(next) =>
                setChannels((prev) => ({
                  ...prev,
                  [channel.key]: { ...prev[channel.key as keyof typeof prev], enabled: next },
                }))
              }
              ariaLabel={`Toggle ${channel.title} notifications`}
            />
          </div>
        ))}
      </CardSection>

      <CardSection title="Notification Preferences">
        <div className="space-y-3">
          {[
            {
              key: "mentions",
              label: "Mentions & Direct Messages",
              description: "When someone mentions you or sends a direct message",
            },
            {
              key: "updates",
              label: "Product Updates",
              description: "New features and improvements",
            },
            {
              key: "reports",
              label: "Weekly Reports",
              description: "Summary of your activity and metrics",
            },
            {
              key: "marketing",
              label: "Marketing & Tips",
              description: "Best practices and product tips",
            },
          ].map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={preferences[item.key as keyof typeof preferences]}
                onChange={(event) =>
                  setPreferences((prev) => ({
                    ...prev,
                    [item.key]: event.target.checked,
                  }))
                }
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0F6E56] focus:ring-[#0F6E56]/20"
              />
              <div>
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
            </label>
          ))}
        </div>
      </CardSection>
    </div>
  );
}

function AppearanceSettings() {
  const [theme, setTheme] = useState<ThemeOption>("light");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Appearance</h1>
        <p className="mt-1 text-sm text-gray-500">Customize how Bedflow looks and feels.</p>
      </div>

      <CardSection title="Theme">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {themeOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              className={cn(
                "relative rounded-xl border-2 bg-gray-50/50 p-4 text-left transition-all duration-200",
                theme === option.id
                  ? "border-[#0F6E56] bg-[#E1F5EE]/30"
                  : "border-gray-200 hover:border-gray-300",
              )}
            >
              <option.Icon className="mb-2 h-6 w-6 text-gray-700" />
              <div className="text-sm font-medium text-gray-900">{option.label}</div>
              <div className="mt-0.5 text-xs text-gray-500">{option.description}</div>
              {theme === option.id ? (
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#0F6E56]">
                  <Check className="h-3 w-3 text-white" />
                </div>
              ) : null}
            </button>
          ))}
        </div>
      </CardSection>
    </div>
  );
}

function IntegrationSettings() {
  const [integrations, setIntegrations] = useState(integrationsSeed);

  const toggleConnection = (id: string) => {
    setIntegrations((current) =>
      current.map((item) => (item.id === id ? { ...item, connected: !item.connected } : item)),
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Integrations</h1>
        <p className="mt-1 text-sm text-gray-500">Connect your tools and streamline your workflow.</p>
      </div>

      <section className="space-y-3">
        <h3 className="px-1 text-sm font-semibold uppercase tracking-wide text-gray-900">Connected</h3>
        {integrations
          .filter((item) => item.connected)
          .map((integration) => (
            <motion.div key={integration.id} layout className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 p-2">
                    <img src={integration.icon} alt={integration.name} className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                      <span className="rounded-full bg-[#E1F5EE] px-2 py-0.5 text-[10px] font-medium text-[#0F6E56]">
                        Connected
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">{integration.description}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {integration.scopes.map((scope) => (
                        <span key={scope} className="rounded-md bg-gray-100 px-2 py-1 text-xs capitalize text-gray-600">
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button type="button" className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
                    Configure
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleConnection(integration.id)}
                    className="rounded-lg px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
      </section>

      <section className="space-y-3">
        <h3 className="px-1 text-sm font-semibold uppercase tracking-wide text-gray-900">Available</h3>
        {integrations
          .filter((item) => !item.connected)
          .map((integration) => (
            <motion.div
              key={integration.id}
              layout
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm opacity-75 transition-opacity hover:opacity-100"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 p-2 grayscale">
                    <img src={integration.icon} alt={integration.name} className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                    <p className="mt-0.5 text-sm text-gray-500">{integration.description}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleConnection(integration.id)}
                  className="rounded-lg bg-[#E1F5EE] px-4 py-2 text-sm font-medium text-[#0F6E56] transition-all duration-200 hover:bg-[#0F6E56] hover:text-white"
                >
                  Connect
                </button>
              </div>
            </motion.div>
          ))}
      </section>
    </div>
  );
}
