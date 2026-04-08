import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '@/lib/db';
import { initializeDatabase } from '@/lib/db-init';
import { emitLocalDataChanged } from '@/lib/local-events';
import type { Plant } from '@/types/plant';
import type {
  PlantCatalogPlant,
  PlantCatalogSymptom,
} from '@/types/plant-catalog';
import {
  formatCatalogTemperatureRange,
  getCatalogAverageWateringIntervalDays,
} from '@/types/plant-catalog';

type CatalogPlantRow = {
  id: string;
  slug: string;
  nameRu: string;
  nameLatin: string;
  category: string;
  description: string;
  wateringIntervalMin: number;
  wateringIntervalMax: number;
  lightLevel: string;
  humidityLevel: string;
  temperatureMin: number;
  temperatureMax: number;
  careTips: string;
  riskNotes: string;
  soilType: string;
  fertilizingInfo: string;
  sprayingNeeded: number;
  petSafe: number;
  difficultyLevel: PlantCatalogPlant['difficultyLevel'];
  inspectionIntervalDays: number;
  sprayingIntervalDays: number | null;
  fertilizingIntervalDays: number | null;
  createdAt: string;
  updatedAt: string;
};

type CatalogSymptomRow = {
  id: string;
  plantCatalogId: string;
  symptomCode: PlantCatalogSymptom['symptomCode'];
  symptomNameRu: string;
  possibleCause: string;
  recommendedAction: string;
  createdAt: string;
};

async function resolveDatabase(database?: SQLiteDatabase) {
  if (database) {
    return database;
  }

  await initializeDatabase();
  return getDatabase();
}

