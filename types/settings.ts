export interface AppSettings {
  id: number;
  notificationsEnabled: number;
  notificationHour: number;
  notificationMinute: number;
}

export interface SettingsFormValues {
  notificationsEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
}
