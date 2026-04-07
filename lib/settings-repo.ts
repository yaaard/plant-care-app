import { DEFAULT_SETTINGS } from '@/constants/defaultValues';
import { getDatabase } from '@/lib/db';
import { initializeDatabase } from '@/lib/db-init';
import { emitLocalDataChanged } from '@/lib/local-events';
import { getCurrentSupabaseUserIdAsync } from '@/lib/supabase';
import type { AppSettings } from '@/types/settings';

export async function getSettings(): Promise<AppSettings> {
  await initializeDatabase();
  const database = await getDatabase();

  const settings = await database.getFirstAsync<AppSettings>(
    `
      SELECT
        id,
        notificationsEnabled,
        notificationHour,
        notificationMinute,
        updatedAt,
        userId,
        syncStatus,
        remoteUpdatedAt
      FROM settings
      WHERE id = 1
    `
  );

  return settings ?? DEFAULT_SETTINGS;
}

export async function updateSettings(
  values: Omit<AppSettings, 'id'> | AppSettings
): Promise<AppSettings> {
  await initializeDatabase();
  const database = await getDatabase();
  const currentSettings = await getSettings();
  const currentUserId = await getCurrentSupabaseUserIdAsync();
  const updatedAt = new Date().toISOString();

  const nextSettings = {
    ...currentSettings,
    ...DEFAULT_SETTINGS,
    ...values,
    id: DEFAULT_SETTINGS.id,
    updatedAt,
    userId: currentUserId ?? currentSettings.userId ?? null,
    syncStatus: 'pending' as const,
    remoteUpdatedAt: null,
  };

  await database.runAsync(
    `
      INSERT INTO settings (
        id,
        notificationsEnabled,
        notificationHour,
        notificationMinute,
        updatedAt,
        userId,
        syncStatus,
        remoteUpdatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        notificationsEnabled = excluded.notificationsEnabled,
        notificationHour = excluded.notificationHour,
        notificationMinute = excluded.notificationMinute,
        updatedAt = excluded.updatedAt,
        userId = excluded.userId,
        syncStatus = excluded.syncStatus,
        remoteUpdatedAt = excluded.remoteUpdatedAt
    `,
    nextSettings.id,
    nextSettings.notificationsEnabled,
    nextSettings.notificationHour,
    nextSettings.notificationMinute,
    nextSettings.updatedAt,
    nextSettings.userId,
    nextSettings.syncStatus,
    nextSettings.remoteUpdatedAt
  );

  emitLocalDataChanged();

  return nextSettings;
}
