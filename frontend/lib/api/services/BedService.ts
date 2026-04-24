/**
 * Bed Service API
 * Handles all bed management operations
 */

import { api } from '../ApiClient';
import BackendRoutes from '../BackendRoutes';
import {
  Bed,
  BedListItem,
  BedStatistics,
  BedStatusHistory,
  BedStatusUpdateRequest,
  BedBlockRequest,
  BedSearchRequest,
  CreateBedRequest,
  UpdateBedRequest,
  EquipmentTag,
  BedGridFilter,
} from '../types';
import { PaginatedAnything } from '../types/common.types';

class BedService {
  /**
   * Get paginated list of beds
   */
  async getBeds(
    params: BedGridFilter & { page?: number; page_size?: number } = {}
  ): Promise<PaginatedAnything<BedListItem>> {
    const response = await api.get<PaginatedAnything<BedListItem>>(
      BackendRoutes.beds.base,
      { params }
    );
    return response.data;
  }

  /**
   * Get single bed details
   */
  async getBed(id: string): Promise<Bed> {
    const response = await api.get<Bed>(BackendRoutes.beds.detail(id));
    return response.data;
  }

  /**
   * Create a new bed
   */
  async createBed(data: CreateBedRequest): Promise<Bed> {
    const response = await api.post<Bed>(BackendRoutes.beds.base, data);
    return response.data;
  }

  /**
   * Update a bed
   */
  async updateBed(id: string, data: UpdateBedRequest): Promise<Bed> {
    const response = await api.patch<Bed>(BackendRoutes.beds.detail(id), data);
    return response.data;
  }

  /**
   * Delete a bed
   */
  async deleteBed(id: string): Promise<void> {
    await api.delete(BackendRoutes.beds.detail(id));
  }

  /**
   * Update bed status with audit trail
   */
  async updateStatus(id: string, data: BedStatusUpdateRequest): Promise<{
    status: string;
    bed_id: string;
    new_status: string;
    changed_at: string;
  }> {
    const response = await api.post(BackendRoutes.beds.updateStatus(id), data);
    return response.data as { status: string; bed_id: string; new_status: string; changed_at: string };
  }

  /**
   * Block a bed
   */
  async blockBed(id: string, data: BedBlockRequest): Promise<{
    status: string;
    bed_id: string;
  }> {
    const response = await api.post(BackendRoutes.beds.block(id), data);
    return response.data as { status: string; bed_id: string };
  }

  /**
   * Unblock a bed
   */
  async unblockBed(id: string): Promise<{
    status: string;
    bed_id: string;
  }> {
    const response = await api.post(BackendRoutes.beds.unblock(id), {});
    return response.data as { status: string; bed_id: string };
  }

  /**
   * Search for available beds matching patient requirements
   */
  async searchAvailableBeds(
    data: BedSearchRequest
  ): Promise<PaginatedAnything<BedListItem>> {
    const response = await api.post<PaginatedAnything<BedListItem>>(
      BackendRoutes.beds.searchAvailable,
      data
    );
    return response.data;
  }

  /**
   * Get bed statistics for a hospital
   */
  async getStatistics(hospitalId: string): Promise<BedStatistics> {
    const response = await api.get<BedStatistics>(
      BackendRoutes.beds.statistics,
      {
        params: { hospital: hospitalId },
      }
    );
    return response.data;
  }

  /**
   * Get status history for a bed
   */
  async getStatusHistory(id: string): Promise<BedStatusHistory[]> {
    const response = await api.get<BedStatusHistory[]>(
      BackendRoutes.beds.history(id)
    );
    return response.data;
  }

  /**
   * Get all equipment tags
   */
  async getEquipmentTags(): Promise<EquipmentTag[]> {
    const response = await api.get<PaginatedAnything<EquipmentTag>>(
      BackendRoutes.beds.equipmentTags
    );
    return response.data.results;
  }

  /**
   * Create equipment tag
   */
  async createEquipmentTag(data: Omit<EquipmentTag, 'id'>): Promise<EquipmentTag> {
    const response = await api.post<EquipmentTag>(
      BackendRoutes.beds.equipmentTags,
      data
    );
    return response.data;
  }
}

export const bedService = new BedService();
export default bedService;
