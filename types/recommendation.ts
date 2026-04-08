import type { PlantCatalogPlant } from '@/types/plant-catalog';
import type { CareTaskType } from '@/types/task';

export type PlantGuideEntry = PlantCatalogPlant;

export interface RecommendationResult {
  summary: string;
  wateringAdvice: string;
  lightAdvice: string;
  humidityAdvice: string;
  riskWarnings: string[];
  diagnosisHints: string[];
  personalizedTips: string[];
  priorityChecks: string[];
  suggestedCareTypes: CareTaskType[];
  highlights: string[];
}
