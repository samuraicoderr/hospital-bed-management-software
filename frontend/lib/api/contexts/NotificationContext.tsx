"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  WebSocketProvider,
  useWebSocket,
  useWebSocketSubscription,
} from "../auth/ws/useWebSocket";
import {
  notificationService,
  NotificationType,
} from "@/lib/api/services/Notification.Service";

// ─── Types ────────────────────────────────────────────────────────────────────

// Shapes the server pushes down over the socket
interface WsNotificationNewPayload {
  data: NotificationType;
}

interface WsUnreadCountPayload {
  count: number;
}

interface WsMarkedReadPayload {
  ids: string[];
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface NotificationContextType {
  notifications: NotificationType[];
  unreadCount: number;
  isConnected: boolean;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  isLoading: true,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  refetch: async () => {},
});

export function useNotifications(): NotificationContextType {
  return useContext(NotificationContext);
}

// ─── Inner provider (must live inside <WebSocketProvider>) ────────────────────
// Separated so that useWebSocket() always has a WebSocketContext above it.

function NotificationState({ children }: { children: React.ReactNode }) {
  const { send, status } = useWebSocket();
  const isMountedRef = useRef(true);

  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // ── Initial REST load ──────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await notificationService.getNotifications();
      if (!isMountedRef.current) return;
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    } catch (err) {
      console.error("[NotificationProvider] Failed to fetch:", err);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchNotifications();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchNotifications]);

  // ── WebSocket subscriptions ────────────────────────────────────────────────
  // useWebSocketSubscription auto-subscribes when connected and cleans up when
  // disconnected — no manual ws.onmessage wiring needed.

  // Server pushes a brand-new notification
  useWebSocketSubscription<WsNotificationNewPayload>(
    "notification",
    useCallback(({ data }) => {
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((prev) => prev + 1);
    }, [])
  );

  // Server corrects the authoritative unread count (e.g. after another session
  // marks something read)
  useWebSocketSubscription<WsUnreadCountPayload>(
    "unread_count",
    useCallback(({ count }) => {
      setUnreadCount(count);
    }, [])
  );

  // Server confirms one-or-many read marks (covers multi-tab sync)
  useWebSocketSubscription<WsMarkedReadPayload>(
    "notification.marked_read",
    useCallback(({ ids }) => {
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n))
      );
    }, [])
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  const markAsRead = useCallback(
    async (id: string) => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await notificationService.markAsRead(id);
        // Tell the server via WS so other sessions get the unread_count push
        send("mark_read", { id });
      } catch (err) {
        console.error("[NotificationProvider] markAsRead failed:", err);
        // Roll back
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
        );
        setUnreadCount((prev) => prev + 1);
      }
    },
    [send]
  );

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await notificationService.markAllAsRead();
      send("mark_all_read", {});
    } catch (err) {
      console.error("[NotificationProvider] markAllAsRead failed:", err);
      // Refetch to restore accurate state rather than guessing the rollback
      fetchNotifications();
    }
  }, [send, fetchNotifications]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected: status.isConnected,
        isLoading,
        markAsRead,
        markAllAsRead,
        refetch: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// ─── Public provider ──────────────────────────────────────────────────────────

/**
 * Drop this anywhere above the components that call useNotifications().
 * Handles its own WebSocket connection — no sibling provider needed.
 *
 * @example
 * // app/layout.tsx
 * <NotificationProvider>
 *   <App />
 * </NotificationProvider>
 */
export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // WebSocketProvider owns the connection, auth, reconnect, heartbeat.
    // endpoint must match whatever your backend mounts the notification WS on.
    <WebSocketProvider endpoint="/notifications">
      <NotificationState>{children}</NotificationState>
    </WebSocketProvider>
  );
}