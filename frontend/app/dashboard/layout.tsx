"use client";

import React, { useState } from "react";
import LoadingScreen from "../components/loading/LoadingScreen";
import Sidebar from "../components/layout/Sidebar";
import TopHeader from "../components/layout/TopHeader";
import { ProtectedRoute } from "@/lib/api/auth/authContext";
import { OrganizationProvider, HospitalProvider, DepartmentProvider, WardProvider, PatientProvider, AdmissionProvider } from "@/lib/api/contexts";
import { useHospital } from "@/lib/api/contexts/HospitalContext";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <OrganizationProvider>
        <HospitalProvider>
          <PatientProvider>
            <AdmissionProvider>
              <DashboardLayoutContent sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                <DepartmentProvider>
                  <WardProvider>
                    {children}
                  </WardProvider>
                </DepartmentProvider>
              </DashboardLayoutContent>
            </AdmissionProvider>
          </PatientProvider>
        </HospitalProvider>
      </OrganizationProvider>
    </ProtectedRoute>
  );
}

function DashboardLayoutContent({
  sidebarOpen,
  setSidebarOpen,
  children,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const { hospital, isLoading, error } = useHospital();

  if (isLoading) {
    return <LoadingScreen minDuration={800} />;
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-gray-500 text-sm mt-2">Please contact support if this persists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans text-gray-900 overflow-hidden">
      <Sidebar
        hospitalName={hospital?.name || "General Hospital"}
        hospitalCode={hospital?.code || "GH-001"}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopHeader
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          hospitalName={hospital?.name || "General Hospital"}
        />

        {children}
      </main>
    </div>
  );
}
