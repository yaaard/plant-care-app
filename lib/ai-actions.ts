import { CARE_TYPE_LABELS, CARE_TYPES } from '@/constants/careTypes';
import { todayString } from '@/lib/date';
import { addAiActionHistory, wasAiActionApplied } from '@/lib/ai-action-history-repo';
import { createId, nowIsoString } from '@/lib/db';
import { emitLocalDataChanged } from '@/lib/local-events';
import { refreshScheduledNotificationsAsync } from '@/lib/notifications';
import { getPlantById, markPlantAttention, updatePlant } from '@/lib/plants-repo';
import { createCareTaskIfNeeded } from '@/lib/tasks-repo';
import { normalizeAiActionArray } from '@/shared/ai-action-schema';
import { parseConditionTags } from '@/types/plant';
import type { AiAction, AiActionExecutionResult, AiActionExecutionSource } from '@/types/ai-action';

function mergeAttentionNote(currentValue: string, note: string | null | undefined) {
  const nextNote = note?.trim() ?? '';

  if (!nextNote) {
    return currentValue;
  }

  if (!currentValue.trim()) {
    return nextNote;
  }

  if (currentValue.includes(nextNote)) {
    return currentValue;
  }

  return `${currentValue.trim()}\n\n${nextNote}`;
}

function getActionPayloadPlantId(action: AiAction) {
  if (!('plantId' in action.payload)) {
    return null;
  }

  const plantId = action.payload.plantId;
  return typeof plantId === 'string' && plantId.trim() ? plantId.trim() : null;
}

function resolveActionPlantId(action: AiAction, source: AiActionExecutionSource = {}) {
  const sourcePlantId = source.plantId?.trim() ?? '';

  if (sourcePlantId) {
    return sourcePlantId;
  }

  return getActionPayloadPlantId(action);
}

function resolveActionSource(action: AiAction, source: AiActionExecutionSource = {}) {
  return {
    plantId: resolveActionPlantId(action, source),
    analysisId: source.analysisId ?? null,
    chatMessageId: source.chatMessageId ?? null,
  } satisfies AiActionExecutionSource;
}

export function validateAiActions(
  value: unknown,
  context: Parameters<typeof normalizeAiActionArray>[1] = {}
) {
  return normalizeAiActionArray(value, {
    ...context,
    createId: context.createId ?? createId,
  });
}

export function normalizeAiActions(
  value: unknown,
  context: Parameters<typeof normalizeAiActionArray>[1] = {}
) {
  return validateAiActions(value, context);
}

export function parseAiActions(
  rawValue: string | null | undefined,
  context: Parameters<typeof normalizeAiActionArray>[1] = {}
) {
  if (!rawValue) {
    return [];
  }

  try {
    return validateAiActions(JSON.parse(rawValue), context);
  } catch {
    return [];
  }
}

export function serializeAiActions(actions: AiAction[]) {
  return JSON.stringify(
    actions.map((action) => ({
      id: action.id,
      type: action.type,
      title: action.title,
      description: action.description,
      payload: action.payload,
      createdAt: action.createdAt,
    }))
  );
}

export function mapAiActionToLabel(action: AiAction) {
  switch (action.type) {
    case 'create_task':
      return `Создать задачу: ${CARE_TYPE_LABELS[action.payload.taskType]}`;
    case 'update_watering_interval':
      return `Изменить интервал полива до ${action.payload.newIntervalDays} дн.`;
    case 'mark_attention':
      return 'Отметить как требующее внимания';
    case 'open_catalog_entry':
      return 'Открыть запись в справочнике';
    case 'open_plant_details':
      return 'Открыть карточку растения';
    case 'open_schedule':
      return 'Открыть расписание';
    case 'dismiss':
      return 'Скрыть рекомендацию';
  }
}

function normalizeHumanText(value: string | undefined) {
  return value?.trim().replace(/\s+/g, ' ') ?? '';
}

function isWeakAiActionTitle(value: string | undefined) {
  const normalized = normalizeHumanText(value).toLowerCase();

  if (!normalized) {
    return true;
  }

  return (
    normalized.length < 6 ||
    normalized === 'хорошо' ||
    normalized === 'ок' ||
    normalized === 'ok' ||
    normalized === 'понятно' ||
    normalized === 'сделать' ||
    normalized === 'действие' ||
    normalized === 'задача' ||
    normalized === 'совет'
  );
}

export function getAiActionTitle(action: AiAction) {
  if (!isWeakAiActionTitle(action.title)) {
    return normalizeHumanText(action.title);
  }

  return mapAiActionToLabel(action);
}

export function getAiActionDescription(action: AiAction) {
  const normalizedDescription = normalizeHumanText(action.description);

  if (normalizedDescription && !isWeakAiActionTitle(normalizedDescription)) {
    return normalizedDescription;
  }

  switch (action.type) {
    case 'create_task':
      return normalizeHumanText(action.payload.reason ?? undefined) || 'Добавит полезную задачу в ваш план ухода.';
    case 'update_watering_interval':
      return `Обновит режим полива до ${action.payload.newIntervalDays} дней.`;
    case 'mark_attention':
      return normalizeHumanText(action.payload.note ?? undefined) || 'Пометит растение как требующее внимания.';
    case 'open_catalog_entry':
      return 'Откроет подходящую запись в справочнике растений.';
    case 'open_plant_details':
      return 'Откроет карточку этого растения.';
    case 'open_schedule':
      return 'Перейдет в расписание задач по уходу.';
    case 'dismiss':
      return 'Скроет эту рекомендацию.';
  }
}

