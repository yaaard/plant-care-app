const CARE_TYPE_VALUES = [
  'watering',
  'fertilizing',
  'spraying',
  'repotting',
  'inspection',
] as const;

const ACTION_TYPE_VALUES = [
  'create_task',
  'update_watering_interval',
  'mark_attention',
  'open_catalog_entry',
  'open_plant_details',
  'open_schedule',
  'dismiss',
] as const;

type CareType = (typeof CARE_TYPE_VALUES)[number];
type RiskLevel = 'low' | 'medium' | 'high';
type StructuredAiActionType = (typeof ACTION_TYPE_VALUES)[number];

export type AiAction =
  | {
      id: string;
      type: 'create_task';
      title: string;
      description?: string;
      payload: {
        plantId: string;
        taskType: CareType;
        scheduledDate?: string | null;
        reason?: string | null;
      };
      createdAt?: string;
    }
  | {
      id: string;
      type: 'update_watering_interval';
      title: string;
      description?: string;
      payload: {
        plantId: string;
        newIntervalDays: number;
      };
      createdAt?: string;
    }
  | {
      id: string;
      type: 'mark_attention';
      title: string;
      description?: string;
      payload: {
        plantId: string;
        riskLevel?: RiskLevel;
        note?: string | null;
      };
      createdAt?: string;
    }
  | {
      id: string;
      type: 'open_catalog_entry';
      title: string;
      description?: string;
      payload: {
        catalogPlantId: string;
      };
      createdAt?: string;
    }
  | {
      id: string;
      type: 'open_plant_details';
      title: string;
      description?: string;
      payload: {
        plantId: string;
      };
      createdAt?: string;
    }
  | {
      id: string;
      type: 'open_schedule' | 'dismiss';
      title: string;
      description?: string;
      payload: Record<string, never>;
      createdAt?: string;
    };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeString(value: unknown, maxLength = 160) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeDescription(value: unknown) {
  const nextValue = normalizeString(value, 180);
  return nextValue || undefined;
}

function normalizeRiskLevel(value: unknown): RiskLevel | undefined {
  return value === 'low' || value === 'medium' || value === 'high' ? value : undefined;
}

function isStructuredAiActionType(value: unknown): value is StructuredAiActionType {
  return ACTION_TYPE_VALUES.includes(value as StructuredAiActionType);
}

export function normalizeAiActionArray(
  value: unknown,
  context: {
    plantId?: string | null;
    catalogPlantId?: string | null;
    createId?: (prefix: string) => string;
    createdAt?: string;
  } = {}
): AiAction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const createId =
    context.createId ??
    ((prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`);
  const createdAt = context.createdAt;
  const normalizedActions: AiAction[] = [];

  for (const item of value.slice(0, 3)) {
    if (!isObject(item) || !isStructuredAiActionType(item.type) || !isNonEmptyString(item.title)) {
      continue;
    }

    const id = normalizeString(item.id, 80) || createId('ai-action');
    const title = normalizeString(item.title, 72);
    const description = normalizeDescription(item.description);
    const payload = isObject(item.payload) ? item.payload : {};

    if (!title) {
      continue;
    }

    switch (item.type) {
      case 'create_task': {
        const plantId =
          normalizeString(payload.plantId, 80) || normalizeString(context.plantId, 80) || '';
        const taskType = payload.taskType;
        const scheduledDate = normalizeString(payload.scheduledDate, 32);
        const reason = normalizeString(payload.reason, 140);

        if (!plantId || !CARE_TYPE_VALUES.includes(taskType as CareType)) {
          break;
        }

        normalizedActions.push({
          id,
          type: 'create_task',
          title,
          description,
          payload: {
            plantId,
            taskType: taskType as CareType,
            scheduledDate: scheduledDate || null,
            reason: reason || null,
          },
          createdAt,
        });
        break;
      }
      case 'update_watering_interval': {
        const plantId =
          normalizeString(payload.plantId, 80) || normalizeString(context.plantId, 80) || '';
        const newIntervalDays =
          typeof payload.newIntervalDays === 'number' && Number.isFinite(payload.newIntervalDays)
            ? Math.max(1, Math.round(payload.newIntervalDays))
            : 0;

        if (!plantId || newIntervalDays < 1) {
          break;
        }

        normalizedActions.push({
          id,
          type: 'update_watering_interval',
          title,
          description,
          payload: {
            plantId,
            newIntervalDays,
          },
          createdAt,
        });
        break;
      }
      case 'mark_attention': {
        const plantId =
          normalizeString(payload.plantId, 80) || normalizeString(context.plantId, 80) || '';
        const note = normalizeString(payload.note, 180);

        if (!plantId) {
          break;
        }

        normalizedActions.push({
          id,
          type: 'mark_attention',
          title,
          description,
          payload: {
            plantId,
            riskLevel: normalizeRiskLevel(payload.riskLevel),
            note: note || null,
          },
          createdAt,
        });
        break;
      }
      case 'open_catalog_entry': {
        const catalogPlantId =
          normalizeString(payload.catalogPlantId, 80) ||
          normalizeString(context.catalogPlantId, 80) ||
          '';

        if (!catalogPlantId) {
          break;
        }

        normalizedActions.push({
          id,
          type: 'open_catalog_entry',
          title,
          description,
          payload: {
            catalogPlantId,
          },
          createdAt,
        });
        break;
      }
      case 'open_plant_details': {
        const plantId =
          normalizeString(payload.plantId, 80) || normalizeString(context.plantId, 80) || '';

        if (!plantId) {
          break;
        }

        normalizedActions.push({
          id,
          type: 'open_plant_details',
          title,
          description,
          payload: {
            plantId,
          },
          createdAt,
        });
        break;
      }
      case 'open_schedule':
        normalizedActions.push({
          id,
          type: 'open_schedule',
          title,
          description,
          payload: {},
          createdAt,
        });
        break;
      case 'dismiss':
        normalizedActions.push({
          id,
          type: 'dismiss',
          title,
          description,
          payload: {},
          createdAt,
        });
        break;
    }
  }

  return normalizedActions;
}

export const AI_ACTION_JSON_SCHEMA = {
  type: 'array',
  maxItems: 3,
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['type', 'title', 'payload'],
    properties: {
      id: {
        type: 'string',
        maxLength: 80,
      },
      type: {
        type: 'string',
        enum: [...ACTION_TYPE_VALUES],
      },
      title: {
        type: 'string',
        maxLength: 72,
      },
      description: {
        type: 'string',
        maxLength: 180,
      },
      payload: {
        type: 'object',
        additionalProperties: true,
      },
    },
  },
} as const;
