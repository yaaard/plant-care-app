import type { CareTaskType } from '@/types/task';

export interface PlantGuideEntry {
  id: string;
  name: string;
  recommendedWateringIntervalDays: number;
  lightLevel: string;
  humidityLevel: string;
  temperatureRange: string;
  careTips: string;
  riskNotes: string;
  inspectionIntervalDays: number;
  sprayingIntervalDays: number | null;
  fertilizingIntervalDays: number;
}

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
