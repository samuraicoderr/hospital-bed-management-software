"use client";

import React, { useState } from "react";
import { Plus, LayoutDashboard } from "lucide-react";
import PlanFilters from "./PlanFilters";
import PlanRow, { type PlanData } from "./PlanRow";
import PlanCard from "./PlanCard";
import appConfig from "@/lib/appconfig";

// ─── Mock data — will be replaced by API call ───

const MOCK_PLANS: PlanData[] = [
  {
    id: "1",
    name: "2024 Operating Plan",
    planType: "operator",
    lastModifiedBy: "you",
    lastModifiedAt: "2 hours ago",
    lastOpenedAt: "2 hours ago",
    owner: "you",
    ownerAvatarUrl: appConfig.media.avatarExample,
    componentTypes: ["kpi", "kpi", "kpi", "sheet", "chart", "statement"],
  },
  {
    id: "2",
    name: "Series A Financial Model",
    planType: "fundraising",
    lastModifiedBy: "you",
    lastModifiedAt: "Yesterday",
    lastOpenedAt: "Yesterday",
    owner: "you",
    componentTypes: ["kpi", "kpi", "kpi", "statement", "statement", "chart"],
  },
  {
    id: "3",
    name: "Q1 Budget Review",
    planType: "strategic",
    lastModifiedBy: "you",
    lastModifiedAt: "3 days ago",
    lastOpenedAt: "3 days ago",
    owner: "you",
    componentTypes: ["kpi", "kpi", "sheet", "sheet", "chart", "statement"],
  },
];

interface PlanListSectionProps {
  plans?: PlanData[];
}

export default function PlanListSection({
  plans = MOCK_PLANS,
}: PlanListSectionProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const isEmpty = plans.length === 0;

  return (
    <section>
      {/* Section header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          Plans
        </h2>
        <div className="flex items-center gap-2 sm:gap-3">
          <button className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors">
            Explore templates
          </button>
          <button className="text-sm font-medium text-white bg-[#0F6E56] hover:bg-[#0a5a44] px-3 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
            <Plus size={16} />
            <span className="hidden sm:inline">Create new</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Filters & view toggle */}
      {!isEmpty && (
        <PlanFilters viewMode={viewMode} onViewModeChange={setViewMode} />
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <LayoutDashboard size={28} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No plans yet
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-[320px]">
            Create your first financial plan to start tracking your
            company&apos;s finances automatically.
          </p>
          <button className="text-sm font-medium text-white bg-[#0F6E56] hover:bg-[#0a5a44] px-5 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-2">
            <Plus size={16} />
            Create your first plan
          </button>
        </div>
      )}

      {/* List view */}
      {!isEmpty && viewMode === "list" && (
        <div>
          <div className="hidden sm:grid sm:grid-cols-[1fr_120px_120px_80px] md:grid-cols-[1fr_120px_120px_80px] gap-4 px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-200">
            <div>Name</div>
            <div className="hidden md:block">Last opened</div>
            <div className="hidden lg:block">Owner</div>
            <div />
          </div>

          <div>
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <PlanRow plan={plan} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid view */}
      {!isEmpty && viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <PlanCard plan={plan} />
            </div>
          ))}

          <div
            className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center py-12 cursor-pointer group hover:border-[#0F6E56]/30 hover:bg-[#E1F5EE]/20 transition-colors animate-fade-in-up"
            style={{ animationDelay: `${plans.length * 0.05}s` }}
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-[#E1F5EE] transition-colors">
              <Plus
                size={20}
                className="text-gray-400 group-hover:text-[#0F6E56] transition-colors"
              />
            </div>
            <span className="text-sm font-medium text-gray-500 group-hover:text-[#0F6E56] transition-colors">
              New plan
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
