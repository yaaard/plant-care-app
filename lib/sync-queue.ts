import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase, nowIsoString } from '@/lib/db';
import { initializeDatabase } from '@/lib/db-init';

type SyncableTable =
  | 'plants'
  | 'care_tasks'
  | 'care_logs'
  | 'settings'
  | 'ai_action_history';

async function resolveDatabase(database?: SQLiteDatabase) {
  if (database) {
    return database;
  }

  await initializeDatabase();
  return getDatabase();
}

export async function enqueueDeletion(
  values: {
    entityType: 'plant' | 'task' | 'log';
    recordId: string;
    userId?: string | null;
    metadataJson?: string;
  },
  database?: SQLiteDatabase
) {
  const activeDatabase = await resolveDatabase(database);

  await activeDatabase.runAsync(
    `
      INSERT INTO sync_deletions (entityType, recordId, userId, metadataJson, createdAt)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(entityType, recordId, userId) DO UPDATE SET
        metadataJson = excluded.metadataJson,
        createdAt = excluded.createdAt
    `,
    values.entityType,
    values.recordId,
    values.userId ?? null,
    values.metadataJson ?? '{}',
    nowIsoString()
  );
}

export async function markRecordSynced(
  table: SyncableTable,
  recordId: string | number,
  remoteUpdatedAt: string,
  database?: SQLiteDatabase
) {
  const activeDatabase = await resolveDatabase(database);

  await activeDatabase.runAsync(
    `
      UPDATE ${table}
      SET syncStatus = 'synced', remoteUpdatedAt = ?
      WHERE id = ?
    `,
    remoteUpdatedAt,
    recordId
  );
}

export async function markRecordError(
  table: SyncableTable,
  recordId: string | number,
  database?: SQLiteDatabase
) {
  const activeDatabase = await resolveDatabase(database);

  await activeDatabase.runAsync(
    `
      UPDATE ${table}
      SET syncStatus = 'error'
      WHERE id = ?
    `,
    recordId
  );
}

export async function countPendingChanges(userId: string, database?: SQLiteDatabase) {
  const activeDatabase = await resolveDatabase(database);

  const [plants, tasks, logs, settings, aiActionHistory, deletions] = await Promise.all([
    activeDatabase.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM plants WHERE userId = ? AND syncStatus != 'synced'`,
      userId
    ),
    activeDatabase.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM care_tasks WHERE userId = ? AND syncStatus != 'synced'`,
      userId
    ),
    activeDatabase.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM care_logs WHERE userId = ? AND syncStatus != 'synced'`,
      userId
    ),
    activeDatabase.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM settings WHERE userId = ? AND syncStatus != 'synced'`,
      userId
    ),
    activeDatabase.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ai_action_history WHERE userId = ? AND syncStatus != 'synced'`,
      userId
    ),
    activeDatabase.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM sync_deletions WHERE userId = ? OR userId IS NULL`,
      userId
    ),
  ]);

  return (
    (plants?.count ?? 0) +
    (tasks?.count ?? 0) +
    (logs?.count ?? 0) +
    (settings?.count ?? 0) +
    (aiActionHistory?.count ?? 0) +
    (deletions?.count ?? 0)
  );
}
