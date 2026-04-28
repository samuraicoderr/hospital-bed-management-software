"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type {
  AdmissionRequest,
  Admission,
  Transfer,
  CreateAdmissionRequest,
  UpdateAdmissionRequest,
  CreateTransferRequest,
  UpdateTransferRequest,
  AdmissionUpdatePayload,
  BedListItem,
} from "@/lib/api/types";
import { admissionService } from "@/lib/api/services";

interface AdmissionContextType {
  // Data
  admissionRequests: AdmissionRequest[];
  admissions: Admission[];
  transfers: Transfer[];
  selectedRequest: AdmissionRequest | null;
  selectedAdmission: Admission | null;
  selectedTransfer: Transfer | null;
  suggestedBeds: BedListItem[];

  // States
  isLoading: boolean;
  isLoadingRequests: boolean;
  isLoadingAdmissions: boolean;
  isLoadingTransfers: boolean;
  error: string | null;

  // Actions
  loadAdmissionRequests: (params?: { hospital?: string; status?: string; priority?: string }) => Promise<void>;
  loadAdmissions: (params?: { hospital?: string; department?: string; status?: string }) => Promise<void>;
  loadTransfers: (params?: { hospital?: string; status?: string }) => Promise<void>;
  createAdmissionRequest: (data: CreateAdmissionRequest) => Promise<AdmissionRequest>;
  updateAdmissionRequest: (id: string, data: UpdateAdmissionRequest) => Promise<AdmissionRequest>;
  approveAdmissionRequest: (id: string) => Promise<void>;
  cancelAdmissionRequest: (id: string, reason?: string) => Promise<void>;
  assignBed: (id: string, bedId: string) => Promise<void>;
  reserveBed: (id: string, bedId: string, reservedUntil?: string, reason?: string) => Promise<void>;
  admitPatient: (id: string) => Promise<void>;
  suggestBeds: (id: string) => Promise<BedListItem[]>;
  
  selectRequest: (request: AdmissionRequest | null) => void;
  selectAdmission: (admission: Admission | null) => void;
  selectTransfer: (transfer: Transfer | null) => void;
  
  updateAdmission: (id: string, data: AdmissionUpdatePayload) => Promise<Admission>;
  dischargeAdmission: (id: string, reason?: string) => Promise<void>;
  
  createTransfer: (data: CreateTransferRequest) => Promise<Transfer>;
  updateTransfer: (id: string, data: UpdateTransferRequest) => Promise<Transfer>;
  approveTransfer: (id: string) => Promise<void>;
  initiateTransfer: (id: string) => Promise<void>;
  completeTransfer: (id: string) => Promise<void>;
  rejectTransfer: (id: string, reason?: string) => Promise<void>;
  
  refreshAll: () => Promise<void>;
}

const AdmissionContext = createContext<AdmissionContextType | undefined>(undefined);

