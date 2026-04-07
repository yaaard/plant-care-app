import type { SQLiteDatabase } from 'expo-sqlite';

import { createId, getDatabase, nowIsoString } from '@/lib/db';
import { initializeDatabase } from '@/lib/db-init';
import { getCurrentSupabaseUserIdAsync } from '@/lib/supabase';
import type { CareActionType, CareLog, CareLogWithPlant } from '@/types/log';

const LOG_SELECT_COLUMNS = `
  id,
  plantId,
  actionType,
  actionDate,
  comment,
  createdAt,
  updatedAt,
  userId,
  syncStatus,
  remoteUpdatedAt
`;

async function resolveDatabase(database?: SQLiteDatabase) {
  if (database) {
    return database;
  }

  await initializeDatabase();
  return getDatabase();
}

export async function getLogs(database?: SQLiteDatabase): Promise<CareLogWithPlant[]> {
  const activeDatabase = await resolveDatabase(database);

  return activeDatabase.getAllAsync<CareLogWithPlant>(
    `
      SELECT
        care_logs.id,
        care_logs.plantId,
        care_logs.actionType,
        care_logs.actionDate,
        care_logs.comment,
        care_logs.createdAt,
        COALESCE(NULLIF(care_logs.updatedAt, ''), care_logs.createdAt) AS updatedAt,
        care_logs.userId,
        care_logs.syncStatus,
        care_logs.remoteUpdatedAt,
        COALESCE(plants.name, 'Удалённое растение') AS plantName,
        COALESCE(plants.species, 'Вид не указан') AS plantSpecies
      FROM care_logs
      LEFT JOIN plants ON plants.id = care_logs.plantId
      ORDER BY care_logs.actionDate DESC, care_logs.createdAt DESC
    `
  );
}

export async function getLogsByPlantId(
  plantId: string,
  database?: SQLiteDatabase
): Promise<CareLog[]> {
  const activeDatabase = await resolveDatabase(database);

  return activeDatabase.getAllAsync<CareLog>(
    `
      SELECT ${LOG_SELECT_COLUMNS}
      FROM care_logs
      WHERE plantId = ?
      ORDER BY actionDate DESC, createdAt DESC
    `,
    plantId
  );
}

export async function getLatestActionDateByType(
  plantId: string,
  actionType: CareActionType,
  database?: SQLiteDatabase
): Promise<string | null> {
  const activeDatabase = await resolveDatabase(database);

  const log = await activeDatabase.getFirstAsync<{ actionDate: string }>(
    `
      SELECT actionDate
      FROM care_logs
      WHERE plantId = ? AND actionType = ?
      ORDER BY actionDate DESC, createdAt DESC
      LIMIT 1
    `,
    plantId,
    actionType
  );

  return log?.actionDate ?? null;
}

export async function addCareLog(
  values: {
    plantId: string;
    actionType: CareActionType;
    actionDate: string;
    comment: string;
  },
  database?: SQLiteDatabase,
  userId?: string | null
): Promise<CareLog> {
  const activeDatabase = await resolveDatabase(database);
  const timestamp = nowIsoString();
  const resolvedUserId = userId ?? (await getCurrentSupabaseUserIdAsync());

  const log: CareLog = {
    id: createId('log'),
    plantId: values.plantId,
    actionType: values.actionType,
    actionDate: values.actionDate,
    comment: values.comment,
    createdAt: timestamp,
    updatedAt: timestamp,
    userId: resolvedUserId,
    syncStatus: 'pending',
    remoteUpdatedAt: null,
  };

  await activeDatabase.runAsync(
    `
      INSERT INTO care_logs (
        id,
        plantId,
        actionType,
        actionDate,
        comment,
        createdAt,
        updatedAt,
        userId,
        syncStatus,
        remoteUpdatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    log.id,
    log.plantId,
    log.actionType,
    log.actionDate,
    log.comment,
    log.createdAt,
    log.updatedAt ?? log.createdAt,
    log.userId ?? null,
    log.syncStatus ?? 'pending',
    log.remoteUpdatedAt ?? null
  );

  return log;
}
