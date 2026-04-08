import type { SQLiteDatabase } from 'expo-sqlite';

import { CARE_TYPE_DEFAULT_COMMENTS, CARE_TYPES } from '@/constants/careTypes';
import { DEFAULT_RISK_LEVEL } from '@/constants/defaultValues';
import { buildAdaptiveCarePlan } from '@/lib/care-plan';
import { getNextWateringDate, isDateBeforeToday } from '@/lib/date';
import { createId, getDatabase, nowIsoString } from '@/lib/db';
import { initializeDatabase } from '@/lib/db-init';
import { emitLocalDataChanged } from '@/lib/local-events';
import { addCareLog, getLogsByPlantId } from '@/lib/logs-repo';
import { refreshScheduledNotificationsAsync } from '@/lib/notifications';
import { findCatalogPlantForPlant } from '@/lib/plant-catalog-repo';
import { buildPlantRiskAssessment } from '@/lib/risk-assessment';
import { getCurrentSupabaseUserIdAsync } from '@/lib/supabase';
import { enqueueDeletion } from '@/lib/sync-queue';
import {
  completeActiveTasksForPlantByType,
  completeTaskById,
  deleteActiveTasksForPlantByType,
  getPendingTasks,
  getTaskById,
  getTasksByPlantId,
  replaceActiveTaskForPlantByType,
} from '@/lib/tasks-repo';
import {
  serializeConditionTags,
  type Plant,
  type PlantFormValues,
  type PlantHealthFormValues,
  type PlantListItem,
} from '@/types/plant';
import type { RiskAssessmentResult } from '@/types/risk';

const PLANT_SELECT_COLUMNS = `
  id,
  name,
  species,
  catalogPlantId,
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
`;

async function resolveDatabase(database?: SQLiteDatabase) {
  if (database) {
    return database;
  }

  await initializeDatabase();
  return getDatabase();
}

async function getPlantByIdInternal(
  id: string,
  database: SQLiteDatabase
): Promise<Plant | null> {
  return database.getFirstAsync<Plant>(
    `
      SELECT ${PLANT_SELECT_COLUMNS}
      FROM plants
      WHERE id = ?
      LIMIT 1
    `,
    id
  );
}

function buildPlantRecord(
  values: PlantFormValues,
  seed: {
    id: string;
    createdAt: string;
    updatedAt: string;
    riskLevel: Plant['riskLevel'];
    lastInspectionDate: string | null;
    photoPath: string | null;
    userId: string | null;
    syncStatus: Plant['syncStatus'];
    remoteUpdatedAt: string | null;
  }
): Plant {
  return {
    id: seed.id,
    name: values.name,
    species: values.species,
    catalogPlantId: values.catalogPlantId,
    photoUri: values.photoUri,
    photoPath: seed.photoPath,
    lastWateringDate: values.lastWateringDate,
    wateringIntervalDays: values.wateringIntervalDays,
    notes: values.notes,
    lightCondition: values.lightCondition,
    humidityCondition: values.humidityCondition,
    roomTemperature: values.roomTemperature,
    conditionTags: serializeConditionTags(values.conditionTags),
    customCareComment: values.customCareComment,
    riskLevel: seed.riskLevel,
    lastInspectionDate: seed.lastInspectionDate,
    userId: seed.userId,
    syncStatus: seed.syncStatus,
    remoteUpdatedAt: seed.remoteUpdatedAt,
    createdAt: seed.createdAt,
    updatedAt: seed.updatedAt,
  };
}

