/**
 * WebSocket Manager
 * Handles WebSocket connections with automatic reconnection, authentication, and state management
 */

import { create } from "zustand";
import { tokenManager } from "../TokenManager";

// ─── Types ────────────────────────────────────────────────────────────────────

export enum WebSocketState {
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  DISCONNECTING = "DISCONNECTING",
  DISCONNECTED = "DISCONNECTED",
  RECONNECTING = "RECONNECTING",
  ERROR = "ERROR",
}

export enum WebSocketCloseCode {
  NORMAL_CLOSURE = 1000,
  GOING_AWAY = 1001,
  PROTOCOL_ERROR = 1002,
  UNSUPPORTED_DATA = 1003,
  INVALID_FRAME = 1007,
  POLICY_VIOLATION = 1008,
  MESSAGE_TOO_BIG = 1009,
  INTERNAL_ERROR = 1011,
  SERVICE_RESTART = 1012,
  TRY_AGAIN_LATER = 1013,
  BAD_GATEWAY = 1014,
  // Custom codes
  UNAUTHORIZED = 4001,
  FORBIDDEN = 4003,
  INVALID_TOKEN = 4004,
  HEARTBEAT_TIMEOUT = 4010, // FIX: was using 1000 (NORMAL_CLOSURE) which blocked reconnection
}

export interface WebSocketMessage<T = unknown> {
  type: string;
  data: T;
  timestamp?: string;
  id?: string;
}

export interface WebSocketError {
  code: number;
  reason: string;
  timestamp: string;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  reconnectDecay?: number;
  maxReconnectInterval?: number; // FIX: added cap to prevent unbounded backoff delay
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  connectionTimeout?: number;
  debug?: boolean;
}

// Resolved config with all fields required (after defaults applied)
type ResolvedWebSocketConfig = Required<WebSocketConfig>;

// ─── Zustand Store ────────────────────────────────────────────────────────────

interface WebSocketStoreState {
  state: WebSocketState;
  error: WebSocketError | null;
  reconnectAttempts: number;
  lastConnectedAt: string | null;
  isAuthenticated: boolean;

  setState: (state: WebSocketState) => void;
  setError: (error: WebSocketError | null) => void;
  setReconnectAttempts: (attempts: number) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  setLastConnectedAt: (timestamp: string | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  reset: () => void;
}

// FIX: factory function so multiple WebSocketManager instances each get their
// own isolated store instead of sharing a single module-level singleton
function createWebSocketStore() {
  return create<WebSocketStoreState>((set) => ({
    state: WebSocketState.DISCONNECTED,
    error: null,
    reconnectAttempts: 0,
    lastConnectedAt: null,
    isAuthenticated: false,

    setState: (state) => set({ state }),
    setError: (error) => set({ error }),
    setReconnectAttempts: (attempts) => set({ reconnectAttempts: attempts }),
    incrementReconnectAttempts: () =>
      set((s) => ({ reconnectAttempts: s.reconnectAttempts + 1 })),
    resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),
    setLastConnectedAt: (timestamp) => set({ lastConnectedAt: timestamp }),
    setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
    reset: () =>
      set({
        state: WebSocketState.DISCONNECTED,
        error: null,
        reconnectAttempts: 0,
        lastConnectedAt: null,
        isAuthenticated: false,
      }),
  }));
}

// ─── WebSocket Manager ────────────────────────────────────────────────────────

