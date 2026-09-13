import type { Notification } from './types';

let notificationCounter = 0;

export class NotificationSystem {
  private container: HTMLDivElement;
  private notifications: Notification[] = [];
  private toastElements = new Map<string, HTMLDivElement>();

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'notification-container';
    parent.appendChild(this.container);
  }

  show(text: string, type: Notification['type'], duration: number): void {
    const notification: Notification = {
      id: `toast-${notificationCounter += 1}`,
      text,
      type,
      duration,
      createdAt: performance.now(),
    };

    this.notifications.push(notification);

    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    toast.textContent = text;
    this.toastElements.set(notification.id, toast);
    this.container.appendChild(toast);
  }

  update(_dt: number): void {
    const now = performance.now();
    const expired: string[] = [];

    for (const notification of this.notifications) {
      if (now - notification.createdAt >= notification.duration) {
        expired.push(notification.id);
      }
    }

    for (const id of expired) {
      this.removeNotification(id);
    }
  }

  clear(): void {
    for (const id of [...this.toastElements.keys()]) {
      this.removeNotification(id);
    }
  }

  private removeNotification(id: string): void {
    const toast = this.toastElements.get(id);
    if (toast) {
      toast.classList.add('expiring');
      window.setTimeout(() => toast.remove(), 300);
      this.toastElements.delete(id);
    }
    this.notifications = this.notifications.filter((n) => n.id !== id);
  }
}
