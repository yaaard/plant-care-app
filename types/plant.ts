export interface Plant {
  id: string;
  name: string;
  species: string;
  photoUri: string | null;
  lastWateringDate: string | null;
  wateringIntervalDays: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlantFormValues {
  name: string;
  species: string;
  photoUri: string | null;
  lastWateringDate: string | null;
  wateringIntervalDays: number;
  notes: string;
}

export interface PlantListItem extends Plant {
  nextWateringDate: string;
  isOverdue: boolean;
}
