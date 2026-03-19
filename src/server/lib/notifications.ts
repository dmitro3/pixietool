// In-memory notification bus for SSE push.
// In production, replace with Redis pub/sub for multi-instance support.

export type NotificationType =
  | "content_generated"
  | "content_published"
  | "content_failed"
  | "engagement_new"
  | "engagement_replied"
  | "billing_payment_failed"
  | "platform_disconnected"
  | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  brandId?: string;
  userId?: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
}

type Listener = (notification: Notification) => void;

class NotificationBus {
  private listeners = new Map<string, Set<Listener>>();

  subscribe(userId: string, listener: Listener): () => void {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, new Set());
    }
    this.listeners.get(userId)!.add(listener);

    return () => {
      this.listeners.get(userId)?.delete(listener);
      if (this.listeners.get(userId)?.size === 0) {
        this.listeners.delete(userId);
      }
    };
  }

  emit(userId: string, notification: Omit<Notification, "id" | "createdAt" | "read">) {
    const full: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      read: false,
    };

    const userListeners = this.listeners.get(userId);
    if (userListeners) {
      for (const listener of userListeners) {
        listener(full);
      }
    }
  }

  // Broadcast to all connected users (for system notifications)
  broadcast(notification: Omit<Notification, "id" | "createdAt" | "read">) {
    const full: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      read: false,
    };

    for (const [, userListeners] of this.listeners) {
      for (const listener of userListeners) {
        listener(full);
      }
    }
  }
}

// Singleton
export const notificationBus = new NotificationBus();
