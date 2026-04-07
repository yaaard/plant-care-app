import { CARE_TYPES } from '@/constants/careTypes';
import { DEFAULT_WATERING_COMMENT } from '@/constants/defaultValues';
import { getNextWateringDate, isDateBeforeToday } from '@/lib/date';
import { createId, getDatabase, nowIsoString } from '@/lib/db';
import { initializeDatabase } from '@/lib/db-init';
import { addCareLog } from '@/lib/logs-repo';
import { refreshScheduledNotificationsAsync } from '@/lib/notifications';
import {
  completeActiveWateringTasksForPlant,
  createWateringTaskIfNeeded,
  getPendingTasks,
  replaceActiveWateringTaskForPlant,
} from '@/lib/tasks-repo';
import {
  serializeConditionTags,
  type Plant,
  type PlantFormValues,
  type PlantListItem,
} from '@/types/plant';

const PLANT_SELECT_COLUMNS = `
  id,
  name,
  species,
  photoUri,
  lastWateringDate,
  wateringIntervalDays,
  notes,
  lightCondition,
  humidityCondition,
  roomTemperature,
  conditionTags,
  customCareComment,
  createdAt,
  updatedAt
`;

export async function getPlants(): Promise<Plant[]> {
  await initializeDatabase();
  const database = await getDatabase();

  return database.getAllAsync<Plant>(
    `
      SELECT
        ${PLANT_SELECT_COLUMNS}
      FROM plants
      ORDER BY name COLLATE NOCASE ASC, createdAt DESC
    `
  );
}

export async function getPlantById(id: string): Promise<Plant | null> {
  await initializeDatabase();
  const database = await getDatabase();

  return database.getFirstAsync<Plant>(
    `
      SELECT
        ${PLANT_SELECT_COLUMNS}
      FROM plants
      WHERE id = ?
      LIMIT 1
    `,
    id
  );
}

export async function getPlantListItems(): Promise<PlantListItem[]> {
  const [plants, pendingTasks] = await Promise.all([getPlants(), getPendingTasks()]);
  const nextTaskByPlantId = new Map<string, string>();

  pendingTasks.forEach((task) => {
    if (!nextTaskByPlantId.has(task.plantId)) {
      nextTaskByPlantId.set(task.plantId, task.scheduledDate);
    }
  });

  return plants.map((plant) => {
    const nextWateringDate =
      nextTaskByPlantId.get(plant.id) ??
      getNextWateringDate(plant.lastWateringDate, plant.wateringIntervalDays);

    return {
      ...plant,
      nextWateringDate,
      isOverdue: isDateBeforeToday(nextWateringDate),
    };
  });
}

function buildPlantRecord(values: PlantFormValues, id: string, createdAt: string, updatedAt: string): Plant {
  return {
    id,
    name: values.name,
    species: values.species,
    photoUri: values.photoUri,
    lastWateringDate: values.lastWateringDate,
    wateringIntervalDays: values.wateringIntervalDays,
    notes: values.notes,
    lightCondition: values.lightCondition,
    humidityCondition: values.humidityCondition,
    roomTemperature: values.roomTemperature,
    conditionTags: serializeConditionTags(values.conditionTags),
    customCareComment: values.customCareComment,
    createdAt,
    updatedAt,
  };
}

export async function createPlant(values: PlantFormValues): Promise<Plant> {
  await initializeDatabase();
  const database = await getDatabase();
  const timestamp = nowIsoString();

  const plant = buildPlantRecord(values, createId('plant'), timestamp, timestamp);
  const nextWateringDate = getNextWateringDate(
    plant.lastWateringDate,
    plant.wateringIntervalDays
  );

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
        INSERT INTO plants (
          id,
          name,
          species,
          photoUri,
          lastWateringDate,
          wateringIntervalDays,
          notes,
          lightCondition,
          humidityCondition,
          roomTemperature,
          conditionTags,
          customCareComment,
          createdAt,
          updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      plant.id,
      plant.name,
      plant.species,
      plant.photoUri,
      plant.lastWateringDate,
      plant.wateringIntervalDays,
      plant.notes,
      plant.lightCondition,
      plant.humidityCondition,
      plant.roomTemperature,
      plant.conditionTags,
      plant.customCareComment,
      plant.createdAt,
      plant.updatedAt
    );

    await createWateringTaskIfNeeded(plant.id, nextWateringDate, database);
  });

  await refreshScheduledNotificationsAsync();

  return plant;
}

export async function updatePlant(id: string, values: PlantFormValues): Promise<Plant | null> {
  await initializeDatabase();
  const database = await getDatabase();
  const existingPlant = await getPlantById(id);

  if (!existingPlant) {
    return null;
  }

  const updatedPlant = buildPlantRecord(values, id, existingPlant.createdAt, nowIsoString());
  const nextWateringDate = getNextWateringDate(
    updatedPlant.lastWateringDate,
    updatedPlant.wateringIntervalDays
  );

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
        UPDATE plants
        SET
          name = ?,
          species = ?,
          photoUri = ?,
          lastWateringDate = ?,
          wateringIntervalDays = ?,
          notes = ?,
          lightCondition = ?,
          humidityCondition = ?,
          roomTemperature = ?,
          conditionTags = ?,
          customCareComment = ?,
          updatedAt = ?
        WHERE id = ?
      `,
      updatedPlant.name,
      updatedPlant.species,
      updatedPlant.photoUri,
      updatedPlant.lastWateringDate,
      updatedPlant.wateringIntervalDays,
      updatedPlant.notes,
      updatedPlant.lightCondition,
      updatedPlant.humidityCondition,
      updatedPlant.roomTemperature,
      updatedPlant.conditionTags,
      updatedPlant.customCareComment,
      updatedPlant.updatedAt,
      updatedPlant.id
    );

    await replaceActiveWateringTaskForPlant(updatedPlant.id, nextWateringDate, database);
  });

  await refreshScheduledNotificationsAsync();

  return updatedPlant;
}

export async function deletePlant(id: string): Promise<void> {
  await initializeDatabase();
  const database = await getDatabase();

  await database.runAsync('DELETE FROM plants WHERE id = ?', id);
  await refreshScheduledNotificationsAsync();
}

export async function markPlantAsWatered(
  plantId: string,
  comment: string = DEFAULT_WATERING_COMMENT
): Promise<Plant | null> {
  await initializeDatabase();
  const database = await getDatabase();
  const plant = await getPlantById(plantId);

  if (!plant) {
    return null;
  }

  const wateredAt = nowIsoString();
  const actionDate = wateredAt.slice(0, 10);
  const nextWateringDate = getNextWateringDate(actionDate, plant.wateringIntervalDays);

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
        UPDATE plants
        SET lastWateringDate = ?, updatedAt = ?
        WHERE id = ?
      `,
      actionDate,
      wateredAt,
      plantId
    );

    await addCareLog(
      {
        plantId,
        actionType: CARE_TYPES.WATERING,
        actionDate,
        comment,
      },
      database
    );

    await completeActiveWateringTasksForPlant(plantId, wateredAt, database);
    await createWateringTaskIfNeeded(plantId, nextWateringDate, database);
  });

  await refreshScheduledNotificationsAsync();

  return getPlantById(plantId);
}
