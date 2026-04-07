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
  photoUri: string | null;
  lastWateringDate: string | null;
  wateringIntervalDays: number;
  notes: string;
  lightCondition: string;
  humidityCondition: string;
  roomTemperature: string;
  conditionTags: string;
  customCareComment: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlantFormValues {
  name: string;
  species: string;
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

export interface PlantListItem extends Plant {
  nextWateringDate: string;
  isOverdue: boolean;
}

export function isPlantConditionTag(value: string): value is PlantConditionTag {
  return PLANT_CONDITION_TAG_VALUES.includes(value as PlantConditionTag);
}

export function parseConditionTags(rawValue: string | null | undefined): PlantConditionTag[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (Array.isArray(parsedValue)) {
      return parsedValue.filter((value): value is PlantConditionTag => isPlantConditionTag(value));
    }
  } catch {
    return rawValue
      .split(',')
      .map((value) => value.trim())
      .filter((value): value is PlantConditionTag => isPlantConditionTag(value));
  }

  return [];
}

export function serializeConditionTags(tags: PlantConditionTag[]): string {
  return JSON.stringify(
    Array.from(new Set(tags.filter((tag): tag is PlantConditionTag => isPlantConditionTag(tag))))
  );
}
