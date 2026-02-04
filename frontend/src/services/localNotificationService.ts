/**
 * Local Notification Service
 * Uses the Web Notifications API with scheduled timers for reminder notifications.
 * For web apps, notifications require the page to be open.
 * Service Workers could be used for background notifications in the future.
 */

export type ReminderType = 'morning' | 'lunch' | 'dinner' | 'weekend';

export interface ReminderConfig {
  type: ReminderType;
  enabled: boolean;
  time: string; // HH:MM format
}

export interface ScheduledNotification {
  id: number;
  type: ReminderType;
  timeoutId: ReturnType<typeof setTimeout>;
}

// Notification IDs (fixed for easy management)
const NOTIFICATION_IDS = {
  morning: 1001,
  lunch: 1002,
  dinner: 1003,
  weekend_fri: 1004,
  weekend_sat: 1005,
  weekend_sun: 1006,
} as const;

// Rotating notification messages
const NOTIFICATION_MESSAGES = {
  morning: [
    { title: 'Good morning!', body: "What's for breakfast? Let me help you decide" },
    { title: 'Rise and shine!', body: 'Start your day with a quick decision' },
    { title: 'Morning decision time', body: 'Breakfast choices? Spin the wheel!' },
  ],
  lunch: [
    { title: 'Lunch time!', body: 'Need help choosing where to eat?' },
    { title: 'Midday munchies', body: "Let's decide what's for lunch" },
    { title: 'Hungry?', body: 'Spin the wheel for your lunch pick!' },
  ],
  dinner: [
    { title: "What's for dinner tonight?", body: 'Spin the wheel!' },
    { title: 'Evening eats', body: "Can't decide on dinner? Let me help" },
    { title: 'Dinnertime decision', body: "What's cooking tonight?" },
  ],
  weekend: [
    { title: 'Weekend plans?', body: "Let's decide together what to do!" },
    { title: 'TGIF!', body: 'Plan your weekend adventures now' },
    { title: 'Free time ahead', body: 'Spin the wheel for weekend fun!' },
  ],
};

class LocalNotificationService {
  private scheduledNotifications: ScheduledNotification[] = [];

  constructor() {
    // Permission is checked dynamically via Notification.permission
  }

  /**
   * Check if notifications are supported
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Check if we're on iOS (limited notification support in browsers)
   */
  isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Notifications not supported in this browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Check if permission is granted
   */
  hasPermission(): boolean {
    return this.getPermissionStatus() === 'granted';
  }

  /**
   * Show a notification immediately
   */
  showNotification(title: string, body: string, options?: NotificationOptions): Notification | null {
    if (!this.hasPermission()) {
      console.warn('Notification permission not granted');
      return null;
    }

    try {
      return new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'decidewiz-reminder',
        ...options,
      });
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  /**
   * Get a random message for a reminder type
   */
  getRandomMessage(type: ReminderType): { title: string; body: string } {
    const messages = NOTIFICATION_MESSAGES[type];
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  }

  /**
   * Calculate milliseconds until a specific time today or tomorrow
   */
  private getMillisecondsUntilTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    return target.getTime() - now.getTime();
  }

  /**
   * Check if today is a weekend day (Friday, Saturday, or Sunday)
   */
  private isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 0 || day === 5 || day === 6; // Sun = 0, Fri = 5, Sat = 6
  }

  /**
   * Schedule a daily reminder
   */
  scheduleReminder(config: ReminderConfig): void {
    if (!config.enabled) {
      this.cancelReminder(config.type);
      return;
    }

    // Cancel existing notification for this type
    this.cancelReminder(config.type);

    const scheduleNext = () => {
      // For weekend reminders, only notify on Fri/Sat/Sun
      if (config.type === 'weekend' && !this.isWeekend()) {
        // Schedule check for next day
        const msUntilMidnight = this.getMillisecondsUntilTime('00:00');
        const timeoutId = setTimeout(() => scheduleNext(), msUntilMidnight);
        this.scheduledNotifications.push({
          id: NOTIFICATION_IDS.weekend_fri,
          type: config.type,
          timeoutId,
        });
        return;
      }

      const msUntilTime = this.getMillisecondsUntilTime(config.time);

      const timeoutId = setTimeout(() => {
        const { title, body } = this.getRandomMessage(config.type);
        this.showNotification(title, body);
        // Schedule the next occurrence
        scheduleNext();
      }, msUntilTime);

      this.scheduledNotifications.push({
        id: NOTIFICATION_IDS[config.type === 'weekend' ? 'weekend_fri' : config.type],
        type: config.type,
        timeoutId,
      });
    };

    if (this.hasPermission()) {
      scheduleNext();
    }
  }

  /**
   * Cancel a scheduled reminder
   */
  cancelReminder(type: ReminderType): void {
    const toRemove = this.scheduledNotifications.filter((n) => n.type === type);
    toRemove.forEach((n) => clearTimeout(n.timeoutId));
    this.scheduledNotifications = this.scheduledNotifications.filter((n) => n.type !== type);
  }

  /**
   * Cancel all scheduled reminders
   */
  cancelAllReminders(): void {
    this.scheduledNotifications.forEach((n) => clearTimeout(n.timeoutId));
    this.scheduledNotifications = [];
  }

  /**
   * Schedule multiple reminders at once
   */
  scheduleAllReminders(configs: ReminderConfig[]): void {
    this.cancelAllReminders();
    configs.forEach((config) => this.scheduleReminder(config));
  }

  /**
   * Test notification (show immediately)
   */
  async testNotification(type: ReminderType): Promise<boolean> {
    if (!this.hasPermission()) {
      const granted = await this.requestPermission();
      if (!granted) return false;
    }

    const { title, body } = this.getRandomMessage(type);
    const notification = this.showNotification(title, body);
    return notification !== null;
  }
}

// Singleton instance
export const localNotificationService = new LocalNotificationService();
export default localNotificationService;
