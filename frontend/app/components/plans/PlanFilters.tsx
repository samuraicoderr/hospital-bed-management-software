"use client";

import React from "react";
import { ChevronDown, Grid, List as ListIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanFiltersProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

export default function PlanFilters({
  viewMode,
  onViewModeChange,
}: PlanFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
      {/* Filter dropdowns */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <button className="flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors">
          All plans
          <ChevronDown size={14} className="text-gray-400" />
        </button>
        <button className="flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors">
          <span className="hidden sm:inline">Owned by anyone</span>
          <span className="sm:hidden">All owners</span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>
      </div>

      {/* Sort + View toggle */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <span className="hidden sm:inline">Sort by</span>
          <button className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900 transition-colors">
            Last opened
            <ChevronDown size={14} />
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center border border-gray-200 rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "p-1.5 rounded transition-colors",
              viewMode === "grid"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-400 hover:text-gray-600"
            )}
            aria-label="Grid view"
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={cn(
              "p-1.5 rounded transition-colors",
              viewMode === "list"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-400 hover:text-gray-600"
            )}
            aria-label="List view"
          >
            <ListIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
