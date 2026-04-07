import type { CareType } from '@/constants/careTypes';
import type { RiskLevel } from '@/types/risk';
import type { SyncStatus } from '@/types/sync';

export type CareTaskType = CareType;

export interface CareTask {
  id: string;
  plantId: string;
  type: CareTaskType;
  scheduledDate: string;
  isCompleted: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt?: string;
  userId?: string | null;
  syncStatus?: SyncStatus;
  remoteUpdatedAt?: string | null;
}

export interface CareTaskWithPlant extends CareTask {
  plantName: string;
  plantSpecies: string;
  plantPhotoUri: string | null;
  plantRiskLevel: RiskLevel;
}
