import type { SQLiteDatabase } from 'expo-sqlite';

import { createId, getDatabase, nowIsoString } from '@/lib/db';
import { initializeDatabase } from '@/lib/db-init';
import { emitLocalDataChanged } from '@/lib/local-events';
import { getCurrentSupabaseUserIdAsync } from '@/lib/supabase';
import type { AiAction, AiActionExecutionSource, AiActionHistory } from '@/types/ai-action';

type AiActionHistoryRow = {
  id: string;
  userId: string | null;
  plantId: string | null;
  analysisId: string | null;
  chatMessageId: string | null;
  actionType: AiActionHistory['actionType'];
  actionPayload: string;
  appliedAt: string;
  createdAt: string;
  syncStatus: string | null;
  remoteUpdatedAt: string | null;
};

const AI_ACTION_HISTORY_SELECT_COLUMNS = `
  id,
  userId,
  plantId,
  analysisId,
  chatMessageId,
  actionType,
  actionPayload,
  appliedAt,
  createdAt,
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

function mapAiActionHistory(row: AiActionHistoryRow): AiActionHistory {
  return {
    id: row.id,
    userId: row.userId,
    plantId: row.plantId,
    analysisId: row.analysisId,
    chatMessageId: row.chatMessageId,
    actionType: row.actionType,
    actionPayload: row.actionPayload,
    appliedAt: row.appliedAt,
    createdAt: row.createdAt,
    syncStatus:
      row.syncStatus === 'pending' || row.syncStatus === 'error' || row.syncStatus === 'synced'
        ? row.syncStatus
        : 'pending',
    remoteUpdatedAt: row.remoteUpdatedAt,
  };
}

function parseActionId(actionPayload: string) {
  try {
    const parsed = JSON.parse(actionPayload) as { id?: unknown };
    return typeof parsed?.id === 'string' && parsed.id.trim() ? parsed.id.trim() : null;
  } catch {
    return null;
  }
}

export async function getAllAiActionHistory(database?: SQLiteDatabase) {
  const activeDatabase = await resolveDatabase(database);
  const rows = await activeDatabase.getAllAsync<AiActionHistoryRow>(
    `
      SELECT ${AI_ACTION_HISTORY_SELECT_COLUMNS}
      FROM ai_action_history
      ORDER BY appliedAt DESC, createdAt DESC
    `
  );

  return rows.map(mapAiActionHistory);
}

export async function getAiActionHistoryByPlantId(
  plantId: string,
  database?: SQLiteDatabase
) {
  const activeDatabase = await resolveDatabase(database);
  const rows = await activeDatabase.getAllAsync<AiActionHistoryRow>(
    `
      SELECT ${AI_ACTION_HISTORY_SELECT_COLUMNS}
      FROM ai_action_history
      WHERE plantId = ?
      ORDER BY appliedAt DESC, createdAt DESC
    `,
    plantId
  );

  return rows.map(mapAiActionHistory);
}

export async function getAppliedAiActionIdsForChatMessages(
  chatMessageIds: string[],
  database?: SQLiteDatabase
) {
  if (chatMessageIds.length === 0) {
    return [];
  }

  const activeDatabase = await resolveDatabase(database);
  const placeholders = chatMessageIds.map(() => '?').join(', ');
  const rows = await activeDatabase.getAllAsync<Pick<AiActionHistoryRow, 'actionPayload'>>(
    `
      SELECT actionPayload
      FROM ai_action_history
      WHERE chatMessageId IN (${placeholders})
      ORDER BY appliedAt DESC
    `,
    ...chatMessageIds
  );

  return rows
    .map((row) => parseActionId(row.actionPayload))
    .filter((value): value is string => Boolean(value));
}

export async function wasAiActionApplied(
  action: Pick<AiAction, 'id' | 'type'>,
  source: AiActionExecutionSource = {},
  database?: SQLiteDatabase
) {
  const activeDatabase = await resolveDatabase(database);
  const row = await activeDatabase.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM ai_action_history
      WHERE actionPayload LIKE ? AND actionType = ?
        AND COALESCE(plantId, '') = COALESCE(?, '')
        AND COALESCE(analysisId, '') = COALESCE(?, '')
        AND COALESCE(chatMessageId, '') = COALESCE(?, '')
    `,
    `%\"id\":\"${action.id}\"%`,
    action.type,
    source.plantId ?? null,
    source.analysisId ?? null,
    source.chatMessageId ?? null
  );

  return (row?.count ?? 0) > 0;
}

export async function addAiActionHistory(
  input: {
    action: AiAction;
    source?: AiActionExecutionSource;
    appliedAt?: string;
  },
  database?: SQLiteDatabase,
  emitChange: boolean = true
) {
  const activeDatabase = await resolveDatabase(database);
  const timestamp = input.appliedAt ?? nowIsoString();
  const userId = await getCurrentSupabaseUserIdAsync();

  const record: AiActionHistory = {
    id: createId('ai-action-history'),
    userId,
    plantId: input.source?.plantId ?? null,
    analysisId: input.source?.analysisId ?? null,
    chatMessageId: input.source?.chatMessageId ?? null,
    actionType: input.action.type,
    actionPayload: JSON.stringify(input.action),
    appliedAt: timestamp,
    createdAt: timestamp,
    syncStatus: 'pending',
    remoteUpdatedAt: null,
  };

  await activeDatabase.runAsync(
    `
      INSERT INTO ai_action_history (
        id,
        userId,
        plantId,
        analysisId,
        chatMessageId,
        actionType,
        actionPayload,
        appliedAt,
        createdAt,
        syncStatus,
        remoteUpdatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    record.id,
    record.userId ?? null,
    record.plantId ?? null,
    record.analysisId ?? null,
    record.chatMessageId ?? null,
    record.actionType,
    record.actionPayload,
    record.appliedAt,
    record.createdAt,
    record.syncStatus ?? 'pending',
    record.remoteUpdatedAt ?? null
  );

  if (emitChange) {
    emitLocalDataChanged();
  }

  return record;
}

export async function upsertAiActionHistoryLocally(
  record: AiActionHistory,
  database?: SQLiteDatabase,
  emitChange: boolean = true
) {
  const activeDatabase = await resolveDatabase(database);

  await activeDatabase.runAsync(
    `
      INSERT INTO ai_action_history (
        id,
        userId,
        plantId,
        analysisId,
        chatMessageId,
        actionType,
        actionPayload,
        appliedAt,
        createdAt,
        syncStatus,
        remoteUpdatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        userId = excluded.userId,
        plantId = excluded.plantId,
        analysisId = excluded.analysisId,
        chatMessageId = excluded.chatMessageId,
        actionType = excluded.actionType,
        actionPayload = excluded.actionPayload,
        appliedAt = excluded.appliedAt,
        createdAt = excluded.createdAt,
        syncStatus = excluded.syncStatus,
        remoteUpdatedAt = excluded.remoteUpdatedAt
    `,
    record.id,
    record.userId ?? null,
    record.plantId ?? null,
    record.analysisId ?? null,
    record.chatMessageId ?? null,
    record.actionType,
    record.actionPayload,
    record.appliedAt,
    record.createdAt,
    record.syncStatus ?? 'synced',
    record.remoteUpdatedAt ?? record.appliedAt
  );

  if (emitChange) {
    emitLocalDataChanged();
  }
}
