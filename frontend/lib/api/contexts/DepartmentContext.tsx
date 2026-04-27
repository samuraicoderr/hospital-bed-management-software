"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { organizationService } from "@/lib/api/services";
import type { Department } from "@/lib/api/types";

interface DepartmentContextType {
  departments: Department[];
  isLoading: boolean;
  error: string | null;
  loadDepartments: (hospitalId: string) => Promise<void>;
  refresh: (hospitalId: string) => Promise<void>;
  createDepartment: (data: any) => Promise<Department>;
  updateDepartment: (id: string, data: any) => Promise<Department>;
  deleteDepartment: (id: string) => Promise<void>;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

export function DepartmentProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDepartments = useCallback(async (hospitalId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const depts = await organizationService.getDepartments(hospitalId);
      setDepartments(depts);
    } catch (err) {
      setError("Failed to load departments");
      console.error("Failed to load departments:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async (hospitalId: string) => {
    await loadDepartments(hospitalId);
  }, [loadDepartments]);

  const createDepartment = useCallback(async (data: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const dept = await organizationService.createDepartment(data);
      setDepartments((prev) => [...prev, dept]);
      return dept;
    } catch (err) {
      setError("Failed to create department");
      console.error("Failed to create department:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateDepartment = useCallback(async (id: string, data: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const dept = await organizationService.updateDepartment(id, data);
      setDepartments((prev) => prev.map((d) => (d.id === id ? dept : d)));
      return dept;
    } catch (err) {
      setError("Failed to update department");
      console.error("Failed to update department:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteDepartment = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await organizationService.deleteDepartment(id);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError("Failed to delete department");
      console.error("Failed to delete department:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <DepartmentContext.Provider
      value={{
        departments,
        isLoading,
        error,
        loadDepartments,
        refresh,
        createDepartment,
        updateDepartment,
        deleteDepartment,
      }}
    >
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartment() {
  const context = useContext(DepartmentContext);
  if (context === undefined) {
    throw new Error("useDepartment must be used within a DepartmentProvider");
  }
  return context;
}
