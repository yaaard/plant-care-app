import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS, LAST_SYNC_STORAGE_KEY } from '@/constants/defaultValues';
import { getDatabase, nowIsoString } from '@/lib/db';
import { initializeDatabase } from '@/lib/db-init';
import { emitLocalDataChanged } from '@/lib/local-events';
import { refreshScheduledNotificationsAsync } from '@/lib/notifications';
import { refreshAllPlantCareState } from '@/lib/plants-repo';
import { deletePlantPhoto, getPlantPhotoPublicUrl, uploadPlantPhoto } from '@/lib/storage';
import { getSupabaseClient } from '@/lib/supabase';
import { markRecordError, markRecordSynced } from '@/lib/sync-queue';
import type { AppSettings } from '@/types/settings';
import type { SyncResult, LocalSyncOverview } from '@/types/sync';

type RemotePlantRow = {
  id: string;
  user_id: string;
  name: string;
  species: string;
  photo_path: string | null;
  photo_url: string | null;
  last_watering_date: string | null;
  watering_interval_days: number;
  notes: string;
  light_condition: string;
  humidity_condition: string;
  room_temperature: string;
  condition_tags: string;
  custom_care_comment: string;
  risk_level: string;
  last_inspection_date: string | null;
  created_at: string;
  updated_at: string;
};

