import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';

import { BACKUP_DIRECTORY_NAME, BACKUP_SCHEMA_VERSION, DEFAULT_SETTINGS } from '@/constants/defaultValues';
import { getDatabase } from '@/lib/db';
import { initializeDatabase } from '@/lib/db-init';
import { refreshScheduledNotificationsAsync } from '@/lib/notifications';
import { refreshAllPlantCareState } from '@/lib/plants-repo';
import { parseBackupData } from '@/lib/validators';
import type { AppBackup, BackupExportResult, ParsedBackupFile } from '@/types/backup';
import type { CareLog } from '@/types/log';
import type { Plant } from '@/types/plant';
import type { AppSettings } from '@/types/settings';
import type { CareTask } from '@/types/task';

const BACKUP_MIME_TYPES = ['application/json', 'text/json', 'text/plain'];

const PLANT_COLUMNS = `
  id,
  name,
  species,
  photoUri,
  lastWateringDate,
  wateringIntervalDays,
  notes,
  lightCondition,
  humidityCondition,
  roomTemperature,
  conditionTags,
  customCareComment,
  riskLevel,
  lastInspectionDate,
  createdAt,
  updatedAt
`;

function getAppVersion() {
  return Constants.expoConfig?.version ?? '1.0.0';
}

function ensureSupportedPlatform() {
  if (Platform.OS === 'web') {
    throw new Error('Экспорт и импорт доступны только на Android и iOS.');
  }
}

function buildBackupFileName(exportedAt: string) {
  const safeStamp = exportedAt.replace(/[:.]/g, '-');
  return `plant-care-backup-${safeStamp}.json`;
}

async function getBackupDirectory() {
  const directory = new Directory(Paths.document, BACKUP_DIRECTORY_NAME);
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

async function collectBackupData(): Promise<AppBackup> {
  await initializeDatabase();
  const database = await getDatabase();

  const [plants, careTasks, careLogs, settings] = await Promise.all([
    database.getAllAsync<Plant>(
      `
        SELECT ${PLANT_COLUMNS}
        FROM plants
        ORDER BY createdAt ASC
      `
    ),
    database.getAllAsync<CareTask>(
      `
        SELECT id, plantId, type, scheduledDate, isCompleted, completedAt, createdAt
        FROM care_tasks
        ORDER BY createdAt ASC
      `
    ),
    database.getAllAsync<CareLog>(
      `
        SELECT id, plantId, actionType, actionDate, comment, createdAt
        FROM care_logs
        ORDER BY createdAt ASC
      `
    ),
    database.getFirstAsync<AppSettings>(
      `
        SELECT id, notificationsEnabled, notificationHour, notificationMinute
        FROM settings
        WHERE id = 1
      `
    ),
  ]);

  return {
    metadata: {
      appVersion: getAppVersion(),
      exportedAt: new Date().toISOString(),
      schemaVersion: BACKUP_SCHEMA_VERSION,
    },
    plants,
    careTasks,
    careLogs,
    settings: settings ?? DEFAULT_SETTINGS,
  };
}

export async function exportAppBackupAsync(): Promise<BackupExportResult> {
  ensureSupportedPlatform();

  const backup = await collectBackupData();
  const directory = await getBackupDirectory();
  const fileName = buildBackupFileName(backup.metadata.exportedAt);
  const file = new File(directory, fileName);

  if (file.exists) {
    file.delete();
  }

  file.create({ intermediates: true, overwrite: true });
  file.write(JSON.stringify(backup, null, 2));

  return {
    fileName,
    fileUri: file.uri,
    backup,
  };
}

export async function shareBackupFileAsync(fileUri: string): Promise<boolean> {
  ensureSupportedPlatform();

  const available = await Sharing.isAvailableAsync();

  if (!available) {
    return false;
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Поделиться резервной копией',
  });

  return true;
}

export async function pickBackupFileAsync(): Promise<ParsedBackupFile | null> {
  ensureSupportedPlatform();

  const result = await DocumentPicker.getDocumentAsync({
    type: BACKUP_MIME_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
    base64: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const file = new File(asset.uri);
  const fileText = await file.text();

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(fileText);
  } catch {
    throw new Error('Выбранный файл не является корректным JSON backup-файлом.');
  }

  return {
    fileName: asset.name,
    backup: parseBackupData(parsedJson),
  };
}

async function clearDatabaseTables(database: Awaited<ReturnType<typeof getDatabase>>) {
  await database.execAsync(`
    DELETE FROM care_logs;
    DELETE FROM care_tasks;
    DELETE FROM plants;
    DELETE FROM settings;
  `);
}

export async function restoreBackupAsync(backup: AppBackup): Promise<void> {
  ensureSupportedPlatform();
  await initializeDatabase();

  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    await clearDatabaseTables(database);

    for (const plant of backup.plants) {
      await database.runAsync(
        `
          INSERT INTO plants (
            id,
            name,
            species,
            photoUri,
            lastWateringDate,
            wateringIntervalDays,
            notes,
            lightCondition,
            humidityCondition,
            roomTemperature,
            conditionTags,
            customCareComment,
            riskLevel,
            lastInspectionDate,
            createdAt,
            updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        plant.id,
        plant.name,
        plant.species,
        plant.photoUri,
        plant.lastWateringDate,
        plant.wateringIntervalDays,
        plant.notes,
        plant.lightCondition,
        plant.humidityCondition,
        plant.roomTemperature,
        plant.conditionTags,
        plant.customCareComment,
        plant.riskLevel,
        plant.lastInspectionDate,
        plant.createdAt,
        plant.updatedAt
      );
    }

    for (const task of backup.careTasks) {
      await database.runAsync(
        `
          INSERT INTO care_tasks (
            id,
            plantId,
            type,
            scheduledDate,
            isCompleted,
            completedAt,
            createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        task.id,
        task.plantId,
        task.type,
        task.scheduledDate,
        task.isCompleted,
        task.completedAt,
        task.createdAt
      );
    }

    for (const log of backup.careLogs) {
      await database.runAsync(
        `
          INSERT INTO care_logs (
            id,
            plantId,
            actionType,
            actionDate,
            comment,
            createdAt
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        log.id,
        log.plantId,
        log.actionType,
        log.actionDate,
        log.comment,
        log.createdAt
      );
    }

    await database.runAsync(
      `
        INSERT INTO settings (
          id,
          notificationsEnabled,
          notificationHour,
          notificationMinute
        ) VALUES (?, ?, ?, ?)
      `,
      1,
      backup.settings.notificationsEnabled,
      backup.settings.notificationHour,
      backup.settings.notificationMinute
    );
  });

  await refreshAllPlantCareState();
  await refreshScheduledNotificationsAsync();
}

export async function resetAllDataAsync(): Promise<void> {
  ensureSupportedPlatform();
  await initializeDatabase();

  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    await clearDatabaseTables(database);

    await database.runAsync(
      `
        INSERT INTO settings (
          id,
          notificationsEnabled,
          notificationHour,
          notificationMinute
        ) VALUES (?, ?, ?, ?)
      `,
      DEFAULT_SETTINGS.id,
      DEFAULT_SETTINGS.notificationsEnabled,
      DEFAULT_SETTINGS.notificationHour,
      DEFAULT_SETTINGS.notificationMinute
    );
  });

  await refreshScheduledNotificationsAsync();
}
