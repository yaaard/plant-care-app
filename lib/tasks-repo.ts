import type { SQLiteDatabase } from 'expo-sqlite';

import { type CareType } from '@/constants/careTypes';
import { todayString } from '@/lib/date';
import { createId, getDatabase, nowIsoString } from '@/lib/db';
import { initializeDatabase } from '@/lib/db-init';
import { getCurrentSupabaseUserIdAsync } from '@/lib/supabase';
import { enqueueDeletion } from '@/lib/sync-queue';
import type { CareTask, CareTaskType, CareTaskWithPlant } from '@/types/task';

const TASK_SELECT_COLUMNS = `
  id,
  plantId,
  type,
  scheduledDate,
  isCompleted,
  completedAt,
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

async function getActiveTasksByPlantAndType(
  plantId: string,
  type: CareType,
  database: SQLiteDatabase
) {
  return database.getAllAsync<CareTask>(
    `
      SELECT ${TASK_SELECT_COLUMNS}
      FROM care_tasks
      WHERE plantId = ? AND type = ? AND isCompleted = 0
      ORDER BY scheduledDate ASC, createdAt ASC
    `,
    plantId,
    type
  );
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
        COALESCE(NULLIF(care_tasks.updatedAt, ''), care_tasks.createdAt) AS updatedAt,
        care_tasks.userId,
        care_tasks.syncStatus,
        care_tasks.remoteUpdatedAt,
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
      SELECT ${TASK_SELECT_COLUMNS}
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
      SELECT ${TASK_SELECT_COLUMNS}
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
  database?: SQLiteDatabase,
  userId?: string | null
): Promise<CareTask> {
  const activeDatabase = await resolveDatabase(database);
  const existingTasks = await getActiveTasksByPlantAndType(plantId, type, activeDatabase);
  const matchingTask = existingTasks.find((task) => task.scheduledDate === scheduledDate) ?? null;

  if (matchingTask) {
    const duplicateTasks = existingTasks.filter((task) => task.id !== matchingTask.id);

    for (const duplicateTask of duplicateTasks) {
      await enqueueDeletion(
        {
          entityType: 'task',
          recordId: duplicateTask.id,
          userId: duplicateTask.userId ?? userId ?? null,
        },
        activeDatabase
      );

      await activeDatabase.runAsync('DELETE FROM care_tasks WHERE id = ?', duplicateTask.id);
    }

    return matchingTask;
  }

  const resolvedUserId = userId ?? (await getCurrentSupabaseUserIdAsync());
  const timestamp = nowIsoString();
  const task: CareTask = {
    id: createId('task'),
    plantId,
    type,
    scheduledDate,
    isCompleted: 0,
    completedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    userId: resolvedUserId,
    syncStatus: 'pending',
    remoteUpdatedAt: null,
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
        createdAt,
        updatedAt,
        userId,
        syncStatus,
        remoteUpdatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    task.id,
    task.plantId,
    task.type,
    task.scheduledDate,
    task.isCompleted,
    task.completedAt,
    task.createdAt,
    task.updatedAt ?? task.createdAt,
    task.userId ?? null,
    task.syncStatus ?? 'pending',
    task.remoteUpdatedAt ?? null
  );

  return task;
}

export async function deleteActiveTasksForPlantByType(
  plantId: string,
  type: CareType,
  database?: SQLiteDatabase
): Promise<void> {
  const activeDatabase = await resolveDatabase(database);
  const existingTasks = await getActiveTasksByPlantAndType(plantId, type, activeDatabase);

  for (const task of existingTasks) {
    await enqueueDeletion(
      {
        entityType: 'task',
        recordId: task.id,
        userId: task.userId ?? null,
      },
      activeDatabase
    );
  }

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
  database?: SQLiteDatabase,
  userId?: string | null
): Promise<void> {
  const activeDatabase = await resolveDatabase(database);
  const existingTasks = await getActiveTasksByPlantAndType(plantId, type, activeDatabase);
  const exactTask = existingTasks.find((task) => task.scheduledDate === scheduledDate) ?? null;

  if (exactTask && existingTasks.length === 1) {
    return;
  }

  if (exactTask) {
    for (const task of existingTasks) {
      if (task.id === exactTask.id) {
        continue;
      }

      await enqueueDeletion(
        {
          entityType: 'task',
          recordId: task.id,
          userId: task.userId ?? userId ?? null,
        },
        activeDatabase
      );

      await activeDatabase.runAsync('DELETE FROM care_tasks WHERE id = ?', task.id);
    }

    return;
  }

  await deleteActiveTasksForPlantByType(plantId, type, activeDatabase);
  await createCareTaskIfNeeded(plantId, type, scheduledDate, activeDatabase, userId);
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
      SET
        isCompleted = 1,
        completedAt = ?,
        updatedAt = ?,
        syncStatus = 'pending',
        remoteUpdatedAt = NULL
      WHERE id = ?
    `,
    completedAt,
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
      SET
        isCompleted = 1,
        completedAt = ?,
        updatedAt = ?,
        syncStatus = 'pending',
        remoteUpdatedAt = NULL
      WHERE plantId = ? AND type = ? AND isCompleted = 0
    `,
    completedAt,
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
