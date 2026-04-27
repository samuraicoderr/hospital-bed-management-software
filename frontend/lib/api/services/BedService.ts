import { api } from "../ApiClient";
import BackendRoutes from "../BackendRoutes";
import type { PaginatedAnything } from "../types/common.types";
import type {
  Bed,
  BedAnalytics,
  BedAssignmentRequest,
  BedEligibilityRequest,
  BedEligibilityResponse,
  BedGridFilter,
  BedListItem,
  BedMaintenanceRecord,
  BedReleaseRequest,
  BedReservationRequest,
  BedSearchRequest,
  BedStatistics,
  BedStatusHistory,
  BedStatusUpdateRequest,
  BedBlockRequest,
  CreateBedRequest,
  CreateEquipmentTagRequest,
  CreateMaintenanceRecordRequest,
  EquipmentTag,
  UpdateBedRequest,
  UpdateMaintenanceRecordRequest,
} from "../types";

class BedService {
  async getBeds(
    params: BedGridFilter & { page?: number; page_size?: number } = {}
  ): Promise<PaginatedAnything<BedListItem>> {
    const response = await api.get<PaginatedAnything<BedListItem>>(BackendRoutes.beds.base, {
      params,
    });
    return response.data;
  }

  async getBed(id: string): Promise<Bed> {
    const response = await api.get<Bed>(BackendRoutes.beds.detail(id));
    return response.data;
  }

  async createBed(data: CreateBedRequest): Promise<Bed> {
    const response = await api.post<Bed>(BackendRoutes.beds.base, data);
    return response.data;
  }

  async updateBed(id: string, data: UpdateBedRequest): Promise<Bed> {
    const response = await api.patch<Bed>(BackendRoutes.beds.detail(id), data);
    return response.data;
  }

  async deleteBed(id: string): Promise<void> {
    await api.delete(BackendRoutes.beds.detail(id));
  }

  async updateStatus(id: string, data: BedStatusUpdateRequest): Promise<Bed> {
    const response = await api.post<Bed>(BackendRoutes.beds.updateStatus(id), data);
    return response.data;
  }

  async blockBed(id: string, data: BedBlockRequest): Promise<Bed> {
    const response = await api.post<Bed>(BackendRoutes.beds.block(id), data);
    return response.data;
  }

  async unblockBed(id: string): Promise<Bed> {
    const response = await api.post<Bed>(BackendRoutes.beds.unblock(id), {});
    return response.data;
  }

  async markForCleaning(id: string, payload: { priority?: string; reason?: string }): Promise<Bed> {
    const response = await api.post<Bed>(BackendRoutes.beds.markForCleaning(id), payload);
    return response.data;
  }

  async reserveBed(id: string, data: BedReservationRequest): Promise<Bed> {
    const response = await api.post<Bed>(BackendRoutes.beds.reserve(id), data);
    return response.data;
  }

  async clearReservation(id: string): Promise<Bed> {
    const response = await api.post<Bed>(BackendRoutes.beds.clearReservation(id), {});
    return response.data;
  }

  async assignBed(id: string, data: BedAssignmentRequest): Promise<Bed> {
    const response = await api.post<Bed>(BackendRoutes.beds.assign(id), data);
    return response.data;
  }

  async releaseBed(id: string, data: BedReleaseRequest): Promise<Bed> {
    const response = await api.post<Bed>(BackendRoutes.beds.release(id), data);
    return response.data;
  }

  async checkEligibility(id: string, data: BedEligibilityRequest): Promise<BedEligibilityResponse> {
    const response = await api.post<BedEligibilityResponse>(BackendRoutes.beds.eligible(id), data);
    return response.data;
  }

  async searchAvailableBeds(
    data: BedSearchRequest
  ): Promise<PaginatedAnything<BedListItem>> {
    const response = await api.post<PaginatedAnything<BedListItem>>(
      BackendRoutes.beds.searchAvailable,
      data
    );
    return response.data;
  }

  async getStatistics(hospitalId: string): Promise<BedStatistics> {
    const response = await api.get<BedStatistics>(BackendRoutes.beds.statistics, {
      params: { hospital: hospitalId },
    });
    return response.data;
  }

  async getAnalytics(hospitalId: string): Promise<BedAnalytics> {
    const response = await api.get<BedAnalytics>(BackendRoutes.beds.analytics, {
      params: { hospital: hospitalId },
    });
    return response.data;
  }

  async getStatusHistory(id: string): Promise<BedStatusHistory[]> {
    const response = await api.get<BedStatusHistory[]>(BackendRoutes.beds.history(id));
    return response.data;
  }

  async getEquipmentTags(params?: { category?: string; is_active?: boolean }): Promise<PaginatedAnything<EquipmentTag>> {
    const response = await api.get<PaginatedAnything<EquipmentTag>>(BackendRoutes.beds.equipmentTags, {
      params,
    });
    return response.data;
  }

  async createEquipmentTag(data: CreateEquipmentTagRequest): Promise<EquipmentTag> {
    const response = await api.post<EquipmentTag>(BackendRoutes.beds.equipmentTags, data);
    return response.data;
  }

  async getMaintenanceRecords(
    params: {
      hospital?: string;
      department?: string;
      ward?: string;
      bed?: string;
      severity?: string;
      status?: string;
      maintenance_type?: string;
      page?: number;
      page_size?: number;
    } = {}
  ): Promise<PaginatedAnything<BedMaintenanceRecord>> {
    const response = await api.get<PaginatedAnything<BedMaintenanceRecord>>(
      BackendRoutes.beds.maintenanceRecords,
      { params }
    );
    return response.data;
  }

  async createMaintenanceRecord(data: CreateMaintenanceRecordRequest): Promise<BedMaintenanceRecord> {
    const response = await api.post<BedMaintenanceRecord>(BackendRoutes.beds.maintenanceRecords, data);
    return response.data;
  }

  async updateMaintenanceRecord(
    id: string,
    data: UpdateMaintenanceRecordRequest
  ): Promise<BedMaintenanceRecord> {
    const response = await api.patch<BedMaintenanceRecord>(
      BackendRoutes.beds.maintenanceRecordDetail(id),
      data
    );
    return response.data;
  }

  async resolveMaintenanceRecord(id: string, resolution_notes?: string): Promise<BedMaintenanceRecord> {
    const response = await api.post<BedMaintenanceRecord>(
      BackendRoutes.beds.resolveMaintenanceRecord(id),
      { resolution_notes }
    );
    return response.data;
  }
}

export const bedService = new BedService();
export default bedService;
