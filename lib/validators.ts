import { CARE_TYPE_VALUES } from '@/constants/careTypes';
import {
  BACKUP_SCHEMA_VERSION,
  DEFAULT_AI_MODEL_NAME,
  DEFAULT_RISK_LEVEL,
  DEFAULT_SETTINGS,
} from '@/constants/defaultValues';
import { isValidDateString } from '@/lib/date';
import {
  normalizeConditionTags,
  serializeConditionTags,
  type PlantConditionTag,
  type PlantFormValues,
  type PlantHealthFormValues,
} from '@/types/plant';
import type { PlantAiAnalysis } from '@/types/ai-analysis';
import type { AppBackup } from '@/types/backup';
import type { ChatMessage, ChatRole, ChatThread } from '@/types/chat';
import type { AppSettings, SettingsFormValues } from '@/types/settings';
import type { RiskLevel } from '@/types/risk';
import type { CareTask } from '@/types/task';
import type { CareLog } from '@/types/log';

type UnknownRecord = Record<string, unknown>;

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getOptionalString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function getOptionalNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function getOptionalNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getOptionalBooleanFlag(value: unknown, fallback = 0): 0 | 1 {
  if (value === 1 || value === true) {
    return 1;
  }

  if (value === 0 || value === false) {
    return 0;
  }

  return fallback as 0 | 1;
}

function isRiskLevel(value: unknown): value is RiskLevel {
  return value === 'low' || value === 'medium' || value === 'high';
}

function isAiOverallCondition(
  value: unknown
): value is PlantAiAnalysis['overallCondition'] {
  return value === 'healthy' || value === 'needs_attention' || value === 'at_risk';
}

function isAiUrgency(value: unknown): value is PlantAiAnalysis['urgency'] {
  return value === 'low' || value === 'medium' || value === 'high';
}

function isDateOrNull(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && isValidDateString(value));
}

function parseConditionTagsValue(value: unknown): string {
  if (Array.isArray(value)) {
    return serializeConditionTags(value.filter((tag): tag is PlantConditionTag => typeof tag === 'string'));
  }

  if (typeof value === 'string') {
    try {
      return serializeConditionTags(normalizeConditionTags(JSON.parse(value)));
    } catch {
      return serializeConditionTags(
        normalizeConditionTags(
          value
            .split(',')
            .map((item) => item.trim())
            .filter((item): item is PlantConditionTag => typeof item === 'string')
        )
      );
    }
  }

  return '[]';
}

