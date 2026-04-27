"use client";

import React from "react";
import {
  LayoutDashboard,
  Bed,
  UserPlus,
  ArrowRightLeft,
  LogOut,
  Sparkles,
  Users,
  BarChart3,
  Bell,
  Settings,
  HelpCircle,
  X,
  HeartPulse,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SidebarItem from "./SidebarItem";
import { useRouter, usePathname } from "next/navigation";
import FrontendRoutes from "@/lib/api/FrontendRoutes";
import appConfig from "@/lib/appconfig";

interface SidebarProps {
  hospitalName: string;
  hospitalCode: string;
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: FrontendRoutes.dashboard },
  { key: "departments", label: "Departments", icon: Building2, path: FrontendRoutes.departments },
  { key: "wards", label: "Wards", icon: HeartPulse, path: FrontendRoutes.wards },
  { key: "beds", label: "Bed Management", icon: Bed, path: FrontendRoutes.beds.root },
  { key: "admissions", label: "Admissions", icon: UserPlus, path: FrontendRoutes.admissions.root },
  { key: "transfers", label: "Transfers", icon: ArrowRightLeft, path: FrontendRoutes.transfers.root },
  { key: "discharges", label: "Discharges", icon: LogOut, path: FrontendRoutes.discharges.root },
  { key: "housekeeping", label: "Housekeeping", icon: Sparkles, path: FrontendRoutes.housekeeping.root },
  { key: "patients", label: "Patients", icon: Users, path: FrontendRoutes.patients.root },
  { key: "reports", label: "Reports", icon: BarChart3, path: FrontendRoutes.reports.root },
  { key: "alerts", label: "Alerts", icon: Bell, path: FrontendRoutes.alerts.root },
];

export default function Sidebar({
  hospitalName,
  hospitalCode,
  isOpen,
  onClose,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === FrontendRoutes.dashboard) {
      return pathname === path || pathname === FrontendRoutes.home;
    }
    return pathname.startsWith(path);
  };

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
          "lg:relative lg:translate-x-0 lg:w-[260px] lg:flex-shrink-0",
          "fixed top-0 left-0 w-[280px] transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F6E56] flex items-center justify-center flex-shrink-0">
              {/* <HeartPulse className="w-5 h-5 text-white" /> */}
              <img src={appConfig.logos.white_svg} alt="Logo" className="w-5 h-5 object-contain" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-gray-400 font-medium leading-none uppercase tracking-wider">
                Hospital
              </span>
              <span className="text-sm font-bold leading-tight truncate">
                {hospitalName}
              </span>
              <span className="text-xs text-gray-400 truncate">
                {hospitalCode}
              </span>
            </div>
          </div>

          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navigationItems.map((item) => (
            <SidebarItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              active={isActive(item.path)}
              onClick={() => {
                router.push(item.path);
                onClose();
              }}
            />
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-gray-200 p-3 space-y-1">
          <SidebarItem
            icon={Settings}
            label="Settings"
            active={isActive(FrontendRoutes.settings.root)}
            onClick={() => router.push(FrontendRoutes.settings.root)}
          />
          <SidebarItem
            icon={HelpCircle}
            label="Help & Support"
            onClick={() => {}}
          />
        </div>
      </aside>
    </>
  );
}
