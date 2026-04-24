"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
}

export default function SidebarItem({
  icon: Icon,
  label,
  active = false,
  onClick,
  badge,
}: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-[#E1F5EE] text-[#0F6E56]"
          : "text-gray-600 hover:bg-gray-100"
      )}
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0", active ? "text-[#0F6E56]" : "text-gray-400")} />
      <span className="flex-1 text-left truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          "px-2 py-0.5 text-xs font-bold rounded-full",
          active ? "bg-[#0F6E56] text-white" : "bg-gray-200 text-gray-600"
        )}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}