async function syncPlantDerivedState(
  plantId: string,
  database: SQLiteDatabase
): Promise<RiskAssessmentResult | null> {
  const plant = await getPlantByIdInternal(plantId, database);

  if (!plant) {
    return null;
  }

  const logs = await getLogsByPlantId(plantId, database);
  const guideEntry = await findCatalogPlantForPlant(plant, database);
  const carePlan = buildAdaptiveCarePlan(plant, guideEntry, logs);

  await replaceActiveTaskForPlantByType(
    plantId,
    CARE_TYPES.WATERING,
    carePlan.taskDates[CARE_TYPES.WATERING] ??
      getNextWateringDate(plant.lastWateringDate, plant.wateringIntervalDays),
    database,
    plant.userId ?? null
  );

  for (const type of [CARE_TYPES.INSPECTION, CARE_TYPES.SPRAYING, CARE_TYPES.FERTILIZING] as const) {
    const scheduledDate = carePlan.taskDates[type];

    if (scheduledDate) {
      await replaceActiveTaskForPlantByType(
        plantId,
        type,
        scheduledDate,
        database,
        plant.userId ?? null
      );
    } else {
      await deleteActiveTasksForPlantByType(plantId, type, database);
    }
  }

  const tasks = await getTasksByPlantId(plantId, database);
  const riskAssessment = buildPlantRiskAssessment(plant, tasks, logs, guideEntry);

  if (riskAssessment.riskLevel !== plant.riskLevel) {
    const timestamp = nowIsoString();

    await database.runAsync(
      `
        UPDATE plants
        SET
          riskLevel = ?,
          updatedAt = ?,
          syncStatus = 'pending',
          remoteUpdatedAt = NULL
        WHERE id = ?
      `,
      riskAssessment.riskLevel,
      timestamp,
      plantId
    );
  }

  return riskAssessment;
}

export async function getPlants(database?: SQLiteDatabase): Promise<Plant[]> {
  const activeDatabase = await resolveDatabase(database);

  return activeDatabase.getAllAsync<Plant>(
    `
      SELECT ${PLANT_SELECT_COLUMNS}
      FROM plants
      ORDER BY name COLLATE NOCASE ASC, createdAt DESC
    `
  );
}

export async function getPlantById(
  id: string,
  database?: SQLiteDatabase
): Promise<Plant | null> {
  const activeDatabase = await resolveDatabase(database);
  return getPlantByIdInternal(id, activeDatabase);
}

export async function getPlantListItems(): Promise<PlantListItem[]> {
  const [plants, pendingTasks] = await Promise.all([getPlants(), getPendingTasks()]);
  const pendingTasksByPlantId = new Map<string, typeof pendingTasks>();

  pendingTasks.forEach((task) => {
    const currentTasks = pendingTasksByPlantId.get(task.plantId) ?? [];
    currentTasks.push(task);
    pendingTasksByPlantId.set(task.plantId, currentTasks);
  });

  return plants.map((plant) => {
    const plantTasks = pendingTasksByPlantId.get(plant.id) ?? [];
    const nextTask = plantTasks[0] ?? null;
    const nextWateringDate =
      plantTasks.find((task) => task.type === CARE_TYPES.WATERING)?.scheduledDate ??
      getNextWateringDate(plant.lastWateringDate, plant.wateringIntervalDays);
    const overdueTaskCount = plantTasks.filter((task) => isDateBeforeToday(task.scheduledDate)).length;

    return {
      ...plant,
      nextWateringDate,
      nextTaskDate: nextTask?.scheduledDate ?? nextWateringDate,
      nextTaskType: nextTask?.type ?? null,
      isOverdue: overdueTaskCount > 0 || isDateBeforeToday(nextWateringDate),
      overdueTaskCount,
    };
  });
}

