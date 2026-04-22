/**
 * WebSocket React Hooks
 * Fully integrated with WebSocketManager — typed, stable, production-ready.
 */

"use client";

import {
  useEffect,
  useCallback,
  useRef,
  useState,
  useContext,
  createContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "../authContext";
import {
  WebSocketManager,
  WebSocketState,
  type WebSocketConfig,
  type WebSocketMessage,
  type WebSocketError,
} from "./WebSocketManager";

// ─── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_WS_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:9000/ws",
  reconnect: true,
  maxReconnectAttempts: 10,
  reconnectInterval: 1_000,
  reconnectDecay: 1.5,
  maxReconnectInterval: 30_000,
  heartbeatInterval: 30_000,
  debug: process.env.NODE_ENV === "development",
} as const;

// ─── Context ──────────────────────────────────────────────────────────────────
// Each call-site that needs a WS connection wraps its subtree in
// <WebSocketProvider> to get an isolated WebSocketManager instance.
// Child hooks consume it via useWebSocketContext().

interface WebSocketContextValue {
  manager: WebSocketManager;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export interface WebSocketProviderProps {
  /** Appended to the base URL, e.g. "/chat" → "ws://host/chat" */
  endpoint?: string;
  /** Override any default config values */
  config?: Partial<Omit<WebSocketConfig, "url">>;
  children: ReactNode;
}

/**
 * Mount one provider per logical WS connection in your component tree.
 * The manager is created once, lives for the lifetime of the provider,
 * and is destroyed on unmount.
 *
 * @example
 * <WebSocketProvider endpoint="/chat">
 *   <ChatRoom />
 * </WebSocketProvider>
 */
export function WebSocketProvider({
  endpoint,
  config,
  children,
}: WebSocketProviderProps) {
  const { isAuthenticated } = useAuth();

  // Build manager once — stable across renders.
  // We use a ref so the same instance is kept without a re-render on creation.
  const managerRef = useRef<WebSocketManager | null>(null);

  if (!managerRef.current) {
    const url = endpoint
      ? `${DEFAULT_WS_CONFIG.BASE_URL}${endpoint}`
      : DEFAULT_WS_CONFIG.BASE_URL;

    managerRef.current = new WebSocketManager({
      url,
      reconnect: DEFAULT_WS_CONFIG.reconnect,
      maxReconnectAttempts: DEFAULT_WS_CONFIG.maxReconnectAttempts,
      reconnectInterval: DEFAULT_WS_CONFIG.reconnectInterval,
      reconnectDecay: DEFAULT_WS_CONFIG.reconnectDecay,
      maxReconnectInterval: DEFAULT_WS_CONFIG.maxReconnectInterval,
      heartbeatInterval: DEFAULT_WS_CONFIG.heartbeatInterval,
      debug: DEFAULT_WS_CONFIG.debug,
      ...config,
    });
  }

  // Connect/disconnect based on auth state
  useEffect(() => {
    const manager = managerRef.current!;

    if (isAuthenticated) {
      manager.connect().catch((err) => {
        console.error("[WebSocketProvider] Initial connection failed:", err);
      });
    } else {
      manager.disconnect();
    }
  }, [isAuthenticated]);

  // Destroy on unmount
  useEffect(() => {
    const manager = managerRef.current!;
    return () => {
      manager.destroy();
      managerRef.current = null;
    };
  }, []);

  const value = useMemo<WebSocketContextValue>(
    () => ({ manager: managerRef.current! }),
    []
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * Internal: get the manager from context. Throws a helpful error if used
 * outside a <WebSocketProvider>.
 */
function useWebSocketContext(): WebSocketManager {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error(
      "[useWebSocket] No WebSocketContext found. " +
        "Wrap your component tree with <WebSocketProvider>."
    );
  }
  return ctx.manager;
}

// ─── Store Snapshot ───────────────────────────────────────────────────────────

interface WebSocketStatus {
  state: WebSocketState;
  error: WebSocketError | null;
  reconnectAttempts: number;
  lastConnectedAt: string | null;
  isAuthenticated: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  isDisconnected: boolean;
  hasError: boolean;
}

/**
 * Returns live connection status from the manager's Zustand store.
 * Re-renders only when the selected slice changes.
 */
export function useWebSocketStatus(): WebSocketStatus {
  const manager = useWebSocketContext();

  // Subscribe to the per-instance store via the manager's exposed useStore hook
  const state = manager.useStore((s) => s.state);
  const error = manager.useStore((s) => s.error);
  const reconnectAttempts = manager.useStore((s) => s.reconnectAttempts);
  const lastConnectedAt = manager.useStore((s) => s.lastConnectedAt);
  const isAuthenticated = manager.useStore((s) => s.isAuthenticated);

  return {
    state,
    error,
    reconnectAttempts,
    lastConnectedAt,
    isAuthenticated,
    isConnected: state === WebSocketState.CONNECTED,
    isConnecting: state === WebSocketState.CONNECTING,
    isReconnecting: state === WebSocketState.RECONNECTING,
    isDisconnected: state === WebSocketState.DISCONNECTED,
    hasError: state === WebSocketState.ERROR,
  };
}

// ─── Core Hook ────────────────────────────────────────────────────────────────

interface UseWebSocketReturn {
  /** Reactive connection status */
  status: WebSocketStatus;
  /**
   * Send a typed message. Returns true if sent immediately, false if queued.
   * Stable reference — safe in dep arrays.
   */
  send: <T = unknown>(type: string, data: T) => boolean;
  /**
   * Subscribe to a specific message type.
   * Returns an unsubscribe function. Stable reference — safe in dep arrays.
   */
  subscribe: <T = unknown>(
    type: string,
    handler: (data: T) => void
  ) => () => void;
  /**
   * Subscribe to ALL messages (wildcard).
   * Returns an unsubscribe function. Stable reference — safe in dep arrays.
   */
  subscribeAll: (handler: (message: WebSocketMessage) => void) => () => void;
  /** Manually trigger a connection attempt */
  connect: () => Promise<void>;
  /** Manually disconnect */
  disconnect: (code?: number, reason?: string) => void;
}

/**
 * Primary hook — use this for most cases.
 * Must be inside a <WebSocketProvider>.
 *
 * @example
 * const { status, send, subscribe } = useWebSocket();
 *
 * useEffect(() => {
 *   return subscribe<ChatMessage>("chat.message", (msg) => {
 *     setMessages((prev) => [...prev, msg]);
 *   });
 * }, [subscribe]);
 */
export function useWebSocket(): UseWebSocketReturn {
  const manager = useWebSocketContext();
  const status = useWebSocketStatus();

  const send = useCallback(
    <T = unknown,>(type: string, data: T): boolean => {
      return manager.send(type, data);
    },
    [manager]
  );

  const subscribe = useCallback(
    <T = unknown,>(
      type: string,
      handler: (data: T) => void
    ): (() => void) => {
      return manager.on(type, handler);
    },
    [manager]
  );

  const subscribeAll = useCallback(
    (handler: (message: WebSocketMessage) => void): (() => void) => {
      return manager.onAny(handler);
    },
    [manager]
  );

  const connect = useCallback(async (): Promise<void> => {
    await manager.connect();
  }, [manager]);

  const disconnect = useCallback(
    (code?: number, reason?: string): void => {
      manager.disconnect(code, reason);
    },
    [manager]
  );

  return { status, send, subscribe, subscribeAll, connect, disconnect };
}

// ─── useWebSocketSubscription ─────────────────────────────────────────────────

/**
 * Declaratively subscribe to a message type.
 * The handler is automatically registered/unregistered as `isConnected` changes.
 *
 * Wrap `handler` in useCallback to keep it stable if it closes over state.
 *
 * @example
 * useWebSocketSubscription<PresenceUpdate>(
 *   "presence.update",
 *   useCallback((data) => setPresence(data), [])
 * );
 */
export function useWebSocketSubscription<T = unknown>(
  messageType: string,
  handler: (data: T) => void
): void {
  const { subscribe, status } = useWebSocket();

  // Keep a ref so we always call the latest handler without re-subscribing
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!status.isConnected) return;

    // Stable wrapper delegates to whatever handler is current
    const stableHandler = (data: T) => handlerRef.current(data);
    const unsubscribe = subscribe<T>(messageType, stableHandler);

    return unsubscribe;
  }, [messageType, status.isConnected, subscribe]);
}

