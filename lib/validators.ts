import { DEFAULT_SETTINGS } from '@/constants/defaultValues';
import { isValidDateString } from '@/lib/date';
import type { PlantFormValues } from '@/types/plant';
import type { AppSettings, SettingsFormValues } from '@/types/settings';

export function normalizePlantFormValues(values: PlantFormValues): PlantFormValues {
  return {
    name: values.name.trim(),
    species: values.species.trim(),
    photoUri: values.photoUri?.trim() ? values.photoUri.trim() : null,
    lastWateringDate: values.lastWateringDate?.trim() ? values.lastWateringDate.trim() : null,
    wateringIntervalDays: Math.floor(Number(values.wateringIntervalDays)),
    notes: values.notes.trim(),
  };
}

export function validatePlantForm(values: PlantFormValues): string[] {
  const normalizedValues = normalizePlantFormValues(values);
  const errors: string[] = [];

  if (!normalizedValues.name) {
    errors.push('Укажите название растения.');
  }

  if (!normalizedValues.species) {
    errors.push('Укажите вид растения.');
  }

  if (
    !Number.isFinite(normalizedValues.wateringIntervalDays) ||
    normalizedValues.wateringIntervalDays < 1
  ) {
    errors.push('Интервал полива должен быть целым числом больше нуля.');
  }

  if (
    normalizedValues.lastWateringDate &&
    !isValidDateString(normalizedValues.lastWateringDate)
  ) {
    errors.push('Дата последнего полива должна быть в формате YYYY-MM-DD.');
  }

  return errors;
}

export function normalizeSettingsFormValues(values: SettingsFormValues): AppSettings {
  return {
    id: DEFAULT_SETTINGS.id,
    notificationsEnabled: values.notificationsEnabled ? 1 : 0,
    notificationHour: Math.floor(Number(values.notificationHour)),
    notificationMinute: Math.floor(Number(values.notificationMinute)),
  };
}

export function validateSettings(values: SettingsFormValues): string[] {
  const normalizedValues = normalizeSettingsFormValues(values);
  const errors: string[] = [];

  if (
    !Number.isFinite(normalizedValues.notificationHour) ||
    normalizedValues.notificationHour < 0 ||
    normalizedValues.notificationHour > 23
  ) {
    errors.push('Часы уведомления должны быть в диапазоне от 0 до 23.');
  }

  if (
    !Number.isFinite(normalizedValues.notificationMinute) ||
    normalizedValues.notificationMinute < 0 ||
    normalizedValues.notificationMinute > 59
  ) {
    errors.push('Минуты уведомления должны быть в диапазоне от 0 до 59.');
  }

  return errors;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
