import { DEFAULT_RISK_LEVEL, DEFAULT_SETTINGS } from '@/constants/defaultValues';
import { getDatabase } from '@/lib/db';

let initializationPromise: Promise<void> | null = null;

async function ensurePlantColumns() {
  const database = await getDatabase();
  const columns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(plants)');
  const columnNames = new Set(columns.map((column) => column.name));

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
  ];

  for (const column of nextColumns) {
    if (!columnNames.has(column.name)) {
      await database.execAsync(column.sql);
    }
  }
}

async function ensureIndexes() {
  const database = await getDatabase();

  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_plants_name ON plants(name);
    CREATE INDEX IF NOT EXISTS idx_plants_risk_level ON plants(riskLevel);
    CREATE INDEX IF NOT EXISTS idx_care_tasks_scheduled_date ON care_tasks(scheduledDate);
    CREATE INDEX IF NOT EXISTS idx_care_tasks_plant_id ON care_tasks(plantId);
    CREATE INDEX IF NOT EXISTS idx_care_logs_plant_id ON care_logs(plantId);
    CREATE INDEX IF NOT EXISTS idx_care_logs_action_date ON care_logs(actionDate);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_care_task
    ON care_tasks(plantId, type, scheduledDate)
    WHERE isCompleted = 0;
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
          FOREIGN KEY (plantId) REFERENCES plants(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS care_logs (
          id TEXT PRIMARY KEY NOT NULL,
          plantId TEXT NOT NULL,
          actionType TEXT NOT NULL,
          actionDate TEXT NOT NULL,
          comment TEXT NOT NULL DEFAULT '',
          createdAt TEXT NOT NULL,
          FOREIGN KEY (plantId) REFERENCES plants(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
          notificationsEnabled INTEGER NOT NULL,
          notificationHour INTEGER NOT NULL,
          notificationMinute INTEGER NOT NULL
        );
      `);

      await ensurePlantColumns();
      await ensureIndexes();

      await database.runAsync(
        `
          INSERT OR IGNORE INTO settings (
            id,
            notificationsEnabled,
            notificationHour,
            notificationMinute
          ) VALUES (?, ?, ?, ?)
        `,
        DEFAULT_SETTINGS.id,
        DEFAULT_SETTINGS.notificationsEnabled,
        DEFAULT_SETTINGS.notificationHour,
        DEFAULT_SETTINGS.notificationMinute
      );
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  await initializationPromise;
}
