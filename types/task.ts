export type CareTaskType = 'watering';

export interface CareTask {
  id: string;
  plantId: string;
  type: CareTaskType;
  scheduledDate: string;
  isCompleted: number;
  completedAt: string | null;
  createdAt: string;
}

export interface CareTaskWithPlant extends CareTask {
  plantName: string;
  plantSpecies: string;
  plantPhotoUri: string | null;
}
