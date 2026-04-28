"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type {
  Patient,
  PatientListItem,
  PatientDetail,
  ClinicalRequirement as PatientClinicalRequirement,
  CreatePatientRequest as CreatePatientRecordRequest,
  UpdatePatientRequest,
  CreateClinicalRequirementRequest,
  UpdateClinicalRequirementRequest,
  PatientFilters,
} from "@/lib/api/types";
import { patientService } from "@/lib/api/services";

interface PatientContextType {
  // Data
  patients: PatientListItem[];
  selectedPatient: PatientDetail | null;
  clinicalRequirements: PatientClinicalRequirement[];

  // States
  isLoading: boolean;
  isLoadingPatient: boolean;
  isLoadingRequirements: boolean;
  error: string | null;

  // Actions
  loadPatients: (filters?: PatientFilters) => Promise<void>;
  loadPatient: (id: string) => Promise<PatientDetail>;
  createPatient: (data: CreatePatientRecordRequest) => Promise<PatientDetail>;
  updatePatient: (id: string, data: UpdatePatientRequest) => Promise<PatientDetail>;
  deactivatePatient: (id: string) => Promise<void>;
  markDeceased: (id: string, deceasedDate?: string) => Promise<void>;
  selectPatient: (patient: PatientDetail | null) => void;
  clearSelectedPatient: () => void;

