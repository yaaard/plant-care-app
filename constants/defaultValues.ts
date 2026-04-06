import type { PlantFormValues } from '@/types/plant';
import type { AppSettings } from '@/types/settings';

export const DATABASE_NAME = 'plant-care.db';
export const NOTIFICATION_CHANNEL_ID = 'plant-care-reminders';
export const DEFAULT_WATERING_INTERVAL_DAYS = 7;
export const DEFAULT_WATERING_COMMENT = 'Полив отмечен в приложении';

export const DEFAULT_PLANT_FORM_VALUES: PlantFormValues = {
  name: '',
  species: '',
  photoUri: null,
  lastWateringDate: null,
  wateringIntervalDays: DEFAULT_WATERING_INTERVAL_DAYS,
  notes: '',
};

export const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  notificationsEnabled: 1,
  notificationHour: 9,
  notificationMinute: 0,
};