type RemoteTaskRow = {
  id: string;
  user_id: string;
  plant_id: string;
  type: string;
  scheduled_date: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type RemoteLogRow = {
  id: string;
  user_id: string;
  plant_id: string;
  action_type: string;
  action_date: string;
  comment: string;
  created_at: string;
  updated_at: string;
};

type RemoteSettingsRow = {
  user_id: string;
  notifications_enabled: boolean;
  notification_hour: number;
  notification_minute: number;
  updated_at: string;
};

type LocalPlantRecord = {
  id: string;
  name: string;
  species: string;
  photoUri: string | null;
  photoPath: string | null;
  lastWateringDate: string | null;
  wateringIntervalDays: number;
  notes: string;
  lightCondition: string;
  humidityCondition: string;
  roomTemperature: string;
  conditionTags: string;
  customCareComment: string;
  riskLevel: string;
  lastInspectionDate: string | null;
  userId: string | null;
  syncStatus: string;
  remoteUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type LocalTaskRecord = {
  id: string;
  plantId: string;
  type: string;
  scheduledDate: string;
  isCompleted: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string | null;
  syncStatus: string;
  remoteUpdatedAt: string | null;
};

type LocalLogRecord = {
  id: string;
  plantId: string;
  actionType: string;
  actionDate: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  userId: string | null;
  syncStatus: string;
  remoteUpdatedAt: string | null;
};

type LocalDeletionRecord = {
  id: number;
  entityType: 'plant' | 'task' | 'log';
  recordId: string;
  userId: string | null;
  metadataJson: string;
  createdAt: string;
};

function getLastSyncStorageKey(userId: string) {
  return `${LAST_SYNC_STORAGE_KEY}:${userId}`;
}

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const parsedValue = Date.parse(value);
  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

function isRemoteNewer(remoteUpdatedAt: string, localUpdatedAt: string) {
  return toTimestamp(remoteUpdatedAt) > toTimestamp(localUpdatedAt);
}

function safeParseMetadata(value: string) {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

async function getCurrentUserIdOrThrow() {
  const client = getSupabaseClient();
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.user) {
    throw new Error('Сессия пользователя не найдена. Войдите в аккаунт повторно.');
  }

  return session.user.id;
}

async function getLocalPlants(userId: string) {
  const database = await getDatabase();

  return database.getAllAsync<LocalPlantRecord>(
    `
      SELECT
        id,
        name,
        species,
        photoUri,
        photoPath,
        lastWateringDate,
        wateringIntervalDays,
        notes,
        lightCondition,
        humidityCondition,
        roomTemperature,
        conditionTags,
        customCareComment,
        riskLevel,
        lastInspectionDate,
        userId,
        syncStatus,
        remoteUpdatedAt,
        createdAt,
        updatedAt
      FROM plants
      WHERE userId = ?
      ORDER BY updatedAt ASC, createdAt ASC
    `,
    userId
  );
}

async function getLocalTasks(userId: string) {
  const database = await getDatabase();

  return database.getAllAsync<LocalTaskRecord>(
    `
      SELECT
        id,
        plantId,
        type,
        scheduledDate,
        isCompleted,
        completedAt,
        createdAt,
        COALESCE(NULLIF(updatedAt, ''), createdAt) AS updatedAt,
        userId,
        syncStatus,
        remoteUpdatedAt
      FROM care_tasks
      WHERE userId = ?
      ORDER BY updatedAt ASC, createdAt ASC
    `,
    userId
  );
}

async function getLocalLogs(userId: string) {
  const database = await getDatabase();

  return database.getAllAsync<LocalLogRecord>(
    `
      SELECT
        id,
        plantId,
        actionType,
        actionDate,
        comment,
        createdAt,
        COALESCE(NULLIF(updatedAt, ''), createdAt) AS updatedAt,
        userId,
        syncStatus,
        remoteUpdatedAt
      FROM care_logs
      WHERE userId = ?
      ORDER BY createdAt ASC
    `,
    userId
  );
}

async function getLocalSettingsRecord() {
  const database = await getDatabase();

  return database.getFirstAsync<AppSettings>(
    `
      SELECT
        id,
        notificationsEnabled,
        notificationHour,
        notificationMinute,
        updatedAt,
        userId,
        syncStatus,
        remoteUpdatedAt
      FROM settings
      WHERE id = 1
    `
  );
}

async function getLocalDeletionQueue(userId: string) {
  const database = await getDatabase();

  return database.getAllAsync<LocalDeletionRecord>(
    `
      SELECT id, entityType, recordId, userId, metadataJson, createdAt
      FROM sync_deletions
      WHERE userId = ? OR userId IS NULL
      ORDER BY createdAt ASC
    `,
    userId
  );
}

async function setLastSyncAt(userId: string, value: string) {
  await AsyncStorage.setItem(getLastSyncStorageKey(userId), value);
}

export async function getLastSyncAt(userId: string) {
  return AsyncStorage.getItem(getLastSyncStorageKey(userId));
}

export async function getLocalSyncOverview(userId: string): Promise<LocalSyncOverview> {
  await initializeDatabase();
  const database = await getDatabase();

  const [anonymousPlants, anonymousTasks, anonymousLogs, foreignPlants, foreignTasks, foreignLogs] =
    await Promise.all([
      database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM plants WHERE userId IS NULL OR userId = ''`
      ),
      database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM care_tasks WHERE userId IS NULL OR userId = ''`
      ),
      database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM care_logs WHERE userId IS NULL OR userId = ''`
      ),
      database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM plants WHERE userId IS NOT NULL AND userId != ?`,
        userId
      ),
      database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM care_tasks WHERE userId IS NOT NULL AND userId != ?`,
        userId
      ),
      database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM care_logs WHERE userId IS NOT NULL AND userId != ?`,
        userId
      ),
    ]);

  const overview: LocalSyncOverview = {
    anonymousPlants: anonymousPlants?.count ?? 0,
    anonymousTasks: anonymousTasks?.count ?? 0,
    anonymousLogs: anonymousLogs?.count ?? 0,
    hasAnonymousData:
      (anonymousPlants?.count ?? 0) > 0 ||
      (anonymousTasks?.count ?? 0) > 0 ||
      (anonymousLogs?.count ?? 0) > 0,
    hasForeignData:
      (foreignPlants?.count ?? 0) > 0 ||
      (foreignTasks?.count ?? 0) > 0 ||
      (foreignLogs?.count ?? 0) > 0,
  };

  return overview;
}

