import { DEFAULT_SETTINGS } from '@/constants/defaultValues';
import { getDatabase } from '@/lib/db';
import { initializeDatabase } from '@/lib/db-init';
import type { AppSettings } from '@/types/settings';

export async function getSettings(): Promise<AppSettings> {
  await initializeDatabase();
  const database = await getDatabase();

  const settings = await database.getFirstAsync<AppSettings>(
    `
      SELECT id, notificationsEnabled, notificationHour, notificationMinute
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

  const nextSettings = {
    ...DEFAULT_SETTINGS,
    ...values,
    id: DEFAULT_SETTINGS.id,
  };

  await database.runAsync(
    `
      INSERT INTO settings (id, notificationsEnabled, notificationHour, notificationMinute)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        notificationsEnabled = excluded.notificationsEnabled,
        notificationHour = excluded.notificationHour,
        notificationMinute = excluded.notificationMinute
    `,
    nextSettings.id,
    nextSettings.notificationsEnabled,
    nextSettings.notificationHour,
    nextSettings.notificationMinute
  );

  return nextSettings;
}
