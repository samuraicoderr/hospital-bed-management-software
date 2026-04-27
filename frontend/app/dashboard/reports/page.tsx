"use client";

import React, { useState } from "react";
import LoadingScreen from "../../components/loading/LoadingScreen";
import Sidebar from "../../components/layout/Sidebar";
import TopHeader from "../../components/layout/TopHeader";
import { ProtectedRoute } from "@/lib/api/auth/authContext";
import { BarChart3, Calendar, Download, FileText, Bed, Users, Clock } from "lucide-react";

const REPORT_TYPES = [
  { id: "daily_census", label: "Daily Census", icon: Bed, description: "Bed occupancy and availability summary" },
  { id: "bed_utilization", label: "Bed Utilization", icon: BarChart3, description: "Department-level utilization rates" },
  { id: "turnover_time", label: "Turnover Time", icon: Clock, description: "Cleaning and bed readiness metrics" },
  { id: "admission_discharge", label: "Admission/Discharge Summary", icon: Users, description: "Patient flow statistics" },
];

function ReportsContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

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
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
              <p className="text-gray-500 mt-1">Generate and download operational reports</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {REPORT_TYPES.map((report) => {
                const Icon = report.icon;
                return (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report.id)}
                    className={`flex items-start gap-4 p-5 bg-white border rounded-xl text-left transition-all ${
                      selectedReport === report.id
                        ? "border-[#0F6E56] ring-2 ring-[#0F6E56]/20"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#E1F5EE] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-[#0F6E56]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{report.label}</h3>
                      <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedReport && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Configuration</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0F6E56]/20 focus:border-[#0F6E56] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0F6E56]/20 focus:border-[#0F6E56] outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#0F6E56] text-white rounded-lg hover:bg-[#0a5a44] transition-colors">
                    <FileText size={18} />
                    Generate Report
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <Download size={18} />
                    Download PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute fallback={<LoadingScreen minDuration={700} />}>
      <ReportsContent />
    </ProtectedRoute>
  );
}
