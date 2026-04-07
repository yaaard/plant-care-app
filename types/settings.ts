import type { SyncStatus } from '@/types/sync';

export interface AppSettings {
  id: number;
  notificationsEnabled: number;
  notificationHour: number;
  notificationMinute: number;
  updatedAt?: string;
  userId?: string | null;
  syncStatus?: SyncStatus;
  remoteUpdatedAt?: string | null;
}

export interface SettingsFormValues {
  notificationsEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
}
