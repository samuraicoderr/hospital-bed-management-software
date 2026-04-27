"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { organizationService } from "@/lib/api/services";
import type { Organization, Hospital } from "@/lib/api/types";

interface OrganizationContextType {
  organizations: Organization[];
  hospitals: Hospital[];
  isLoading: boolean;
  error: string | null;
  loadOrganizations: () => Promise<void>;
  loadHospitals: () => Promise<void>;
  refresh: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrganizations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await organizationService.getOrganizations();
      setOrganizations(response.results || []);
    } catch (err) {
      setError("Failed to load organizations");
      console.error("Failed to load organizations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadHospitals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await organizationService.getHospitals();
      setHospitals(response.results || []);
    } catch (err) {
      setError("Failed to load hospitals");
      console.error("Failed to load hospitals:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadOrganizations(), loadHospitals()]);
  }, [loadOrganizations, loadHospitals]);

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        hospitals,
        isLoading,
        error,
        loadOrganizations,
        loadHospitals,
        refresh,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}
