import type { CareType } from '@/constants/careTypes';

export type CareActionType = CareType;

export interface CareLog {
  id: string;
  plantId: string;
  actionType: CareActionType;
  actionDate: string;
  comment: string;
  createdAt: string;
}

export interface CareLogWithPlant extends CareLog {
  plantName: string;
  plantSpecies: string;
}
