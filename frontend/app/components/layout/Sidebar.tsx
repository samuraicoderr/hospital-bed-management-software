"use client";

import React from "react";
import {
  Search,
  Plus,
  Home,
  Clock,
  Star,
  Settings,
  HelpCircle,
  X,
  Crown,
  Trash2, 
} from "lucide-react";
import { cn } from "@/lib/utils";
import SidebarItem from "./SidebarItem";
import appConfig from "@/lib/appconfig";
import { useRouter } from "next/navigation";
import { FrontendRoutes } from "@/lib/api/FrontendRoutes";

interface SidebarProps {
  organizationName: string;
  organizationInitials?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  organizationName,
  organizationInitials,
  isOpen,
  onClose,
}: SidebarProps) {
  const initials =
    organizationInitials ||
    organizationName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const router = useRouter(); 

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "flex flex-col bg-white border-r border-gray-200 h-full z-50",
          // Desktop: always visible, fixed width
          "lg:relative lg:translate-x-0 lg:w-[240px] lg:flex-shrink-0",
          // Mobile/Tablet: slide-in drawer
          "fixed top-0 left-0 w-[280px] transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#0F6E56] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-gray-400 font-medium leading-none uppercase tracking-wider">
                Organization
              </span>
              <span className="text-sm font-bold leading-tight truncate">
                {organizationName}
              </span>
            </div>
          </div>

          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 lg:hidden"
          >
            <X size={16} />
          </button>

          {/* Add button — desktop only */}
          <button className="w-6 h-6 hidden lg:flex items-center justify-center rounded hover:bg-gray-100 text-gray-500">
            <Plus size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 mb-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search plans..."
              className="w-full pl-9 pr-3 py-2 bg-gray-100 border-none rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#0F6E56]/30 focus:bg-white transition-all outline-none"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-6 overflow-y-auto scrollbar-thin">
          <div className="space-y-1">
            <SidebarItem icon={Clock} label="Recent" active onClick={()=>{router.push(FrontendRoutes.home)}}/>
            <SidebarItem icon={Star} label="Starred" />
            <SidebarItem icon={Crown} label="Premium" />
            <SidebarItem icon={Trash2} label="Trash" onClick={()=>{router.push(FrontendRoutes.trash)}}/>
          </div>

          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Plans
              </span>
              <button className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <Plus size={14} />
              </button>
            </div>
            {/* Plan list will be populated from API */}
            <p className="px-3 text-xs text-gray-400">No plans yet</p>
          </div>
        </nav>

        {/* Bottom */}
        <div className="border-t border-gray-200 p-2 space-y-1">
          <SidebarItem icon={Settings} label="Admin Console" onClick={()=>{
              router.push(FrontendRoutes.organization);
          }} />
          <SidebarItem icon={HelpCircle} label="Help & support" />
        </div>
      </aside>
    </>
  );
}
