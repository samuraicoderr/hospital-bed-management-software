"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Clock,
  FileText,
  History,
  RefreshCw,
  RotateCcw,
  Search,
  Square,
  Trash2,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import appConfig from "@/lib/appconfig";
import { FrontendRoutes } from "@/lib/api/FrontendRoutes";
import { ProtectedRoute } from "@/lib/api/auth/authContext";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type PlanKind =
  | "strategic"
  | "fundraising"
  | "operator"
  | "sheet"
  | "chart"
  | "statement"
  | "calendar";

type TimeFilter = "all" | "24h" | "7d" | "30d" | "expiring";
type SortField = "timeLeft" | "deleted" | "name";
type SortOrder = "asc" | "desc";
type ViewMode = "table" | "grid";

interface TrashedPlan {
  id: string;
  name: string;
  type: PlanKind;
  owner: { name: string; email: string; avatar?: string };
  deletedAt: Date;
  deletedBy: string;
  items: number;
  lastModified: Date;
  collaborators: number;
  timeLeftDays: number;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PLAN_TYPE_CONFIG: Record<PlanKind, { color: string; bg: string; label: string }> = {
  strategic: { color: "#534AB7", bg: "#EEEDFE", label: "Strategic" },
  fundraising: { color: "#0F6E56", bg: "#E1F5EE", label: "Fundraising" },
  operator: { color: "#854F0B", bg: "#FAEEDA", label: "Operator" },
  sheet: { color: "#0F6E56", bg: "#E1F5EE", label: "Sheet" },
  chart: { color: "#854F0B", bg: "#FAEEDA", label: "Chart" },
  statement: { color: "#993C1D", bg: "#FAECE7", label: "Statement" },
  calendar: { color: "#993556", bg: "#FBEAF0", label: "Calendar" },
};

const RETENTION_DAYS = 30;
const EXPIRY_THRESHOLD_DAYS = 7;

const MOCK_TRASHED_PLANS: TrashedPlan[] = [
  {
    id: "plan_001",
    name: "Q4 2024 Strategic Review",
    type: "strategic",
    owner: { name: "Sarah Chen", email: "sarah@acme.com" },
    deletedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    deletedBy: "Alex Chen",
    items: 12,
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    collaborators: 8,
    timeLeftDays: 28,
  },
  {
    id: "plan_002",
    name: "Series B Fundraising Deck",
    type: "fundraising",
    owner: { name: "Mike Ross", email: "mike@acme.com" },
    deletedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    deletedBy: "Mike Ross",
    items: 45,
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6),
    collaborators: 12,
    timeLeftDays: 25,
  },
  {
    id: "plan_003",
    name: "Q1 2024 Operator Manual",
    type: "operator",
    owner: { name: "Emma Wilson", email: "emma@acme.com" },
    deletedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
    deletedBy: "Alex Chen",
    items: 6,
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25),
    collaborators: 4,
    timeLeftDays: 10,
  },
  {
    id: "plan_004",
    name: "Product Metrics Dashboard",
    type: "chart",
    owner: { name: "James Kumar", email: "james@acme.com" },
    deletedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 27),
    deletedBy: "James Kumar",
    items: 18,
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28),
    collaborators: 6,
    timeLeftDays: 3,
  },
  {
    id: "plan_005",
    name: "Financial Statements 2023",
    type: "statement",
    owner: { name: "Lisa Park", email: "lisa@acme.com" },
    deletedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 29),
    deletedBy: "Alex Chen",
    items: 24,
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    collaborators: 3,
    timeLeftDays: 1,
  },
  {
    id: "plan_006",
    name: "Team Calendar 2024",
    type: "calendar",
    owner: { name: "Sarah Chen", email: "sarah@acme.com" },
    deletedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
    deletedBy: "Sarah Chen",
    items: 365,
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 16),
    collaborators: 20,
    timeLeftDays: 15,
  },
  {
    id: "plan_007",
    name: "Customer Acquisition Sheet",
    type: "sheet",
    owner: { name: "Mike Ross", email: "mike@acme.com" },
    deletedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    deletedBy: "Mike Ross",
    items: 8,
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 14),
    collaborators: 5,
    timeLeftDays: 29,
  },
  {
    id: "plan_008",
    name: "Deprecated: Old Roadmap",
    type: "strategic",
    owner: { name: "Alex Chen", email: "alex@acme.com" },
    deletedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25),
    deletedBy: "Alex Chen",
    items: 9,
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40),
    collaborators: 2,
    timeLeftDays: 5,
  },
];