export async function createPlant(values: PlantFormValues): Promise<Plant> {
  const database = await resolveDatabase();
  const timestamp = nowIsoString();
  const currentUserId = await getCurrentSupabaseUserIdAsync();
  const plant = buildPlantRecord(values, {
    id: createId('plant'),
    createdAt: timestamp,
    updatedAt: timestamp,
    riskLevel: DEFAULT_RISK_LEVEL,
    lastInspectionDate: null,
    photoPath: null,
    userId: currentUserId,
    syncStatus: 'pending',
    remoteUpdatedAt: null,
  });

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
        INSERT INTO plants (
          id,
          name,
          species,
          catalogPlantId,
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      plant.id,
      plant.name,
      plant.species,
      plant.catalogPlantId,
      plant.photoUri,
      plant.photoPath ?? null,
      plant.lastWateringDate,
      plant.wateringIntervalDays,
      plant.notes,
      plant.lightCondition,
      plant.humidityCondition,
      plant.roomTemperature,
      plant.conditionTags,
      plant.customCareComment,
      plant.riskLevel,
      plant.lastInspectionDate,
      plant.userId ?? null,
      plant.syncStatus ?? 'pending',
      plant.remoteUpdatedAt ?? null,
      plant.createdAt,
      plant.updatedAt
    );

    await syncPlantDerivedState(plant.id, database);
  });

  emitLocalDataChanged();
  await refreshScheduledNotificationsAsync();

  return (await getPlantById(plant.id)) ?? plant;
}

export async function updatePlant(
  id: string,
  values: PlantFormValues
): Promise<Plant | null> {
  const database = await resolveDatabase();
  const existingPlant = await getPlantByIdInternal(id, database);

  if (!existingPlant) {
    return null;
  }

  const updatedPlant = buildPlantRecord(values, {
    id,
    createdAt: existingPlant.createdAt,
    updatedAt: nowIsoString(),
    riskLevel: existingPlant.riskLevel,
    lastInspectionDate: existingPlant.lastInspectionDate,
    photoPath: existingPlant.photoPath ?? null,
    userId: existingPlant.userId ?? (await getCurrentSupabaseUserIdAsync()),
    syncStatus: 'pending',
    remoteUpdatedAt: null,
  });

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
        UPDATE plants
        SET
          name = ?,
          species = ?,
          catalogPlantId = ?,
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
          syncStatus = ?,
          remoteUpdatedAt = ?,
          updatedAt = ?
        WHERE id = ?
      `,
      updatedPlant.name,
      updatedPlant.species,
      updatedPlant.catalogPlantId,
      updatedPlant.photoUri,
      updatedPlant.photoPath ?? null,
      updatedPlant.lastWateringDate,
      updatedPlant.wateringIntervalDays,
      updatedPlant.notes,
      updatedPlant.lightCondition,
      updatedPlant.humidityCondition,
      updatedPlant.roomTemperature,
      updatedPlant.conditionTags,
      updatedPlant.customCareComment,
      updatedPlant.riskLevel,
      updatedPlant.lastInspectionDate,
      updatedPlant.userId ?? null,
      updatedPlant.syncStatus ?? 'pending',
      updatedPlant.remoteUpdatedAt ?? null,
      updatedPlant.updatedAt,
      updatedPlant.id
    );

    await syncPlantDerivedState(updatedPlant.id, database);
  });

  emitLocalDataChanged();
  await refreshScheduledNotificationsAsync();

  return getPlantById(id);
}

export async function deletePlant(id: string): Promise<void> {
  const database = await resolveDatabase();
  const plant = await getPlantByIdInternal(id, database);

  if (!plant) {
    return;
  }

  await enqueueDeletion(
    {
      entityType: 'plant',
      recordId: plant.id,
      userId: plant.userId ?? null,
      metadataJson: JSON.stringify({
        photoPath: plant.photoPath ?? null,
      }),
    },
    database
  );

  await database.runAsync('DELETE FROM plants WHERE id = ?', id);

  emitLocalDataChanged();
  await refreshScheduledNotificationsAsync();
}

export async function markPlantAsWatered(
  plantId: string,
  comment: string = CARE_TYPE_DEFAULT_COMMENTS.watering
): Promise<Plant | null> {
  const database = await resolveDatabase();
  const plant = await getPlantByIdInternal(plantId, database);

  if (!plant) {
    return null;
  }

  const completedAt = nowIsoString();
  const actionDate = completedAt.slice(0, 10);

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
        UPDATE plants
        SET
          lastWateringDate = ?,
          updatedAt = ?,
          syncStatus = 'pending',
          remoteUpdatedAt = NULL
        WHERE id = ?
      `,
      actionDate,
      completedAt,
      plantId
    );

    await addCareLog(
      {
        plantId,
        actionType: CARE_TYPES.WATERING,
        actionDate,
        comment,
      },
      database,
      plant.userId
    );

    await completeActiveTasksForPlantByType(
      plantId,
      CARE_TYPES.WATERING,
      completedAt,
      database
    );

    await syncPlantDerivedState(plantId, database);
  });

  emitLocalDataChanged();
  await refreshScheduledNotificationsAsync();

  return getPlantById(plantId);
}

