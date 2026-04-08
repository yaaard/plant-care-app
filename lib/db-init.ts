import {
  DEFAULT_AI_MODEL_NAME,
  DEFAULT_RISK_LEVEL,
  DEFAULT_SETTINGS,
} from '@/constants/defaultValues';
import { getDatabase, nowIsoString } from '@/lib/db';

let initializationPromise: Promise<void> | null = null;

async function getColumnNames(tableName: string) {
  const database = await getDatabase();
  const columns = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);

  return new Set(columns.map((column) => column.name));
}

async function ensurePlantColumns() {
  const database = await getDatabase();
  const columnNames = await getColumnNames('plants');

  const nextColumns = [
    {
      name: 'lightCondition',
      sql: "ALTER TABLE plants ADD COLUMN lightCondition TEXT NOT NULL DEFAULT ''",
    },
    {
      name: 'humidityCondition',
      sql: "ALTER TABLE plants ADD COLUMN humidityCondition TEXT NOT NULL DEFAULT ''",
    },
    {
      name: 'roomTemperature',
      sql: "ALTER TABLE plants ADD COLUMN roomTemperature TEXT NOT NULL DEFAULT ''",
    },
    {
      name: 'conditionTags',
      sql: "ALTER TABLE plants ADD COLUMN conditionTags TEXT NOT NULL DEFAULT '[]'",
    },
    {
      name: 'customCareComment',
      sql: "ALTER TABLE plants ADD COLUMN customCareComment TEXT NOT NULL DEFAULT ''",
    },
    {
      name: 'riskLevel',
      sql: `ALTER TABLE plants ADD COLUMN riskLevel TEXT NOT NULL DEFAULT '${DEFAULT_RISK_LEVEL}'`,
    },
    {
      name: 'lastInspectionDate',
      sql: 'ALTER TABLE plants ADD COLUMN lastInspectionDate TEXT',
    },
    {
      name: 'photoPath',
      sql: 'ALTER TABLE plants ADD COLUMN photoPath TEXT',
    },
    {
      name: 'userId',
      sql: 'ALTER TABLE plants ADD COLUMN userId TEXT',
    },
    {
      name: 'syncStatus',
      sql: "ALTER TABLE plants ADD COLUMN syncStatus TEXT NOT NULL DEFAULT 'pending'",
    },
    {
      name: 'remoteUpdatedAt',
      sql: 'ALTER TABLE plants ADD COLUMN remoteUpdatedAt TEXT',
    },
  ];

  for (const column of nextColumns) {
    if (!columnNames.has(column.name)) {
      await database.execAsync(column.sql);
    }
  }
}

async function ensureTaskColumns() {
  const database = await getDatabase();
  const columnNames = await getColumnNames('care_tasks');

  const nextColumns = [
    {
      name: 'updatedAt',
      sql: "ALTER TABLE care_tasks ADD COLUMN updatedAt TEXT NOT NULL DEFAULT ''",
    },
    {
      name: 'userId',
      sql: 'ALTER TABLE care_tasks ADD COLUMN userId TEXT',
    },
    {
      name: 'syncStatus',
      sql: "ALTER TABLE care_tasks ADD COLUMN syncStatus TEXT NOT NULL DEFAULT 'pending'",
    },
    {
      name: 'remoteUpdatedAt',
      sql: 'ALTER TABLE care_tasks ADD COLUMN remoteUpdatedAt TEXT',
    },
  ];

  for (const column of nextColumns) {
    if (!columnNames.has(column.name)) {
      await database.execAsync(column.sql);
    }
  }
}

async function ensureLogColumns() {
  const database = await getDatabase();
  const columnNames = await getColumnNames('care_logs');

  const nextColumns = [
    {
      name: 'updatedAt',
      sql: "ALTER TABLE care_logs ADD COLUMN updatedAt TEXT NOT NULL DEFAULT ''",
    },
    {
      name: 'userId',
      sql: 'ALTER TABLE care_logs ADD COLUMN userId TEXT',
    },
    {
      name: 'syncStatus',
      sql: "ALTER TABLE care_logs ADD COLUMN syncStatus TEXT NOT NULL DEFAULT 'pending'",
    },
    {
      name: 'remoteUpdatedAt',
      sql: 'ALTER TABLE care_logs ADD COLUMN remoteUpdatedAt TEXT',
    },
  ];

  for (const column of nextColumns) {
    if (!columnNames.has(column.name)) {
      await database.execAsync(column.sql);
    }
  }
}

