"use client";

import React from "react";
import appConfig from "@/lib/appconfig";
import type { PlanData } from "./PlanRow";
import PlanMenu from "./PlanDropDown";
import OwnerAvatar from "./OwnerAvatar";

interface PlanCardProps {
  plan: PlanData;
  onClick?: () => void;
}

export default function PlanCard({ plan, onClick }: PlanCardProps) {
  const planColors = appConfig.planTypeColors[plan.planType];

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer group hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Canvas preview */}
      <div
        className="h-[120px] sm:h-[140px] p-4 relative"
        style={{ backgroundColor: `${planColors.bgColor}40` }}
      >
        {/* Mini component blocks representing the canvas */}
        <div className="grid grid-cols-3 gap-1.5 h-full">
          {plan.componentTypes.slice(0, 6).map((type, i) => (
            <div
              key={i}
              className="rounded-md transition-transform group-hover:scale-[1.02]"
              style={{
                backgroundColor: appConfig.componentTypeColors[type]?.bg,
                border: `1px solid ${appConfig.componentTypeColors[type]?.accent}20`,
              }}
            />
          ))}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3">
          <span className="text-sm font-medium text-white bg-[#0F6E56] px-4 py-1.5 rounded-lg shadow-md translate-y-2 group-hover:translate-y-0 transition-transform">
            Open plan
          </span>
        </div>

        {/* Actions — top right on hover */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div onClick={(e) => e.stopPropagation()}>
            <PlanMenu
              planName={plan.name}
              onShare={() => console.log(`Share ${plan.id}`)}
              onCopyLink={() => console.log(`Copy link ${plan.id}`)}
              onOpenInNewTab={() => window.open(`/plans/${plan.id}`, "_blank")}
              onStar={() => console.log(`Toggle star ${plan.id}`)}
              onRename={() => console.log(`Rename ${plan.id}`)}
              onDuplicate={() => console.log(`Duplicate ${plan.id}`)}
              onChangeThumbnail={() => console.log(`Thumbnail ${plan.id}`)}
              onViewDetails={() => console.log(`Details ${plan.id}`)}
              onMakePrivate={() => console.log(`Privacy ${plan.id}`)}
              onDownloadBackup={() => console.log(`Download ${plan.id}`)}
              onDelete={() => console.log(`Delete ${plan.id}`)}
            />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold text-gray-900 truncate flex-1">
            {plan.name}
          </h3>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{
              color: planColors.color,
              backgroundColor: planColors.bgColor,
            }}
          >
            {planColors.label}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-gray-500 truncate">
            Edited {plan.lastModifiedAt}
          </p>
          <OwnerAvatar
            ownerName={plan.owner}
            avatarUrl={plan.ownerAvatarUrl}
            sizeClassName="h-7 w-7"
          />
        </div>
      </div>
    </div>
  );
}
