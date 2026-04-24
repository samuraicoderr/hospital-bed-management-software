"use client";

import React, { useState, useEffect } from "react";
import LoadingScreen from "../components/loading/LoadingScreen";
import Sidebar from "../components/layout/Sidebar";
import TopHeader from "../components/layout/TopHeader";
import { ProtectedRoute } from "@/lib/api/auth/authContext";
import { bedService } from "@/lib/api/services";
import { BedListItem, BedStatistics, BedStatus } from "@/lib/api/types";
import {
  Bed as BedIcon,
  Search,
  MoreVertical,
  RefreshCw,
} from "lucide-react";

const HOSPITAL_ID = "123e4567-e89b-12d3-a456-426614174000";

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  available: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", label: "Available" },
  occupied: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", label: "Occupied" },
  reserved: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Reserved" },
  cleaning_required: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "Cleaning Required" },
  cleaning_in_progress: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200", label: "Cleaning In Progress" },
  under_maintenance: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200", label: "Maintenance" },
  blocked: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Blocked" },
  isolation: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", label: "Isolation" },
};

function BedCard({ bed }: { bed: BedListItem }) {
  const config = STATUS_CONFIG[bed.status] || STATUS_CONFIG.available;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bg}`}>
            <BedIcon className={`w-5 h-5 ${config.text}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{bed.bed_code}</h3>
            <p className="text-sm text-gray-500">{bed.ward_name}</p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreVertical size={18} />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
          {config.label}
        </span>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          {bed.bed_type_display}
        </span>
        {bed.is_isolation && (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
            Isolation
          </span>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Department</span>
          <span className="font-medium text-gray-700">{bed.department_name}</span>
        </div>
      </div>
    </div>
  );
}

function BedsContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [beds, setBeds] = useState<BedListItem[]>([]);
  const [stats, setStats] = useState<BedStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    loadBeds();
  }, []);

  const loadBeds = async () => {
    try {
      setIsLoading(true);
      const [bedsData, statsData] = await Promise.all([
        bedService.getBeds({ hospital: HOSPITAL_ID, page_size: 50 }),
        bedService.getStatistics(HOSPITAL_ID),
      ]);
      setBeds(bedsData.results);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load beds:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBeds = beds.filter((bed) => {
    const matchesSearch =
      bed.bed_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bed.ward_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter ? bed.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const statsItems = [
    { label: "Total", value: stats?.total || 0, color: "bg-gray-500" },
    { label: "Available", value: stats?.available || 0, color: "bg-green-500" },
    { label: "Occupied", value: stats?.occupied || 0, color: "bg-purple-500" },
    { label: "Cleaning", value: (stats?.cleaning_required || 0) + (stats?.cleaning_in_progress || 0), color: "bg-orange-500" },
    { label: "Maintenance", value: stats?.maintenance || 0, color: "bg-gray-400" },
    { label: "Blocked", value: stats?.blocked || 0, color: "bg-red-500" },
  ];

  if (isLoading) {
    return <LoadingScreen minDuration={500} />;
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bed Management</h1>
                <p className="text-gray-500 mt-1">View and manage all hospital beds</p>
              </div>
              <button
                onClick={loadBeds}
                className="flex items-center gap-2 px-4 py-2 bg-[#0F6E56] text-white rounded-lg hover:bg-[#0a5a44] transition-colors"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
              {statsItems.map((item) => (
                <div key={item.label} className="bg-white border border-gray-200 rounded-xl p-3">
                  <div className={`w-3 h-3 rounded-full ${item.color} mb-2`} />
                  <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search beds..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0F6E56]/20 focus:border-[#0F6E56] outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0F6E56]/20 focus:border-[#0F6E56] outline-none"
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </select>
            </div>

            {filteredBeds.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredBeds.map((bed) => (
                  <BedCard key={bed.id} bed={bed} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <BedIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No beds found matching your criteria</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BedsPage() {
  return (
    <ProtectedRoute fallback={<LoadingScreen minDuration={700} />}>
      <BedsContent />
    </ProtectedRoute>
  );
}

