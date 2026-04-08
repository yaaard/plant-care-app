import { emitLocalDataChanged } from '@/lib/local-events';
import { getDatabase } from '@/lib/db';
import type { ChatMessage, ChatRole, ChatThread, ChatThreadListItem } from '@/types/chat';

type ChatThreadRow = {
  id: string;
  userId: string | null;
  plantId: string | null;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: string | null;
  remoteUpdatedAt: string | null;
};

type ChatThreadListRow = ChatThreadRow & {
  lastMessageText: string | null;
  lastMessageAt: string | null;
  messageCount: number | null;
};

type ChatMessageRow = {
  id: string;
  threadId: string;
  userId: string | null;
  role: string;
  text: string | null;
  imagePath: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: string | null;
  remoteUpdatedAt: string | null;
};

function normalizeSyncStatus(value: string | null | undefined) {
  return value === 'pending' || value === 'error' || value === 'synced'
    ? value
    : 'synced';
}

function normalizeChatRole(value: string | null | undefined): ChatRole {
  if (value === 'assistant' || value === 'system') {
    return value;
  }

  return 'user';
}

function mapChatThread(row: ChatThreadRow): ChatThread {
  return {
    id: row.id,
    userId: row.userId,
    plantId: row.plantId,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    syncStatus: normalizeSyncStatus(row.syncStatus),
    remoteUpdatedAt: row.remoteUpdatedAt,
  };
}

function mapChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    threadId: row.threadId,
    userId: row.userId,
    role: normalizeChatRole(row.role),
    text: row.text ?? '',
    imagePath: row.imagePath,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    syncStatus: normalizeSyncStatus(row.syncStatus),
    remoteUpdatedAt: row.remoteUpdatedAt,
  };
}

export async function getAllChatThreads() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<ChatThreadRow>(
    `
      SELECT
        id,
        userId,
        plantId,
        title,
        createdAt,
        updatedAt,
        syncStatus,
        remoteUpdatedAt
      FROM chat_threads
      ORDER BY updatedAt DESC, createdAt DESC
    `
  );

  return rows.map(mapChatThread);
}

export async function getChatThreads(options?: { plantId?: string | null }) {
  const database = await getDatabase();
  const plantId = options?.plantId ?? null;
  const rows = await database.getAllAsync<ChatThreadListRow>(
    `
      SELECT
        t.id,
        t.userId,
        t.plantId,
        t.title,
        t.createdAt,
        t.updatedAt,
        t.syncStatus,
        t.remoteUpdatedAt,
        (
          SELECT
            CASE
              WHEN COALESCE(NULLIF(m.text, ''), '') != '' THEN m.text
              WHEN m.imagePath IS NOT NULL THEN '[image]'
              ELSE NULL
            END
          FROM chat_messages m
          WHERE m.threadId = t.id
          ORDER BY m.createdAt DESC
          LIMIT 1
        ) AS lastMessageText,
        (
          SELECT m.createdAt
          FROM chat_messages m
          WHERE m.threadId = t.id
          ORDER BY m.createdAt DESC
          LIMIT 1
        ) AS lastMessageAt,
        (
          SELECT COUNT(*)
          FROM chat_messages m
          WHERE m.threadId = t.id
        ) AS messageCount
      FROM chat_threads t
      WHERE (? IS NULL OR t.plantId = ?)
      ORDER BY COALESCE(
        (
          SELECT m.createdAt
          FROM chat_messages m
          WHERE m.threadId = t.id
          ORDER BY m.createdAt DESC
          LIMIT 1
        ),
        t.updatedAt,
        t.createdAt
      ) DESC
    `,
    plantId,
    plantId
  );

  return rows.map(
    (row) =>
      ({
        ...mapChatThread(row),
        lastMessageText: row.lastMessageText,
        lastMessageAt: row.lastMessageAt,
        messageCount: row.messageCount ?? 0,
      }) as ChatThreadListItem
  );
}

export async function getChatThreadById(id: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<ChatThreadRow>(
    `
      SELECT
        id,
        userId,
        plantId,
        title,
        createdAt,
        updatedAt,
        syncStatus,
        remoteUpdatedAt
      FROM chat_threads
      WHERE id = ?
    `,
    id
  );

  return row ? mapChatThread(row) : null;
}

export async function getLatestChatThreadByPlantId(plantId: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<ChatThreadRow>(
    `
      SELECT
        id,
        userId,
        plantId,
        title,
        createdAt,
        updatedAt,
        syncStatus,
        remoteUpdatedAt
      FROM chat_threads
      WHERE plantId = ?
      ORDER BY updatedAt DESC, createdAt DESC
      LIMIT 1
    `,
    plantId
  );

  return row ? mapChatThread(row) : null;
}

export async function getAllChatMessages() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<ChatMessageRow>(
    `
      SELECT
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
      FROM chat_messages
      ORDER BY createdAt ASC
    `
  );

  return rows.map(mapChatMessage);
}

export async function getChatMessagesByThreadId(threadId: string) {
  const database = await getDatabase();
  const rows = await database.getAllAsync<ChatMessageRow>(
    `
      SELECT
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
      FROM chat_messages
      WHERE threadId = ?
      ORDER BY createdAt ASC
    `,
    threadId
  );

  return rows.map(mapChatMessage);
}

export async function upsertChatThreadLocally(thread: ChatThread) {
  const database = await getDatabase();

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
      ON CONFLICT(id) DO UPDATE SET
        userId = excluded.userId,
        plantId = excluded.plantId,
        title = excluded.title,
        createdAt = excluded.createdAt,
        updatedAt = excluded.updatedAt,
        syncStatus = excluded.syncStatus,
        remoteUpdatedAt = excluded.remoteUpdatedAt
    `,
    thread.id,
    thread.userId,
    thread.plantId,
    thread.title,
    thread.createdAt,
    thread.updatedAt,
    thread.syncStatus ?? 'synced',
    thread.remoteUpdatedAt ?? thread.updatedAt
  );
}

export async function upsertChatMessageLocally(message: ChatMessage) {
  const database = await getDatabase();

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
      ON CONFLICT(id) DO UPDATE SET
        threadId = excluded.threadId,
        userId = excluded.userId,
        role = excluded.role,
        text = excluded.text,
        imagePath = excluded.imagePath,
        createdAt = excluded.createdAt,
        updatedAt = excluded.updatedAt,
        syncStatus = excluded.syncStatus,
        remoteUpdatedAt = excluded.remoteUpdatedAt
    `,
    message.id,
    message.threadId,
    message.userId,
    message.role,
    message.text,
    message.imagePath,
    message.createdAt,
    message.updatedAt,
    message.syncStatus ?? 'synced',
    message.remoteUpdatedAt ?? message.updatedAt
  );
}

export async function upsertChatConversationLocally(input: {
  thread: ChatThread;
  messages: ChatMessage[];
}) {
  await upsertChatThreadLocally(input.thread);

  for (const message of input.messages) {
    await upsertChatMessageLocally(message);
  }

  emitLocalDataChanged();
}
