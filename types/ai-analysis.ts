import type { SyncStatus } from '@/types/sync';
import type { AiAction } from '@/types/ai-action';

export type AiOverallCondition = 'healthy' | 'needs_attention' | 'at_risk';
export type AiUrgency = 'low' | 'medium' | 'high';

export interface PlantAiAnalysisContent {
  summary: string;
  overallCondition: AiOverallCondition;
  urgency: AiUrgency;
  observedSigns: string[];
  possibleCauses: string[];
  wateringAdvice: string;
  lightAdvice: string;
  humidityAdvice: string;
  recommendedActions: string[];
  actions: AiAction[];
  confidenceNote: string;
}

export interface PlantAiAnalysis extends PlantAiAnalysisContent {
  id: string;
  userId: string | null;
  plantId: string;
  photoPath: string | null;
  modelName: string;
  rawJson: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: SyncStatus;
  remoteUpdatedAt?: string | null;
}

export interface PlantAiAnalysisFunctionResponse {
  analysis: PlantAiAnalysis;
}