export async function executeAiAction(
  action: AiAction,
  options: {
    source?: AiActionExecutionSource;
  } = {}
): Promise<AiActionExecutionResult> {
  const source = resolveActionSource(action, options.source ?? {});
  const alreadyApplied =
    action.type === 'dismiss' ? false : await wasAiActionApplied(action, source);

  if (alreadyApplied) {
    throw new Error('Это действие уже было применено ранее.');
  }

  switch (action.type) {
    case 'create_task': {
      const plantId = resolveActionPlantId(action, source);

      if (!plantId) {
        throw new Error('Не удалось определить растение для этой рекомендации.');
      }

      const plant = await getPlantById(plantId);

      if (!plant) {
        throw new Error('Растение для создания задачи не найдено.');
      }

      await createCareTaskIfNeeded(
        plantId,
        action.payload.taskType,
        action.payload.scheduledDate ?? todayString()
      );
      await addAiActionHistory({ action, source }, undefined, false);
      emitLocalDataChanged();
      await refreshScheduledNotificationsAsync();

      return {
        status: 'applied',
        action,
        message: `Задача "${CARE_TYPE_LABELS[action.payload.taskType]}" добавлена в план ухода.`,
        requiresReload: true,
      };
    }
    case 'update_watering_interval': {
      const plantId = resolveActionPlantId(action, source);

      if (!plantId) {
        throw new Error('Не удалось определить растение для обновления интервала.');
      }

      const plant = await getPlantById(plantId);

      if (!plant) {
        throw new Error('Растение для обновления интервала не найдено.');
      }

      await updatePlant(plant.id, {
        name: plant.name,
        species: plant.species,
        catalogPlantId: plant.catalogPlantId ?? null,
        photoUri: plant.photoUri ?? null,
        lastWateringDate: plant.lastWateringDate,
        wateringIntervalDays: action.payload.newIntervalDays,
        notes: plant.notes,
        lightCondition: plant.lightCondition,
        humidityCondition: plant.humidityCondition,
        roomTemperature: plant.roomTemperature,
        conditionTags: parseConditionTags(plant.conditionTags),
        customCareComment: plant.customCareComment,
      });

      await addAiActionHistory({ action, source }, undefined, false);
      emitLocalDataChanged();
      await refreshScheduledNotificationsAsync();

      return {
        status: 'applied',
        action,
        message: `Интервал полива обновлен до ${action.payload.newIntervalDays} дн.`,
        requiresReload: true,
      };
    }
    case 'mark_attention': {
      const plantId = resolveActionPlantId(action, source);

      if (!plantId) {
        throw new Error('Не удалось определить растение для этой рекомендации.');
      }

      const plant = await getPlantById(plantId);

      if (!plant) {
        throw new Error('Растение для отметки не найдено.');
      }

      await markPlantAttention(plant.id, {
        riskLevel: action.payload.riskLevel,
        note: mergeAttentionNote(plant.customCareComment, action.payload.note),
      });

      await addAiActionHistory({ action, source }, undefined, false);
      emitLocalDataChanged();

      return {
        status: 'applied',
        action,
        message: 'Растение отмечено как требующее внимания.',
        requiresReload: true,
      };
    }
    case 'open_catalog_entry': {
      await addAiActionHistory({ action, source, appliedAt: nowIsoString() }, undefined, false);
      emitLocalDataChanged();

      return {
        status: 'navigated',
        action,
        message: 'Открываем запись в справочнике.',
        navigationTarget: {
          pathname: '/catalog/[id]',
          params: {
            id: action.payload.catalogPlantId,
          },
        },
      };
    }
    case 'open_plant_details': {
      const plantId = resolveActionPlantId(action, source);

      if (!plantId) {
        throw new Error('Не удалось определить растение для перехода.');
      }

      await addAiActionHistory({ action, source }, undefined, false);
      emitLocalDataChanged();

      return {
        status: 'navigated',
        action,
        message: 'Открываем карточку растения.',
        navigationTarget: {
          pathname: '/plant/[id]',
          params: {
            id: plantId,
          },
        },
      };
    }
    case 'open_schedule': {
      await addAiActionHistory({ action, source }, undefined, false);
      emitLocalDataChanged();

      return {
        status: 'navigated',
        action,
        message: 'Открываем расписание задач.',
        navigationTarget: {
          pathname: '/(tabs)/schedule',
        },
      };
    }
    case 'dismiss':
      return {
        status: 'dismissed',
        action,
        message: 'Рекомендация скрыта.',
      };
  }
}

export function buildSuggestedTaskAction(input: {
  plantId: string;
  taskType: string;
  title?: string;
  description?: string;
  reason?: string | null;
}) {
  const taskType = Object.values(CARE_TYPES).includes(input.taskType as (typeof CARE_TYPES)[keyof typeof CARE_TYPES])
    ? (input.taskType as (typeof CARE_TYPES)[keyof typeof CARE_TYPES])
    : CARE_TYPES.INSPECTION;

  return {
    id: createId('ai-action'),
    type: 'create_task' as const,
    title: input.title ?? `Создать задачу: ${CARE_TYPE_LABELS[taskType]}`,
    description: input.description,
    payload: {
      plantId: input.plantId,
      taskType,
      scheduledDate: todayString(),
      reason: input.reason ?? null,
    },
    createdAt: nowIsoString(),
  };
}
