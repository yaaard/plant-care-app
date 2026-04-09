import { AI_ACTION_JSON_SCHEMA, normalizeAiActionArray, type AiAction } from './ai-action-schema.ts';

export const AI_OVERALL_CONDITION_VALUES = ['healthy', 'needs_attention', 'at_risk'] as const;
export const AI_URGENCY_VALUES = ['low', 'medium', 'high'] as const;

export type PlantAiStructuredOverallCondition =
  (typeof AI_OVERALL_CONDITION_VALUES)[number];
export type PlantAiStructuredUrgency = (typeof AI_URGENCY_VALUES)[number];

export interface PlantAiStructuredResult {
  summary: string;
  overall_condition: PlantAiStructuredOverallCondition;
  urgency: PlantAiStructuredUrgency;
  observed_signs: string[];
  possible_causes: string[];
  watering_advice: string;
  light_advice: string;
  humidity_advice: string;
  recommended_actions: string[];
  actions: AiAction[];
  confidence_note: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeRequiredString(
  value: unknown,
  fieldName: keyof PlantAiStructuredResult
) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Поле ${fieldName} отсутствует или пустое.`);
  }

  return value.trim();
}

function normalizeStringArray(
  value: unknown,
  fieldName: keyof PlantAiStructuredResult,
  maxItems = 4
) {
  if (!Array.isArray(value)) {
    throw new Error(`Поле ${fieldName} должно быть массивом строк.`);
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, maxItems);
}

function normalizeOverallCondition(value: unknown) {
  if (AI_OVERALL_CONDITION_VALUES.includes(value as PlantAiStructuredOverallCondition)) {
    return value as PlantAiStructuredOverallCondition;
  }

  throw new Error('Поле overall_condition имеет неподдерживаемое значение.');
}

function normalizeUrgency(value: unknown) {
  if (AI_URGENCY_VALUES.includes(value as PlantAiStructuredUrgency)) {
    return value as PlantAiStructuredUrgency;
  }

  throw new Error('Поле urgency имеет неподдерживаемое значение.');
}

export const PLANT_AI_ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'overall_condition',
    'urgency',
    'observed_signs',
    'possible_causes',
    'watering_advice',
    'light_advice',
    'humidity_advice',
    'recommended_actions',
    'actions',
    'confidence_note',
  ],
  properties: {
    summary: {
      type: 'string',
      maxLength: 240,
    },
    overall_condition: {
      type: 'string',
      enum: [...AI_OVERALL_CONDITION_VALUES],
    },
    urgency: {
      type: 'string',
      enum: [...AI_URGENCY_VALUES],
    },
    observed_signs: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'string',
        maxLength: 80,
      },
    },
    possible_causes: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'string',
        maxLength: 110,
      },
    },
    watering_advice: {
      type: 'string',
      maxLength: 200,
    },
    light_advice: {
      type: 'string',
      maxLength: 200,
    },
    humidity_advice: {
      type: 'string',
      maxLength: 200,
    },
    recommended_actions: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'string',
        maxLength: 110,
      },
    },
    actions: AI_ACTION_JSON_SCHEMA,
    confidence_note: {
      type: 'string',
      maxLength: 180,
    },
  },
} as const;

export function normalizePlantAiStructuredResult(
  input: unknown,
  context: Parameters<typeof normalizeAiActionArray>[1] = {}
): PlantAiStructuredResult {
  if (!isObject(input)) {
    throw new Error('AI-анализ вернулся в неподдерживаемом формате.');
  }

  return {
    summary: normalizeRequiredString(input.summary, 'summary'),
    overall_condition: normalizeOverallCondition(input.overall_condition),
    urgency: normalizeUrgency(input.urgency),
    observed_signs: normalizeStringArray(input.observed_signs, 'observed_signs'),
    possible_causes: normalizeStringArray(input.possible_causes, 'possible_causes'),
    watering_advice: normalizeRequiredString(input.watering_advice, 'watering_advice'),
    light_advice: normalizeRequiredString(input.light_advice, 'light_advice'),
    humidity_advice: normalizeRequiredString(input.humidity_advice, 'humidity_advice'),
    recommended_actions: normalizeStringArray(
      input.recommended_actions,
      'recommended_actions'
    ),
    actions: normalizeAiActionArray(input.actions, context),
    confidence_note: normalizeRequiredString(input.confidence_note, 'confidence_note'),
  };
}
