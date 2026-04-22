"use client";

import React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import appConfig, { type PlanType } from "@/lib/appconfig";
import TemplateThumbnail from "./TemplateThumbnail";

interface TemplateCardProps {
  templateKey: string;
  title: string;
  description: string;
  planType: PlanType;
  componentCount: number;
  isBlank?: boolean;
  onClick?: () => void;
}

export default function TemplateCard({
  templateKey,
  title,
  description,
  planType,
  componentCount,
  isBlank = false,
  onClick,
}: TemplateCardProps) {
  const colors = appConfig.planTypeColors[planType];

  return (
    <div
      onClick={onClick}
      className="flex flex-col gap-2 min-w-[160px] sm:min-w-[180px] cursor-pointer group"
    >
      {/* Thumbnail */}
      <div
        className={cn(
          "h-[110px] sm:h-[120px] w-full rounded-xl border flex items-center justify-center relative overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5",
          isBlank
            ? "bg-white border-dashed border-2 border-gray-300"
            : "bg-gray-50/50 border-gray-200"
        )}
      >
        {isBlank ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-[#E1F5EE] transition-colors">
              <Plus className="text-gray-400 group-hover:text-[#0F6E56] transition-colors" size={20} />
            </div>
            <span className="text-xs text-gray-400 font-medium">Blank plan</span>
          </div>
        ) : (
          <>
            <TemplateThumbnail templateKey={templateKey} planType={planType} />

            {/* Component count badge */}
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-[10px] font-medium text-gray-500 px-1.5 py-0.5 rounded-full shadow-sm">
              {componentCount} components
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
              <span className="text-sm font-medium text-white bg-[#0F6E56] px-3 py-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                Use template
              </span>
            </div>
          </>
        )}
      </div>

      {/* Title & metadata */}
      <div className="flex flex-col gap-1 px-0.5">
        <div className="flex items-center gap-1.5">
          {!isBlank && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: colors?.color }}
            />
          )}
          <span className="text-xs font-semibold text-gray-700 leading-tight line-clamp-1">
            {title}
          </span>
        </div>

        {!isBlank && (
          <span className="text-[11px] text-gray-400 leading-snug line-clamp-2">
            {description}
          </span>
        )}
      </div>
    </div>
  );
}
