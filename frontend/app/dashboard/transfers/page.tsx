"use client";

import React, { useState, useEffect } from "react";
import LoadingScreen from "../../components/loading/LoadingScreen";
import Sidebar from "../../components/layout/Sidebar";
import TopHeader from "../../components/layout/TopHeader";
import { ProtectedRoute } from "@/lib/api/auth/authContext";
import { admissionService } from "@/lib/api/services";
import { Transfer, TransferStatus, TransferType } from "@/lib/api/types";
import {
  ArrowRightLeft,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import FrontendRoutes from "@/lib/api/FrontendRoutes";

const HOSPITAL_ID = "123e4567-e89b-12d3-a456-426614174000";

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
  approved: { bg: "bg-blue-100", text: "text-blue-700", label: "Approved" },
  in_progress: { bg: "bg-purple-100", text: "text-purple-700", label: "In Progress" },
  completed: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-700", label: "Cancelled" },
};

const TYPE_LABELS: Record<string, string> = {
  intra_ward: "Intra-ward",
  inter_ward: "Inter-ward",
  inter_hospital: "Inter-hospital",
};

function TransferCard({ transfer, onUpdate }: { transfer: Transfer; onUpdate: () => void }) {
  const statusConfig = STATUS_CONFIG[transfer.status] || STATUS_CONFIG.pending;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">
              {transfer.patient.first_name} {transfer.patient.last_name}
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">MRN: {transfer.patient.mrn}</p>
          <p className="text-xs text-gray-400 mt-1">{TYPE_LABELS[transfer.transfer_type] || transfer.transfer_type} Transfer</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm">
        <div className="flex-1 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">From</p>
          <p className="font-medium text-gray-700">{transfer.from_department.name}</p>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400" />
        <div className="flex-1 p-3 bg-[#E1F5EE] rounded-lg">
          <p className="text-xs text-gray-500 mb-1">To</p>
          <p className="font-medium text-[#0F6E56]">{transfer.to_department.name}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          Requested: {new Date(transfer.requested_at).toLocaleDateString()}
        </div>
        {transfer.status === "pending" && (
          <button
            onClick={async () => {
              await admissionService.approveTransfer(transfer.id);
              onUpdate();
            }}
            className="px-3 py-1.5 bg-[#0F6E56] text-white text-sm rounded-lg hover:bg-[#0a5a44] transition-colors"
          >
            Approve
          </button>
        )}
        {transfer.status === "approved" && (
          <button
            onClick={async () => {
              await admissionService.completeTransfer(transfer.id);
              onUpdate();
            }}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
          >
            Complete
          </button>
        )}
      </div>
    </div>
  );
}

function TransfersContent() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    try {
      setIsLoading(true);
      const response = await admissionService.getTransfers({
        hospital: HOSPITAL_ID,
      });
      setTransfers(response.results);
    } catch (error) {
      console.error("Failed to load transfers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    pending: transfers.filter((t) => t.status === "pending").length,
    approved: transfers.filter((t) => t.status === "approved").length,
    inProgress: transfers.filter((t) => t.status === "in_progress").length,
    completed: transfers.filter((t) => t.status === "completed").length,
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
                <h1 className="text-2xl font-bold text-gray-900">Patient Transfers</h1>
                <p className="text-gray-500 mt-1">Manage intra and inter-ward transfers</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={loadTransfers}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw size={18} />
                  Refresh
                </button>
                <button
                  onClick={() => router.push(FrontendRoutes.transfers.new)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0F6E56] text-white rounded-lg hover:bg-[#0a5a44] transition-colors"
                >
                  <Plus size={18} />
                  New Transfer
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
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
                  <ArrowRightLeft className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-gray-600">In Progress</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-600">Completed</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>

            {transfers.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {transfers.map((transfer) => (
                  <TransferCard key={transfer.id} transfer={transfer} onUpdate={loadTransfers} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <ArrowRightLeft className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No transfers found</p>
                <button
                  onClick={() => router.push(FrontendRoutes.transfers.new)}
                  className="mt-4 px-4 py-2 bg-[#0F6E56] text-white rounded-lg hover:bg-[#0a5a44] transition-colors"
                >
                  Create New Transfer
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function TransfersPage() {
  return (
    <ProtectedRoute fallback={<LoadingScreen minDuration={700} />}>
      <TransfersContent />
    </ProtectedRoute>
  );
}
