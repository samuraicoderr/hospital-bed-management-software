"use client";

import React, { useState, useEffect } from "react";
import LoadingScreen from "../../components/loading/LoadingScreen";
import Sidebar from "../../components/layout/Sidebar";
import TopHeader from "../../components/layout/TopHeader";
import { ProtectedRoute } from "@/lib/api/auth/authContext";
import { alertService } from "@/lib/api/services";
import { Alert, AlertSeverity, AlertType } from "@/lib/api/types";
import {
  Bell,
  AlertCircle,
  AlertTriangle,
  Info,
  Siren,
  CheckCircle,
  Filter,
  Trash2,
} from "lucide-react";

const HOSPITAL_ID = "123e4567-e89b-12d3-a456-426614174000";

const SEVERITY_CONFIG: Record<string, { icon: any; bg: string; text: string; border: string }> = {
  info: { icon: Info, bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  warning: { icon: AlertTriangle, bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  critical: { icon: AlertCircle, bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  emergency: { icon: Siren, bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
};

function AlertCard({ alert, onUpdate }: { alert: Alert; onUpdate: () => void }) {
  const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
  const Icon = config.icon;

  return (
    <div
      className={`bg-white border rounded-xl p-4 ${alert.is_read ? "border-gray-200 opacity-70" : `${config.border} shadow-sm`}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
          <Icon className={`w-5 h-5 ${config.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-semibold ${alert.is_read ? "text-gray-600" : "text-gray-900"}`}>
              {alert.title}
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${config.bg} ${config.text} ${config.border}`}>
              {alert.severity_display}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-400">
              {new Date(alert.created_at).toLocaleString()}
            </span>
            {!alert.is_read && (
              <button
                onClick={async () => {
                  await alertService.acknowledgeAlert(alert.id);
                  onUpdate();
                }}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-[#0F6E56] hover:bg-[#E1F5EE] rounded-lg transition-colors"
              >
                <CheckCircle size={14} />
                Mark Read
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertsContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "">("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [severityFilter, showUnreadOnly]);

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      const response = await alertService.getAlerts({
        hospital: HOSPITAL_ID,
        severity: severityFilter || undefined,
        is_read: showUnreadOnly ? false : undefined,
      });
      setAlerts(response.results);
    } catch (error) {
      console.error("Failed to load alerts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    total: alerts.length,
    unread: alerts.filter((a) => !a.is_read).length,
    critical: alerts.filter((a) => a.severity === "critical" && !a.is_read).length,
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
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
                <p className="text-gray-500 mt-1">System notifications and warnings</p>
              </div>
              {stats.unread > 0 && (
                <button
                  onClick={async () => {
                    await alertService.markAsRead({ mark_all: true });
                    loadAlerts();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0F6E56] text-white rounded-lg hover:bg-[#0a5a44] transition-colors"
                >
                  <CheckCircle size={18} />
                  Mark All Read
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="w-5 h-5 text-[#0F6E56]" />
                  <span className="text-sm text-gray-600">Total Alerts</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-gray-600">Unread</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.unread}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-gray-600">Critical</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.critical}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showUnreadOnly
                    ? "bg-[#0F6E56] text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                Unread Only
              </button>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | "")}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6E56]/20 focus:border-[#0F6E56] outline-none"
              >
                <option value="">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            <div className="space-y-3">
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} onUpdate={loadAlerts} />
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No alerts found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AlertsPage() {
  return (
    <ProtectedRoute fallback={<LoadingScreen minDuration={700} />}>
      <AlertsContent />
    </ProtectedRoute>
  );
}