function parseStringArrayValue(value: unknown) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }

  if (typeof value === 'string') {
    try {
      return parseStringArrayValue(JSON.parse(value));
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

export function normalizePlantFormValues(values: PlantFormValues): PlantFormValues {
  return {
    name: values.name.trim(),
    species: values.species.trim(),
    catalogPlantId: values.catalogPlantId?.trim() ? values.catalogPlantId.trim() : null,
    photoUri: values.photoUri?.trim() ? values.photoUri.trim() : null,
    lastWateringDate: values.lastWateringDate?.trim() ? values.lastWateringDate.trim() : null,
    wateringIntervalDays: Math.floor(Number(values.wateringIntervalDays)),
    notes: values.notes.trim(),
    lightCondition: values.lightCondition.trim(),
    humidityCondition: values.humidityCondition.trim(),
    roomTemperature: values.roomTemperature.trim(),
    conditionTags: normalizeConditionTags(values.conditionTags),
    customCareComment: values.customCareComment.trim(),
  };
}

export function validatePlantForm(values: PlantFormValues): string[] {
  const normalizedValues = normalizePlantFormValues(values);
  const errors: string[] = [];

  if (!normalizedValues.name) {
    errors.push('Укажите название растения.');
  }

  if (!normalizedValues.species) {
    errors.push('Укажите вид растения или выберите его из справочника.');
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

export function normalizePlantHealthValues(values: PlantHealthFormValues): PlantHealthFormValues {
  return {
    conditionTags: normalizeConditionTags(values.conditionTags),
    customCareComment: values.customCareComment.trim(),
  };
}

export function validatePlantHealthValues(values: PlantHealthFormValues): string[] {
  const normalizedValues = normalizePlantHealthValues(values);
  const errors: string[] = [];

  if (normalizedValues.conditionTags.length === 0) {
    errors.push('Отметьте хотя бы один тег состояния растения.');
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

function normalizeImportedSettings(value: unknown, errors: string[]): AppSettings {
  if (!isObject(value)) {
    errors.push('В backup отсутствует корректный блок settings.');
    return DEFAULT_SETTINGS;
  }

  const nextSettings: AppSettings = {
    id: 1,
    notificationsEnabled: getOptionalBooleanFlag(value.notificationsEnabled, DEFAULT_SETTINGS.notificationsEnabled),
    notificationHour: getOptionalNumber(value.notificationHour, DEFAULT_SETTINGS.notificationHour),
    notificationMinute: getOptionalNumber(value.notificationMinute, DEFAULT_SETTINGS.notificationMinute),
  };

  const settingsErrors = validateSettings({
    notificationsEnabled: Boolean(nextSettings.notificationsEnabled),
    notificationHour: nextSettings.notificationHour,
    notificationMinute: nextSettings.notificationMinute,
  });

  if (settingsErrors.length > 0) {
    errors.push(...settingsErrors);
  }

  return nextSettings;
}

function normalizeImportedPlants(value: unknown, errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push('В backup отсутствует массив plants.');
    return [];
  }

  return value
    .map((item, index) => {
      if (!isObject(item)) {
        errors.push(`Некорректная запись растения #${index + 1}.`);
        return null;
      }

      if (!isNonEmptyString(item.id) || !isNonEmptyString(item.name) || !isNonEmptyString(item.species)) {
        errors.push(`У растения #${index + 1} отсутствуют обязательные поля id, name или species.`);
        return null;
      }

      const lastWateringDate = getOptionalNullableString(item.lastWateringDate);
      const lastInspectionDate = getOptionalNullableString(item.lastInspectionDate);

      if (!isDateOrNull(lastWateringDate)) {
        errors.push(`У растения "${item.name}" некорректная дата последнего полива.`);
        return null;
      }

      if (!isDateOrNull(lastInspectionDate)) {
        errors.push(`У растения "${item.name}" некорректная дата последнего осмотра.`);
        return null;
      }

      const wateringIntervalDays = Math.max(1, Math.floor(getOptionalNumber(item.wateringIntervalDays, 1)));
      const riskLevel = isRiskLevel(item.riskLevel) ? item.riskLevel : DEFAULT_RISK_LEVEL;
      const now = new Date().toISOString();

      return {
        id: item.id.trim(),
        name: item.name.trim(),
        species: item.species.trim(),
        catalogPlantId: getOptionalNullableString(item.catalogPlantId),
        photoUri: getOptionalNullableString(item.photoUri),
        photoPath: getOptionalNullableString(item.photoPath),
        lastWateringDate,
        wateringIntervalDays,
        notes: getOptionalString(item.notes),
        lightCondition: getOptionalString(item.lightCondition),
        humidityCondition: getOptionalString(item.humidityCondition),
        roomTemperature: getOptionalString(item.roomTemperature),
        conditionTags: parseConditionTagsValue(item.conditionTags),
        customCareComment: getOptionalString(item.customCareComment),
        riskLevel,
        lastInspectionDate,
        createdAt: isNonEmptyString(item.createdAt) ? item.createdAt : now,
        updatedAt: isNonEmptyString(item.updatedAt) ? item.updatedAt : now,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function normalizeImportedTasks(value: unknown, plantIds: Set<string>, errors: string[]): CareTask[] {
  if (!Array.isArray(value)) {
    errors.push('В backup отсутствует массив careTasks.');
    return [];
  }

  const activeTaskKeys = new Set<string>();
  const usedIds = new Set<string>();

  return value
    .map((item, index) => {
      if (!isObject(item)) {
        errors.push(`Некорректная запись задачи #${index + 1}.`);
        return null;
      }

      if (!isNonEmptyString(item.id) || !isNonEmptyString(item.plantId)) {
        errors.push(`У задачи #${index + 1} отсутствуют обязательные поля id или plantId.`);
        return null;
      }

      if (!plantIds.has(item.plantId.trim())) {
        errors.push(`Задача "${item.id}" ссылается на неизвестное растение.`);
        return null;
      }

      if (!CARE_TYPE_VALUES.includes(item.type as CareTask['type'])) {
        errors.push(`У задачи "${item.id}" указан неизвестный тип ухода.`);
        return null;
      }

      if (!isNonEmptyString(item.scheduledDate) || !isValidDateString(item.scheduledDate)) {
        errors.push(`У задачи "${item.id}" некорректная дата scheduledDate.`);
        return null;
      }

      if (usedIds.has(item.id.trim())) {
        errors.push(`В backup найден дубликат id задачи "${item.id}".`);
        return null;
      }

      usedIds.add(item.id.trim());

      const isCompleted = getOptionalBooleanFlag(item.isCompleted, 0);
      const task: CareTask = {
        id: item.id.trim(),
        plantId: item.plantId.trim(),
        type: item.type as CareTask['type'],
        scheduledDate: item.scheduledDate,
        isCompleted,
        completedAt: getOptionalNullableString(item.completedAt),
        createdAt: isNonEmptyString(item.createdAt) ? item.createdAt : new Date().toISOString(),
      };

      if (task.isCompleted === 0) {
        const uniqueKey = `${task.plantId}:${task.type}:${task.scheduledDate}`;

        if (activeTaskKeys.has(uniqueKey)) {
          errors.push(
            `В backup найдены дублирующиеся активные задачи "${task.type}" на дату ${task.scheduledDate}.`
          );
          return null;
        }

        activeTaskKeys.add(uniqueKey);
      }

      return task;
    })
    .filter((item): item is CareTask => item !== null);
}

function normalizeImportedLogs(value: unknown, plantIds: Set<string>, errors: string[]): CareLog[] {
  if (!Array.isArray(value)) {
    errors.push('В backup отсутствует массив careLogs.');
    return [];
  }

  const usedIds = new Set<string>();

  return value
    .map((item, index) => {
      if (!isObject(item)) {
        errors.push(`Некорректная запись журнала #${index + 1}.`);
        return null;
      }

      if (!isNonEmptyString(item.id) || !isNonEmptyString(item.plantId)) {
        errors.push(`У записи журнала #${index + 1} отсутствуют поля id или plantId.`);
        return null;
      }

      if (!plantIds.has(item.plantId.trim())) {
        errors.push(`Запись журнала "${item.id}" ссылается на неизвестное растение.`);
        return null;
      }

      if (!CARE_TYPE_VALUES.includes(item.actionType as CareLog['actionType'])) {
        errors.push(`У записи журнала "${item.id}" указан неизвестный тип действия.`);
        return null;
      }

      if (!isNonEmptyString(item.actionDate) || !isValidDateString(item.actionDate)) {
        errors.push(`У записи журнала "${item.id}" некорректная дата actionDate.`);
        return null;
      }

      if (usedIds.has(item.id.trim())) {
        errors.push(`В backup найден дубликат id журнала "${item.id}".`);
        return null;
      }

      usedIds.add(item.id.trim());

      return {
        id: item.id.trim(),
        plantId: item.plantId.trim(),
        actionType: item.actionType as CareLog['actionType'],
        actionDate: item.actionDate,
        comment: getOptionalString(item.comment),
        createdAt: isNonEmptyString(item.createdAt) ? item.createdAt : new Date().toISOString(),
      };
    })
    .filter((item): item is CareLog => item !== null);
}

function normalizeImportedAiAnalyses(
  value: unknown,
  plantIds: Set<string>,
  errors: string[]
): PlantAiAnalysis[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    errors.push('В backup поле aiAnalyses должно быть массивом.');
    return [];
  }

  const usedIds = new Set<string>();

  return value
    .map((item, index) => {
      if (!isObject(item)) {
        errors.push(`Некорректная запись AI-анализа #${index + 1}.`);
        return null;
      }

      if (!isNonEmptyString(item.id) || !isNonEmptyString(item.plantId)) {
        errors.push(`У AI-анализа #${index + 1} отсутствуют поля id или plantId.`);
        return null;
      }

      if (!plantIds.has(item.plantId.trim())) {
        errors.push(`AI-анализ "${item.id}" ссылается на неизвестное растение.`);
        return null;
      }

      if (usedIds.has(item.id.trim())) {
        errors.push(`В backup найден дубликат id AI-анализа "${item.id}".`);
        return null;
      }

      usedIds.add(item.id.trim());

      if (!isNonEmptyString(item.summary)) {
        errors.push(`У AI-анализа "${item.id}" отсутствует summary.`);
        return null;
      }

      const overallCondition = isAiOverallCondition(item.overallCondition)
        ? item.overallCondition
        : 'needs_attention';
      const urgency = isAiUrgency(item.urgency) ? item.urgency : 'medium';
      const createdAt = isNonEmptyString(item.createdAt)
        ? item.createdAt
        : new Date().toISOString();
      const updatedAt = isNonEmptyString(item.updatedAt) ? item.updatedAt : createdAt;

      return {
        id: item.id.trim(),
        plantId: item.plantId.trim(),
        userId: getOptionalNullableString(item.userId),
        photoPath: getOptionalNullableString(item.photoPath),
        modelName: getOptionalString(item.modelName, DEFAULT_AI_MODEL_NAME),
        summary: item.summary.trim(),
        overallCondition,
        urgency,
        observedSigns: parseStringArrayValue(item.observedSigns),
        possibleCauses: parseStringArrayValue(item.possibleCauses),
        wateringAdvice: getOptionalString(item.wateringAdvice),
        lightAdvice: getOptionalString(item.lightAdvice),
        humidityAdvice: getOptionalString(item.humidityAdvice),
        recommendedActions: parseStringArrayValue(item.recommendedActions),
        confidenceNote: getOptionalString(item.confidenceNote),
        rawJson: getOptionalString(item.rawJson, '{}'),
        createdAt,
        updatedAt,
        syncStatus: 'synced' as const,
        remoteUpdatedAt: updatedAt,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function normalizeImportedChatThreads(
  value: unknown,
  plantIds: Set<string>,
  errors: string[]
): ChatThread[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    errors.push('В backup поле chatThreads должно быть массивом.');
    return [];
  }

  const usedIds = new Set<string>();

  return value
    .map((item, index) => {
      if (!isObject(item)) {
        errors.push(`Некорректная запись треда чата #${index + 1}.`);
        return null;
      }

      if (!isNonEmptyString(item.id)) {
        errors.push(`У треда чата #${index + 1} отсутствует id.`);
        return null;
      }

      if (usedIds.has(item.id.trim())) {
        errors.push(`В backup найден дубликат id треда "${item.id}".`);
        return null;
      }

      const plantId = getOptionalNullableString(item.plantId);

      if (plantId && !plantIds.has(plantId)) {
        errors.push(`Тред чата "${item.id}" ссылается на неизвестное растение.`);
        return null;
      }

      usedIds.add(item.id.trim());

      const createdAt = isNonEmptyString(item.createdAt)
        ? item.createdAt
        : new Date().toISOString();
      const updatedAt = isNonEmptyString(item.updatedAt) ? item.updatedAt : createdAt;

      return {
        id: item.id.trim(),
        userId: getOptionalNullableString(item.userId),
        plantId,
        title: getOptionalNullableString(item.title),
        createdAt,
        updatedAt,
        syncStatus: 'synced' as const,
        remoteUpdatedAt: updatedAt,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function normalizeImportedChatMessages(
  value: unknown,
  threadIds: Set<string>,
  errors: string[]
): ChatMessage[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    errors.push('В backup поле chatMessages должно быть массивом.');
    return [];
  }

  const usedIds = new Set<string>();

  return value
    .map((item, index) => {
      if (!isObject(item)) {
        errors.push(`Некорректная запись сообщения чата #${index + 1}.`);
        return null;
      }

      if (!isNonEmptyString(item.id) || !isNonEmptyString(item.threadId)) {
        errors.push(`У сообщения чата #${index + 1} отсутствует id или threadId.`);
        return null;
      }

      if (!threadIds.has(item.threadId.trim())) {
        errors.push(`Сообщение чата "${item.id}" ссылается на неизвестный тред.`);
        return null;
      }

      if (usedIds.has(item.id.trim())) {
        errors.push(`В backup найден дубликат id сообщения "${item.id}".`);
        return null;
      }

      const role =
        item.role === 'assistant' || item.role === 'system' || item.role === 'user'
          ? (item.role as ChatRole)
          : null;

      if (!role) {
        errors.push(`У сообщения "${item.id}" указан неподдерживаемый role.`);
        return null;
      }

      if (!isNonEmptyString(item.text) && !isNonEmptyString(item.imagePath)) {
        errors.push(`Сообщение "${item.id}" должно содержать текст или imagePath.`);
        return null;
      }

      usedIds.add(item.id.trim());

      const createdAt = isNonEmptyString(item.createdAt)
        ? item.createdAt
        : new Date().toISOString();
      const updatedAt = isNonEmptyString(item.updatedAt) ? item.updatedAt : createdAt;

      return {
        id: item.id.trim(),
        threadId: item.threadId.trim(),
        userId: getOptionalNullableString(item.userId),
        role,
        text: getOptionalString(item.text),
        imagePath: getOptionalNullableString(item.imagePath),
        createdAt,
        updatedAt,
        syncStatus: 'synced' as const,
        remoteUpdatedAt: updatedAt,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

export function parseBackupData(input: unknown): AppBackup {
  const errors: string[] = [];

  if (!isObject(input)) {
    throw new Error('Файл не похож на резервную копию приложения.');
  }

  const metadataInput = isObject(input.metadata) ? input.metadata : null;
  const schemaVersion = getOptionalNumber(metadataInput?.schemaVersion, BACKUP_SCHEMA_VERSION);

  if (schemaVersion > BACKUP_SCHEMA_VERSION) {
    errors.push('Резервная копия создана в более новой версии приложения и не поддерживается.');
  }

  const plants = normalizeImportedPlants(input.plants, errors);
  const plantIds = new Set(plants.map((plant) => plant.id));
  const careTasks = normalizeImportedTasks(input.careTasks, plantIds, errors);
  const careLogs = normalizeImportedLogs(input.careLogs, plantIds, errors);
  const aiAnalyses = normalizeImportedAiAnalyses(input.aiAnalyses, plantIds, errors);
  const chatThreads = normalizeImportedChatThreads(input.chatThreads, plantIds, errors);
  const threadIds = new Set(chatThreads.map((thread) => thread.id));
  const chatMessages = normalizeImportedChatMessages(input.chatMessages, threadIds, errors);
  const settings = normalizeImportedSettings(input.settings, errors);

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return {
    metadata: {
      appVersion: isNonEmptyString(metadataInput?.appVersion) ? metadataInput.appVersion : '1.0.0',
      exportedAt: isNonEmptyString(metadataInput?.exportedAt)
        ? metadataInput.exportedAt
        : new Date().toISOString(),
      schemaVersion,
    },
    plants,
    careTasks,
    careLogs,
    aiAnalyses,
    chatThreads,
    chatMessages,
    settings,
  };
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
