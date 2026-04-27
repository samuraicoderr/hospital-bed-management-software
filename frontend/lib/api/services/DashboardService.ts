/**
 * Dashboard Service API
 * Handles dashboard data and analytics
 */

import { api } from '../ApiClient';
import BackendRoutes from '../BackendRoutes';
import {
  OperationalDashboard,
  OccupancyTrend,
  DepartmentStats,
  KPIData,
  BedStatistics,
} from '../types';
import { PaginatedAnything } from '../types/common.types';

const API_VERSION = '/api/v1';

class DashboardService {
  /**
   * Get operational dashboard data
   */
  async getOperationalDashboard(hospitalId: string): Promise<OperationalDashboard> {
    const response = await api.get<OperationalDashboard>(
      BackendRoutes.dashboard.operational,
      {
        params: { hospital: hospitalId },
      }
    );
    return response.data;
  }

  /**
   * Get occupancy trend data for charts
   */
  async getOccupancyTrend(
    hospitalId: string,
    days: number = 7
  ): Promise<OccupancyTrend> {
    const response = await api.get<OccupancyTrend>(
      BackendRoutes.dashboard.occupancyTrend,
      {
        params: { hospital: hospitalId, days },
      }
    );
    return response.data;
  }

  /**
   * Get department statistics
   */
  async getDepartmentStats(hospitalId: string): Promise<DepartmentStats[]> {
    const response = await api.get<DepartmentStats[]>(
      `${API_VERSION}/dashboard/department_stats/`,
      {
        params: { hospital: hospitalId },
      }
    );
    return response.data;
  }

  /**
   * Get all KPI data for dashboard
   */
  async getKPIData(hospitalId: string): Promise<KPIData> {
    const [bedStats, cleaningResponse, admissionsResponse] = await Promise.all([
      api.get<BedStatistics>(BackendRoutes.beds.statistics, { params: { hospital: hospitalId } }),
      api.get<PaginatedAnything<unknown>>(BackendRoutes.housekeeping.tasks, {
        params: { hospital: hospitalId, status: ['pending', 'assigned', 'in_progress'], page_size: 1 },
      }),
      api.get<PaginatedAnything<unknown>>(BackendRoutes.admissions.requests, {
        params: { hospital: hospitalId, status: ['pending', 'approved'], page_size: 1 },
      }),
    ]);

    // Extract counts from paginated responses
    const cleaningBacklog = cleaningResponse.data.count || 0;
    const admissionQueue = admissionsResponse.data.count || 0;

    return {
      total_beds: bedStats.data.total,
      occupied_beds: bedStats.data.occupied,
      available_beds: bedStats.data.available,
      icu_occupancy_pct: bedStats.data.isolation > 0
        ? (bedStats.data.isolation / bedStats.data.total) * 100
        : 0,
      cleaning_backlog: cleaningBacklog,
      admission_queue: admissionQueue,
      avg_length_of_stay: 0, // TODO: Implement from backend
      pending_discharges: 0, // TODO: Implement from backend
      critical_alerts: 0, // TODO: Implement from backend
    };
  }

  /**
   * Get bed status summary for quick view
   */
  getBedStatusSummary(stats: {
    total: number;
    available: number;
    occupied: number;
    cleaning_required: number;
    maintenance: number;
    blocked: number;
  }): Array<{ label: string; value: number; color: string }> {
    return [
      { label: 'Available', value: stats.available, color: '#0F6E56' },
      { label: 'Occupied', value: stats.occupied, color: '#534AB7' },
      { label: 'Cleaning', value: stats.cleaning_required, color: '#854F0B' },
      { label: 'Maintenance', value: stats.maintenance, color: '#52525B' },
      { label: 'Blocked', value: stats.blocked, color: '#DC2626' },
    ];
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