export function AdmissionProvider({ children }: { children: React.ReactNode }) {
  const [admissionRequests, setAdmissionRequests] = useState<AdmissionRequest[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<AdmissionRequest | null>(null);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [suggestedBeds, setSuggestedBeds] = useState<BedListItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isLoadingAdmissions, setIsLoadingAdmissions] = useState(false);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAdmissionRequests = useCallback(async (params = {}) => {
    try {
      setIsLoadingRequests(true);
      setError(null);
      const response = await admissionService.getAdmissionRequests({
        ...params,
        page: 1,
        page_size: 100,
      } as any);
      setAdmissionRequests(response.results || []);
    } catch (err) {
      console.error("Failed to load admission requests:", err);
      setError("Failed to load admission requests");
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  const loadAdmissions = useCallback(async (params = {}) => {
    try {
      setIsLoadingAdmissions(true);
      setError(null);
      const response = await admissionService.getActiveAdmissions({
        ...params,
        page: 1,
        page_size: 100,
      } as any);
      setAdmissions(response.results || []);
    } catch (err) {
      console.error("Failed to load admissions:", err);
      setError("Failed to load admissions");
    } finally {
      setIsLoadingAdmissions(false);
    }
  }, []);

  const loadTransfers = useCallback(async (params = {}) => {
    try {
      setIsLoadingTransfers(true);
      setError(null);
      const response = await admissionService.getTransfers({
        ...params,
        page: 1,
        page_size: 100,
      } as any);
      setTransfers(response.results || []);
    } catch (err) {
      console.error("Failed to load transfers:", err);
      setError("Failed to load transfers");
    } finally {
      setIsLoadingTransfers(false);
    }
  }, []);

  const createAdmissionRequest = useCallback(async (data: CreateAdmissionRequest) => {
    try {
      setError(null);
      const request = await admissionService.createAdmissionRequest(data);
      await loadAdmissionRequests();
      return request;
    } catch (err) {
      console.error("Failed to create admission request:", err);
      setError("Failed to create admission request");
      throw err;
    }
  }, [loadAdmissionRequests]);

  const updateAdmissionRequest = useCallback(async (id: string, data: UpdateAdmissionRequest) => {
    try {
      setError(null);
      const request = await admissionService.updateAdmissionRequest(id, data);
      if (selectedRequest?.id === id) {
        setSelectedRequest(request);
      }
      await loadAdmissionRequests();
      return request;
    } catch (err) {
      console.error("Failed to update admission request:", err);
      setError("Failed to update admission request");
      throw err;
    }
  }, [selectedRequest, loadAdmissionRequests]);

  const approveAdmissionRequest = useCallback(async (id: string) => {
    try {
      setError(null);
      await admissionService.approveAdmissionRequest(id);
      if (selectedRequest?.id === id) {
        const updated = await admissionService.getAdmissionRequest(id);
        setSelectedRequest(updated);
      }
      await loadAdmissionRequests();
    } catch (err) {
      console.error("Failed to approve admission request:", err);
      setError("Failed to approve admission request");
      throw err;
    }
  }, [selectedRequest, loadAdmissionRequests]);

  const cancelAdmissionRequest = useCallback(async (id: string, reason?: string) => {
    try {
      setError(null);
      await admissionService.cancelAdmissionRequest(id, reason);
      if (selectedRequest?.id === id) {
        setSelectedRequest(null);
      }
      await loadAdmissionRequests();
    } catch (err) {
      console.error("Failed to cancel admission request:", err);
      setError("Failed to cancel admission request");
      throw err;
    }
  }, [selectedRequest, loadAdmissionRequests]);

  const assignBed = useCallback(async (id: string, bedId: string) => {
    try {
      setError(null);
      await admissionService.assignBed(id, { bed_id: bedId });
      if (selectedRequest?.id === id) {
        const updated = await admissionService.getAdmissionRequest(id);
        setSelectedRequest(updated);
      }
      await loadAdmissionRequests();
    } catch (err) {
      console.error("Failed to assign bed:", err);
      setError("Failed to assign bed");
      throw err;
    }
  }, [selectedRequest, loadAdmissionRequests]);

  const reserveBed = useCallback(async (id: string, bedId: string, reservedUntil?: string, reason?: string) => {
    try {
      setError(null);
      await admissionService.reserveBedForRequest(id, { bed_id: bedId, reserved_until: reservedUntil, reason });
      if (selectedRequest?.id === id) {
        const updated = await admissionService.getAdmissionRequest(id);
        setSelectedRequest(updated);
      }
      await loadAdmissionRequests();
    } catch (err) {
      console.error("Failed to reserve bed:", err);
      setError("Failed to reserve bed");
      throw err;
    }
  }, [selectedRequest, loadAdmissionRequests]);

  const admitPatient = useCallback(async (id: string) => {
    try {
      setError(null);
      await admissionService.admitPatient(id);
      if (selectedRequest?.id === id) {
        setSelectedRequest(null);
      }
      await loadAdmissionRequests();
      await loadAdmissions();
    } catch (err) {
      console.error("Failed to admit patient:", err);
      setError("Failed to admit patient");
      throw err;
    }
  }, [selectedRequest, loadAdmissionRequests, loadAdmissions]);

  const suggestBeds = useCallback(async (id: string) => {
    try {
      setError(null);
      const beds = await admissionService.suggestBeds(id);
      setSuggestedBeds(beds);
      return beds;
    } catch (err) {
      console.error("Failed to suggest beds:", err);
      setError("Failed to suggest beds");
      throw err;
    }
  }, []);

  const updateAdmission = useCallback(async (id: string, data: AdmissionUpdatePayload) => {
    try {
      setError(null);
      const admission = await admissionService.updateAdmission(id, data);
      if (selectedAdmission?.id === id) {
        setSelectedAdmission(admission);
      }
      await loadAdmissions();
      return admission;
    } catch (err) {
      console.error("Failed to update admission:", err);
      setError("Failed to update admission");
      throw err;
    }
  }, [selectedAdmission, loadAdmissions]);

  const dischargeAdmission = useCallback(async (id: string, reason?: string) => {
    try {
      setError(null);
      await admissionService.dischargeAdmission(id, reason);
      if (selectedAdmission?.id === id) {
        setSelectedAdmission(null);
      }
      await loadAdmissions();
    } catch (err) {
      console.error("Failed to discharge admission:", err);
      setError("Failed to discharge admission");
      throw err;
    }
  }, [selectedAdmission, loadAdmissions]);

  const createTransfer = useCallback(async (data: CreateTransferRequest) => {
    try {
      setError(null);
      const transfer = await admissionService.createTransfer(data);
      await loadTransfers();
      return transfer;
    } catch (err) {
      console.error("Failed to create transfer:", err);
      setError("Failed to create transfer");
      throw err;
    }
  }, [loadTransfers]);

  const updateTransfer = useCallback(async (id: string, data: UpdateTransferRequest) => {
    try {
      setError(null);
      const transfer = await admissionService.updateTransfer(id, data);
      if (selectedTransfer?.id === id) {
        setSelectedTransfer(transfer);
      }
      await loadTransfers();
      return transfer;
    } catch (err) {
      console.error("Failed to update transfer:", err);
      setError("Failed to update transfer");
      throw err;
    }
  }, [selectedTransfer, loadTransfers]);

  const approveTransfer = useCallback(async (id: string) => {
    try {
      setError(null);
      await admissionService.approveTransfer(id);
      if (selectedTransfer?.id === id) {
        const updated = await admissionService.getTransfer(id);
        setSelectedTransfer(updated);
      }
      await loadTransfers();
    } catch (err) {
      console.error("Failed to approve transfer:", err);
      setError("Failed to approve transfer");
      throw err;
    }
  }, [selectedTransfer, loadTransfers]);

  const initiateTransfer = useCallback(async (id: string) => {
    try {
      setError(null);
      await admissionService.initiateTransfer(id);
      if (selectedTransfer?.id === id) {
        const updated = await admissionService.getTransfer(id);
        setSelectedTransfer(updated);
      }
      await loadTransfers();
    } catch (err) {
      console.error("Failed to initiate transfer:", err);
      setError("Failed to initiate transfer");
      throw err;
    }
  }, [selectedTransfer, loadTransfers]);

  const completeTransfer = useCallback(async (id: string) => {
    try {
      setError(null);
      await admissionService.completeTransfer(id);
      if (selectedTransfer?.id === id) {
        setSelectedTransfer(null);
      }
      await loadTransfers();
      await loadAdmissions();
    } catch (err) {
      console.error("Failed to complete transfer:", err);
      setError("Failed to complete transfer");
      throw err;
    }
  }, [selectedTransfer, loadTransfers, loadAdmissions]);

  const rejectTransfer = useCallback(async (id: string, reason?: string) => {
    try {
      setError(null);
      await admissionService.rejectTransfer(id, reason);
      if (selectedTransfer?.id === id) {
        setSelectedTransfer(null);
      }
      await loadTransfers();
    } catch (err) {
      console.error("Failed to reject transfer:", err);
      setError("Failed to reject transfer");
      throw err;
    }
  }, [selectedTransfer, loadTransfers]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadAdmissionRequests(),
      loadAdmissions(),
      loadTransfers(),
    ]);
  }, [loadAdmissionRequests, loadAdmissions, loadTransfers]);

  return (
    <AdmissionContext.Provider
      value={{
        admissionRequests,
        admissions,
        transfers,
        selectedRequest,
        selectedAdmission,
        selectedTransfer,
        suggestedBeds,
        isLoading,
        isLoadingRequests,
        isLoadingAdmissions,
        isLoadingTransfers,
        error,
        loadAdmissionRequests,
        loadAdmissions,
        loadTransfers,
        createAdmissionRequest,
        updateAdmissionRequest,
        approveAdmissionRequest,
        cancelAdmissionRequest,
        assignBed,
        reserveBed,
        admitPatient,
        suggestBeds,
        selectRequest: setSelectedRequest,
        selectAdmission: setSelectedAdmission,
        selectTransfer: setSelectedTransfer,
        updateAdmission,
        dischargeAdmission,
        createTransfer,
        updateTransfer,
        approveTransfer,
        initiateTransfer,
        completeTransfer,
        rejectTransfer,
        refreshAll,
      }}
    >
      {children}
    </AdmissionContext.Provider>
  );
}

export function useAdmission() {
  const context = useContext(AdmissionContext);
  if (context === undefined) {
    throw new Error("useAdmission must be used within an AdmissionProvider");
  }
  return context;
}