// ─────────────────────────────────────────────
// Shared UI Primitives
// ─────────────────────────────────────────────

function TopHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href={FrontendRoutes.home}>
            <img src={appConfig.logos.green} alt={appConfig.appName} className="h-7 w-7 object-contain" />
          </Link>
          <div>
            <p className="text-sm font-semibold text-gray-900">Trash</p>
            <p className="text-xs text-gray-500">Acme Corp</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
            <Clock className="h-3.5 w-3.5" />
            Auto-delete after {RETENTION_DAYS} days
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

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-gray-200 bg-white shadow-sm", className)}>
      {children}
    </section>
  );
}

function UserAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("");
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-xs font-medium text-gray-600",
        className,
      )}
    >
      {initials}
    </div>
  );
}

function PlanTypeBadge({ type }: { type: PlanKind }) {
  const config = PLAN_TYPE_CONFIG[type];
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

function PlanIcon({ type, size = "md" }: { type: PlanKind; size?: "sm" | "md" }) {
  const config = PLAN_TYPE_CONFIG[type];
  const sizeClasses = size === "sm" ? "h-10 w-10" : "h-12 w-12";
  const iconSize = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  return (
    <div
      className={cn("flex flex-shrink-0 items-center justify-center rounded-lg", sizeClasses)}
      style={{ backgroundColor: config.bg }}
    >
      <FileText className={iconSize} style={{ color: config.color }} />
    </div>
  );
}

function TimeLeftIndicator({ daysLeft }: { daysLeft: number }) {
  const isExpiring = daysLeft <= EXPIRY_THRESHOLD_DAYS;
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-1.5 w-16 overflow-hidden rounded-full", isExpiring ? "bg-red-200" : "bg-gray-200")}>
        <div
          className={cn("h-full rounded-full transition-all", isExpiring ? "bg-red-500" : "bg-[#0F6E56]")}
          style={{ width: `${(daysLeft / RETENTION_DAYS) * 100}%` }}
        />
      </div>
      <span className={cn("text-sm font-medium", isExpiring ? "text-red-600" : "text-gray-900")}>{daysLeft}d</span>
    </div>
  );
}

function SelectionCheckbox({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle} className="rounded p-1 transition-colors hover:bg-gray-200">
      {checked ? (
        <CheckSquare className="h-4 w-4 text-[#0F6E56]" />
      ) : (
        <Square className="h-4 w-4 text-gray-400" />
      )}
    </button>
  );
}

// ─────────────────────────────────────────────
// Confirmation Modal
// ─────────────────────────────────────────────

