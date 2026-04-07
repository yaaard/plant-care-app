import type { SQLiteDatabase } from 'expo-sqlite';

import { CARE_TYPES, type CareType } from '@/constants/careTypes';
import { todayString } from '@/lib/date';
import { createId, getDatabase, nowIsoString } from '@/lib/db';
import { initializeDatabase } from '@/lib/db-init';
import type { CareTask, CareTaskType, CareTaskWithPlant } from '@/types/task';

async function resolveDatabase(database?: SQLiteDatabase) {
  if (database) {
    return database;
  }

  await initializeDatabase();
  return getDatabase();
}

export async function getPendingTasks(database?: SQLiteDatabase): Promise<CareTaskWithPlant[]> {
  const activeDatabase = await resolveDatabase(database);

  return activeDatabase.getAllAsync<CareTaskWithPlant>(
    `
      SELECT
        care_tasks.id,
        care_tasks.plantId,
        care_tasks.type,
        care_tasks.scheduledDate,
        care_tasks.isCompleted,
        care_tasks.completedAt,
        care_tasks.createdAt,
        plants.name AS plantName,
        plants.species AS plantSpecies,
        plants.photoUri AS plantPhotoUri,
        plants.riskLevel AS plantRiskLevel
      FROM care_tasks
      INNER JOIN plants ON plants.id = care_tasks.plantId
      WHERE care_tasks.isCompleted = 0
      ORDER BY care_tasks.scheduledDate ASC, plants.name COLLATE NOCASE ASC
    `
  );
}

export async function getTaskById(
  taskId: string,
  database?: SQLiteDatabase
): Promise<CareTask | null> {
  const activeDatabase = await resolveDatabase(database);

  return activeDatabase.getFirstAsync<CareTask>(
    `
      SELECT id, plantId, type, scheduledDate, isCompleted, completedAt, createdAt
      FROM care_tasks
      WHERE id = ?
      LIMIT 1
    `,
    taskId
  );
}

export async function getTasksByPlantId(
  plantId: string,
  database?: SQLiteDatabase
): Promise<CareTask[]> {
  const activeDatabase = await resolveDatabase(database);

  return activeDatabase.getAllAsync<CareTask>(
    `
      SELECT id, plantId, type, scheduledDate, isCompleted, completedAt, createdAt
      FROM care_tasks
      WHERE plantId = ?
      ORDER BY isCompleted ASC, scheduledDate ASC, createdAt DESC
    `,
    plantId
  );
}

export async function createCareTaskIfNeeded(
  plantId: string,
  type: CareTaskType,
  scheduledDate: string,
  database?: SQLiteDatabase
): Promise<CareTask> {
  const activeDatabase = await resolveDatabase(database);

  const existingTask = await activeDatabase.getFirstAsync<CareTask>(
    `
      SELECT id, plantId, type, scheduledDate, isCompleted, completedAt, createdAt
      FROM care_tasks
      WHERE plantId = ? AND type = ? AND scheduledDate = ? AND isCompleted = 0
      LIMIT 1
    `,
    plantId,
    type,
    scheduledDate
  );

  if (existingTask) {
    return existingTask;
  }

  const task: CareTask = {
    id: createId('task'),
    plantId,
    type,
    scheduledDate,
    isCompleted: 0,
    completedAt: null,
    createdAt: nowIsoString(),
  };

  await activeDatabase.runAsync(
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

  return task;
}

export async function deleteActiveTasksForPlantByType(
  plantId: string,
  type: CareType,
  database?: SQLiteDatabase
): Promise<void> {
  const activeDatabase = await resolveDatabase(database);

  await activeDatabase.runAsync(
    `
      DELETE FROM care_tasks
      WHERE plantId = ? AND type = ? AND isCompleted = 0
    `,
    plantId,
    type
  );
}

export async function replaceActiveTaskForPlantByType(
  plantId: string,
  type: CareType,
  scheduledDate: string,
  database?: SQLiteDatabase
): Promise<void> {
  const activeDatabase = await resolveDatabase(database);

  await deleteActiveTasksForPlantByType(plantId, type, activeDatabase);
  await createCareTaskIfNeeded(plantId, type, scheduledDate, activeDatabase);
}

export async function completeTaskById(
  taskId: string,
  completedAt: string,
  database?: SQLiteDatabase
): Promise<void> {
  const activeDatabase = await resolveDatabase(database);

  await activeDatabase.runAsync(
    `
      UPDATE care_tasks
      SET isCompleted = 1, completedAt = ?
      WHERE id = ?
    `,
    completedAt,
    taskId
  );
}

export async function completeActiveTasksForPlantByType(
  plantId: string,
  type: CareType,
  completedAt: string,
  database?: SQLiteDatabase
): Promise<void> {
  const activeDatabase = await resolveDatabase(database);

  await activeDatabase.runAsync(
    `
      UPDATE care_tasks
      SET isCompleted = 1, completedAt = ?
      WHERE plantId = ? AND type = ? AND isCompleted = 0
    `,
    completedAt,
    plantId,
    type
  );
}

export async function getOverdueTasksCount(database?: SQLiteDatabase): Promise<number> {
  const activeDatabase = await resolveDatabase(database);
  const today = todayString();

  const result = await activeDatabase.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM care_tasks
      WHERE isCompleted = 0 AND scheduledDate < ?
    `,
    today
  );

  return result?.count ?? 0;
}