  // Clinical Requirements
  loadClinicalRequirements: (patientId: string) => Promise<void>;
  createClinicalRequirement: (data: CreateClinicalRequirementRequest) => Promise<PatientClinicalRequirement>;
  updateClinicalRequirement: (id: string, data: UpdateClinicalRequirementRequest) => Promise<PatientClinicalRequirement>;
  deleteClinicalRequirement: (id: string) => Promise<void>;
  resolveClinicalRequirement: (id: string) => Promise<PatientClinicalRequirement>;
  refreshPatients: () => Promise<void>;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientDetail | null>(null);
  const [clinicalRequirements, setClinicalRequirements] = useState<PatientClinicalRequirement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPatients = useCallback(async (filters: PatientFilters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await patientService.getPatients({
        ...filters,
        page_size: 100,
      });
      setPatients(response.results || []);
    } catch (err) {
      console.error("Failed to load patients:", err);
      setError("Failed to load patients");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPatient = useCallback(async (id: string) => {
    try {
      setIsLoadingPatient(true);
      setError(null);
      const patient = await patientService.getPatient(id);
      setSelectedPatient(patient);
      return patient;
    } catch (err) {
      console.error("Failed to load patient:", err);
      setError("Failed to load patient details");
      throw err;
    } finally {
      setIsLoadingPatient(false);
    }
  }, []);

  const createPatient = useCallback(async (data: CreatePatientRecordRequest) => {
    try {
      setError(null);
      const patient = await patientService.createPatient(data);
      await loadPatients();
      return patient;
    } catch (err) {
      console.error("Failed to create patient:", err);
      setError("Failed to create patient");
      throw err;
    }
  }, [loadPatients]);

  const updatePatient = useCallback(async (id: string, data: UpdatePatientRequest) => {
    try {
      setError(null);
      const patient = await patientService.updatePatient(id, data);
      if (selectedPatient?.id === id) {
        setSelectedPatient(patient);
      }
      await loadPatients();
      return patient;
    } catch (err) {
      console.error("Failed to update patient:", err);
      setError("Failed to update patient");
      throw err;
    }
  }, [selectedPatient, loadPatients]);

  const deactivatePatient = useCallback(async (id: string) => {
    try {
      setError(null);
      await patientService.deactivatePatient(id);
      if (selectedPatient?.id === id) {
        await loadPatient(id);
      }
      await loadPatients();
    } catch (err) {
      console.error("Failed to deactivate patient:", err);
      setError("Failed to deactivate patient");
      throw err;
    }
  }, [selectedPatient, loadPatient, loadPatients]);

  const markDeceased = useCallback(async (id: string, deceasedDate?: string) => {
    try {
      setError(null);
      await patientService.markDeceased(id, { deceased_date: deceasedDate });
      if (selectedPatient?.id === id) {
        await loadPatient(id);
      }
      await loadPatients();
    } catch (err) {
      console.error("Failed to mark patient as deceased:", err);
      setError("Failed to mark patient as deceased");
      throw err;
    }
  }, [selectedPatient, loadPatient, loadPatients]);

  const selectPatient = useCallback((patient: PatientDetail | null) => {
    setSelectedPatient(patient);
  }, []);

  const clearSelectedPatient = useCallback(() => {
    setSelectedPatient(null);
    setClinicalRequirements([]);
  }, []);

  const loadClinicalRequirements = useCallback(async (patientId: string) => {
    try {
      setIsLoadingRequirements(true);
      setError(null);
      const requirements = await patientService.getPatientClinicalRequirements(patientId);
      setClinicalRequirements(requirements);
    } catch (err) {
      console.error("Failed to load clinical requirements:", err);
      setError("Failed to load clinical requirements");
    } finally {
      setIsLoadingRequirements(false);
    }
  }, []);

  const createClinicalRequirement = useCallback(async (data: CreateClinicalRequirementRequest) => {
    try {
      setError(null);
      const requirement = await patientService.createClinicalRequirement(data);
      if (selectedPatient) {
        await loadClinicalRequirements(selectedPatient.id);
      }
      return requirement;
    } catch (err) {
      console.error("Failed to create clinical requirement:", err);
      setError("Failed to create clinical requirement");
      throw err;
    }
  }, [selectedPatient, loadClinicalRequirements]);

  const updateClinicalRequirement = useCallback(async (id: string, data: UpdateClinicalRequirementRequest) => {
    try {
      setError(null);
      const requirement = await patientService.updateClinicalRequirement(id, data);
      if (selectedPatient) {
        await loadClinicalRequirements(selectedPatient.id);
      }
      return requirement;
    } catch (err) {
      console.error("Failed to update clinical requirement:", err);
      setError("Failed to update clinical requirement");
      throw err;
    }
  }, [selectedPatient, loadClinicalRequirements]);

  const deleteClinicalRequirement = useCallback(async (id: string) => {
    try {
      setError(null);
      await patientService.deleteClinicalRequirement(id);
      if (selectedPatient) {
        await loadClinicalRequirements(selectedPatient.id);
      }
    } catch (err) {
      console.error("Failed to delete clinical requirement:", err);
      setError("Failed to delete clinical requirement");
      throw err;
    }
  }, [selectedPatient, loadClinicalRequirements]);

  const resolveClinicalRequirement = useCallback(async (id: string) => {
    try {
      setError(null);
      const requirement = await patientService.resolveClinicalRequirement(id);
      if (selectedPatient) {
        await loadClinicalRequirements(selectedPatient.id);
      }
      return requirement;
    } catch (err) {
      console.error("Failed to resolve clinical requirement:", err);
      setError("Failed to resolve clinical requirement");
      throw err;
    }
  }, [selectedPatient, loadClinicalRequirements]);

  const refreshPatients = useCallback(async () => {
    await loadPatients();
  }, [loadPatients]);

  return (
    <PatientContext.Provider
      value={{
        patients,
        selectedPatient,
        clinicalRequirements,
        isLoading,
        isLoadingPatient,
        isLoadingRequirements,
        error,
        loadPatients,
        loadPatient,
        createPatient,
        updatePatient,
        deactivatePatient,
        markDeceased,
        selectPatient,
        clearSelectedPatient,
        loadClinicalRequirements,
        createClinicalRequirement,
        updateClinicalRequirement,
        deleteClinicalRequirement,
        resolveClinicalRequirement,
        refreshPatients,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error("usePatient must be used within a PatientProvider");
  }
  return context;
}