function ConfirmDeleteModal({
  title,
  description,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">This action cannot be undone</p>
            </div>
          </div>

          <p className="mb-6 text-sm text-gray-600">{description}</p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Delete Forever
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Expiring Alert Banner
// ─────────────────────────────────────────────

function ExpiringBanner({
  count,
  onViewExpiring,
}: {
  count: number;
  onViewExpiring: () => void;
}) {
  if (count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
      <div className="flex-1">
        <p className="font-medium text-amber-900">
          {count} plan{count > 1 ? "s" : ""} expiring soon
        </p>
        <p className="mt-1 text-sm text-amber-700/70">
          Plans with less than {EXPIRY_THRESHOLD_DAYS} days remaining will be permanently deleted.
          <button type="button" onClick={onViewExpiring} className="ml-2 text-amber-700 underline hover:text-amber-900">
            View expiring plans
          </button>
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Stats Bar
// ─────────────────────────────────────────────

function StatsBar({
  total,
  expiringSoon,
  selectedCount,
}: {
  total: number;
  expiringSoon: number;
  selectedCount: number;
}) {
  const stats = [
    { label: "Total Plans", value: String(total), highlight: false },
    { label: "Expiring Soon", value: String(expiringSoon), highlight: expiringSoon > 0 },
    { label: "Selected", value: String(selectedCount), highlight: false },
  ];

  return (
    <div className="mb-6 grid grid-cols-3 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
          <p className={cn("mt-1 text-2xl font-semibold", stat.highlight ? "text-red-600" : "text-gray-900")}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Bulk Action Bar
// ─────────────────────────────────────────────

function BulkActionBar({
  count,
  isRestoring,
  onRestore,
  onDelete,
  onClear,
}: {
  count: number;
  isRestoring: boolean;
  onRestore: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center justify-between rounded-lg border border-[#0F6E56]/20 bg-[#E1F5EE] p-3"
    >
      <div className="flex items-center gap-3">
        <CheckSquare className="h-5 w-5 text-[#0F6E56]" />
        <span className="font-medium text-[#0F6E56]">
          {count} plan{count > 1 ? "s" : ""} selected
        </span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRestore}
          disabled={isRestoring}
          className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-[#0F6E56] transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {isRestoring ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Restore All
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete Permanently
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Table View
// ─────────────────────────────────────────────

function TrashTableView({
  plans,
  selectedIds,
  restoringId,
  onToggle,
  onToggleAll,
  onRestore,
  onDelete,
}: {
  plans: TrashedPlan[];
  selectedIds: Set<string>;
  restoringId: string | null;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const allSelected = selectedIds.size === plans.length && plans.length > 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="w-10 px-4 py-3">
              <SelectionCheckbox checked={allSelected} onToggle={onToggleAll} />
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Plan</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Owner</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Deleted
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Time Left
            </th>
            <th className="w-10 px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {plans.map((plan) => {
            const isSelected = selectedIds.has(plan.id);
            const isExpiring = plan.timeLeftDays <= EXPIRY_THRESHOLD_DAYS;
            const isRestoring = restoringId === plan.id;

            return (
              <tr
                key={plan.id}
                className={cn("group transition-colors hover:bg-gray-50/70", isSelected && "bg-[#E1F5EE]/30")}
              >
                <td className="px-4 py-3">
                  <SelectionCheckbox checked={isSelected} onToggle={() => onToggle(plan.id)} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <PlanIcon type={plan.type} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{plan.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <PlanTypeBadge type={plan.type} />
                        <span className="font-mono text-xs text-gray-400">{plan.id}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {plan.items} items • {plan.collaborators} collaborators
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={plan.owner.name} className="h-6 w-6" />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-900">{plan.owner.name}</p>
                      <p className="truncate text-xs text-gray-500">{plan.owner.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">{plan.deletedAt.toLocaleDateString()}</div>
                  <p className="mt-0.5 text-xs text-gray-500">by {plan.deletedBy}</p>
                </td>
                <td className="px-4 py-3">
                  <TimeLeftIndicator daysLeft={plan.timeLeftDays} />
                  {isExpiring ? <p className="mt-0.5 text-xs text-red-600">Expiring soon</p> : null}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onRestore(plan.id)}
                      disabled={isRestoring}
                      className="rounded-lg p-1.5 text-[#0F6E56] transition-colors hover:bg-[#E1F5EE] disabled:opacity-50"
                      title="Restore"
                    >
                      {isRestoring ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(plan.id)}
                      className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50"
                      title="Delete Permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────
// Grid View
// ─────────────────────────────────────────────

function TrashGridView({
  plans,
  selectedIds,
  restoringId,
  onToggle,
  onRestore,
  onDelete,
}: {
  plans: TrashedPlan[];
  selectedIds: Set<string>;
  restoringId: string | null;
  onToggle: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => {
        const isSelected = selectedIds.has(plan.id);
        const isExpiring = plan.timeLeftDays <= EXPIRY_THRESHOLD_DAYS;
        const isRestoring = restoringId === plan.id;

        return (
          <div
            key={plan.id}
            onClick={() => onToggle(plan.id)}
            className={cn(
              "group relative cursor-pointer rounded-xl border-2 p-4 transition-all",
              isSelected ? "border-[#0F6E56] bg-[#E1F5EE]/20" : "border-gray-200 bg-white hover:border-gray-300",
            )}
          >
            <div className="mb-3 flex items-start justify-between">
              <PlanIcon type={plan.type} />
              <div className="flex items-center gap-1">
                {isSelected ? (
                  <CheckCircle2 className="h-5 w-5 text-[#0F6E56]" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300 group-hover:border-gray-400" />
                )}
              </div>
            </div>

            <h3 className="mb-1 line-clamp-1 font-medium text-gray-900">{plan.name}</h3>
            <div className="mb-3 flex items-center gap-2">
              <PlanTypeBadge type={plan.type} />
              <span className="font-mono text-xs text-gray-400">{plan.id}</span>
            </div>

            <div className="mb-4 space-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                {plan.owner.name}
              </div>
              <div className="flex items-center gap-2">
                <Trash2 className="h-3.5 w-3.5" />
                {plan.deletedAt.toLocaleDateString()}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2">
                <Clock className={cn("h-4 w-4", isExpiring ? "text-red-500" : "text-gray-400")} />
                <span className={cn("text-sm font-medium", isExpiring ? "text-red-600" : "text-gray-900")}>
                  {plan.timeLeftDays} days left
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore(plan.id);
                  }}
                  disabled={isRestoring}
                  className="rounded-lg p-1.5 text-[#0F6E56] transition-colors hover:bg-[#E1F5EE]"
                >
                  {isRestoring ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(plan.id);
                  }}
                  className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isExpiring ? (
              <div className="absolute right-2 top-2">
                <span className="flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <Trash2 className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mb-1 font-medium text-gray-900">No plans in trash</h3>
      <p className="text-sm text-gray-500">Deleted plans will appear here for {RETENTION_DAYS} days</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Toolbar (Search, Filters, Sort, View Toggle)
// ─────────────────────────────────────────────

function Toolbar({
  searchQuery,
  onSearchChange,
  timeFilter,
  onTimeFilterChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  viewMode,
  onViewModeChange,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  timeFilter: TimeFilter;
  onTimeFilterChange: (value: TimeFilter) => void;
  sortBy: SortField;
  onSortByChange: (value: SortField) => void;
  sortOrder: SortOrder;
  onSortOrderToggle: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by plan name or ID…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
        />
      </div>

      <div className="flex gap-2">
        <select
          value={timeFilter}
          onChange={(e) => onTimeFilterChange(e.target.value as TimeFilter)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
        >
          <option value="all">All Time</option>
          <option value="24h">Deleted Today</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="expiring">Expiring Soon (≤7 days)</option>
        </select>

        <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white">
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as SortField)}
            className="border-r border-gray-200 px-3 py-2 text-sm focus:outline-none"
          >
            <option value="timeLeft">Time Left</option>
            <option value="deleted">Deleted Date</option>
            <option value="name">Name</option>
          </select>
          <button
            type="button"
            onClick={onSortOrderToggle}
            className="px-3 py-2 transition-colors hover:bg-gray-50"
          >
            <ArrowUpDown
              className={cn("h-4 w-4 text-gray-600 transition-transform", sortOrder === "desc" && "rotate-180")}
            />
          </button>
        </div>

        <div className="flex rounded-lg bg-gray-100 p-1">
          {(["table", "grid"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                viewMode === mode ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900",
              )}
            >
              {mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────

export default function TrashPage() {
  const [plans, setPlans] = useState<TrashedPlan[]>(MOCK_TRASHED_PLANS);
  const [currentTime] = useState(() => Date.now());
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [sortBy, setSortBy] = useState<SortField>("timeLeft");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // ── Derived state ──

  const filteredPlans = useMemo(() => {
    let result = [...plans];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query),
      );
    }

    // Time filter
    result = result.filter((p) => {
      const deletedDays = (currentTime - p.deletedAt.getTime()) / (1000 * 60 * 60 * 24);
      switch (timeFilter) {
        case "24h":
          return deletedDays <= 1;
        case "7d":
          return deletedDays <= 7;
        case "30d":
          return deletedDays <= 30;
        case "expiring":
          return p.timeLeftDays <= EXPIRY_THRESHOLD_DAYS;
        default:
          return true;
      }
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "timeLeft":
          comparison = a.timeLeftDays - b.timeLeftDays;
          break;
        case "deleted":
          comparison = a.deletedAt.getTime() - b.deletedAt.getTime();
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [plans, searchQuery, timeFilter, sortBy, sortOrder, currentTime]);

  const expiringSoon = useMemo(() => plans.filter((p) => p.timeLeftDays <= EXPIRY_THRESHOLD_DAYS).length, [plans]);

  // ── Selection ──

  const toggleSelection = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [],
  );

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === filteredPlans.length ? new Set() : new Set(filteredPlans.map((p) => p.id)),
    );
  }, [filteredPlans]);

  // ── Actions ──

  const removePlans = useCallback((ids: string[]) => {
    setPlans((prev) => prev.filter((p) => !ids.includes(p.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  const handleRestore = useCallback(
    async (id: string) => {
      setRestoringId(id);
      await new Promise((r) => setTimeout(r, 800));
      removePlans([id]);
      setRestoringId(null);
    },
    [removePlans],
  );

  const handlePermanentDelete = useCallback(
    (id: string) => {
      removePlans([id]);
      setShowDeleteConfirm(null);
    },
    [removePlans],
  );

  const handleBulkRestore = useCallback(async () => {
    const ids = Array.from(selectedIds);
    setRestoringId("bulk");
    await new Promise((r) => setTimeout(r, 1000));
    removePlans(ids);
    setRestoringId(null);
  }, [selectedIds, removePlans]);

  const handleBulkDelete = useCallback(() => {
    removePlans(Array.from(selectedIds));
    setShowBulkDeleteConfirm(false);
  }, [selectedIds, removePlans]);

  // ── Render ──

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#fafafa]">
        <TopHeader />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Trash</h1>
          <p className="mt-1 text-sm text-gray-500">
            Deleted plans are retained for {RETENTION_DAYS} days before automatic permanent deletion.
          </p>
        </div>

        <ExpiringBanner count={expiringSoon} onViewExpiring={() => setTimeFilter("expiring")} />

        <StatsBar total={plans.length} expiringSoon={expiringSoon} selectedCount={selectedIds.size} />

        {/* Main content card */}
        <SectionCard className="mb-6 overflow-hidden">
          <div className="space-y-4 border-b border-gray-200 p-4">
            <Toolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              timeFilter={timeFilter}
              onTimeFilterChange={setTimeFilter}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              sortOrder={sortOrder}
              onSortOrderToggle={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            <AnimatePresence>
              <BulkActionBar
                count={selectedIds.size}
                isRestoring={restoringId === "bulk"}
                onRestore={handleBulkRestore}
                onDelete={() => setShowBulkDeleteConfirm(true)}
                onClear={() => setSelectedIds(new Set())}
              />
            </AnimatePresence>
          </div>

          {viewMode === "table" ? (
            <TrashTableView
              plans={filteredPlans}
              selectedIds={selectedIds}
              restoringId={restoringId}
              onToggle={toggleSelection}
              onToggleAll={toggleAll}
              onRestore={handleRestore}
              onDelete={setShowDeleteConfirm}
            />
          ) : (
            <TrashGridView
              plans={filteredPlans}
              selectedIds={selectedIds}
              restoringId={restoringId}
              onToggle={toggleSelection}
              onRestore={handleRestore}
              onDelete={setShowDeleteConfirm}
            />
          )}

          {filteredPlans.length === 0 ? <EmptyState /> : null}

          {filteredPlans.length > 0 ? (
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-500">
                Showing {filteredPlans.length} of {plans.length} plans
              </p>
            </div>
          ) : null}
        </SectionCard>

        {/* Retention policy info */}
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <History className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-900">Retention Policy</p>
            <p className="mt-1 text-sm text-blue-700/70">
              Plans remain in trash for {RETENTION_DAYS} days before automatic permanent deletion. During this period,
              you can restore plans with all their data, collaborators, and history intact. Once deleted permanently,
              this action cannot be undone.
            </p>
          </div>
        </div>
      </div>

      {/* Single delete confirmation */}
      <AnimatePresence>
        {showDeleteConfirm ? (
          <ConfirmDeleteModal
            title="Delete Permanently?"
            description={`This will permanently delete "${plans.find((p) => p.id === showDeleteConfirm)?.name}" and all associated data including history, comments, and attachments.`}
            onConfirm={() => handlePermanentDelete(showDeleteConfirm)}
            onCancel={() => setShowDeleteConfirm(null)}
          />
        ) : null}
      </AnimatePresence>

      {/* Bulk delete confirmation */}
      <AnimatePresence>
        {showBulkDeleteConfirm ? (
          <ConfirmDeleteModal
            title={`Delete ${selectedIds.size} Plans?`}
            description={`You are about to permanently delete ${selectedIds.size} plans. This action is irreversible and all data will be lost immediately.`}
            onConfirm={handleBulkDelete}
            onCancel={() => setShowBulkDeleteConfirm(false)}
          />
        ) : null}
      </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}