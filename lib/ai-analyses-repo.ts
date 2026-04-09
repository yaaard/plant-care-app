import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '@/lib/db';
import { initializeDatabase } from '@/lib/db-init';
import { emitLocalDataChanged } from '@/lib/local-events';
import { parseAiActions, serializeAiActions } from '@/lib/ai-actions';
import type { PlantAiAnalysis } from '@/types/ai-analysis';

type AiAnalysisRecord = {
  id: string;
  plantId: string;
  userId: string | null;
  photoPath: string | null;
  modelName: string;
  summary: string;
  overallCondition: PlantAiAnalysis['overallCondition'];
  urgency: PlantAiAnalysis['urgency'];
  observedSigns: string;
  possibleCauses: string;
  wateringAdvice: string;
  lightAdvice: string;
  humidityAdvice: string;
  recommendedActions: string;
  actions: string;
  confidenceNote: string;
  rawJson: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
  remoteUpdatedAt: string | null;
};

const AI_ANALYSIS_SELECT_COLUMNS = `
  id,
  plantId,
  userId,
  photoPath,
  modelName,
  summary,
  overallCondition,
  urgency,
  observedSigns,
  possibleCauses,
  wateringAdvice,
  lightAdvice,
  humidityAdvice,
  recommendedActions,
  actions,
  confidenceNote,
  rawJson,
  createdAt,
  updatedAt,
  syncStatus,
  remoteUpdatedAt
`;

function parseStringArray(rawValue: string | null | undefined) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function serializeStringArray(values: string[]) {
  return JSON.stringify(
    Array.from(
      new Set(
        values
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean)
      )
    )
  );
}

function mapAiAnalysisRecord(record: AiAnalysisRecord): PlantAiAnalysis {
  return {
    id: record.id,
    plantId: record.plantId,
    userId: record.userId,
    photoPath: record.photoPath,
    modelName: record.modelName,
    summary: record.summary,
    overallCondition: record.overallCondition,
    urgency: record.urgency,
    observedSigns: parseStringArray(record.observedSigns),
    possibleCauses: parseStringArray(record.possibleCauses),
    wateringAdvice: record.wateringAdvice,
    lightAdvice: record.lightAdvice,
    humidityAdvice: record.humidityAdvice,
    recommendedActions: parseStringArray(record.recommendedActions),
    actions: parseAiActions(record.actions, {
      plantId: record.plantId,
      createdAt: record.createdAt,
    }),
    confidenceNote: record.confidenceNote,
    rawJson: record.rawJson,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    syncStatus: record.syncStatus as PlantAiAnalysis['syncStatus'],
    remoteUpdatedAt: record.remoteUpdatedAt,
  };
}

async function resolveDatabase(database?: SQLiteDatabase) {
  if (database) {
    return database;
  }

  await initializeDatabase();
  return getDatabase();
}

export async function getAllAiAnalyses(
  database?: SQLiteDatabase
): Promise<PlantAiAnalysis[]> {
  const activeDatabase = await resolveDatabase(database);
  const records = await activeDatabase.getAllAsync<AiAnalysisRecord>(
    `
      SELECT ${AI_ANALYSIS_SELECT_COLUMNS}
      FROM plant_ai_analyses
      ORDER BY createdAt DESC
    `
  );

  return records.map(mapAiAnalysisRecord);
}

export async function getAiAnalysesByPlantId(
  plantId: string,
  database?: SQLiteDatabase
): Promise<PlantAiAnalysis[]> {
  const activeDatabase = await resolveDatabase(database);
  const records = await activeDatabase.getAllAsync<AiAnalysisRecord>(
    `
      SELECT ${AI_ANALYSIS_SELECT_COLUMNS}
      FROM plant_ai_analyses
      WHERE plantId = ?
      ORDER BY createdAt DESC
    `,
    plantId
  );

  return records.map(mapAiAnalysisRecord);
}

export async function getLatestAiAnalysisByPlantId(
  plantId: string,
  database?: SQLiteDatabase
): Promise<PlantAiAnalysis | null> {
  const activeDatabase = await resolveDatabase(database);
  const record = await activeDatabase.getFirstAsync<AiAnalysisRecord>(
    `
      SELECT ${AI_ANALYSIS_SELECT_COLUMNS}
      FROM plant_ai_analyses
      WHERE plantId = ?
      ORDER BY createdAt DESC
      LIMIT 1
    `,
    plantId
  );

  return record ? mapAiAnalysisRecord(record) : null;
}

export async function upsertAiAnalysisLocally(
  analysis: PlantAiAnalysis,
  database?: SQLiteDatabase,
  emitChange: boolean = true
) {
  const activeDatabase = await resolveDatabase(database);

  await activeDatabase.runAsync(
    `
      INSERT INTO plant_ai_analyses (
        id,
        plantId,
        userId,
        photoPath,
        modelName,
        summary,
        overallCondition,
        urgency,
        observedSigns,
        possibleCauses,
        wateringAdvice,
        lightAdvice,
        humidityAdvice,
        recommendedActions,
        actions,
        confidenceNote,
        rawJson,
        createdAt,
        updatedAt,
        syncStatus,
        remoteUpdatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        plantId = excluded.plantId,
        userId = excluded.userId,
        photoPath = excluded.photoPath,
        modelName = excluded.modelName,
        summary = excluded.summary,
        overallCondition = excluded.overallCondition,
        urgency = excluded.urgency,
        observedSigns = excluded.observedSigns,
        possibleCauses = excluded.possibleCauses,
        wateringAdvice = excluded.wateringAdvice,
        lightAdvice = excluded.lightAdvice,
        humidityAdvice = excluded.humidityAdvice,
        recommendedActions = excluded.recommendedActions,
        actions = excluded.actions,
        confidenceNote = excluded.confidenceNote,
        rawJson = excluded.rawJson,
        createdAt = excluded.createdAt,
        updatedAt = excluded.updatedAt,
        syncStatus = excluded.syncStatus,
        remoteUpdatedAt = excluded.remoteUpdatedAt
    `,
    analysis.id,
    analysis.plantId,
    analysis.userId ?? null,
    analysis.photoPath ?? null,
    analysis.modelName,
    analysis.summary,
    analysis.overallCondition,
    analysis.urgency,
    serializeStringArray(analysis.observedSigns),
    serializeStringArray(analysis.possibleCauses),
    analysis.wateringAdvice,
    analysis.lightAdvice,
    analysis.humidityAdvice,
    serializeStringArray(analysis.recommendedActions),
    serializeAiActions(analysis.actions),
    analysis.confidenceNote,
    analysis.rawJson,
    analysis.createdAt,
    analysis.updatedAt,
    analysis.syncStatus ?? 'synced',
    analysis.remoteUpdatedAt ?? analysis.updatedAt
  );

  if (emitChange) {
    emitLocalDataChanged();
  }
}