export async function savePlantHealthState(
  plantId: string,
  values: PlantHealthFormValues
): Promise<Plant | null> {
  const database = await resolveDatabase();
  const plant = await getPlantByIdInternal(plantId, database);

  if (!plant) {
    return null;
  }

  const completedAt = nowIsoString();
  const actionDate = completedAt.slice(0, 10);
  const comment = values.customCareComment.trim() || CARE_TYPE_DEFAULT_COMMENTS.inspection;

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
        UPDATE plants
        SET
          conditionTags = ?,
          customCareComment = ?,
          lastInspectionDate = ?,
          updatedAt = ?,
          syncStatus = 'pending',
          remoteUpdatedAt = NULL
        WHERE id = ?
      `,
      serializeConditionTags(values.conditionTags),
      values.customCareComment.trim(),
      actionDate,
      completedAt,
      plantId
    );

    await addCareLog(
      {
        plantId,
        actionType: CARE_TYPES.INSPECTION,
        actionDate,
        comment,
      },
      database,
      plant.userId
    );

    await completeActiveTasksForPlantByType(
      plantId,
      CARE_TYPES.INSPECTION,
      completedAt,
      database
    );

    await syncPlantDerivedState(plantId, database);
  });

  emitLocalDataChanged();
  await refreshScheduledNotificationsAsync();

  return getPlantById(plantId);
}

export async function completePlantTask(
  taskId: string,
  comment?: string
): Promise<Plant | null> {
  const database = await resolveDatabase();
  const task = await getTaskById(taskId, database);

  if (!task || task.isCompleted) {
    return null;
  }

  const plant = await getPlantByIdInternal(task.plantId, database);

  if (!plant) {
    return null;
  }

  const completedAt = nowIsoString();
  const actionDate = completedAt.slice(0, 10);

  await database.withTransactionAsync(async () => {
    if (task.type === CARE_TYPES.WATERING) {
      await database.runAsync(
        `
          UPDATE plants
          SET
            lastWateringDate = ?,
            updatedAt = ?,
            syncStatus = 'pending',
            remoteUpdatedAt = NULL
          WHERE id = ?
        `,
        actionDate,
        completedAt,
        task.plantId
      );
    } else if (task.type === CARE_TYPES.INSPECTION) {
      await database.runAsync(
        `
          UPDATE plants
          SET
            lastInspectionDate = ?,
            updatedAt = ?,
            syncStatus = 'pending',
            remoteUpdatedAt = NULL
          WHERE id = ?
        `,
        actionDate,
        completedAt,
        task.plantId
      );
    }

    await addCareLog(
      {
        plantId: task.plantId,
        actionType: task.type,
        actionDate,
        comment: comment?.trim() || CARE_TYPE_DEFAULT_COMMENTS[task.type],
      },
      database,
      plant.userId
    );

    await completeTaskById(task.id, completedAt, database);
    await syncPlantDerivedState(task.plantId, database);
  });

  emitLocalDataChanged();
  await refreshScheduledNotificationsAsync();

  return getPlantById(task.plantId);
}

export async function refreshAllPlantCareState(): Promise<void> {
  const database = await resolveDatabase();
  const plants = await getPlants(database);

  await database.withTransactionAsync(async () => {
    for (const plant of plants) {
      await syncPlantDerivedState(plant.id, database);
    }
  });
}
