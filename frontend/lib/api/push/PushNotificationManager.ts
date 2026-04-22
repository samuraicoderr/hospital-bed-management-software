
type PushOptions = {
  icon?: string;
  badge?: string;
  onClick?: (notification: Notification) => void;
};

export class PushNotificationManager {
  private options: PushOptions;
  private permission: NotificationPermission = "default";

  constructor(options: PushOptions = {}) {
    this.options = options;
    // Sync current permission state on init — don't ask yet
    if (typeof window !== "undefined" && "Notification" in window) {
      this.permission = Notification.permission;
    }
  }

  get isSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window;
  }

  get isGranted(): boolean {
    return this.permission === "granted";
  }

  /** Call this on a user gesture (button click etc) — never on mount */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) return "denied";
    this.permission = await Notification.requestPermission();
    return this.permission;
  }

  /**
   * Show a push notification only if the tab is hidden.
   * If the tab is visible, let the in-app UI handle it — don't double notify.
   */
  notify(title: string, body: string, tag?: string): void {
    if (!this.isGranted) return;
    if (document.visibilityState === "visible") return; // tab is open, skip

    const n = new Notification(title, {
      body,
      icon: this.options.icon ?? "/icon-192.png",
      badge: this.options.badge ?? "/badge.png",
      tag,         // deduplicates — same tag replaces previous notification
      silent: false,
    });

    n.onclick = () => {
      window.focus();
      n.close();
      this.options.onClick?.(n);
    };
  }
}

// Singleton — one instance for the whole app
export const pushManager = new PushNotificationManager({
  icon: "/icon-192.png",
});