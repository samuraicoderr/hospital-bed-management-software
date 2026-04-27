"use client";

import React, { useState, useEffect } from "react";
import LoadingScreen from "../../components/loading/LoadingScreen";
import Sidebar from "../../components/layout/Sidebar";
import TopHeader from "../../components/layout/TopHeader";
import { ProtectedRoute } from "@/lib/api/auth/authContext";
import { dischargeService } from "@/lib/api/services";
import { LogOut, CheckCircle, Clock, ArrowRight, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

const HOSPITAL_ID = "123e4567-e89b-12d3-a456-426614174000";

interface Discharge {
  id: string;
  patient: { id: string; mrn: string; name: string };
  bed?: { id: string; bed_code: string };
  status: string;
  discharge_type: string;
  destination: string;
  discharged_at?: string;
  turnover_minutes?: number;
  created_at: string;
}

function DischargeCard({ discharge, onUpdate }: { discharge: Discharge; onUpdate: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{discharge.patient.name}</h3>
          <p className="text-sm text-gray-500">MRN: {discharge.patient.mrn}</p>
          {discharge.bed && (
            <p className="text-sm text-gray-600 mt-1">Bed: {discharge.bed.bed_code}</p>
          )}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          discharge.status === "completed"
            ? "bg-green-100 text-green-700"
            : discharge.status === "approved"
            ? "bg-blue-100 text-blue-700"
            : "bg-amber-100 text-amber-700"
        }`}>
          {discharge.status}
        </span>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Type</span>
            <p className="font-medium text-gray-700 capitalize">{discharge.discharge_type}</p>
          </div>
          <div>
            <span className="text-gray-400">Destination</span>
            <p className="font-medium text-gray-700 capitalize">{discharge.destination.replace("_", " ")}</p>
          </div>
        </div>
        {discharge.turnover_minutes !== undefined && (
          <div className="mt-3 p-2 bg-gray-50 rounded-lg">
            <span className="text-xs text-gray-500">Turnover Time: </span>
            <span className="text-sm font-medium text-gray-700">{discharge.turnover_minutes} min</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DischargesContent() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [discharges, setDischarges] = useState<Discharge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDischarges();
  }, []);

  const loadDischarges = async () => {
    try {
      setIsLoading(true);
      const response = await dischargeService.getDischarges({ hospital: HOSPITAL_ID });
      setDischarges(response.results);
    } catch (error) {
      console.error("Failed to load discharges:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    pending: discharges.filter((d) => d.status === "pending").length,
    approved: discharges.filter((d) => d.status === "approved").length,
    completed: discharges.filter((d) => d.status === "completed").length,
  };

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
        <TopHeader onMenuToggle={() => setSidebarOpen((prev) => !prev)} hospitalName="General Hospital" />

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Discharges</h1>
                <p className="text-gray-500 mt-1">Manage patient discharges and turnover</p>
              </div>
              <button
                onClick={loadDischarges}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-gray-600">Pending</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-gray-600">Approved</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <LogOut className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-600">Completed</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>

            {discharges.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {discharges.map((discharge) => (
                  <DischargeCard key={discharge.id} discharge={discharge} onUpdate={loadDischarges} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <LogOut className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No discharges found</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DischargesPage() {
  return (
    <ProtectedRoute fallback={<LoadingScreen minDuration={700} />}>
      <DischargesContent />
    </ProtectedRoute>
  );
}