// ─── useWebSocketSend ─────────────────────────────────────────────────────────

interface UseWebSocketSendReturn<T> {
  send: (type: string, data: T) => Promise<boolean>;
  isSending: boolean;
  error: string | null;
  clearError: () => void;
  isConnected: boolean;
}

/**
 * Wraps send() with async loading + error state.
 * Useful for fire-and-confirm patterns with UI feedback.
 *
 * @example
 * const { send, isSending, error } = useWebSocketSend<ChatPayload>();
 * await send("chat.message", { text: "hello" });
 */
export function useWebSocketSend<T = unknown>(): UseWebSocketSendReturn<T> {
  const { send: rawSend, status } = useWebSocket();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (type: string, data: T): Promise<boolean> => {
      setIsSending(true);
      setError(null);

      try {
        const success = rawSend(type, data);
        if (!success) setError("Message queued — not yet connected");
        return success;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [rawSend]
  );

  const clearError = useCallback(() => setError(null), []);

  return { send, isSending, error, clearError, isConnected: status.isConnected };
}

// ─── useWebSocketRequest ──────────────────────────────────────────────────────

interface PendingRequest<TResponse> {
  resolve: (data: TResponse) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

interface UseWebSocketRequestReturn<TRequest, TResponse> {
  request: (
    type: string,
    data: TRequest,
    timeoutMs?: number
  ) => Promise<TResponse>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Request–response pattern over WebSocket.
 *
 * Sends a message with an auto-generated `id`, then waits for the server to
 * reply with `{ type: "response", id: <same id>, data: TResponse }`.
 * Rejects if no reply arrives within `timeoutMs` (default 10 s).
 *
 * Server response shape expected:
 * { type: "response", id: string, data: TResponse, error?: string }
 *
 * @example
 * const { request } = useWebSocketRequest<SearchQuery, SearchResults>();
 * const results = await request("search.query", { q: "hello" });
 */
export function useWebSocketRequest<
  TRequest = unknown,
  TResponse = unknown,
>(): UseWebSocketRequestReturn<TRequest, TResponse> {
  const { send, subscribe } = useWebSocket();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keyed by request id
  const pending = useRef<Map<string, PendingRequest<TResponse>>>(new Map());

  // Subscribe once to all "response" messages for the lifetime of the hook
  useEffect(() => {
    const unsubscribe = subscribe<{
      id: string;
      data: TResponse;
      error?: string;
    }>("response", (response) => {
      const entry = pending.current.get(response.id);
      if (!entry) return;

      clearTimeout(entry.timeoutId);
      pending.current.delete(response.id);

      if (response.error) {
        entry.reject(new Error(response.error));
      } else {
        entry.resolve(response.data);
      }
    });

    return () => {
      unsubscribe();
      // Reject all in-flight requests on unmount
      for (const [id, entry] of pending.current) {
        clearTimeout(entry.timeoutId);
        entry.reject(new Error("Component unmounted"));
        pending.current.delete(id);
      }
    };
  }, [subscribe]);

  const request = useCallback(
    (type: string, data: TRequest, timeoutMs = 10_000): Promise<TResponse> => {
      return new Promise<TResponse>((resolve, reject) => {
        const requestId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        setIsLoading(true);
        setError(null);

        const timeoutId = setTimeout(() => {
          pending.current.delete(requestId);
          setIsLoading(false);
          const msg = "Request timed out";
          setError(msg);
          reject(new Error(msg));
        }, timeoutMs);

        pending.current.set(requestId, {
          resolve: (responseData) => {
            setIsLoading(false);
            resolve(responseData);
          },
          reject: (err) => {
            setIsLoading(false);
            setError(err.message);
            reject(err);
          },
          timeoutId,
        });

        const sent = send(type, { id: requestId, data });

        if (!sent) {
          clearTimeout(timeoutId);
          pending.current.delete(requestId);
          setIsLoading(false);
          const msg = "Failed to send request — not connected";
          setError(msg);
          reject(new Error(msg));
        }
      });
    },
    [send]
  );

  const clearError = useCallback(() => setError(null), []);

  return { request, isLoading, error, clearError };
}