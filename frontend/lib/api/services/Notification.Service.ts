import { apiClient } from "../ApiClient";
import { BackendRoutes } from "../BackendRoutes";

/* ------------------------------------------------------------ */
/*  Types (mirror the Django Notification model exactly)        */
/* ------------------------------------------------------------ */

export type NotificationCategory = "loan" | "investment" | "wallet" | "system";

export interface NotificationType {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string; // ISO-8601 string from backend
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/* ------------------------------------------------------------ */
/*  Service                                                     */
/* ------------------------------------------------------------ */

class NotificationService {
  /** Fetch notifications for the current user (handles paginated or plain array). */
  async getNotifications(isRead?: boolean): Promise<NotificationType[]> {
    const params: Record<string, string> = {};
    if (isRead !== undefined) params.is_read = isRead.toString();

    const res = await apiClient.get<
      PaginatedResponse<NotificationType> | NotificationType[]
    >(BackendRoutes.notifications, { requiresAuth: true, params });

    const data = res.data;
    if (data && "results" in data) return data.results;
    return Array.isArray(data) ? data : [];
  }

  /** Return the count of unread notifications. */
  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<{ count: number }>(
      BackendRoutes.notificationsUnreadCount,
      { requiresAuth: true }
    );
    return res.data.count;
  }

  /** Mark a single notification as read. */
  async markAsRead(id: string): Promise<NotificationType> {
    const res = await apiClient.patch<NotificationType>(
      BackendRoutes.notificationMarkRead(id),
      {},
      { requiresAuth: true }
    );
    return res.data;
  }

  /** Mark all unread notifications as read. */
  async markAllAsRead(): Promise<{ updated: number }> {
    const res = await apiClient.post<{ updated: number }>(
      BackendRoutes.notificationsMarkAllRead,
      {},
      { requiresAuth: true }
    );
    return res.data;
  }
}

export const notificationService = new NotificationService();
export default NotificationService;
