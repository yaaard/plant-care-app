import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';

import { BACKUP_DIRECTORY_NAME, BACKUP_SCHEMA_VERSION, DEFAULT_SETTINGS } from '@/constants/defaultValues';
import { getAllAiAnalyses } from '@/lib/ai-analyses-repo';
import { getAllChatMessages, getAllChatThreads } from '@/lib/chat-repo';
import { getDatabase } from '@/lib/db';
import { initializeDatabase } from '@/lib/db-init';
import { emitLocalDataChanged } from '@/lib/local-events';
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
  catalogPlantId,
  photoUri,
  photoPath,
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

  const [plants, careTasks, careLogs, aiAnalyses, chatThreads, chatMessages, settings] =
    await Promise.all([
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
    getAllAiAnalyses(database),
    getAllChatThreads(),
    getAllChatMessages(),
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
    aiAnalyses,
    chatThreads,
    chatMessages,
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
    DELETE FROM sync_deletions;
    DELETE FROM chat_messages;
    DELETE FROM chat_threads;
    DELETE FROM plant_ai_analyses;
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
            catalogPlantId,
            photoUri,
            photoPath,
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        plant.id,
        plant.name,
        plant.species,
        plant.catalogPlantId,
        plant.photoUri,
        plant.photoPath ?? null,
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

    for (const analysis of backup.aiAnalyses) {
      await database.runAsync(
        `
          INSERT INTO plant_ai_analyses (
            id,
            plantId,
            userId,
            photoPath,
            modelName,
            summary,
            overallCondition,
            urgency,
            observedSigns,
            possibleCauses,
            wateringAdvice,
            lightAdvice,
            humidityAdvice,
            recommendedActions,
            confidenceNote,
            rawJson,
            createdAt,
            updatedAt,
            syncStatus,
            remoteUpdatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        analysis.id,
        analysis.plantId,
        analysis.userId ?? null,
        analysis.photoPath ?? null,
        analysis.modelName,
        analysis.summary,
        analysis.overallCondition,
        analysis.urgency,
        JSON.stringify(analysis.observedSigns),
        JSON.stringify(analysis.possibleCauses),
        analysis.wateringAdvice,
        analysis.lightAdvice,
        analysis.humidityAdvice,
        JSON.stringify(analysis.recommendedActions),
        analysis.confidenceNote,
        analysis.rawJson,
        analysis.createdAt,
        analysis.updatedAt,
        analysis.syncStatus ?? 'synced',
        analysis.remoteUpdatedAt ?? analysis.updatedAt
      );
    }

    for (const thread of backup.chatThreads) {
      await database.runAsync(
        `
          INSERT INTO chat_threads (
            id,
            userId,
            plantId,
            title,
            createdAt,
            updatedAt,
            syncStatus,
            remoteUpdatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        thread.id,
        thread.userId ?? null,
        thread.plantId ?? null,
        thread.title ?? null,
        thread.createdAt,
        thread.updatedAt,
        thread.syncStatus ?? 'synced',
        thread.remoteUpdatedAt ?? thread.updatedAt
      );
    }

    for (const message of backup.chatMessages) {
      await database.runAsync(
        `
          INSERT INTO chat_messages (
            id,
            threadId,
            userId,
            role,
            text,
            imagePath,
            createdAt,
            updatedAt,
            syncStatus,
            remoteUpdatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        message.id,
        message.threadId,
        message.userId ?? null,
        message.role,
        message.text,
        message.imagePath ?? null,
        message.createdAt,
        message.updatedAt,
        message.syncStatus ?? 'synced',
        message.remoteUpdatedAt ?? message.updatedAt
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
  emitLocalDataChanged();
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
  emitLocalDataChanged();
}