export async function bindAnonymousDataToUser(userId: string) {
  await initializeDatabase();
  const database = await getDatabase();

  await database.execAsync(`
    UPDATE plants
    SET userId = '${userId}', syncStatus = 'pending', remoteUpdatedAt = NULL
    WHERE userId IS NULL OR userId = '';

    UPDATE care_tasks
    SET userId = '${userId}', syncStatus = 'pending', remoteUpdatedAt = NULL
    WHERE userId IS NULL OR userId = '';

    UPDATE care_logs
    SET userId = '${userId}', syncStatus = 'pending', remoteUpdatedAt = NULL
    WHERE userId IS NULL OR userId = '';

    UPDATE sync_deletions
    SET userId = '${userId}'
    WHERE userId IS NULL OR userId = '';
  `);

  await database.runAsync(
    `
      UPDATE settings
      SET
        userId = ?,
        syncStatus = 'pending',
        remoteUpdatedAt = NULL
      WHERE id = 1
    `,
    userId
  );
}

export async function clearLocalDataForSignOut() {
  await initializeDatabase();
  const database = await getDatabase();
  const timestamp = nowIsoString();

  await database.withTransactionAsync(async () => {
    await database.execAsync(`
      DELETE FROM sync_deletions;
      DELETE FROM care_logs;
      DELETE FROM care_tasks;
      DELETE FROM plants;
      DELETE FROM settings;
    `);

    await database.runAsync(
      `
        INSERT INTO settings (
          id,
          notificationsEnabled,
          notificationHour,
          notificationMinute,
          updatedAt,
          userId,
          syncStatus,
          remoteUpdatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      DEFAULT_SETTINGS.id,
      DEFAULT_SETTINGS.notificationsEnabled,
      DEFAULT_SETTINGS.notificationHour,
      DEFAULT_SETTINGS.notificationMinute,
      timestamp,
      null,
      'pending',
      null
    );
  });

  emitLocalDataChanged();
  await refreshScheduledNotificationsAsync();
}

export async function isRemoteAccountEmpty(userId?: string) {
  const client = getSupabaseClient();
  const resolvedUserId = userId ?? (await getCurrentUserIdOrThrow());
  const { count, error } = await client
    .from('plants')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', resolvedUserId);

  if (error) {
    throw error;
  }

  return (count ?? 0) === 0;
}

export async function getPendingChangesCountForCurrentUser() {
  const userId = await getCurrentUserIdOrThrow();
  const database = await getDatabase();
  const [plants, tasks, logs, settings, deletions] = await Promise.all([
    database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM plants WHERE userId = ? AND syncStatus != 'synced'`,
      userId
    ),
    database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM care_tasks WHERE userId = ? AND syncStatus != 'synced'`,
      userId
    ),
    database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM care_logs WHERE userId = ? AND syncStatus != 'synced'`,
      userId
    ),
    database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM settings WHERE userId = ? AND syncStatus != 'synced'`,
      userId
    ),
    database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM sync_deletions WHERE userId = ?`,
      userId
    ),
  ]);

  return (
    (plants?.count ?? 0) +
    (tasks?.count ?? 0) +
    (logs?.count ?? 0) +
    (settings?.count ?? 0) +
    (deletions?.count ?? 0)
  );
}

