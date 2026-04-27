/**
 * Admission Service API
 * Handles patient admissions, transfers, and patient management
 */

import { api } from '../ApiClient';
import BackendRoutes from '../BackendRoutes';
import {
  AdmissionRequest,
  Admission,
  Transfer,
  Patient,
  PatientDetail,
  BedListItem,
  CreateAdmissionRequest,
  AssignBedRequest,
  CreateTransferRequest,
  CreatePatientRequest,
  AdmissionQueueFilters,
  AdmissionQueueStats,
} from '../types';
import { PaginatedAnything } from '../types/common.types';

class AdmissionService {
  // ─────────────────────────────────────────────
  // Admission Requests
  // ─────────────────────────────────────────────

  async getAdmissionRequests(
    params?: AdmissionQueueFilters & { page?: number; page_size?: number }
  ): Promise<PaginatedAnything<AdmissionRequest>> {
    const response = await api.get<PaginatedAnything<AdmissionRequest>>(
      BackendRoutes.admissions.requests,
      { params }
    );
    return response.data;
  }

  async getAdmissionRequest(id: string): Promise<AdmissionRequest> {
    const response = await api.get<AdmissionRequest>(
      BackendRoutes.admissions.requestDetail(id)
    );
    return response.data;
  }

  async createAdmissionRequest(data: CreateAdmissionRequest): Promise<AdmissionRequest> {
    const response = await api.post<AdmissionRequest>(
      BackendRoutes.admissions.requests,
      data
    );
    return response.data;
  }

  async updateAdmissionRequest(
    id: string,
    data: Partial<CreateAdmissionRequest>
  ): Promise<AdmissionRequest> {
    const response = await api.patch<AdmissionRequest>(
      BackendRoutes.admissions.requestDetail(id),
      data
    );
    return response.data;
  }

  async assignBed(id: string, data: AssignBedRequest): Promise<{
    status: string;
    request_id: string;
    assigned_bed: string;
  }> {
    const response = await api.post(BackendRoutes.admissions.assignBed(id), data);
    return response.data as { status: string; request_id: string; assigned_bed: string };
  }

  async admitPatient(id: string): Promise<{
    status: string;
    admission_id: string;
    bed: string | null;
  }> {
    const response = await api.post(BackendRoutes.admissions.admit(id), {});
    return response.data as { status: string; admission_id: string; bed: string | null };
  }

  async suggestBeds(id: string): Promise<BedListItem[]> {
    const response = await api.get<BedListItem[]>(BackendRoutes.admissions.suggestBeds(id));
    return response.data;
  }

  // ─────────────────────────────────────────────
  // Active Admissions
  // ─────────────────────────────────────────────

  async getActiveAdmissions(
    params?: { hospital?: string; department?: string; status?: string } & { page?: number }
  ): Promise<PaginatedAnything<Admission>> {
    const response = await api.get<PaginatedAnything<Admission>>(
      BackendRoutes.admissions.admissions,
      { params }
    );
    return response.data;
  }

  // ─────────────────────────────────────────────
  // Transfers
  // ─────────────────────────────────────────────

  async getTransfers(
    params?: { hospital?: string; status?: string } & { page?: number }
  ): Promise<PaginatedAnything<Transfer>> {
    const response = await api.get<PaginatedAnything<Transfer>>(
      BackendRoutes.admissions.transfers,
      { params }
    );
    return response.data;
  }

  async getTransfer(id: string): Promise<Transfer> {
    const response = await api.get<Transfer>(
      BackendRoutes.admissions.transferDetail(id)
    );
    return response.data;
  }

  async createTransfer(data: CreateTransferRequest): Promise<Transfer> {
    const response = await api.post<Transfer>(
      BackendRoutes.admissions.transfers,
      data
    );
    return response.data;
  }

  async approveTransfer(id: string): Promise<{ status: string }> {
    const response = await api.post(BackendRoutes.admissions.approveTransfer(id), {});
    return response.data as { status: string };
  }

  async completeTransfer(id: string): Promise<{ status: string }> {
    const response = await api.post(BackendRoutes.admissions.completeTransfer(id), {});
    return response.data as { status: string };
  }

  // ─────────────────────────────────────────────
  // Patients
  // ─────────────────────────────────────────────

  async getPatients(
    params?: { search?: string; hospital?: string; is_active?: boolean } & { page?: number; page_size?: number }
  ): Promise<PaginatedAnything<Patient>> {
    const response = await api.get<PaginatedAnything<Patient>>(
      BackendRoutes.patients.base,
      { params }
    );
    return response.data;
  }

  async getPatient(id: string): Promise<PatientDetail> {
    const response = await api.get<PatientDetail>(
      BackendRoutes.patients.detail(id)
    );
    return response.data;
  }

  async createPatient(data: CreatePatientRequest): Promise<Patient> {
    const response = await api.post<Patient>(
      BackendRoutes.patients.base,
      data
    );
    return response.data;
  }

  async updatePatient(id: string, data: Partial<CreatePatientRequest>): Promise<Patient> {
    const response = await api.patch<Patient>(
      BackendRoutes.patients.detail(id),
      data
    );
    return response.data;
  }

  async searchPatients(query: string): Promise<Patient[]> {
    const response = await api.get<PaginatedAnything<Patient>>(BackendRoutes.patients.base, {
      params: { q: query },
    });
    return response.data.results || [];
  }

  // ─────────────────────────────────────────────
  // Queue Stats
  // ─────────────────────────────────────────────

  async getQueueStats(hospitalId: string): Promise<AdmissionQueueStats> {
    const response = await api.get('/api/v1/admissions/queue-stats/', {
      params: { hospital: hospitalId },
    });
    return response.data as AdmissionQueueStats;
  }
}

export const admissionService = new AdmissionService();
export default admissionService;
