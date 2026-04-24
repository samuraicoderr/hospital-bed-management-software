"use client";

import React, { useState, useEffect } from "react";
import LoadingScreen from "../components/loading/LoadingScreen";
import Sidebar from "../components/layout/Sidebar";
import TopHeader from "../components/layout/TopHeader";
import { ProtectedRoute } from "@/lib/api/auth/authContext";
import { housekeepingService } from "@/lib/api/services";
import { CleaningTask, CleaningStatus } from "@/lib/api/types";
import {
  Sparkles,
  Clock,
  AlertTriangle,
  CheckCircle,
  Play,
  User,
} from "lucide-react";

const HOSPITAL_ID = "123e4567-e89b-12d3-a456-426614174000";

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
  assigned: { bg: "bg-blue-100", text: "text-blue-700", label: "Assigned" },
  in_progress: { bg: "bg-purple-100", text: "text-purple-700", label: "In Progress" },
  completed: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
  overdue: { bg: "bg-red-100", text: "text-red-700", label: "Overdue" },
  escalated: { bg: "bg-violet-100", text: "text-violet-700", label: "Escalated" },
};

function TaskCard({ task, onUpdate }: { task: CleaningTask; onUpdate: () => void }) {
  const config = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const isOverdue = task.sla_breached;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">{task.bed.bed_code}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
              {config.label}
            </span>
          </div>
          <p className="text-sm text-gray-500">{task.bed.ward_name}</p>
          <p className="text-sm text-gray-500">{task.bed.department_name}</p>
        </div>
        {isOverdue && (
          <div className="flex items-center gap-1 text-red-600">
            <AlertTriangle size={16} />
            <span className="text-xs font-medium">SLA Breached</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1 text-gray-500">
          <Clock size={14} />
          <span>SLA: {new Date(task.sla_deadline).toLocaleTimeString()}</span>
        </div>
        {task.assigned_to && (
          <div className="flex items-center gap-1 text-gray-500">
            <User size={14} />
            <span>{task.assigned_to.name}</span>
          </div>
        )}
      </div>

      {task.status === "assigned" && (
        <button
          onClick={async () => {
            await housekeepingService.startTask(task.id);
            onUpdate();
          }}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#0F6E56] text-white rounded-lg hover:bg-[#0a5a44] transition-colors"
        >
          <Play size={16} />
          Start Cleaning
        </button>
      )}

      {task.status === "in_progress" && (
        <button
          onClick={async () => {
            await housekeepingService.completeTask(task.id);
            onUpdate();
          }}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <CheckCircle size={16} />
          Complete
        </button>
      )}
    </div>
  );
}

function HousekeepingContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CleaningStatus | "">("");

  useEffect(() => {
    loadTasks();
  }, [statusFilter]);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const response = await housekeepingService.getTasks({
        hospital: HOSPITAL_ID,
        status: statusFilter || undefined,
      });
      setTasks(response.results);
    } catch (error) {
      console.error("Failed to load tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTasks = tasks;

  const stats = {
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: tasks.filter((t) => t.sla_breached).length,
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
                <h1 className="text-2xl font-bold text-gray-900">Housekeeping</h1>
                <p className="text-gray-500 mt-1">Manage cleaning tasks and bed turnover</p>
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
                  <Play className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-gray-600">In Progress</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.in_progress}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-600">Completed</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-gray-600">Overdue</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              {["", "pending", "in_progress", "completed", "overdue"].map((status) => (
                <button
                  key={status || "all"}
                  onClick={() => setStatusFilter(status as CleaningStatus | "")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? "bg-[#0F6E56] text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {status ? status.replace("_", " ") : "All Tasks"}
                </button>
              ))}
            </div>

            {filteredTasks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onUpdate={loadTasks} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No cleaning tasks found</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function HousekeepingPage() {
  return (
    <ProtectedRoute fallback={<LoadingScreen minDuration={700} />}>
      <HousekeepingContent />
    </ProtectedRoute>
  );
}
