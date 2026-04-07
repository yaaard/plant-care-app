import type { Plant } from '@/types/plant';

export interface PlantGuideEntry {
  id: string;
  name: string;
  recommendedWateringIntervalDays: number;
  lightLevel: string;
  humidityLevel: string;
  temperatureRange: string;
  careTips: string;
  riskNotes: string;
}

export interface RecommendationResult {
  summary: string;
  wateringAdvice: string;
  lightAdvice: string;
  humidityAdvice: string;
  riskWarnings: string[];
  diagnosisHints: string[];
  personalizedTips: string[];
  highlights: string[];
}

export interface RecommendationContext {
  plant: Plant;
  guideEntry: PlantGuideEntry | null;
}
