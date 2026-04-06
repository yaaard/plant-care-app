import type { SQLiteDatabase } from 'expo-sqlite';

import { CARE_TYPES } from '@/constants/careTypes';
import { createId, getDatabase, nowIsoString } from '@/lib/db';
import { initializeDatabase } from '@/lib/db-init';
import type { CareTask, CareTaskWithPlant } from '@/types/task';

async function resolveDatabase(database?: SQLiteDatabase) {
  if (database) {
    return database;
  }

  await initializeDatabase();
  return getDatabase();
}

export async function getPendingTasks(): Promise<CareTaskWithPlant[]> {
  const database = await resolveDatabase();

  return database.getAllAsync<CareTaskWithPlant>(
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
        plants.photoUri AS plantPhotoUri
      FROM care_tasks
      INNER JOIN plants ON plants.id = care_tasks.plantId
      WHERE care_tasks.isCompleted = 0
      ORDER BY care_tasks.scheduledDate ASC, plants.name COLLATE NOCASE ASC
    `
  );
}

export async function getTasksByPlantId(plantId: string): Promise<CareTask[]> {
  const database = await resolveDatabase();

  return database.getAllAsync<CareTask>(
    `
      SELECT id, plantId, type, scheduledDate, isCompleted, completedAt, createdAt
      FROM care_tasks
      WHERE plantId = ?
      ORDER BY isCompleted ASC, scheduledDate ASC, createdAt DESC
    `,
    plantId
  );
}

export async function createWateringTaskIfNeeded(
  plantId: string,
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
    CARE_TYPES.WATERING,
    scheduledDate
  );

  if (existingTask) {
    return existingTask;
  }

  const task: CareTask = {
    id: createId('task'),
    plantId,
    type: CARE_TYPES.WATERING,
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

export async function completeActiveWateringTasksForPlant(
  plantId: string,
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
    CARE_TYPES.WATERING
  );
}

export async function replaceActiveWateringTaskForPlant(
  plantId: string,
  scheduledDate: string,
  database?: SQLiteDatabase
): Promise<void> {
  const activeDatabase = await resolveDatabase(database);

  await activeDatabase.runAsync(
    `
      DELETE FROM care_tasks
      WHERE plantId = ? AND type = ? AND isCompleted = 0
    `,
    plantId,
    CARE_TYPES.WATERING
  );

  await createWateringTaskIfNeeded(plantId, scheduledDate, activeDatabase);
}