async function ensureSettingsColumns() {
  const database = await getDatabase();
  const columnNames = await getColumnNames('settings');

  const nextColumns = [
    {
      name: 'updatedAt',
      sql: "ALTER TABLE settings ADD COLUMN updatedAt TEXT NOT NULL DEFAULT ''",
    },
    {
      name: 'userId',
      sql: 'ALTER TABLE settings ADD COLUMN userId TEXT',
    },
    {
      name: 'syncStatus',
      sql: "ALTER TABLE settings ADD COLUMN syncStatus TEXT NOT NULL DEFAULT 'pending'",
    },
    {
      name: 'remoteUpdatedAt',
      sql: 'ALTER TABLE settings ADD COLUMN remoteUpdatedAt TEXT',
    },
  ];

  for (const column of nextColumns) {
    if (!columnNames.has(column.name)) {
      await database.execAsync(column.sql);
    }
  }
}

async function ensureAiAnalysisColumns() {
  const database = await getDatabase();
  const columnNames = await getColumnNames('plant_ai_analyses');

  const nextColumns = [
    {
      name: 'userId',
      sql: 'ALTER TABLE plant_ai_analyses ADD COLUMN userId TEXT',
    },
    {
      name: 'photoPath',
      sql: 'ALTER TABLE plant_ai_analyses ADD COLUMN photoPath TEXT',
    },
    {
      name: 'modelName',
      sql: `ALTER TABLE plant_ai_analyses ADD COLUMN modelName TEXT NOT NULL DEFAULT '${DEFAULT_AI_MODEL_NAME}'`,
    },
    {
      name: 'summary',
      sql: "ALTER TABLE plant_ai_analyses ADD COLUMN summary TEXT NOT NULL DEFAULT ''",
    },
    {
      name: 'overallCondition',
      sql: "ALTER TABLE plant_ai_analyses ADD COLUMN overallCondition TEXT NOT NULL DEFAULT 'needs_attention'",
    },
    {
      name: 'urgency',
      sql: "ALTER TABLE plant_ai_analyses ADD COLUMN urgency TEXT NOT NULL DEFAULT 'medium'",
    },
    {
      name: 'observedSigns',
      sql: "ALTER TABLE plant_ai_analyses ADD COLUMN observedSigns TEXT NOT NULL DEFAULT '[]'",
    },
    {
      name: 'possibleCauses',
      sql: "ALTER TABLE plant_ai_analyses ADD COLUMN possibleCauses TEXT NOT NULL DEFAULT '[]'",
    },
    {
      name: 'wateringAdvice',
      sql: "ALTER TABLE plant_ai_analyses ADD COLUMN wateringAdvice TEXT NOT NULL DEFAULT ''",
    },
    {
      name: 'lightAdvice',
      sql: "ALTER TABLE plant_ai_analyses ADD COLUMN lightAdvice TEXT NOT NULL DEFAULT ''",
    },
    {
      name: 'humidityAdvice',
      sql: "ALTER TABLE plant_ai_analyses ADD COLUMN humidityAdvice TEXT NOT NULL DEFAULT ''",
    },
    {
      name: 'recommendedActions',
      sql: "ALTER TABLE plant_ai_analyses ADD COLUMN recommendedActions TEXT NOT NULL DEFAULT '[]'",
    },
    {
      name: 'confidenceNote',
      sql: "ALTER TABLE plant_ai_analyses ADD COLUMN confidenceNote TEXT NOT NULL DEFAULT ''",
    },
    {
      name: 'rawJson',
      sql: "ALTER TABLE plant_ai_analyses ADD COLUMN rawJson TEXT NOT NULL DEFAULT '{}'",
    },
    {
      name: 'updatedAt',
      sql: "ALTER TABLE plant_ai_analyses ADD COLUMN updatedAt TEXT NOT NULL DEFAULT ''",
    },
    {
      name: 'syncStatus',
      sql: "ALTER TABLE plant_ai_analyses ADD COLUMN syncStatus TEXT NOT NULL DEFAULT 'synced'",
    },
    {
      name: 'remoteUpdatedAt',
      sql: 'ALTER TABLE plant_ai_analyses ADD COLUMN remoteUpdatedAt TEXT',
    },
  ];

  for (const column of nextColumns) {
    if (!columnNames.has(column.name)) {
      await database.execAsync(column.sql);
    }
  }
}

