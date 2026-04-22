"use client";

import React from "react";
import appConfig, { type PlanType, type ComponentType } from "@/lib/appconfig";
import PlanMenu from "./PlanDropDown";
import OwnerAvatar from "./OwnerAvatar";


export interface PlanData {
  id: string;
  name: string;
  planType: PlanType;
  lastModifiedBy: string;
  lastModifiedAt: string;
  lastOpenedAt: string;
  owner: string;
  ownerAvatarUrl?: string;
  componentTypes: ComponentType[];
}

interface PlanRowProps {
  plan: PlanData;
  onClick?: () => void;
}

export default function PlanRow({ plan, onClick }: PlanRowProps) {
  const planColors = appConfig.planTypeColors[plan.planType];

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 sm:py-4 hover:bg-gray-50 rounded-lg transition-colors group cursor-pointer border-b border-gray-100 last:border-b-0"
    >
      {/* Plan icon + info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Icon showing component layout */}
        <div
          className="w-10 h-10 rounded-lg flex-shrink-0 p-1.5 grid grid-cols-2 gap-0.5"
          style={{ backgroundColor: planColors.bgColor }}
        >
          {plan.componentTypes.slice(0, 4).map((type, i) => (
            <div
              key={i}
              className="rounded-[2px]"
              style={{
                backgroundColor: appConfig.componentTypeColors[type]?.accent,
                opacity: 0.3,
              }}
            />
          ))}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {plan.name}
            </span>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 hidden sm:inline-block"
              style={{
                color: planColors.color,
                backgroundColor: planColors.bgColor,
              }}
            >
              {planColors.label}
            </span>
          </div>
          <span className="text-xs text-gray-500 truncate">
            Modified by {plan.lastModifiedBy}, {plan.lastModifiedAt}
          </span>
        </div>
      </div>

      {/* Columns — hidden on mobile */}
      <div className="hidden md:block w-[120px] text-sm text-gray-500 flex-shrink-0">
        {plan.lastOpenedAt}
      </div>
      <div className="hidden lg:flex w-[120px] flex-shrink-0 items-center">
        <OwnerAvatar ownerName={plan.owner} avatarUrl={plan.ownerAvatarUrl} sizeClassName="h-8 w-8" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
  );
}
