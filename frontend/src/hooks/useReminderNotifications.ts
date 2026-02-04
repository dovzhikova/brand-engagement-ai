import { useState, useEffect, useCallback } from 'react';
import localNotificationService, {
  ReminderType,
  ReminderConfig,
} from '../services/localNotificationService';

// Storage key for reminder preferences
const STORAGE_KEY = 'decidewiz_reminder_preferences';

// Default reminder times
const DEFAULT_TIMES: Record<ReminderType, string> = {
  morning: '08:00',
  lunch: '12:00',
  dinner: '18:00',
  weekend: '10:00',
};

export interface ReminderPreferences {
  morningEnabled: boolean;
  morningTime: string;
  lunchEnabled: boolean;
  lunchTime: string;
  dinnerEnabled: boolean;
  dinnerTime: string;
  weekendEnabled: boolean;
  weekendTime: string;
}

const DEFAULT_PREFERENCES: ReminderPreferences = {
  morningEnabled: false,
  morningTime: DEFAULT_TIMES.morning,
  lunchEnabled: false,
  lunchTime: DEFAULT_TIMES.lunch,
  dinnerEnabled: false,
  dinnerTime: DEFAULT_TIMES.dinner,
  weekendEnabled: false,
  weekendTime: DEFAULT_TIMES.weekend,
};

export interface UseReminderNotificationsResult {
  // State
  preferences: ReminderPreferences;
  permissionStatus: NotificationPermission;
  isSupported: boolean;
  isLoading: boolean;

  // Actions
  requestPermission: () => Promise<boolean>;
  updateReminder: (type: ReminderType, enabled: boolean, time?: string) => void;
  updateReminderTime: (type: ReminderType, time: string) => void;
  testNotification: (type: ReminderType) => Promise<boolean>;
  resetToDefaults: () => void;
}

/**
 * Hook for managing reminder notification preferences
 */
export function useReminderNotifications(): UseReminderNotificationsResult {
  const [preferences, setPreferences] = useState<ReminderPreferences>(DEFAULT_PREFERENCES);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(true);

  const isSupported = localNotificationService.isSupported();

  // Load preferences from localStorage on mount
  useEffect(() => {
    const loadPreferences = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<ReminderPreferences>;
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        }
      } catch (error) {
        console.error('Error loading reminder preferences:', error);
      }
      setIsLoading(false);
    };

    loadPreferences();
    setPermissionStatus(localNotificationService.getPermissionStatus());
  }, []);

  // Save preferences to localStorage and sync notifications when preferences change
  useEffect(() => {
    if (isLoading) return;

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving reminder preferences:', error);
    }

    // Sync scheduled notifications
    const configs: ReminderConfig[] = [
      { type: 'morning', enabled: preferences.morningEnabled, time: preferences.morningTime },
      { type: 'lunch', enabled: preferences.lunchEnabled, time: preferences.lunchTime },
      { type: 'dinner', enabled: preferences.dinnerEnabled, time: preferences.dinnerTime },
      { type: 'weekend', enabled: preferences.weekendEnabled, time: preferences.weekendTime },
    ];

    // Only schedule if we have permission
    if (permissionStatus === 'granted') {
      localNotificationService.scheduleAllReminders(configs);
    }
  }, [preferences, permissionStatus, isLoading]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await localNotificationService.requestPermission();
    setPermissionStatus(localNotificationService.getPermissionStatus());
    return granted;
  }, []);

  // Update a specific reminder
  const updateReminder = useCallback(
    async (type: ReminderType, enabled: boolean, time?: string) => {
      // If enabling and we don't have permission, request it first
      if (enabled && permissionStatus !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          return; // Don't enable if permission denied
        }
      }

      setPreferences((prev) => {
        const updates: Partial<ReminderPreferences> = {};

        switch (type) {
          case 'morning':
            updates.morningEnabled = enabled;
            if (time) updates.morningTime = time;
            break;
          case 'lunch':
            updates.lunchEnabled = enabled;
            if (time) updates.lunchTime = time;
            break;
          case 'dinner':
            updates.dinnerEnabled = enabled;
            if (time) updates.dinnerTime = time;
            break;
          case 'weekend':
            updates.weekendEnabled = enabled;
            if (time) updates.weekendTime = time;
            break;
        }

        return { ...prev, ...updates };
      });
    },
    [permissionStatus, requestPermission]
  );

  // Update just the time for a reminder
  const updateReminderTime = useCallback((type: ReminderType, time: string) => {
    setPreferences((prev) => {
      switch (type) {
        case 'morning':
          return { ...prev, morningTime: time };
        case 'lunch':
          return { ...prev, lunchTime: time };
        case 'dinner':
          return { ...prev, dinnerTime: time };
        case 'weekend':
          return { ...prev, weekendTime: time };
        default:
          return prev;
      }
    });
  }, []);

  // Test a notification type
  const testNotification = useCallback(async (type: ReminderType): Promise<boolean> => {
    const result = await localNotificationService.testNotification(type);
    setPermissionStatus(localNotificationService.getPermissionStatus());
    return result;
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    localNotificationService.cancelAllReminders();
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  return {
    preferences,
    permissionStatus,
    isSupported,
    isLoading,
    requestPermission,
    updateReminder,
    updateReminderTime,
    testNotification,
    resetToDefaults,
  };
}

export default useReminderNotifications;
