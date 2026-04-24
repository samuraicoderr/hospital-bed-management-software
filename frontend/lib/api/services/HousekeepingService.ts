/**
 * Housekeeping Service API
 * Handles cleaning tasks and housekeeping operations
 */

import { api } from '../ApiClient';
import BackendRoutes from '../BackendRoutes';
import {
  CleaningTask,
  HousekeepingStaff,
  CleaningDashboardStats,
  CreateCleaningTaskRequest,
  AssignCleaningTaskRequest,
  CompleteCleaningTaskRequest,
  QualityCheckRequest,
  CleaningTaskFilters,
  CleaningStatus,
} from '../types';
import { PaginatedAnything } from '../types/common.types';

class HousekeepingService {
  // ─────────────────────────────────────────────
  // Cleaning Tasks
  // ─────────────────────────────────────────────

  async getTasks(
    params?: CleaningTaskFilters & { page?: number; page_size?: number }
  ): Promise<PaginatedAnything<CleaningTask>> {
    const response = await api.get<PaginatedAnything<CleaningTask>>(
      BackendRoutes.housekeeping.tasks,
      { params }
    );
    return response.data;
  }

  async getTask(id: string): Promise<CleaningTask> {
    const response = await api.get<CleaningTask>(
      BackendRoutes.housekeeping.taskDetail(id)
    );
    return response.data;
  }

  async createTask(data: CreateCleaningTaskRequest): Promise<CleaningTask> {
    const response = await api.post<CleaningTask>(
      BackendRoutes.housekeeping.tasks,
      data
    );
    return response.data;
  }

  async assignTask(id: string, data: AssignCleaningTaskRequest): Promise<CleaningTask> {
    const response = await api.post<CleaningTask>(
      BackendRoutes.housekeeping.assign(id),
      data
    );
    return response.data;
  }

  async startTask(id: string): Promise<CleaningTask> {
    const response = await api.post<CleaningTask>(
      BackendRoutes.housekeeping.start(id),
      {}
    );
    return response.data;
  }

  async completeTask(
    id: string,
    data: CompleteCleaningTaskRequest = {}
  ): Promise<CleaningTask> {
    const response = await api.post<CleaningTask>(
      BackendRoutes.housekeeping.complete(id),
      data
    );
    return response.data;
  }

  async escalateTask(id: string, reason?: string): Promise<CleaningTask> {
    const response = await api.post<CleaningTask>(
      BackendRoutes.housekeeping.escalate(id),
      { reason }
    );
    return response.data;
  }

  async qualityCheck(id: string, data: QualityCheckRequest): Promise<CleaningTask> {
    const response = await api.post<CleaningTask>(
      BackendRoutes.housekeeping.qualityCheck(id),
      data
    );
    return response.data;
  }

  // ─────────────────────────────────────────────
  // Housekeeping Staff
  // ─────────────────────────────────────────────

  async getStaff(
    params?: { hospital?: string; is_active?: boolean } & { page?: number }
  ): Promise<PaginatedAnything<HousekeepingStaff>> {
    const response = await api.get<PaginatedAnything<HousekeepingStaff>>(
      BackendRoutes.housekeeping.staff,
      { params }
    );
    return response.data;
  }

  async getStaffMember(id: string): Promise<HousekeepingStaff> {
    const response = await api.get<HousekeepingStaff>(
      BackendRoutes.housekeeping.staffDetail(id)
    );
    return response.data;
  }

  // ─────────────────────────────────────────────
  // Dashboard
  // ─────────────────────────────────────────────

  async getDashboardStats(): Promise<CleaningDashboardStats> {
    const response = await api.get<CleaningDashboardStats>(
      BackendRoutes.housekeeping.dashboard
    );
    return response.data;
  }

  // ─────────────────────────────────────────────
  // Convenience Methods
  // ─────────────────────────────────────────────

  async getOverdueTasks(hospitalId?: string): Promise<CleaningTask[]> {
    const response = await this.getTasks({
      ...(hospitalId && { hospital: hospitalId }),
      overdue: true,
    });
    return response.results;
  }

  async getTasksByStaff(staffId: string): Promise<CleaningTask[]> {
    const response = await this.getTasks({
      assigned_to: staffId,
    });
    return response.results;
  }

  async getPendingTasks(hospitalId?: string): Promise<CleaningTask[]> {
    const response = await this.getTasks({
      ...(hospitalId && { hospital: hospitalId }),
      status: CleaningStatus.PENDING,
    });
    return response.results;
  }
}

export const housekeepingService = new HousekeepingService();
export default housekeepingService;