type MessageHandler<T = unknown> = (data: T) => void;
type WildcardHandler = (message: WebSocketMessage) => void;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private readonly config: ResolvedWebSocketConfig;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private visibilityHandler: (() => void) | null = null;

  // FIX: separate wildcard handlers into their own typed map
  private readonly messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private readonly wildcardHandlers: Set<WildcardHandler> = new Set();

  private connectionPromise: Promise<void> | null = null;
  private isManualClose = false;
  private messageQueue: WebSocketMessage[] = [];
  private readonly MAX_QUEUE_SIZE = 100;

  // FIX: each instance gets its own store
  readonly useStore: ReturnType<typeof createWebSocketStore>;

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      protocols: config.protocols ?? [],
      reconnect: config.reconnect ?? true,
      reconnectInterval: config.reconnectInterval ?? 1000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      reconnectDecay: config.reconnectDecay ?? 1.5,
      maxReconnectInterval: config.maxReconnectInterval ?? 30_000, // FIX: cap at 30s
      heartbeatInterval: config.heartbeatInterval ?? 30_000,
      heartbeatTimeout: config.heartbeatTimeout ?? 5_000,
      connectionTimeout: config.connectionTimeout ?? 10_000,
      debug: config.debug ?? false,
    };

    this.useStore = createWebSocketStore();
    this.setupVisibilityHandler(); // FIX: handle tab backgrounding
    this.log("WebSocket Manager initialized", this.config);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Connect to WebSocket server with authentication.
   * Returns the same promise if a connection attempt is already in flight.
   */
  async connect(): Promise<void> {
    // FIX: cancel any pending reconnect timer so it doesn't race with a manual connect()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.performConnect();

    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  /**
   * Send a typed message. Returns true if sent immediately, false if queued.
   */
  send<T = unknown>(type: string, data: T): boolean {
    const message: WebSocketMessage<T> = {
      type,
      data,
      timestamp: new Date().toISOString(),
      id: this.generateMessageId(),
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        this.log("Message sent:", message);
        return true;
      } catch (error) {
        this.log("Error sending message:", error);
        this.queueMessage(message);
        return false;
      }
    }

    this.queueMessage(message);
    return false;
  }

  /**
   * Register a typed handler for a specific message type.
   * Returns an unsubscribe function.
   */
  on<T = unknown>(type: string, handler: MessageHandler<T>): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    // Cast: the map stores MessageHandler<unknown> but callers use a specific T
    this.messageHandlers.get(type)!.add(handler as MessageHandler);
    this.log(`Handler registered for type: ${type}`);

    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler as MessageHandler);
        if (handlers.size === 0) this.messageHandlers.delete(type);
      }
      this.log(`Handler unregistered for type: ${type}`);
    };
  }

  /**
   * Register a wildcard handler that receives every message.
   * Returns an unsubscribe function.
   */
  onAny(handler: WildcardHandler): () => void {
    this.wildcardHandlers.add(handler);
    this.log("Wildcard handler registered");

    return () => {
      this.wildcardHandlers.delete(handler);
      this.log("Wildcard handler unregistered");
    };
  }

  /**
   * Gracefully disconnect. Queued messages are discarded — flush first if needed.
   */
  disconnect(
    code: number = WebSocketCloseCode.NORMAL_CLOSURE,
    reason = "Manual disconnect"
  ): void {
    this.log("Disconnecting WebSocket", { code, reason });
    this.isManualClose = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      try {
        if (
          this.ws.readyState === WebSocket.OPEN ||
          this.ws.readyState === WebSocket.CONNECTING
        ) {
          this.ws.close(code, reason);
        }
      } catch (error) {
        this.log("Error closing WebSocket:", error);
      }
      this.ws = null;
    }

    const store = this.useStore.getState();
    store.setState(WebSocketState.DISCONNECTED);
    store.setIsAuthenticated(false);
    this.messageQueue = [];
  }

  getState(): WebSocketState {
    return this.useStore.getState().state;
  }

  isConnected(): boolean {
    return (
      this.ws?.readyState === WebSocket.OPEN &&
      this.useStore.getState().isAuthenticated
    );
  }

  /**
   * Drain the queue synchronously. Call before disconnect() if you need
   * in-flight messages delivered before teardown.
   */
  flushAndDisconnect(): void {
    this.flushMessageQueue();
    this.disconnect();
  }

  destroy(): void {
    this.log("Destroying WebSocket Manager");
    this.disconnect();
    this.messageHandlers.clear();
    this.wildcardHandlers.clear();
    this.removeVisibilityHandler();
    this.useStore.getState().reset();
  }

  // ─── Connection ─────────────────────────────────────────────────────────────

  private async performConnect(): Promise<void> {
    const store = this.useStore.getState();

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.log("Already connected");
      return;
    }

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      this.log("Connection already in progress");
      return;
    }

    this.isManualClose = false;

    try {
      const token = await tokenManager.getAccessToken();
      if (!token) throw new Error("No authentication token available");

      // FIX: token sent as first message after open, not in URL query string
      // (URL tokens leak into server logs, proxies, and browser history)
      store.setState(WebSocketState.CONNECTING);
      this.log("Connecting to WebSocket...", this.config.url);

      const protocols = Array.isArray(this.config.protocols)
        ? this.config.protocols
        : this.config.protocols
        ? [this.config.protocols]
        : undefined;

      this.ws = new WebSocket(this.config.url, protocols);

      // FIX: set up persistent handlers BEFORE waitForConnection so we don't
      // end up with duplicate `onopen` listeners competing with addEventListener
      this.setupEventHandlers();

      await this.waitForConnection(token);

      this.log("WebSocket connected successfully");
      store.setState(WebSocketState.CONNECTED);
      store.setLastConnectedAt(new Date().toISOString());
      store.resetReconnectAttempts();
      store.setIsAuthenticated(true);
      store.setError(null);

      this.startHeartbeat();
      this.flushMessageQueue();
    } catch (error) {
      this.log("Connection failed:", error);
      store.setState(WebSocketState.ERROR);
      store.setError({
        code: 0,
        reason: error instanceof Error ? error.message : "Connection failed",
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * FIX: waitForConnection now also sends the auth token as the first message
   * once the socket opens, rather than embedding it in the URL.
   *
   * FIX: resolves/rejects via a single `open`/`error` listener pair instead of
   * doubling up with addEventListener alongside the onopen already set in
   * setupEventHandlers — we wire the promise directly through handleOpen by
   * temporarily replacing it.
   */
  private waitForConnection(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error("WebSocket not initialized"));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, this.config.connectionTimeout);

      const cleanup = () => clearTimeout(timeout);

      // Temporarily override onopen to capture the open event for the promise.
      // After resolving we restore the permanent handler.
      const originalOnOpen = this.ws.onopen;
      this.ws.onopen = (event: Event) => {
        cleanup();
        // Send auth token as first frame — safer than URL query param
        try {
          this.ws?.send(JSON.stringify({ type: "auth", token }));
        } catch {
          reject(new Error("Failed to send auth token"));
          return;
        }
        if (originalOnOpen) (originalOnOpen as (e: Event) => void)(event);
        resolve();
      };

      const originalOnError = this.ws.onerror;
      this.ws.onerror = (event: Event) => {
        cleanup();
        if (originalOnError) (originalOnError as (e: Event) => void)(event);
        reject(new Error("WebSocket error during connection"));
      };
    });
  }

  // ─── Event Handlers ─────────────────────────────────────────────────────────

  private setupEventHandlers(): void {
    if (!this.ws) return;
    this.ws.onopen = this.handleOpen.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
    this.ws.onerror = this.handleError.bind(this);
    this.ws.onmessage = this.handleMessage.bind(this);
  }

  private handleOpen(_event: Event): void {
    this.log("WebSocket opened");
  }

  private handleClose(event: CloseEvent): void {
    this.log("WebSocket closed", { code: event.code, reason: event.reason });

    const store = this.useStore.getState();
    store.setState(WebSocketState.DISCONNECTED);
    store.setIsAuthenticated(false);
    this.stopHeartbeat();

    if (!this.isManualClose && this.config.reconnect) {
      this.handleReconnect(event.code, event.reason);
    }
  }

  private handleError(_event: Event): void {
    this.log("WebSocket error");

    const store = this.useStore.getState();
    store.setState(WebSocketState.ERROR);
    store.setError({
      code: 0,
      reason: "WebSocket error occurred",
      timestamp: new Date().toISOString(),
    });
  }

  private handleMessage(event: MessageEvent<string>): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      this.log("Message received:", message);

      this.resetHeartbeatTimeout();

      if (message.type === "pong") {
        this.log("Heartbeat pong received");
        return;
      }

      // Dispatch to type-specific handlers
      const handlers = this.messageHandlers.get(message.type);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(message.data);
          } catch (err) {
            this.log("Error in message handler:", err);
          }
        }
      }

      // Dispatch to wildcard handlers
      for (const handler of this.wildcardHandlers) {
        try {
          handler(message);
        } catch (err) {
          this.log("Error in wildcard message handler:", err);
        }
      }
    } catch (error) {
      this.log("Error parsing message:", error);
    }
  }

  // ─── Reconnection ────────────────────────────────────────────────────────────

  private handleReconnect(closeCode: number, reason: string): void {
    const store = this.useStore.getState();

    const noReconnectCodes: number[] = [
      WebSocketCloseCode.NORMAL_CLOSURE,
      WebSocketCloseCode.UNAUTHORIZED,
      WebSocketCloseCode.FORBIDDEN,
      WebSocketCloseCode.INVALID_TOKEN,
    ];

    if (noReconnectCodes.includes(closeCode)) {
      this.log("Not reconnecting due to close code:", closeCode);
      store.setError({
        code: closeCode,
        reason: reason || "Connection closed",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (store.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log("Max reconnect attempts reached");
      store.setError({
        code: closeCode,
        reason: "Max reconnection attempts exceeded",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // FIX: cap delay so it never grows beyond maxReconnectInterval
    const rawDelay =
      this.config.reconnectInterval *
      Math.pow(this.config.reconnectDecay, store.reconnectAttempts);
    const delay = Math.min(rawDelay, this.config.maxReconnectInterval);

    this.log(
      `Reconnecting in ${delay}ms (attempt ${store.reconnectAttempts + 1}/${
        this.config.maxReconnectAttempts
      })`
    );
    store.setState(WebSocketState.RECONNECTING);
    store.incrementReconnectAttempts();

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        this.log("Reconnection failed:", error);
      });
    }, delay);
  }

  // ─── Message Queue ───────────────────────────────────────────────────────────

  private queueMessage(message: WebSocketMessage): void {
    if (this.messageQueue.length >= this.MAX_QUEUE_SIZE) {
      this.log("Message queue full, dropping oldest message");
      this.messageQueue.shift();
    }
    this.messageQueue.push(message);
    this.log("Message queued:", message);
  }

  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;
    this.log(`Flushing ${this.messageQueue.length} queued messages`);

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (!message) break;

      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify(message));
        } catch (error) {
          this.log("Error sending queued message:", error);
          this.messageQueue.unshift(message);
          break;
        }
      }
    }
  }

  // ─── Heartbeat ───────────────────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send("ping", { timestamp: Date.now() });
        this.log("Heartbeat ping sent");

        // FIX: use HEARTBEAT_TIMEOUT (4010) so handleReconnect doesn't skip
        // reconnection because of the NORMAL_CLOSURE (1000) code
        this.heartbeatTimeoutTimer = setTimeout(() => {
          this.log("Heartbeat timeout — closing for reconnection");
          this.ws?.close(
            WebSocketCloseCode.HEARTBEAT_TIMEOUT,
            "Heartbeat timeout"
          );
        }, this.config.heartbeatTimeout);
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  // ─── Visibility Handling ─────────────────────────────────────────────────────

  /**
   * FIX: browsers throttle timers on hidden tabs, causing false heartbeat
   * timeouts and spurious reconnects. Pause heartbeat when hidden, resume
   * (and re-check connection) when visible again.
   */
  private setupVisibilityHandler(): void {
    if (typeof document === "undefined") return; // SSR guard

    this.visibilityHandler = () => {
      if (document.visibilityState === "hidden") {
        this.log("Tab hidden — pausing heartbeat");
        this.stopHeartbeat();
      } else {
        this.log("Tab visible — resuming");
        if (this.isConnected()) {
          this.startHeartbeat();
        } else if (!this.isManualClose && this.config.reconnect) {
          this.connect().catch((err) =>
            this.log("Reconnect on visibility failed:", err)
          );
        }
      }
    };

    document.addEventListener("visibilitychange", this.visibilityHandler);
  }

  private removeVisibilityHandler(): void {
    if (this.visibilityHandler && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private generateMessageId(): string {
    // FIX: crypto.randomUUID() is unambiguous and spec-compliant; substr is deprecated
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug || process.env.NODE_ENV === "development") {
      console.log(`[WebSocketManager] ${message}`, ...args);
    }
  }
}

// ─── Singleton Factory ────────────────────────────────────────────────────────

let wsManagerInstance: WebSocketManager | null = null;

/**
 * Returns the singleton WebSocketManager. Pass `config` on the first call to
 * initialise it; subsequent calls ignore `config` and return the same instance.
 */
export function getWebSocketManager(config?: WebSocketConfig): WebSocketManager {
  if (!wsManagerInstance) {
    if (!config) {
      throw new Error(
        "WebSocket Manager not initialized. Provide config on first call."
      );
    }
    wsManagerInstance = new WebSocketManager(config);
  }
  return wsManagerInstance;
}

export function destroyWebSocketManager(): void {
  if (wsManagerInstance) {
    wsManagerInstance.destroy();
    wsManagerInstance = null;
  }
}