function mapCatalogPlant(row: CatalogPlantRow): PlantCatalogPlant {
  const basePlant = {
    id: row.id,
    slug: row.slug,
    nameRu: row.nameRu,
    nameLatin: row.nameLatin,
    name: row.nameRu,
    category: row.category,
    description: row.description,
    wateringIntervalMin: row.wateringIntervalMin,
    wateringIntervalMax: row.wateringIntervalMax,
    lightLevel: row.lightLevel,
    humidityLevel: row.humidityLevel,
    temperatureMin: row.temperatureMin,
    temperatureMax: row.temperatureMax,
    careTips: row.careTips,
    riskNotes: row.riskNotes,
    soilType: row.soilType,
    fertilizingInfo: row.fertilizingInfo,
    sprayingNeeded: Boolean(row.sprayingNeeded),
    petSafe: Boolean(row.petSafe),
    difficultyLevel: row.difficultyLevel,
    inspectionIntervalDays: row.inspectionIntervalDays,
    sprayingIntervalDays: row.sprayingIntervalDays,
    fertilizingIntervalDays: row.fertilizingIntervalDays,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return {
    ...basePlant,
    recommendedWateringIntervalDays: getCatalogAverageWateringIntervalDays(basePlant),
    temperatureRange: formatCatalogTemperatureRange(basePlant),
  };
}

function mapCatalogSymptom(row: CatalogSymptomRow): PlantCatalogSymptom {
  return {
    id: row.id,
    plantCatalogId: row.plantCatalogId,
    symptomCode: row.symptomCode,
    symptomNameRu: row.symptomNameRu,
    possibleCause: row.possibleCause,
    recommendedAction: row.recommendedAction,
    createdAt: row.createdAt,
  };
}

function normalizeCatalogQuery(value: string) {
  return value.trim().toLowerCase();
}

function buildCatalogNotes(plant: PlantCatalogPlant) {
  return [plant.description.trim(), plant.careTips.trim()].filter(Boolean).join('\n\n');
}

export function buildPlantFormAutofillFromCatalog(plant: PlantCatalogPlant) {
  return {
    catalogPlantId: plant.id,
    species: plant.nameRu,
    wateringIntervalDays: getCatalogAverageWateringIntervalDays(plant),
    lightCondition: plant.lightLevel,
    humidityCondition: plant.humidityLevel,
    roomTemperature: formatCatalogTemperatureRange(plant),
    notes: buildCatalogNotes(plant),
  };
}

export async function getAllCatalogPlants(database?: SQLiteDatabase): Promise<PlantCatalogPlant[]> {
  const activeDatabase = await resolveDatabase(database);
  const rows = await activeDatabase.getAllAsync<CatalogPlantRow>(
    `
      SELECT
        id,
        slug,
        nameRu,
        nameLatin,
        category,
        description,
        wateringIntervalMin,
        wateringIntervalMax,
        lightLevel,
        humidityLevel,
        temperatureMin,
        temperatureMax,
        careTips,
        riskNotes,
        soilType,
        fertilizingInfo,
        sprayingNeeded,
        petSafe,
        difficultyLevel,
        inspectionIntervalDays,
        sprayingIntervalDays,
        fertilizingIntervalDays,
        createdAt,
        updatedAt
      FROM plant_catalog
      ORDER BY nameRu COLLATE NOCASE ASC
    `
  );

  return rows.map(mapCatalogPlant);
}

export async function getCatalogPlantById(
  id: string,
  database?: SQLiteDatabase
): Promise<PlantCatalogPlant | null> {
  const activeDatabase = await resolveDatabase(database);
  const row = await activeDatabase.getFirstAsync<CatalogPlantRow>(
    `
      SELECT
        id,
        slug,
        nameRu,
        nameLatin,
        category,
        description,
        wateringIntervalMin,
        wateringIntervalMax,
        lightLevel,
        humidityLevel,
        temperatureMin,
        temperatureMax,
        careTips,
        riskNotes,
        soilType,
        fertilizingInfo,
        sprayingNeeded,
        petSafe,
        difficultyLevel,
        inspectionIntervalDays,
        sprayingIntervalDays,
        fertilizingIntervalDays,
        createdAt,
        updatedAt
      FROM plant_catalog
      WHERE id = ?
      LIMIT 1
    `,
    id
  );

  return row ? mapCatalogPlant(row) : null;
}

export async function getCatalogPlantBySlug(
  slug: string,
  database?: SQLiteDatabase
): Promise<PlantCatalogPlant | null> {
  const activeDatabase = await resolveDatabase(database);
  const row = await activeDatabase.getFirstAsync<CatalogPlantRow>(
    `
      SELECT
        id,
        slug,
        nameRu,
        nameLatin,
        category,
        description,
        wateringIntervalMin,
        wateringIntervalMax,
        lightLevel,
        humidityLevel,
        temperatureMin,
        temperatureMax,
        careTips,
        riskNotes,
        soilType,
        fertilizingInfo,
        sprayingNeeded,
        petSafe,
        difficultyLevel,
        inspectionIntervalDays,
        sprayingIntervalDays,
        fertilizingIntervalDays,
        createdAt,
        updatedAt
      FROM plant_catalog
      WHERE slug = ?
      LIMIT 1
    `,
    normalizeCatalogQuery(slug)
  );

  return row ? mapCatalogPlant(row) : null;
}

export async function searchCatalogPlants(
  query: string,
  database?: SQLiteDatabase
): Promise<PlantCatalogPlant[]> {
  const normalizedQuery = normalizeCatalogQuery(query);

  if (!normalizedQuery) {
    return getAllCatalogPlants(database);
  }

  const activeDatabase = await resolveDatabase(database);
  const searchValue = `%${normalizedQuery}%`;
  const rows = await activeDatabase.getAllAsync<CatalogPlantRow>(
    `
      SELECT
        id,
        slug,
        nameRu,
        nameLatin,
        category,
        description,
        wateringIntervalMin,
        wateringIntervalMax,
        lightLevel,
        humidityLevel,
        temperatureMin,
        temperatureMax,
        careTips,
        riskNotes,
        soilType,
        fertilizingInfo,
        sprayingNeeded,
        petSafe,
        difficultyLevel,
        inspectionIntervalDays,
        sprayingIntervalDays,
        fertilizingIntervalDays,
        createdAt,
        updatedAt
      FROM plant_catalog
      WHERE
        LOWER(nameRu) LIKE ?
        OR LOWER(nameLatin) LIKE ?
        OR LOWER(slug) LIKE ?
      ORDER BY nameRu COLLATE NOCASE ASC
    `,
    searchValue,
    searchValue,
    searchValue
  );

  return rows.map(mapCatalogPlant);
}

export async function getCatalogSymptomsByPlantId(
  plantCatalogId: string,
  database?: SQLiteDatabase
): Promise<PlantCatalogSymptom[]> {
  const activeDatabase = await resolveDatabase(database);
  const rows = await activeDatabase.getAllAsync<CatalogSymptomRow>(
    `
      SELECT
        id,
        plantCatalogId,
        symptomCode,
        symptomNameRu,
        possibleCause,
        recommendedAction,
        createdAt
      FROM plant_catalog_symptoms
      WHERE plantCatalogId = ?
      ORDER BY symptomNameRu COLLATE NOCASE ASC
    `,
    plantCatalogId
  );

  return rows.map(mapCatalogSymptom);
}

export async function findCatalogPlantForPlant(
  plant:
    | Pick<Plant, 'catalogPlantId' | 'species'>
    | {
        catalogPlantId: string | null;
        species: string;
      },
  database?: SQLiteDatabase
): Promise<PlantCatalogPlant | null> {
  if (plant.catalogPlantId) {
    const linkedPlant = await getCatalogPlantById(plant.catalogPlantId, database);

    if (linkedPlant) {
      return linkedPlant;
    }
  }

  const normalizedSpecies = normalizeCatalogQuery(plant.species);

  if (!normalizedSpecies) {
    return null;
  }

  const activeDatabase = await resolveDatabase(database);
  const row = await activeDatabase.getFirstAsync<CatalogPlantRow>(
    `
      SELECT
        id,
        slug,
        nameRu,
        nameLatin,
        category,
        description,
        wateringIntervalMin,
        wateringIntervalMax,
        lightLevel,
        humidityLevel,
        temperatureMin,
        temperatureMax,
        careTips,
        riskNotes,
        soilType,
        fertilizingInfo,
        sprayingNeeded,
        petSafe,
        difficultyLevel,
        inspectionIntervalDays,
        sprayingIntervalDays,
        fertilizingIntervalDays,
        createdAt,
        updatedAt
      FROM plant_catalog
      WHERE LOWER(nameRu) = ? OR LOWER(nameLatin) = ? OR LOWER(slug) = ?
      LIMIT 1
    `,
    normalizedSpecies,
    normalizedSpecies,
    normalizedSpecies
  );

  return row ? mapCatalogPlant(row) : null;
}

export async function replacePlantCatalogLocally(
  plants: PlantCatalogPlant[],
  symptoms: PlantCatalogSymptom[],
  database?: SQLiteDatabase
) {
  const activeDatabase = await resolveDatabase(database);

  await activeDatabase.withTransactionAsync(async () => {
    await activeDatabase.execAsync(`
      DELETE FROM plant_catalog_symptoms;
      DELETE FROM plant_catalog;
    `);

    for (const plant of plants) {
      await activeDatabase.runAsync(
        `
          INSERT INTO plant_catalog (
            id,
            slug,
            nameRu,
            nameLatin,
            category,
            description,
            wateringIntervalMin,
            wateringIntervalMax,
            lightLevel,
            humidityLevel,
            temperatureMin,
            temperatureMax,
            careTips,
            riskNotes,
            soilType,
            fertilizingInfo,
            sprayingNeeded,
            petSafe,
            difficultyLevel,
            inspectionIntervalDays,
            sprayingIntervalDays,
            fertilizingIntervalDays,
            createdAt,
            updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        plant.id,
        plant.slug,
        plant.nameRu,
        plant.nameLatin,
        plant.category,
        plant.description,
        plant.wateringIntervalMin,
        plant.wateringIntervalMax,
        plant.lightLevel,
        plant.humidityLevel,
        plant.temperatureMin,
        plant.temperatureMax,
        plant.careTips,
        plant.riskNotes,
        plant.soilType,
        plant.fertilizingInfo,
        plant.sprayingNeeded ? 1 : 0,
        plant.petSafe ? 1 : 0,
        plant.difficultyLevel,
        plant.inspectionIntervalDays,
        plant.sprayingIntervalDays,
        plant.fertilizingIntervalDays,
        plant.createdAt,
        plant.updatedAt
      );
    }

    for (const symptom of symptoms) {
      await activeDatabase.runAsync(
        `
          INSERT INTO plant_catalog_symptoms (
            id,
            plantCatalogId,
            symptomCode,
            symptomNameRu,
            possibleCause,
            recommendedAction,
            createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        symptom.id,
        symptom.plantCatalogId,
        symptom.symptomCode,
        symptom.symptomNameRu,
        symptom.possibleCause,
        symptom.recommendedAction,
        symptom.createdAt
      );
    }
  });

  emitLocalDataChanged();
}

export async function syncPlantCatalog() {
  const { syncPlantCatalogForCurrentUser } = await import('@/lib/sync');
  return syncPlantCatalogForCurrentUser();
}
