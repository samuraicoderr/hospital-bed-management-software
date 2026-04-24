"use client";

import React, { useState, useEffect } from "react";
import {
  Menu,
  Bell,
  Search,
  User,
  LogOut,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/api/auth/authContext";
import FrontendRoutes from "@/lib/api/FrontendRoutes";
import { alertService } from "@/lib/api/services";

interface TopHeaderProps {
  onMenuToggle: () => void;
  hospitalName: string;
}

export default function TopHeader({ onMenuToggle, hospitalName }: TopHeaderProps) {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const checkAlerts = async () => {
      try {
        const stats = await alertService.getStats();
        setUnreadAlerts(stats.unread);
      } catch (e) {
        // Silently fail
      }
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push(FrontendRoutes.auth.login);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 lg:hidden"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Search button */}
        <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
          <Search className="w-5 h-5" />
        </button>

        {/* Alerts */}
        <button
          onClick={() => router.push(FrontendRoutes.alerts.root)}
          className="relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <Bell className="w-5 h-5" />
          {unreadAlerts > 0 && (
            <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadAlerts > 9 ? "9+" : unreadAlerts}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            <div className="w-8 h-8 rounded-full bg-[#0F6E56] flex items-center justify-center text-white text-sm font-medium">
              {user?.first_name?.[0] || user?.email?.[0] || "U"}
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700">
              {user?.first_name} {user?.last_name}
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  router.push(FrontendRoutes.settings.root);
                }}
                className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
