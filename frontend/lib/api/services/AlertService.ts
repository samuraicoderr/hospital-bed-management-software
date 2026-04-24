/**
 * Alert Service API
 * Handles notifications and alert management
 */

import { api } from '../ApiClient';
import BackendRoutes from '../BackendRoutes';
import {
  Alert,
  AlertStats,
  CreateAlertRequest,
  MarkAlertReadRequest,
  AlertFilters,
  AlertSeverity,
} from '../types';
import { PaginatedAnything } from '../types/common.types';

class AlertService {
  /**
   * Get alerts with filtering
   */
  async getAlerts(
    params?: AlertFilters & { page?: number; page_size?: number }
  ): Promise<PaginatedAnything<Alert>> {
    const response = await api.get<PaginatedAnything<Alert>>(
      BackendRoutes.alerts.base,
      { params }
    );
    return response.data;
  }

  /**
   * Get single alert
   */
  async getAlert(id: string): Promise<Alert> {
    const response = await api.get<Alert>(BackendRoutes.alerts.detail(id));
    return response.data;
  }

  /**
   * Create alert (admin/system function)
   */
  async createAlert(data: CreateAlertRequest): Promise<Alert> {
    const response = await api.post<Alert>(BackendRoutes.alerts.base, data);
    return response.data;
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(id: string): Promise<Alert> {
    const response = await api.post<Alert>(
      BackendRoutes.alerts.acknowledge(id),
      {}
    );
    return response.data;
  }

  /**
   * Mark alerts as read
   */
  async markAsRead(data: MarkAlertReadRequest): Promise<void> {
    await api.post(BackendRoutes.alerts.markRead, data);
  }

  /**
   * Get alert statistics
   */
  async getStats(): Promise<AlertStats> {
    const response = await api.get<AlertStats>(BackendRoutes.alerts.stats);
    return response.data;
  }

  /**
   * Get unread alerts count
   */
  async getUnreadCount(): Promise<number> {
    const stats = await this.getStats();
    return stats.unread;
  }

  /**
   * Get critical alerts that need immediate attention
   */
  async getCriticalAlerts(hospitalId?: string): Promise<Alert[]> {
    const response = await this.getAlerts({
      ...(hospitalId && { hospital: hospitalId }),
      severity: AlertSeverity.CRITICAL,
      is_read: false,
    });
    return response.results;
  }

  /**
   * Dismiss/acknowledge multiple alerts
   */
  async dismissAlerts(alertIds: string[]): Promise<void> {
    await this.markAsRead({ alert_ids: alertIds });
  }
}

export const alertService = new AlertService();
export default alertService;
