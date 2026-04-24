"use client";

import React, { useState, useEffect } from "react";
import LoadingScreen from "../components/loading/LoadingScreen";
import Sidebar from "../components/layout/Sidebar";
import TopHeader from "../components/layout/TopHeader";
import { ProtectedRoute } from "@/lib/api/auth/authContext";
import { dashboardService, bedService } from "@/lib/api/services";
import { BedStatistics, KPIData } from "@/lib/api/types";
import {
  Bed,
  Users,
  Sparkles,
  Clock,
  AlertTriangle,
  TrendingUp,
  Activity,
  HeartPulse,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import FrontendRoutes from "@/lib/api/FrontendRoutes";

const HOSPITAL_ID = "123e4567-e89b-12d3-a456-426614174000";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; label: string; direction: "up" | "down" | "neutral" };
  onClick?: () => void;
}

function KPICard({ title, value, icon: Icon, color, trend, onClick }: KPICardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp
                className={trend.direction === "up" ? "text-green-500" : "text-red-500"}
                size={16}
              />
              <span className={trend.direction === "up" ? "text-green-600 text-xs font-medium" : "text-red-600 text-xs font-medium"}>
                {trend.value}%
              </span>
              <span className="text-xs text-gray-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: color + "20" }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<BedStatistics | null>(null);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        const [bedStats, dashboardKPIs] = await Promise.all([
          bedService.getStatistics(HOSPITAL_ID),
          dashboardService.getKPIData(HOSPITAL_ID),
        ]);
        setStats(bedStats);
        setKpiData(dashboardKPIs);
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (isLoading) {
    return <LoadingScreen minDuration={800} />;
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans text-gray-900 overflow-hidden">
      <Sidebar
        hospitalName="General Hospital"
        hospitalCode="GH-001"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <TopHeader
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          hospitalName="General Hospital"
        />

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-500 mt-1">
                Real-time overview of bed availability and patient flow
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KPICard
                title="Total Beds"
                value={stats?.total || 0}
                icon={Bed}
                color="#0F6E56"
                onClick={() => router.push(FrontendRoutes.beds.root)}
              />
              <KPICard
                title="Occupied Beds"
                value={stats?.occupied || 0}
                icon={Users}
                color="#534AB7"
                trend={{ value: Math.round(stats?.occupancy_rate || 0), label: "occupancy", direction: "up" }}
              />
              <KPICard
                title="Available Beds"
                value={stats?.available || 0}
                icon={CheckCircle}
                color="#0F6E56"
              />
              <KPICard
                title="Cleaning Backlog"
                value={(stats?.cleaning_required || 0) + (stats?.cleaning_in_progress || 0)}
                icon={Sparkles}
                color="#854F0B"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-medium text-gray-600">Admission Queue</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{kpiData?.admission_queue || 0}</p>
                <p className="text-xs text-gray-400 mt-1">Patients waiting</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HeartPulse className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-gray-600">ICU Occupancy</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round((stats?.isolation || 0) / (stats?.total || 1) * 100)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">{stats?.isolation || 0} beds in use</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Avg Length of Stay</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">4.2 days</p>
                <p className="text-xs text-gray-400 mt-1">Target: 3.5 days</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute fallback={<LoadingScreen minDuration={700} />}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
