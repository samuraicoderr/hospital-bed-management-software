"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { organizationService } from "@/lib/api/services";
import type { Ward } from "@/lib/api/types";

interface WardContextType {
  wards: Ward[];
  isLoading: boolean;
  error: string | null;
  loadWards: (departmentId: string) => Promise<void>;
  refresh: (departmentId: string) => Promise<void>;
  createWard: (data: any) => Promise<Ward>;
  updateWard: (id: string, data: any) => Promise<Ward>;
  deleteWard: (id: string) => Promise<void>;
}

const WardContext = createContext<WardContextType | undefined>(undefined);

export function WardProvider({ children }: { children: ReactNode }) {
  const [wards, setWards] = useState<Ward[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWards = useCallback(async (departmentId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const w = await organizationService.getWards(departmentId);
      setWards(w);
    } catch (err) {
      setError("Failed to load wards");
      console.error("Failed to load wards:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async (departmentId: string) => {
    await loadWards(departmentId);
  }, [loadWards]);

  const createWard = useCallback(async (data: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const ward = await organizationService.createWard(data);
      setWards((prev) => [...prev, ward]);
      return ward;
    } catch (err) {
      setError("Failed to create ward");
      console.error("Failed to create ward:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateWard = useCallback(async (id: string, data: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const ward = await organizationService.updateWard(id, data);
      setWards((prev) => prev.map((w) => (w.id === id ? ward : w)));
      return ward;
    } catch (err) {
      setError("Failed to update ward");
      console.error("Failed to update ward:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteWard = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await organizationService.deleteWard(id);
      setWards((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      setError("Failed to delete ward");
      console.error("Failed to delete ward:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <WardContext.Provider
      value={{
        wards,
        isLoading,
        error,
        loadWards,
        refresh,
        createWard,
        updateWard,
        deleteWard,
      }}
    >
      {children}
    </WardContext.Provider>
  );
}

export function useWard() {
  const context = useContext(WardContext);
  if (context === undefined) {
    throw new Error("useWard must be used within a WardProvider");
  }
  return context;
}
