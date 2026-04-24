/**
 * Discharge Service API
 * Handles discharge workflow
 */

import { api } from '../ApiClient';
import BackendRoutes from '../BackendRoutes';

interface Discharge {
  id: string;
  patient: {
    id: string;
    mrn: string;
    name: string;
  };
  bed?: {
    id: string;
    bed_code: string;
  };
  status: string;
  discharge_type: string;
  destination: string;
  discharge_reason?: string;
  discharged_at?: string;
  turnover_minutes?: number;
  created_at: string;
}

interface CreateDischargeRequest {
  admission_id: string;
  reason?: string;
  discharge_type?: 'routine' | 'ama' | 'transfer' | 'deceased';
  destination?: 'home' | 'other_hospital' | 'rehabilitation' | 'nursing_home' | 'hospice' | 'deceased';
}

class DischargeService {
  async getDischarges(
    params?: { hospital?: string; status?: string } & { page?: number }
  ): Promise<{ count: number; results: Discharge[] }> {
    const response = await api.get(BackendRoutes.discharges.base, { params });
    return response.data as { count: number; results: Discharge[] };
  }

  async getDischarge(id: string): Promise<Discharge> {
    const response = await api.get(BackendRoutes.discharges.detail(id));
    return response.data as Discharge;
  }

  async initiateDischarge(data: CreateDischargeRequest): Promise<{
    status: string;
    discharge_id: string;
  }> {
    const response = await api.post(BackendRoutes.discharges.base, data);
    return response.data as { status: string; discharge_id: string };
  }

  async approveDischarge(id: string): Promise<{ status: string }> {
    const response = await api.post(BackendRoutes.discharges.approve(id), {});
    return response.data as { status: string };
  }

  async completeDischarge(id: string): Promise<{
    status: string;
    turnover_minutes?: number;
  }> {
    const response = await api.post(BackendRoutes.discharges.complete(id), {});
    return response.data as { status: string; turnover_minutes?: number };
  }

  async getPendingDischarges(hospitalId: string): Promise<Discharge[]> {
    const response = await api.get(BackendRoutes.discharges.pending, {
      params: { hospital: hospitalId },
    });
    return response.data as Discharge[];
  }
}

export const dischargeService = new DischargeService();
export default dischargeService;
