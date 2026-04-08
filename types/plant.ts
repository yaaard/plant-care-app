import type { RiskLevel } from '@/types/risk';
import type { SyncStatus } from '@/types/sync';
import type { CareTaskType } from '@/types/task';

export type PlantConditionTag =
  | 'yellow_leaves'
  | 'dry_tips'
  | 'brown_spots'
  | 'wilting'
  | 'slow_growth'
  | 'healthy';

export const PLANT_CONDITION_TAG_VALUES: PlantConditionTag[] = [
  'yellow_leaves',
  'dry_tips',
  'brown_spots',
  'wilting',
  'slow_growth',
  'healthy',
];

export interface Plant {
  id: string;
  name: string;
  species: string;
  catalogPlantId: string | null;
  photoUri: string | null;
  photoPath?: string | null;
  lastWateringDate: string | null;
  wateringIntervalDays: number;
  notes: string;
  lightCondition: string;
  humidityCondition: string;
  roomTemperature: string;
  conditionTags: string;
  customCareComment: string;
  riskLevel: RiskLevel;
  lastInspectionDate: string | null;
  createdAt: string;
  updatedAt: string;
  userId?: string | null;
  syncStatus?: SyncStatus;
  remoteUpdatedAt?: string | null;
}

export interface PlantFormValues {
  name: string;
  species: string;
  catalogPlantId: string | null;
  photoUri: string | null;
  lastWateringDate: string | null;
  wateringIntervalDays: number;
  notes: string;
  lightCondition: string;
  humidityCondition: string;
  roomTemperature: string;
  conditionTags: PlantConditionTag[];
  customCareComment: string;
}

export interface PlantHealthFormValues {
  conditionTags: PlantConditionTag[];
  customCareComment: string;
}

export interface PlantListItem extends Plant {
  nextWateringDate: string;
  nextTaskDate: string | null;
  nextTaskType: CareTaskType | null;
  isOverdue: boolean;
  overdueTaskCount: number;
}

export function isPlantConditionTag(value: string): value is PlantConditionTag {
  return PLANT_CONDITION_TAG_VALUES.includes(value as PlantConditionTag);
}

export function normalizeConditionTags(tags: PlantConditionTag[]): PlantConditionTag[] {
  const uniqueTags = Array.from(
    new Set(tags.filter((tag): tag is PlantConditionTag => isPlantConditionTag(tag)))
  );

  if (uniqueTags.includes('healthy') && uniqueTags.length > 1) {
    return uniqueTags.filter((tag) => tag !== 'healthy');
  }

  return uniqueTags;
}

export function parseConditionTags(rawValue: string | null | undefined): PlantConditionTag[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (Array.isArray(parsedValue)) {
      return normalizeConditionTags(
        parsedValue.filter((value): value is PlantConditionTag => isPlantConditionTag(value))
      );
    }
  } catch {
    return normalizeConditionTags(
      rawValue
        .split(',')
        .map((value) => value.trim())
        .filter((value): value is PlantConditionTag => isPlantConditionTag(value))
    );
  }

  return [];
}

export function serializeConditionTags(tags: PlantConditionTag[]): string {
  return JSON.stringify(normalizeConditionTags(tags));
}
