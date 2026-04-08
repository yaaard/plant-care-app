export type PlantCatalogDifficultyLevel = 'легкий' | 'средний' | 'сложный';

export type PlantCatalogSymptomCode =
  | 'yellow_leaves'
  | 'dry_tips'
  | 'brown_spots'
  | 'wilting'
  | 'slow_growth';

export interface PlantCatalogPlant {
  id: string;
  slug: string;
  nameRu: string;
  nameLatin: string;
  name: string;
  category: string;
  description: string;
  wateringIntervalMin: number;
  wateringIntervalMax: number;
  recommendedWateringIntervalDays: number;
  lightLevel: string;
  humidityLevel: string;
  temperatureMin: number;
  temperatureMax: number;
  temperatureRange: string;
  careTips: string;
  riskNotes: string;
  soilType: string;
  fertilizingInfo: string;
  sprayingNeeded: boolean;
  petSafe: boolean;
  difficultyLevel: PlantCatalogDifficultyLevel;
  inspectionIntervalDays: number;
  sprayingIntervalDays: number | null;
  fertilizingIntervalDays: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlantCatalogSymptom {
  id: string;
  plantCatalogId: string;
  symptomCode: PlantCatalogSymptomCode;
  symptomNameRu: string;
  possibleCause: string;
  recommendedAction: string;
  createdAt: string;
}

export function isPlantCatalogSymptomCode(value: string): value is PlantCatalogSymptomCode {
  return (
    value === 'yellow_leaves' ||
    value === 'dry_tips' ||
    value === 'brown_spots' ||
    value === 'wilting' ||
    value === 'slow_growth'
  );
}

export function getCatalogAverageWateringIntervalDays(
  plant: Pick<PlantCatalogPlant, 'wateringIntervalMin' | 'wateringIntervalMax'>
) {
  return Math.max(
    1,
    Math.round((plant.wateringIntervalMin + plant.wateringIntervalMax) / 2)
  );
}

export function formatCatalogTemperatureRange(
  plant: Pick<PlantCatalogPlant, 'temperatureMin' | 'temperatureMax'>
) {
  return `${plant.temperatureMin}-${plant.temperatureMax}°C`;
}

export function formatCatalogWateringRange(
  plant: Pick<PlantCatalogPlant, 'wateringIntervalMin' | 'wateringIntervalMax'>
) {
  if (plant.wateringIntervalMin === plant.wateringIntervalMax) {
    return `примерно раз в ${plant.wateringIntervalMin} дн.`;
  }

  return `примерно раз в ${plant.wateringIntervalMin}-${plant.wateringIntervalMax} дн.`;
}

export function formatCatalogSummary(
  plant: Pick<
    PlantCatalogPlant,
    'wateringIntervalMin' | 'wateringIntervalMax' | 'lightLevel' | 'difficultyLevel'
  >
) {
  return `${formatCatalogWateringRange(plant)} • ${plant.lightLevel} • ${plant.difficultyLevel}`;
}
