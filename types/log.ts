export type CareActionType = 'watering';

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