async function pushDeletionQueue(userId: string) {
  const client = getSupabaseClient();
  const database = await getDatabase();
  const queue = await getLocalDeletionQueue(userId);

  for (const item of queue) {
    const metadata = safeParseMetadata(item.metadataJson) as { photoPath?: string | null };

    if (item.entityType === 'plant') {
      const { error } = await client.from('plants').delete().eq('id', item.recordId).eq('user_id', userId);

      if (error) {
        throw error;
      }

      if (metadata.photoPath) {
        await deletePlantPhoto(metadata.photoPath);
      }
    } else if (item.entityType === 'task') {
      const { error } = await client
        .from('care_tasks')
        .delete()
        .eq('id', item.recordId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await client
        .from('care_logs')
        .delete()
        .eq('id', item.recordId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    }

    await database.runAsync('DELETE FROM sync_deletions WHERE id = ?', item.id);
  }

  return queue.length;
}

async function pushSettings(userId: string) {
  const client = getSupabaseClient();
  const database = await getDatabase();
  const settings = await getLocalSettingsRecord();

  if (!settings) {
    return 0;
  }

  const payload = {
    user_id: userId,
    notifications_enabled: Boolean(settings.notificationsEnabled),
    notification_hour: settings.notificationHour,
    notification_minute: settings.notificationMinute,
    updated_at: settings.updatedAt || nowIsoString(),
  };

  const { data, error } = await client
    .from('user_settings')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await markRecordSynced('settings', 1, (data as RemoteSettingsRow).updated_at, database);

  return 1;
}

async function pushPlants(userId: string) {
  const client = getSupabaseClient();
  const database = await getDatabase();
  const plants = await getLocalPlants(userId);
  let pushed = 0;

  for (const plant of plants) {
    if (plant.syncStatus === 'synced') {
      continue;
    }

    try {
      let photoSyncError: unknown = null;
      let nextPhotoPath = plant.photoPath;
      let nextPhotoUrl =
        plant.photoPath && (!plant.photoUri || plant.photoUri.startsWith('http'))
          ? getPlantPhotoPublicUrl(plant.photoPath)
          : null;

      if (plant.photoUri?.startsWith('file')) {
        try {
          const uploadResult = await uploadPlantPhoto({
            userId,
            plantId: plant.id,
            localUri: plant.photoUri,
            photoPath: plant.photoPath,
          });

          nextPhotoPath = uploadResult.photoPath;
          nextPhotoUrl = uploadResult.photoUrl;
        } catch (error) {
          photoSyncError = error;
        }
      } else if (!plant.photoUri && plant.photoPath) {
        await deletePlantPhoto(plant.photoPath);
        nextPhotoPath = null;
        nextPhotoUrl = null;
      }

      const payload = {
        id: plant.id,
        user_id: userId,
        name: plant.name,
        species: plant.species,
        photo_path: nextPhotoPath,
        photo_url: nextPhotoUrl,
        last_watering_date: plant.lastWateringDate,
        watering_interval_days: plant.wateringIntervalDays,
        notes: plant.notes,
        light_condition: plant.lightCondition,
        humidity_condition: plant.humidityCondition,
        room_temperature: plant.roomTemperature,
        condition_tags: plant.conditionTags,
        custom_care_comment: plant.customCareComment,
        risk_level: plant.riskLevel,
        last_inspection_date: plant.lastInspectionDate,
        created_at: plant.createdAt,
        updated_at: plant.updatedAt,
      };

      const { data, error } = await client
        .from('plants')
        .upsert(payload, { onConflict: 'id' })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      const remotePlant = data as RemotePlantRow;
      const nextLocalPhotoUri =
        photoSyncError && plant.photoUri?.startsWith('file')
          ? plant.photoUri
          : remotePlant.photo_url;

      await database.runAsync(
        `
          UPDATE plants
          SET
            photoUri = ?,
            photoPath = ?,
            userId = ?,
            syncStatus = ?,
            remoteUpdatedAt = ?
          WHERE id = ?
        `,
        nextLocalPhotoUri,
        remotePlant.photo_path,
        userId,
        photoSyncError ? 'error' : 'synced',
        remotePlant.updated_at,
        plant.id
      );

      if (photoSyncError) {
        console.warn(
          '[sync] Растение синхронизировано, но фото не удалось загрузить в Supabase Storage.',
          plant.id,
          photoSyncError
        );
      }

      pushed += 1;
    } catch (error) {
      console.warn('[sync] Не удалось синхронизировать растение.', plant.id, error);
      await markRecordError('plants', plant.id, database);
    }
  }

  return pushed;
}

async function pushTasks(userId: string) {
  const client = getSupabaseClient();
  const database = await getDatabase();
  const tasks = await getLocalTasks(userId);
  let pushed = 0;

  for (const task of tasks) {
    if (task.syncStatus === 'synced') {
      continue;
    }

    try {
      const payload = {
        id: task.id,
        user_id: userId,
        plant_id: task.plantId,
        type: task.type,
        scheduled_date: task.scheduledDate,
        is_completed: Boolean(task.isCompleted),
        completed_at: task.completedAt,
        created_at: task.createdAt,
        updated_at: task.updatedAt,
      };

      const { data, error } = await client
        .from('care_tasks')
        .upsert(payload, { onConflict: 'id' })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      await markRecordSynced('care_tasks', task.id, (data as RemoteTaskRow).updated_at, database);
      pushed += 1;
    } catch (error) {
      console.warn('[sync] Не удалось синхронизировать задачу ухода.', task.id, error);
      await markRecordError('care_tasks', task.id, database);
    }
  }

  return pushed;
}

async function pushLogs(userId: string) {
  const client = getSupabaseClient();
  const database = await getDatabase();
  const logs = await getLocalLogs(userId);
  let pushed = 0;

  for (const log of logs) {
    if (log.syncStatus === 'synced') {
      continue;
    }

    try {
      const payload = {
        id: log.id,
        user_id: userId,
        plant_id: log.plantId,
        action_type: log.actionType,
        action_date: log.actionDate,
        comment: log.comment,
        created_at: log.createdAt,
        updated_at: log.updatedAt,
      };

      const { data, error } = await client
        .from('care_logs')
        .upsert(payload, { onConflict: 'id' })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      await markRecordSynced('care_logs', log.id, (data as RemoteLogRow).updated_at, database);
      pushed += 1;
    } catch (error) {
      console.warn('[sync] Не удалось синхронизировать запись журнала.', log.id, error);
      await markRecordError('care_logs', log.id, database);
    }
  }

  return pushed;
}

async function pullSettings(userId: string) {
  const client = getSupabaseClient();
  const database = await getDatabase();
  const localSettings = (await getLocalSettingsRecord()) ?? DEFAULT_SETTINGS;
  const { data, error } = await client
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return 0;
  }

  const remoteSettings = data as RemoteSettingsRow;
  const localUpdatedAt = localSettings.updatedAt || '';

  if (localSettings.syncStatus === 'pending' && !isRemoteNewer(remoteSettings.updated_at, localUpdatedAt)) {
    return 0;
  }

  await database.runAsync(
    `
      INSERT INTO settings (
        id,
        notificationsEnabled,
        notificationHour,
        notificationMinute,
        updatedAt,
        userId,
        syncStatus,
        remoteUpdatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        notificationsEnabled = excluded.notificationsEnabled,
        notificationHour = excluded.notificationHour,
        notificationMinute = excluded.notificationMinute,
        updatedAt = excluded.updatedAt,
        userId = excluded.userId,
        syncStatus = excluded.syncStatus,
        remoteUpdatedAt = excluded.remoteUpdatedAt
    `,
    1,
    remoteSettings.notifications_enabled ? 1 : 0,
    remoteSettings.notification_hour,
    remoteSettings.notification_minute,
    remoteSettings.updated_at,
    userId,
    'synced',
    remoteSettings.updated_at
  );

  return 1;
}

async function pullPlants(userId: string) {
  const client = getSupabaseClient();
  const database = await getDatabase();
  const localPlants = await getLocalPlants(userId);
  const localPlantMap = new Map(localPlants.map((plant) => [plant.id, plant]));
  const { data, error } = await client
    .from('plants')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: true });

  if (error) {
    throw error;
  }

  const remotePlants = (data ?? []) as RemotePlantRow[];
  let pulled = 0;

  for (const remotePlant of remotePlants) {
    const localPlant = localPlantMap.get(remotePlant.id);

    if (!localPlant) {
      await database.runAsync(
        `
          INSERT INTO plants (
            id,
            name,
            species,
            photoUri,
            photoPath,
            lastWateringDate,
            wateringIntervalDays,
            notes,
            lightCondition,
            humidityCondition,
            roomTemperature,
            conditionTags,
            customCareComment,
            riskLevel,
            lastInspectionDate,
            userId,
            syncStatus,
            remoteUpdatedAt,
            createdAt,
            updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        remotePlant.id,
        remotePlant.name,
        remotePlant.species,
        remotePlant.photo_url,
        remotePlant.photo_path,
        remotePlant.last_watering_date,
        remotePlant.watering_interval_days,
        remotePlant.notes,
        remotePlant.light_condition,
        remotePlant.humidity_condition,
        remotePlant.room_temperature,
        remotePlant.condition_tags,
        remotePlant.custom_care_comment,
        remotePlant.risk_level,
        remotePlant.last_inspection_date,
        userId,
        'synced',
        remotePlant.updated_at,
        remotePlant.created_at,
        remotePlant.updated_at
      );

      pulled += 1;
      continue;
    }

    if (
      localPlant.syncStatus === 'pending' &&
      !isRemoteNewer(remotePlant.updated_at, localPlant.updatedAt)
    ) {
      continue;
    }

    if (
      localPlant.remoteUpdatedAt === remotePlant.updated_at &&
      localPlant.syncStatus === 'synced'
    ) {
      continue;
    }

    await database.runAsync(
      `
        UPDATE plants
        SET
          name = ?,
          species = ?,
          photoUri = ?,
          photoPath = ?,
          lastWateringDate = ?,
          wateringIntervalDays = ?,
          notes = ?,
          lightCondition = ?,
          humidityCondition = ?,
          roomTemperature = ?,
          conditionTags = ?,
          customCareComment = ?,
          riskLevel = ?,
          lastInspectionDate = ?,
          userId = ?,
          syncStatus = 'synced',
          remoteUpdatedAt = ?,
          createdAt = ?,
          updatedAt = ?
        WHERE id = ?
      `,
      remotePlant.name,
      remotePlant.species,
      remotePlant.photo_url,
      remotePlant.photo_path,
      remotePlant.last_watering_date,
      remotePlant.watering_interval_days,
      remotePlant.notes,
      remotePlant.light_condition,
      remotePlant.humidity_condition,
      remotePlant.room_temperature,
      remotePlant.condition_tags,
      remotePlant.custom_care_comment,
      remotePlant.risk_level,
      remotePlant.last_inspection_date,
      userId,
      remotePlant.updated_at,
      remotePlant.created_at,
      remotePlant.updated_at,
      remotePlant.id
    );

    pulled += 1;
  }

  const remoteIds = new Set(remotePlants.map((item) => item.id));

  for (const localPlant of localPlants) {
    if (!remoteIds.has(localPlant.id) && localPlant.syncStatus === 'synced') {
      await database.runAsync('DELETE FROM plants WHERE id = ?', localPlant.id);
      pulled += 1;
    }
  }

  return pulled;
}

async function pullTasks(userId: string) {
  const client = getSupabaseClient();
  const database = await getDatabase();
  const localTasks = await getLocalTasks(userId);
  const localTaskMap = new Map(localTasks.map((task) => [task.id, task]));
  const { data, error } = await client
    .from('care_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: true });

  if (error) {
    throw error;
  }

  const remoteTasks = (data ?? []) as RemoteTaskRow[];
  let pulled = 0;

  for (const remoteTask of remoteTasks) {
    const localTask = localTaskMap.get(remoteTask.id);

    if (!localTask) {
      await database.runAsync(
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
        remoteTask.id,
        remoteTask.plant_id,
        remoteTask.type,
        remoteTask.scheduled_date,
        remoteTask.is_completed ? 1 : 0,
        remoteTask.completed_at,
        remoteTask.created_at,
        remoteTask.updated_at,
        userId,
        'synced',
        remoteTask.updated_at
      );

      pulled += 1;
      continue;
    }

    if (
      localTask.syncStatus === 'pending' &&
      !isRemoteNewer(remoteTask.updated_at, localTask.updatedAt)
    ) {
      continue;
    }

    if (
      localTask.remoteUpdatedAt === remoteTask.updated_at &&
      localTask.syncStatus === 'synced'
    ) {
      continue;
    }

    await database.runAsync(
      `
        UPDATE care_tasks
        SET
          plantId = ?,
          type = ?,
          scheduledDate = ?,
          isCompleted = ?,
          completedAt = ?,
          createdAt = ?,
          updatedAt = ?,
          userId = ?,
          syncStatus = 'synced',
          remoteUpdatedAt = ?
        WHERE id = ?
      `,
      remoteTask.plant_id,
      remoteTask.type,
      remoteTask.scheduled_date,
      remoteTask.is_completed ? 1 : 0,
      remoteTask.completed_at,
      remoteTask.created_at,
      remoteTask.updated_at,
      userId,
      remoteTask.updated_at,
      remoteTask.id
    );

    pulled += 1;
  }

  const remoteIds = new Set(remoteTasks.map((item) => item.id));

  for (const localTask of localTasks) {
    if (!remoteIds.has(localTask.id) && localTask.syncStatus === 'synced') {
      await database.runAsync('DELETE FROM care_tasks WHERE id = ?', localTask.id);
      pulled += 1;
    }
  }

  return pulled;
}

async function pullLogs(userId: string) {
  const client = getSupabaseClient();
  const database = await getDatabase();
  const localLogs = await getLocalLogs(userId);
  const localLogMap = new Map(localLogs.map((log) => [log.id, log]));
  const { data, error } = await client
    .from('care_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const remoteLogs = (data ?? []) as RemoteLogRow[];
  let pulled = 0;

  for (const remoteLog of remoteLogs) {
    const localLog = localLogMap.get(remoteLog.id);

    if (!localLog) {
      await database.runAsync(
        `
          INSERT INTO care_logs (
            id,
            plantId,
            actionType,
            actionDate,
            comment,
            createdAt,
            updatedAt,
            userId,
            syncStatus,
            remoteUpdatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        remoteLog.id,
        remoteLog.plant_id,
        remoteLog.action_type,
        remoteLog.action_date,
        remoteLog.comment,
        remoteLog.created_at,
        remoteLog.updated_at,
        userId,
        'synced',
        remoteLog.updated_at
      );

      pulled += 1;
      continue;
    }

    if (localLog.remoteUpdatedAt === remoteLog.updated_at && localLog.syncStatus === 'synced') {
      continue;
    }

    if (localLog.syncStatus === 'pending' && !isRemoteNewer(remoteLog.updated_at, localLog.updatedAt)) {
      continue;
    }

    await database.runAsync(
      `
        UPDATE care_logs
        SET
          plantId = ?,
          actionType = ?,
          actionDate = ?,
          comment = ?,
          createdAt = ?,
          updatedAt = ?,
          userId = ?,
          syncStatus = 'synced',
          remoteUpdatedAt = ?
        WHERE id = ?
      `,
      remoteLog.plant_id,
      remoteLog.action_type,
      remoteLog.action_date,
      remoteLog.comment,
      remoteLog.created_at,
      remoteLog.updated_at,
      userId,
      remoteLog.updated_at,
      remoteLog.id
    );

    pulled += 1;
  }

  const remoteIds = new Set(remoteLogs.map((item) => item.id));

  for (const localLog of localLogs) {
    if (!remoteIds.has(localLog.id) && localLog.syncStatus === 'synced') {
      await database.runAsync('DELETE FROM care_logs WHERE id = ?', localLog.id);
      pulled += 1;
    }
  }

  return pulled;
}

export async function syncAllForCurrentUser(): Promise<SyncResult> {
  await initializeDatabase();

  const userId = await getCurrentUserIdOrThrow();
  const pushedDeletions = await pushDeletionQueue(userId);
  const pushedSettings = await pushSettings(userId);
  const pushedPlants = await pushPlants(userId);
  const pushedTasks = await pushTasks(userId);
  const pushedLogs = await pushLogs(userId);
  const pulledPlants = await pullPlants(userId);
  const pulledTasks = await pullTasks(userId);
  const pulledLogs = await pullLogs(userId);
  const pulledSettings = await pullSettings(userId);

  await refreshAllPlantCareState();
  await refreshScheduledNotificationsAsync();

  const finishedAt = nowIsoString();
  await setLastSyncAt(userId, finishedAt);
  emitLocalDataChanged();

  return {
    finishedAt,
    pushed: pushedDeletions + pushedSettings + pushedPlants + pushedTasks + pushedLogs,
    pulled: pulledPlants + pulledTasks + pulledLogs + pulledSettings,
  };
}