async function ensureChatThreadColumns() {
  const database = await getDatabase();
  const columnNames = await getColumnNames('chat_threads');

  const nextColumns = [
    {
      name: 'userId',
      sql: 'ALTER TABLE chat_threads ADD COLUMN userId TEXT',
    },
    {
      name: 'plantId',
      sql: 'ALTER TABLE chat_threads ADD COLUMN plantId TEXT',
    },
    {
      name: 'title',
      sql: 'ALTER TABLE chat_threads ADD COLUMN title TEXT',
    },
    {
      name: 'createdAt',
      sql: `ALTER TABLE chat_threads ADD COLUMN createdAt TEXT NOT NULL DEFAULT '${nowIsoString()}'`,
    },
    {
      name: 'updatedAt',
      sql: `ALTER TABLE chat_threads ADD COLUMN updatedAt TEXT NOT NULL DEFAULT '${nowIsoString()}'`,
    },
    {
      name: 'syncStatus',
      sql: "ALTER TABLE chat_threads ADD COLUMN syncStatus TEXT NOT NULL DEFAULT 'synced'",
    },
    {
      name: 'remoteUpdatedAt',
      sql: 'ALTER TABLE chat_threads ADD COLUMN remoteUpdatedAt TEXT',
    },
  ];

  for (const column of nextColumns) {
    if (!columnNames.has(column.name)) {
      await database.execAsync(column.sql);
    }
  }
}

async function ensureChatMessageColumns() {
  const database = await getDatabase();
  const columnNames = await getColumnNames('chat_messages');

  const nextColumns = [
    {
      name: 'threadId',
      sql: 'ALTER TABLE chat_messages ADD COLUMN threadId TEXT',
    },
    {
      name: 'userId',
      sql: 'ALTER TABLE chat_messages ADD COLUMN userId TEXT',
    },
    {
      name: 'role',
      sql: "ALTER TABLE chat_messages ADD COLUMN role TEXT NOT NULL DEFAULT 'user'",
    },
    {
      name: 'text',
      sql: "ALTER TABLE chat_messages ADD COLUMN text TEXT NOT NULL DEFAULT ''",
    },
    {
      name: 'imagePath',
      sql: 'ALTER TABLE chat_messages ADD COLUMN imagePath TEXT',
    },
    {
      name: 'createdAt',
      sql: `ALTER TABLE chat_messages ADD COLUMN createdAt TEXT NOT NULL DEFAULT '${nowIsoString()}'`,
    },
    {
      name: 'updatedAt',
      sql: `ALTER TABLE chat_messages ADD COLUMN updatedAt TEXT NOT NULL DEFAULT '${nowIsoString()}'`,
    },
    {
      name: 'syncStatus',
      sql: "ALTER TABLE chat_messages ADD COLUMN syncStatus TEXT NOT NULL DEFAULT 'synced'",
    },
    {
      name: 'remoteUpdatedAt',
      sql: 'ALTER TABLE chat_messages ADD COLUMN remoteUpdatedAt TEXT',
    },
  ];

  for (const column of nextColumns) {
    if (!columnNames.has(column.name)) {
      await database.execAsync(column.sql);
    }
  }
}

async function ensureDefaultSyncValues() {
  const database = await getDatabase();
  const now = nowIsoString();

  await database.execAsync(`
    UPDATE plants
    SET syncStatus = COALESCE(NULLIF(syncStatus, ''), 'pending')
    WHERE syncStatus IS NULL OR syncStatus = '';

    UPDATE care_tasks
    SET
      updatedAt = COALESCE(NULLIF(updatedAt, ''), createdAt),
      syncStatus = COALESCE(NULLIF(syncStatus, ''), 'pending')
    WHERE updatedAt IS NULL OR updatedAt = '' OR syncStatus IS NULL OR syncStatus = '';

    UPDATE care_logs
    SET
      updatedAt = COALESCE(NULLIF(updatedAt, ''), createdAt),
      syncStatus = COALESCE(NULLIF(syncStatus, ''), 'pending')
    WHERE updatedAt IS NULL OR updatedAt = '' OR syncStatus IS NULL OR syncStatus = '';

    UPDATE plant_ai_analyses
    SET
      updatedAt = COALESCE(NULLIF(updatedAt, ''), createdAt),
      syncStatus = COALESCE(NULLIF(syncStatus, ''), 'synced')
    WHERE updatedAt IS NULL OR updatedAt = '' OR syncStatus IS NULL OR syncStatus = '';

    UPDATE chat_threads
    SET
      updatedAt = COALESCE(NULLIF(updatedAt, ''), createdAt),
      syncStatus = COALESCE(NULLIF(syncStatus, ''), 'synced')
    WHERE updatedAt IS NULL OR updatedAt = '' OR syncStatus IS NULL OR syncStatus = '';

    UPDATE chat_messages
    SET
      updatedAt = COALESCE(NULLIF(updatedAt, ''), createdAt),
      syncStatus = COALESCE(NULLIF(syncStatus, ''), 'synced')
    WHERE updatedAt IS NULL OR updatedAt = '' OR syncStatus IS NULL OR syncStatus = '';
  `);

  await database.runAsync(
    `
      UPDATE settings
      SET
        updatedAt = COALESCE(NULLIF(updatedAt, ''), ?),
        syncStatus = COALESCE(NULLIF(syncStatus, ''), 'pending')
      WHERE updatedAt IS NULL OR updatedAt = '' OR syncStatus IS NULL OR syncStatus = ''
    `,
    now
  );
}

