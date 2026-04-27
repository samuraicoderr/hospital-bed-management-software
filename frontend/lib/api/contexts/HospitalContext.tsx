"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Hospital, BedStatistics, KPIData, Organization } from "@/lib/api/types";
import { bedService, organizationService, dashboardService } from "@/lib/api/services";

interface HospitalContextType {
  // Data
  hospital: Hospital | null;
  hospitals: Hospital[];
  organization: Organization | null;
  stats: BedStatistics | null;
  kpiData: KPIData | null;

  // States
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  selectHospital: (hospitalId: string) => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

export function HospitalProvider({ children }: { children: React.ReactNode }) {
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [stats, setStats] = useState<BedStatistics | null>(null);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHospitalData = useCallback(async (hospitalId: string) => {
    try {
      const [bedStats, kpis] = await Promise.all([
        bedService.getStatistics(hospitalId),
        dashboardService.getKPIData(hospitalId),
      ]);
      setStats(bedStats);
      setKpiData(kpis);
      setError(null);
    } catch (err) {
      console.error("Failed to load hospital data:", err);
      setError("Failed to load hospital statistics");
    }
  }, []);

  const initialize = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch hospitals (could also fetch organization here if needed)
      const hospitalsResponse = await organizationService.getHospitals();
      const hospitalsList = hospitalsResponse.results || [];

      if (hospitalsList.length === 0) {
        setError("No hospitals found for your account");
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      setHospitals(hospitalsList);
      const defaultHospital = hospitalsList[0];
      setHospital(defaultHospital);

      await loadHospitalData(defaultHospital.id);
      setIsInitialized(true);
    } catch (err) {
      console.error("Failed to initialize:", err);
      setError("Failed to load your hospitals");
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  }, [loadHospitalData]);

  const selectHospital = useCallback(async (hospitalId: string) => {
    const target = hospitals.find((h) => h.id === hospitalId);
    if (!target) return;

    setHospital(target);
    setStats(null);
    setKpiData(null);
    await loadHospitalData(hospitalId);
  }, [hospitals, loadHospitalData]);

  const refreshStats = useCallback(async () => {
    if (!hospital) return;
    await loadHospitalData(hospital.id);
  }, [hospital, loadHospitalData]);

  const refreshAll = useCallback(async () => {
    await initialize();
  }, [initialize]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <HospitalContext.Provider
      value={{
        hospital,
        hospitals,
        organization,
        stats,
        kpiData,
        isLoading,
        isInitialized,
        error,
        selectHospital,
        refreshStats,
        refreshAll,
      }}
    >
      {children}
    </HospitalContext.Provider>
  );
}

export function useHospital() {
  const context = useContext(HospitalContext);
  if (context === undefined) {
    throw new Error("useHospital must be used within a HospitalProvider");
  }
  return context;
}