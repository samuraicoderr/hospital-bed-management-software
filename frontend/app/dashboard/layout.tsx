"use client";

import React, { useState, useEffect } from "react";
import LoadingScreen from "../components/loading/LoadingScreen";
import Sidebar from "../components/layout/Sidebar";
import TopHeader from "../components/layout/TopHeader";
import { ProtectedRoute, useAuth } from "@/lib/api/auth/authContext";
import { dashboardService, bedService, organizationService } from "@/lib/api/services";
import { BedStatistics, KPIData, Hospital } from "@/lib/api/types";
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

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; label: string; direction: "up" | "down" | "neutral" };
  onClick?: () => void;
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<BedStatistics | null>(null);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        
        // Get user's hospitals
        const hospitalsResponse = await organizationService.getHospitals();
        const hospitals = hospitalsResponse.results || [];
        
        if (hospitals.length === 0) {
          console.error("No hospitals found for user");
          setIsLoading(false);
          return;
        }
        
        const selectedHospital = hospitals[0];
        setHospital(selectedHospital);
        
        const [bedStats, dashboardKPIs] = await Promise.all([
          bedService.getStatistics(selectedHospital.id),
          dashboardService.getKPIData(selectedHospital.id),
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
        hospitalName={hospital?.name || "General Hospital"}
        hospitalCode={hospital?.code || "GH-001"}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <TopHeader
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          hospitalName={hospital?.name || "General Hospital"}
        />

        {children}
      </main>
    </div>
  );
}
