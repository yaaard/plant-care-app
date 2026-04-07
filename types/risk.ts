export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskAssessmentResult {
  riskLevel: RiskLevel;
  score: number;
  summary: string;
  reasons: string[];
  recommendations: string[];
}
