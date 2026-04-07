import type { CareType } from '@/constants/careTypes';
import type { SyncStatus } from '@/types/sync';

export type CareActionType = CareType;

export interface CareLog {
  id: string;
  plantId: string;
  actionType: CareActionType;
  actionDate: string;
  comment: string;
  createdAt: string;
  updatedAt?: string;
  userId?: string | null;
  syncStatus?: SyncStatus;
  remoteUpdatedAt?: string | null;
}

export interface CareLogWithPlant extends CareLog {
  plantName: string;
  plantSpecies: string;
}
