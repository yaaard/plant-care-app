import type { SQLiteDatabase } from 'expo-sqlite';

import { createId, getDatabase, nowIsoString } from '@/lib/db';
import { initializeDatabase } from '@/lib/db-init';
import type { CareActionType, CareLog, CareLogWithPlant } from '@/types/log';

async function resolveDatabase(database?: SQLiteDatabase) {
  if (database) {
    return database;
  }

  await initializeDatabase();
  return getDatabase();
}

export async function getLogs(): Promise<CareLogWithPlant[]> {
  const database = await resolveDatabase();

  return database.getAllAsync<CareLogWithPlant>(
    `
      SELECT
        care_logs.id,
        care_logs.plantId,
        care_logs.actionType,
        care_logs.actionDate,
        care_logs.comment,
        care_logs.createdAt,
        plants.name AS plantName,
        plants.species AS plantSpecies
      FROM care_logs
      INNER JOIN plants ON plants.id = care_logs.plantId
      ORDER BY care_logs.actionDate DESC, care_logs.createdAt DESC
    `
  );
}

export async function getLogsByPlantId(plantId: string): Promise<CareLog[]> {
  const database = await resolveDatabase();

  return database.getAllAsync<CareLog>(
    `
      SELECT id, plantId, actionType, actionDate, comment, createdAt
      FROM care_logs
      WHERE plantId = ?
      ORDER BY actionDate DESC, createdAt DESC
    `,
    plantId
  );
}

export async function addCareLog(
  values: {
    plantId: string;
    actionType: CareActionType;
    actionDate: string;
    comment: string;
  },
  database?: SQLiteDatabase
): Promise<CareLog> {
  const activeDatabase = await resolveDatabase(database);

  const log: CareLog = {
    id: createId('log'),
    plantId: values.plantId,
    actionType: values.actionType,
    actionDate: values.actionDate,
    comment: values.comment,
    createdAt: nowIsoString(),
  };

  await activeDatabase.runAsync(
    `
      INSERT INTO care_logs (id, plantId, actionType, actionDate, comment, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    log.id,
    log.plantId,
    log.actionType,
    log.actionDate,
    log.comment,
    log.createdAt
  );

  return log;
}
