import type { PlantFormValues } from '@/types/plant';
import type { RiskLevel } from '@/types/risk';
import type { AppSettings } from '@/types/settings';

export const DATABASE_NAME = 'plant-care.db';
export const NOTIFICATION_CHANNEL_ID = 'plant-care-reminders';
export const DEFAULT_WATERING_INTERVAL_DAYS = 7;
export const DEFAULT_RISK_LEVEL: RiskLevel = 'low';

export const DEFAULT_PLANT_FORM_VALUES: PlantFormValues = {
  name: '',
  species: '',
  photoUri: null,
  lastWateringDate: null,
  wateringIntervalDays: DEFAULT_WATERING_INTERVAL_DAYS,
  notes: '',
  lightCondition: '',
  humidityCondition: '',
  roomTemperature: '',
  conditionTags: [],
  customCareComment: '',
};

export const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  notificationsEnabled: 1,
  notificationHour: 9,
  notificationMinute: 0,
};
