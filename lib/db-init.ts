import { DEFAULT_RISK_LEVEL, DEFAULT_SETTINGS } from '@/constants/defaultValues';
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
      `);

      await ensurePlantColumns();
      await ensureTaskColumns();
      await ensureLogColumns();
      await ensureSettingsColumns();
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