async function ensureIndexes() {
  const database = await getDatabase();

  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_plants_name ON plants(name);
    CREATE INDEX IF NOT EXISTS idx_plants_risk_level ON plants(riskLevel);
    CREATE INDEX IF NOT EXISTS idx_plants_user_id ON plants(userId);
    CREATE INDEX IF NOT EXISTS idx_plants_sync_status ON plants(syncStatus);

    CREATE INDEX IF NOT EXISTS idx_care_tasks_scheduled_date ON care_tasks(scheduledDate);
    CREATE INDEX IF NOT EXISTS idx_care_tasks_plant_id ON care_tasks(plantId);
    CREATE INDEX IF NOT EXISTS idx_care_tasks_user_id ON care_tasks(userId);
    CREATE INDEX IF NOT EXISTS idx_care_tasks_sync_status ON care_tasks(syncStatus);

    CREATE INDEX IF NOT EXISTS idx_care_logs_plant_id ON care_logs(plantId);
    CREATE INDEX IF NOT EXISTS idx_care_logs_action_date ON care_logs(actionDate);
    CREATE INDEX IF NOT EXISTS idx_care_logs_user_id ON care_logs(userId);
    CREATE INDEX IF NOT EXISTS idx_care_logs_sync_status ON care_logs(syncStatus);

    CREATE INDEX IF NOT EXISTS idx_ai_analyses_plant_id ON plant_ai_analyses(plantId);
    CREATE INDEX IF NOT EXISTS idx_ai_analyses_user_id ON plant_ai_analyses(userId);
    CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON plant_ai_analyses(createdAt);
    CREATE INDEX IF NOT EXISTS idx_ai_analyses_remote_updated_at ON plant_ai_analyses(remoteUpdatedAt);

    CREATE INDEX IF NOT EXISTS idx_chat_threads_plant_id ON chat_threads(plantId);
    CREATE INDEX IF NOT EXISTS idx_chat_threads_user_id ON chat_threads(userId);
    CREATE INDEX IF NOT EXISTS idx_chat_threads_updated_at ON chat_threads(updatedAt);

    CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON chat_messages(threadId);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(userId);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(createdAt);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_care_task
    ON care_tasks(plantId, type, scheduledDate)
    WHERE isCompleted = 0;

    CREATE TABLE IF NOT EXISTS sync_deletions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entityType TEXT NOT NULL,
      recordId TEXT NOT NULL,
      userId TEXT,
      metadataJson TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL,
      UNIQUE(entityType, recordId, userId)
    );

    CREATE INDEX IF NOT EXISTS idx_sync_deletions_user_id ON sync_deletions(userId);
  `);
}

export async function initializeDatabase(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const database = await getDatabase();

      await database.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS plants (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          species TEXT NOT NULL,
          photoUri TEXT,
          photoPath TEXT,
          lastWateringDate TEXT,
          wateringIntervalDays INTEGER NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          lightCondition TEXT NOT NULL DEFAULT '',
          humidityCondition TEXT NOT NULL DEFAULT '',
          roomTemperature TEXT NOT NULL DEFAULT '',
          conditionTags TEXT NOT NULL DEFAULT '[]',
          customCareComment TEXT NOT NULL DEFAULT '',
          riskLevel TEXT NOT NULL DEFAULT 'low',
          lastInspectionDate TEXT,
          userId TEXT,
          syncStatus TEXT NOT NULL DEFAULT 'pending',
          remoteUpdatedAt TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS care_tasks (
          id TEXT PRIMARY KEY NOT NULL,
          plantId TEXT NOT NULL,
          type TEXT NOT NULL,
          scheduledDate TEXT NOT NULL,
          isCompleted INTEGER NOT NULL DEFAULT 0,
          completedAt TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL DEFAULT '',
          userId TEXT,
          syncStatus TEXT NOT NULL DEFAULT 'pending',
          remoteUpdatedAt TEXT,
          FOREIGN KEY (plantId) REFERENCES plants(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS care_logs (
          id TEXT PRIMARY KEY NOT NULL,
          plantId TEXT NOT NULL,
          actionType TEXT NOT NULL,
          actionDate TEXT NOT NULL,
          comment TEXT NOT NULL DEFAULT '',
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL DEFAULT '',
          userId TEXT,
          syncStatus TEXT NOT NULL DEFAULT 'pending',
          remoteUpdatedAt TEXT,
          FOREIGN KEY (plantId) REFERENCES plants(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
          notificationsEnabled INTEGER NOT NULL,
          notificationHour INTEGER NOT NULL,
          notificationMinute INTEGER NOT NULL,
          updatedAt TEXT NOT NULL DEFAULT '',
          userId TEXT,
          syncStatus TEXT NOT NULL DEFAULT 'pending',
          remoteUpdatedAt TEXT
        );

        CREATE TABLE IF NOT EXISTS plant_ai_analyses (
          id TEXT PRIMARY KEY NOT NULL,
          plantId TEXT NOT NULL,
          userId TEXT,
          photoPath TEXT,
          modelName TEXT NOT NULL DEFAULT '${DEFAULT_AI_MODEL_NAME}',
          summary TEXT NOT NULL DEFAULT '',
          overallCondition TEXT NOT NULL DEFAULT 'needs_attention',
          urgency TEXT NOT NULL DEFAULT 'medium',
          observedSigns TEXT NOT NULL DEFAULT '[]',
          possibleCauses TEXT NOT NULL DEFAULT '[]',
          wateringAdvice TEXT NOT NULL DEFAULT '',
          lightAdvice TEXT NOT NULL DEFAULT '',
          humidityAdvice TEXT NOT NULL DEFAULT '',
          recommendedActions TEXT NOT NULL DEFAULT '[]',
          confidenceNote TEXT NOT NULL DEFAULT '',
          rawJson TEXT NOT NULL DEFAULT '{}',
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL DEFAULT '',
          syncStatus TEXT NOT NULL DEFAULT 'synced',
          remoteUpdatedAt TEXT,
          FOREIGN KEY (plantId) REFERENCES plants(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS chat_threads (
          id TEXT PRIMARY KEY NOT NULL,
          userId TEXT,
          plantId TEXT,
          title TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          syncStatus TEXT NOT NULL DEFAULT 'synced',
          remoteUpdatedAt TEXT,
          FOREIGN KEY (plantId) REFERENCES plants(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY NOT NULL,
          threadId TEXT NOT NULL,
          userId TEXT,
          role TEXT NOT NULL,
          text TEXT NOT NULL DEFAULT '',
          imagePath TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          syncStatus TEXT NOT NULL DEFAULT 'synced',
          remoteUpdatedAt TEXT,
          FOREIGN KEY (threadId) REFERENCES chat_threads(id) ON DELETE CASCADE
        );
      `);

      await ensurePlantColumns();
      await ensureTaskColumns();
      await ensureLogColumns();
      await ensureSettingsColumns();
      await ensureAiAnalysisColumns();
      await ensureChatThreadColumns();
      await ensureChatMessageColumns();
      await ensureDefaultSyncValues();
      await ensureIndexes();

      await database.runAsync(
        `
          INSERT OR IGNORE INTO settings (
            id,
            notificationsEnabled,
            notificationHour,
            notificationMinute,
            updatedAt,
            syncStatus
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        DEFAULT_SETTINGS.id,
        DEFAULT_SETTINGS.notificationsEnabled,
        DEFAULT_SETTINGS.notificationHour,
        DEFAULT_SETTINGS.notificationMinute,
        nowIsoString(),
        'pending'
      );
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  await initializationPromise;
}
