"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  Download,
  FileText,
  Filter,
  Lock,
  MoreHorizontal,
  Plus,
  ScrollText,
  Search,
  Settings,
  Shield,
  Trash2,
  UserCog,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import appConfig from "@/lib/appconfig";
import { FrontendRoutes } from "@/lib/api/FrontendRoutes";
import { ProtectedRoute } from "@/lib/api/auth/authContext";
import InvitationModal from "@/app/components/fragments/InvitationModal";

type OrganizationTab = "profile" | "members" | "analytics" | "audit" | "security";
type MemberRole = "Owner" | "Admin" | "Member" | "Guest";
type MemberStatus = "active" | "pending" | "inactive";
type Severity = "info" | "warning" | "error";

type NavItem = {
  id: OrganizationTab;
  label: string;
  icon: LucideIcon;
  description: string;
};

type Member = {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  lastActive: string;
  plans: string[];
  avatar: string | null;
};

type AuditLog = {
  id: string;
  event: string;
  actor: string;
  time: string;
  severity: Severity;
  ip: string;
  details: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "profile", label: "Organization", icon: Building2, description: "Profile & billing" },
  { id: "members", label: "Members", icon: Users, description: "Manage team access" },
  { id: "analytics", label: "Analytics", icon: BarChart3, description: "Usage & activity" },
  { id: "audit", label: "Audit Logs", icon: ScrollText, description: "Security events" },
  { id: "security", label: "Security", icon: Shield, description: "Policies & compliance" },
];

const MEMBERS: Member[] = [
  {
    id: "1",
    name: "Alex Chen",
    email: "alex@acme.com",
    role: "Owner",
    status: "active",
    lastActive: "2 mins ago",
    plans: ["Strategic Plan 2024", "Q1 Fundraising"],
    avatar: "/media/avatars/samuraicoderr.png",
  },
  {
    id: "2",
    name: "Sarah Chen",
    email: "sarah@acme.com",
    role: "Admin",
    status: "active",
    lastActive: "1 hour ago",
    plans: ["Strategic Plan 2024"],
    avatar: null,
  },
  {
    id: "3",
    name: "Mike Ross",
    email: "mike@acme.com",
    role: "Admin",
    status: "active",
    lastActive: "3 hours ago",
    plans: ["Q1 Fundraising", "Operator Manual"],
    avatar: null,
  },
  {
    id: "4",
    name: "Emma Wilson",
    email: "emma@acme.com",
    role: "Member",
    status: "active",
    lastActive: "1 day ago",
    plans: ["Strategic Plan 2024"],
    avatar: null,
  },
  {
    id: "5",
    name: "James Kumar",
    email: "james@acme.com",
    role: "Guest",
    status: "pending",
    lastActive: "Never",
    plans: ["Q1 Fundraising (Viewer)"],
    avatar: null,
  },
  {
    id: "6",
    name: "Lisa Park",
    email: "lisa@acme.com",
    role: "Member",
    status: "inactive",
    lastActive: "2 weeks ago",
    plans: [],
    avatar: null,
  },
];

const AUDIT_LOGS: AuditLog[] = [
  {
    id: "evt_123",
    event: "Organization settings updated",
    actor: "Alex Chen",
    time: "2024-03-31T06:45:00Z",
    severity: "info",
    ip: "192.168.1.1",
    details: "Changed organization name from 'Acme Inc' to 'Acme Corporation'",
  },
  {
    id: "evt_124",
    event: "Member role changed",
    actor: "Alex Chen",
    time: "2024-03-31T06:30:00Z",
    severity: "warning",
    ip: "192.168.1.1",
    details: "Promoted Sarah Chen from Member to Admin",
  },
  {
    id: "evt_125",
    event: "Failed login attempt",
    actor: "unknown",
    time: "2024-03-31T05:15:00Z",
    severity: "error",
    ip: "203.0.113.1",
    details: "Invalid credentials for user mike@acme.com",
  },
  {
    id: "evt_126",
    event: "API key generated",
    actor: "Sarah Chen",
    time: "2024-03-31T04:20:00Z",
    severity: "info",
    ip: "192.168.1.45",
    details: "Created new API key for integration: Slack Bot",
  },
  {
    id: "evt_127",
    event: "Member invited",
    actor: "Mike Ross",
    time: "2024-03-31T03:10:00Z",
    severity: "info",
    ip: "192.168.1.23",
    details: "Invited james@acme.com as Guest",
  },
  {
    id: "evt_128",
    event: "Plan access revoked",
    actor: "Alex Chen",
    time: "2024-03-30T22:00:00Z",
    severity: "warning",
    ip: "192.168.1.1",
    details: "Removed Emma Wilson from Strategic Plan 2024",
  },
];

function TopHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href={FrontendRoutes.home}>
            <img src={appConfig.logos.green} alt={appConfig.appName} className="h-7 w-7 object-contain" />
          </Link>
          <div>
            <p className="text-sm font-semibold text-gray-900">Organization Console</p>
            <p className="text-xs text-gray-500">Acme Corp</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#0F6E56]/20 bg-[#E1F5EE] px-3 py-1.5 text-xs font-medium text-[#0F6E56]">
            <Crown className="h-3.5 w-3.5" />
            Enterprise Plan
          </span>
          <Link
            href={FrontendRoutes.home}
            className="group inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <ChevronRight className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-0.5" />
            Back
          </Link>
        </div>
      </div>
    </header>
  );
}

function ToggleSwitch({
  enabled,
  onToggle,
  ariaLabel,
}: {
  enabled: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      onClick={onToggle}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors duration-200",
        enabled ? "bg-[#0F6E56]" : "bg-gray-200",
      )}
    >
      <span
        className={cn(
          "absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          enabled ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border border-gray-200 bg-white shadow-sm", className)}>{children}</section>;
}

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<OrganizationTab>("profile");

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#fafafa]">
        <TopHeader />

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            <nav className="lg:w-72 lg:flex-shrink-0">
              <div className="sticky top-24">
                <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/60 shadow-xl shadow-gray-200/20 backdrop-blur-2xl">
                  <div className="space-y-1 p-2">
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveTab(item.id)}
                          className={cn(
                            "group relative flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-200",
                            isActive
                              ? "bg-[#0F6E56]/10 text-[#0F6E56]"
                              : "text-gray-600 hover:bg-white/70 hover:text-gray-900",
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-lg transition-all",
                              isActive ? "bg-[#0F6E56] text-white" : "bg-gray-100 text-gray-500",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-sm font-medium", isActive ? "text-[#0F6E56]" : "text-gray-900")}>{item.label}</p>
                            <p className="truncate text-xs text-gray-500">{item.description}</p>
                          </div>
                          {isActive ? <ChevronRight className="h-4 w-4 text-[#0F6E56]" /> : null}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mx-4 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

                  <div className="space-y-2 p-3">
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
                      <Plus className="h-4 w-4" />
                      Invite Member
                    </button>
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
                      <Download className="h-4 w-4" />
                      Export Data
                    </button>
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
                  {activeTab === "profile" ? <OrganizationProfile /> : null}
                  {activeTab === "members" ? <MembersManagement /> : null}
                  {activeTab === "analytics" ? <AnalyticsView /> : null}
                  {activeTab === "audit" ? <AuditLogs /> : null}
                  {activeTab === "security" ? <SecurityPolicies /> : null}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function OrganizationProfile() {
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Organization Profile</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your team identity and subscription.</p>
      </div>

      <SectionCard>
        <div className="p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-900">Identity</h3>
          <div className="flex items-start gap-6">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F6E56] to-[#0a5a44] text-2xl font-bold text-white shadow-lg">
                AC
              </div>
              <button
                type="button"
                className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-md transition-colors hover:bg-gray-50"
              >
                <Settings className="h-4 w-4 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Organization Name</label>
                  <input
                    type="text"
                    defaultValue="Acme Corporation"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Slug</label>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500">
                      bedflow.io/
                    </span>
                    <input
                      type="text"
                      defaultValue="acme-corp"
                      className="flex-1 rounded-r-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={2}
                  defaultValue="Building the future of work management"
                  className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button type="button" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button type="button" className="rounded-lg bg-[#0F6E56] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a5a44]">
            Save Changes
          </button>
        </div>
      </SectionCard>

      <SectionCard className="overflow-hidden">
        <div className="p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Plan & Billing</h3>
              <p className="mt-1 text-sm text-gray-500">Manage your subscription and usage.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-lg border border-[#0F6E56]/20 bg-[#E1F5EE] px-3 py-1.5 text-sm font-medium text-[#0F6E56]">
              <Crown className="h-4 w-4" />
              Enterprise
            </span>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Members</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">24/50</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div className="h-full w-[48%] rounded-full bg-[#0F6E56]" />
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Storage</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">45GB</p>
              <p className="mt-1 text-xs text-gray-500">of 100GB used</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Next Billing</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">Apr 15</p>
              <p className="mt-1 text-xs text-gray-500">$299/month</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" className="rounded-lg bg-[#E1F5EE] px-4 py-2 text-sm font-medium text-[#0F6E56] transition-colors hover:bg-[#0F6E56] hover:text-white">
              Upgrade Plan
            </button>
            <button type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
              View Invoices
            </button>
            <button type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
              Payment Methods
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="overflow-hidden border-red-200 bg-red-50/50">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Danger Zone</h3>
              <p className="mt-1 text-sm text-red-700/70">Destructive actions for organization management.</p>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-white p-4">
                  <div>
                    <p className="font-medium text-gray-900">Leave Organization</p>
                    <p className="text-sm text-gray-500">Transfer ownership before leaving.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLeaveModalOpen(true)}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
                  >
                    Leave Org
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-white p-4">
                  <div>
                    <p className="font-medium text-gray-900">Delete Organization</p>
                    <p className="text-sm text-gray-500">Permanently delete all data.</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
                  >
                    Delete Org
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <AnimatePresence>
        {isLeaveModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
            >
              <div className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                    <Crown className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Transfer Ownership</h3>
                    <p className="text-sm text-gray-500">Required before leaving</p>
                  </div>
                </div>

                <p className="mb-4 text-sm text-gray-600">
                  You are the current owner. Please select a new owner before leaving the organization.
                </p>

                <label className="mb-2 block text-sm font-medium text-gray-700">New Owner</label>
                <select className="mb-4 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <option>Sarah Chen (Admin)</option>
                  <option>Mike Ross (Admin)</option>
                  <option>Emma Wilson (Member)</option>
                </select>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsLeaveModalOpen(false)}
                    className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLeaveModalOpen(false)}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                  >
                    Transfer & Leave
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MembersManagement() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMembers = useMemo(() => {
    return MEMBERS.filter((member) => {
      const matchesRole = filterRole === "all" || member.role.toLowerCase() === filterRole;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query);
      return matchesRole && matchesSearch;
    });
  }, [filterRole, searchQuery]);

  const handleSendInvites = async (emails: string[]) => {
    console.log("Inviting:", emails);
    setIsInviteOpen(false);
  };

  const handleCopyInviteLink = async () => {
    await navigator.clipboard.writeText("https://bedflow.io/join/acme-corp");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Members</h1>
          <p className="mt-1 text-sm text-gray-500">Manage team access and permissions.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsInviteOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0F6E56] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0a5a44]"
        >
          <Plus className="h-4 w-4" />
          Invite Member
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Members", value: "24", change: "+2 this week" },
          { label: "Active Now", value: "3", change: "Online" },
          { label: "Pending Invites", value: "2", change: "Awaiting response" },
          { label: "Guests", value: "4", change: "Limited access" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stat.value}</p>
            <p className="mt-1 text-xs text-gray-500">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filterRole}
            onChange={(event) => setFilterRole(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="guest">Guest</option>
          </select>
          <button type="button" className="rounded-lg border border-gray-200 bg-white px-3 py-2 transition-colors hover:bg-gray-50">
            <Filter className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      <SectionCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Member</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Plan Access</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Last Active</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="group transition-colors hover:bg-gray-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-sm font-medium text-gray-600">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          member.name
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                        member.role === "Owner" && "border-amber-200 bg-amber-50 text-amber-700",
                        member.role === "Admin" && "border-[#0F6E56]/25 bg-[#E1F5EE] text-[#0F6E56]",
                        member.role === "Member" && "border-gray-200 bg-gray-100 text-gray-700",
                        member.role === "Guest" && "border-blue-200 bg-blue-50 text-blue-700",
                      )}
                    >
                      {member.role === "Owner" ? <Crown className="h-3 w-3" /> : null}
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-[280px] flex-wrap gap-1">
                      {member.plans.length ? (
                        member.plans.map((plan) => (
                          <span key={plan} className="max-w-[120px] truncate rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                            {plan}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">No plans</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {member.lastActive}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs",
                        member.status === "active" && "text-green-600",
                        member.status === "pending" && "text-amber-600",
                        member.status === "inactive" && "text-gray-500",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          member.status === "active" && "bg-green-500",
                          member.status === "pending" && "bg-amber-500",
                          member.status === "inactive" && "bg-gray-400",
                        )}
                      />
                      {member.status[0].toUpperCase() + member.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMember((current) => (current === member.id ? null : member.id))
                        }
                        className="rounded-lg p-1.5 transition-colors hover:bg-gray-200"
                      >
                        <MoreHorizontal className="h-4 w-4 text-gray-500" />
                      </button>

                      {selectedMember === member.id ? (
                        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                          <button className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                            <UserCog className="h-4 w-4" />
                            Manage Access
                          </button>
                          <div className="my-1 h-px bg-gray-200" />
                          <button className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                            Remove Member
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-sm text-gray-500">
            Showing {filteredMembers.length} of {MEMBERS.length} members
          </p>
          <div className="flex gap-2">
            <button type="button" disabled className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors disabled:opacity-50">
              Previous
            </button>
            <button type="button" className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-200">
              Next
            </button>
          </div>
        </div>
      </SectionCard>

      <InvitationModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        teamName="Acme Corp"
        onSendInvites={handleSendInvites}
        onCopyLink={handleCopyInviteLink}
      />
    </div>
  );
}

function AnalyticsView() {
  const [dateRange, setDateRange] = useState("7d");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Organization activity and usage metrics.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(event) => setDateRange(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button type="button" className="rounded-lg border border-gray-200 bg-white px-3 py-2 transition-colors hover:bg-gray-50">
            <Download className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Users", value: "18", change: "+12%", trend: "up", icon: Users },
          { label: "Plans Created", value: "47", change: "+5", trend: "up", icon: FileText },
          { label: "Avg. Session", value: "12m", change: "-2m", trend: "down", icon: Clock },
          { label: "Collaborations", value: "156", change: "+23", trend: "up", icon: Activity },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                  <Icon className="h-5 w-5 text-gray-600" />
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium",
                    kpi.trend === "up" ? "text-green-600" : "text-red-600",
                  )}
                >
                  {kpi.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {kpi.change}
                </span>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{kpi.value}</p>
              <p className="mt-1 text-xs text-gray-500">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard>
          <div className="p-6">
            <h3 className="mb-4 font-semibold text-gray-900">Daily Active Users</h3>
            <div className="flex h-48 items-end gap-2">
              {[40, 65, 45, 80, 55, 70, 85, 60, 75, 50, 90, 65, 70, 80].map((height, index) => (
                <div key={index} className="flex flex-1 flex-col justify-end">
                  <div className="group relative w-full rounded-t-sm bg-[#0F6E56]/20 transition-colors hover:bg-[#0F6E56]/35" style={{ height: `${height}%` }}>
                    <div className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {height}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-400">
              <span>Mar 18</span>
              <span>Mar 25</span>
              <span>Apr 1</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="p-6">
            <h3 className="mb-4 font-semibold text-gray-900">Plan Activity</h3>
            <div className="space-y-4">
              {[
                { name: "Strategic Plan 2024", users: 12, edits: 45, color: "#534AB7" },
                { name: "Q1 Fundraising", users: 8, edits: 32, color: "#0F6E56" },
                { name: "Operator Manual", users: 6, edits: 18, color: "#854F0B" },
                { name: "Product Roadmap", users: 4, edits: 12, color: "#993C1D" },
              ].map((plan) => (
                <div key={plan.name} className="flex items-center gap-4">
                  <div className="h-10 w-2 rounded-full" style={{ backgroundColor: plan.color }} />
                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{plan.name}</p>
                      <span className="text-xs text-gray-500">{plan.users} users</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full" style={{ width: `${(plan.edits / 45) * 100}%`, backgroundColor: plan.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function AuditLogs() {
  const [severityFilter, setSeverityFilter] = useState<"all" | Severity>("all");

  const filteredLogs = useMemo(
    () => (severityFilter === "all" ? AUDIT_LOGS : AUDIT_LOGS.filter((log) => log.severity === severityFilter)),
    [severityFilter],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Audit Logs</h1>
          <p className="mt-1 text-sm text-gray-500">Security and compliance event history.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-50">
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-50">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "all" as const, label: "All Events", count: AUDIT_LOGS.length },
          { id: "info" as const, label: "Info", count: AUDIT_LOGS.filter((log) => log.severity === "info").length },
          {
            id: "warning" as const,
            label: "Warnings",
            count: AUDIT_LOGS.filter((log) => log.severity === "warning").length,
          },
          { id: "error" as const, label: "Errors", count: AUDIT_LOGS.filter((log) => log.severity === "error").length },
        ].map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setSeverityFilter(filter.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              severityFilter === filter.id
                ? "bg-[#0F6E56] text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-100",
            )}
          >
            {filter.label}
            <span className="ml-2 text-xs opacity-70">({filter.count})</span>
          </button>
        ))}
      </div>

      <SectionCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Event</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">IP Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-gray-50/70">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{log.event}</p>
                    <p className="mt-0.5 max-w-md truncate text-xs text-gray-500">{log.details}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{log.actor}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(log.time).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-600">{log.ip}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium",
                        log.severity === "info" && "bg-blue-50 text-blue-700",
                        log.severity === "warning" && "bg-amber-50 text-amber-700",
                        log.severity === "error" && "bg-red-50 text-red-700",
                      )}
                    >
                      {log.severity === "info" ? <CheckCircle2 className="h-3 w-3" /> : null}
                      {log.severity === "warning" ? <AlertTriangle className="h-3 w-3" /> : null}
                      {log.severity === "error" ? <XCircle className="h-3 w-3" /> : null}
                      {log.severity[0].toUpperCase() + log.severity.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <Lock className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
        <div>
          <p className="text-sm font-medium text-blue-900">Data Retention</p>
          <p className="mt-1 text-sm text-blue-700/80">
            Audit logs are retained for 90 days on your current plan. Upgrade to Enterprise for 1-year retention and advanced compliance features.
          </p>
        </div>
      </div>
    </div>
  );
}

function SecurityPolicies() {
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [enforce2FA, setEnforce2FA] = useState(false);
  const [ipRestrictions, setIpRestrictions] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Security Policies</h1>
        <p className="mt-1 text-sm text-gray-500">Configure organization-wide security settings.</p>
      </div>

      <SectionCard className="p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-900">Authentication</h3>
        <div className="space-y-4">
          <div className="flex items-start justify-between rounded-xl bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                <Shield className="h-5 w-5 text-[#0F6E56]" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Enforce Two-Factor Authentication</p>
                <p className="mt-0.5 text-sm text-gray-500">Require all members to enable 2FA.</p>
              </div>
            </div>
            <ToggleSwitch enabled={enforce2FA} onToggle={() => setEnforce2FA((prev) => !prev)} ariaLabel="Toggle 2FA enforcement" />
          </div>

          <div className="flex items-start justify-between rounded-xl bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                <Lock className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Single Sign-On (SSO)</p>
                <p className="mt-0.5 text-sm text-gray-500">SAML 2.0 authentication.</p>
              </div>
            </div>
            <ToggleSwitch enabled={ssoEnabled} onToggle={() => setSsoEnabled((prev) => !prev)} ariaLabel="Toggle SSO" />
          </div>

          {ssoEnabled ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-3 rounded-xl border border-[#0F6E56]/20 bg-[#E1F5EE]/30 p-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">SAML SSO URL</label>
                <input
                  type="url"
                  placeholder="https://sso.acme.com/saml"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Identity Provider Issuer</label>
                <input
                  type="text"
                  placeholder="https://sts.windows.net/..."
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">X.509 Certificate</label>
                <textarea
                  rows={3}
                  placeholder="Paste your certificate here..."
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                />
              </div>
            </motion.div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard className="p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-900">Access Control</h3>

        <div className="space-y-4">
          <div className="flex items-start justify-between rounded-xl bg-gray-50 p-4">
            <div>
              <p className="font-medium text-gray-900">IP Restrictions</p>
              <p className="mt-0.5 text-sm text-gray-500">Limit access to specific IP ranges.</p>
            </div>
            <ToggleSwitch
              enabled={ipRestrictions}
              onToggle={() => setIpRestrictions((prev) => !prev)}
              ariaLabel="Toggle IP restrictions"
            />
          </div>

          {ipRestrictions ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-xl bg-gray-50 p-4"
            >
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Allowed IP Ranges (CIDR notation)</label>
              <textarea
                rows={2}
                defaultValue={"192.168.1.0/24\n10.0.0.0/8"}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
              />
              <p className="mt-2 text-xs text-gray-500">One range per line. Supports IPv4 and IPv6 CIDR notation.</p>
            </motion.div>
          ) : null}

          <div className="flex items-start justify-between rounded-xl bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                <Calendar className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Session Duration</p>
                <p className="mt-0.5 text-sm text-gray-500">Maximum session lifetime.</p>
              </div>
            </div>
            <select className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm">
              <option>24 hours</option>
              <option>7 days</option>
              <option>30 days</option>
              <option>Never</option>
            </select>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
