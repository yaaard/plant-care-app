import type { PlantFormValues } from '@/types/plant';
import type { RiskLevel } from '@/types/risk';
import type { AppSettings } from '@/types/settings';

export const DATABASE_NAME = 'plant-care.db';
export const NOTIFICATION_CHANNEL_ID = 'plant-care-reminders';
export const DEFAULT_WATERING_INTERVAL_DAYS = 7;
export const DEFAULT_RISK_LEVEL: RiskLevel = 'low';
export const BACKUP_SCHEMA_VERSION = 7;
export const BACKUP_DIRECTORY_NAME = 'backups';
export const PLANT_PHOTO_BUCKET = 'plant-photos';
export const LAST_SYNC_STORAGE_KEY = 'plant-care:last-sync-at';
export const DEFAULT_AI_MODEL_NAME = 'gemini-2.5-flash';
export const AI_ANALYSIS_FUNCTION_NAME = 'analyze-plant-photo';
export const ASSISTANT_CHAT_FUNCTION_NAME = 'assistant-chat';

export const DEFAULT_PLANT_FORM_VALUES: PlantFormValues = {
  name: '',
  species: '',
  catalogPlantId: null,
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
