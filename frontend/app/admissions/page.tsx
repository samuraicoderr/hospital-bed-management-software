"use client";

import React, { useState, useEffect } from "react";
import LoadingScreen from "../components/loading/LoadingScreen";
import Sidebar from "../components/layout/Sidebar";
import TopHeader from "../components/layout/TopHeader";
import { ProtectedRoute } from "@/lib/api/auth/authContext";
import { admissionService } from "@/lib/api/services";
import { AdmissionRequest, Priority, AdmissionStatus } from "@/lib/api/types";
import {
  UserPlus,
  Clock,
  AlertCircle,
  CheckCircle,
  MapPin,
  Bed,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import FrontendRoutes from "@/lib/api/FrontendRoutes";

const HOSPITAL_ID = "123e4567-e89b-12d3-a456-426614174000";

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; icon: any }> = {
  stat: { bg: "bg-red-50", text: "text-red-700", icon: AlertCircle },
  emergency: { bg: "bg-orange-50", text: "text-orange-700", icon: AlertCircle },
  urgent: { bg: "bg-amber-50", text: "text-amber-700", icon: Clock },
  routine: { bg: "bg-blue-50", text: "text-blue-700", icon: CheckCircle },
};

function AdmissionsContent() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState<AdmissionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      const response = await admissionService.getAdmissionRequests({
        hospital: HOSPITAL_ID,
      });
      setRequests(response.results);
    } catch (error) {
      console.error("Failed to load admissions:", error);
    } finally {
      setIsLoading(false);
    }
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
        <TopHeader
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          hospitalName="General Hospital"
        />

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admissions</h1>
                <p className="text-gray-500 mt-1">Manage patient admission requests</p>
              </div>
              <button
                onClick={() => router.push(FrontendRoutes.admissions.new)}
                className="flex items-center gap-2 px-4 py-2 bg-[#0F6E56] text-white rounded-lg hover:bg-[#0a5a44] transition-colors"
              >
                <UserPlus size={18} />
                New Admission
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-gray-600">Pending</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter((r) => r.status === "pending").length}
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-600">Approved</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter((r) => r.status === "approved").length}
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-gray-600">Assigned</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter((r) => r.status === "assigned").length}
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-gray-600">Urgent</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter((r) => r.priority === "urgent" || r.priority === "emergency").length}
                </p>
              </div>
            </div>

            {requests.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {requests.map((request) => (
                  <div key={request.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {request.patient?.first_name} {request.patient?.last_name}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {request.priority_display}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">MRN: {request.patient?.mrn}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        {request.status_display}
                      </span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Source: {request.admission_source_display}</span>
                        <span className="text-gray-500">Bed Type: {request.required_bed_type}</span>
                      </div>
                    </div>
                    {request.status === "pending" && (
                      <button className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#0F6E56] text-white rounded-lg hover:bg-[#0a5a44] transition-colors">
                        <Bed size={16} />
                        Assign Bed
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No admission requests found</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdmissionsPage() {
  return (
    <ProtectedRoute fallback={<LoadingScreen minDuration={700} />}>
      <AdmissionsContent />
    </ProtectedRoute>
  );
}
