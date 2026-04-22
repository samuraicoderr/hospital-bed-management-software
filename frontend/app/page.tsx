"use client";

import React, { useState } from "react";
import LoadingScreen from "./components/loading/LoadingScreen";
import Sidebar from "./components/layout/Sidebar";
import TopHeader from "./components/layout/TopHeader";
import TemplateSection from "./components/templates/TemplateSection";
import PlanListSection from "./components/plans/PlanListSection";
import { ProtectedRoute } from "@/lib/api/auth/authContext";

/**
 * Organization Detail Page
 *
 * The main dashboard page showing an organization's plans and templates.
 * This is the first screen a user sees after login.
 */
export default function OrganizationDetailPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);


  // TODO: Replace with real org data from API
  const organizationName = "My Startup";

  return (
    <ProtectedRoute fallback={<LoadingScreen minDuration={700} />}>
      <LoadingScreen minDuration={1400} />

      <div className="flex h-screen w-full bg-white font-sans text-gray-900 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          organizationName={organizationName}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          <TopHeader
            onMenuToggle={() => setSidebarOpen((prev) => !prev)}
            teamName={organizationName}
          />

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <TemplateSection />
              <PlanListSection />
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}