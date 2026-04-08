export const AI_OVERALL_CONDITION_VALUES = [
  'healthy',
  'needs_attention',
  'at_risk',
] as const;

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
  fieldName: keyof PlantAiStructuredResult
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
  );
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
    'confidence_note',
  ],
  properties: {
    summary: {
      type: 'string',
      description:
        'Короткий общий вывод по фото растения на русском языке. Умеренный и аккуратный.',
    },
    overall_condition: {
      type: 'string',
      enum: [...AI_OVERALL_CONDITION_VALUES],
      description:
        'Общая оценка состояния растения: healthy, needs_attention или at_risk.',
    },
    urgency: {
      type: 'string',
      enum: [...AI_URGENCY_VALUES],
      description: 'Срочность внимания: low, medium или high.',
    },
    observed_signs: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: 'Краткие признаки, которые можно предположить по фото.',
    },
    possible_causes: {
      type: 'array',
      items: {
        type: 'string',
      },
      description:
        'Мягко сформулированные возможные причины, без категоричных диагнозов.',
    },
    watering_advice: {
      type: 'string',
      description: 'Совет по поливу на русском языке.',
    },
    light_advice: {
      type: 'string',
      description: 'Совет по освещению на русском языке.',
    },
    humidity_advice: {
      type: 'string',
      description: 'Совет по влажности на русском языке.',
    },
    recommended_actions: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: 'Короткий список действий, которые стоит проверить или сделать.',
    },
    confidence_note: {
      type: 'string',
      description:
        'Короткая пометка, что вывод носит вероятностный характер и основан только на фото.',
    },
  },
} as const;

export function normalizePlantAiStructuredResult(
  input: unknown
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
    watering_advice: normalizeRequiredString(
      input.watering_advice,
      'watering_advice'
    ),
    light_advice: normalizeRequiredString(input.light_advice, 'light_advice'),
    humidity_advice: normalizeRequiredString(
      input.humidity_advice,
      'humidity_advice'
    ),
    recommended_actions: normalizeStringArray(
      input.recommended_actions,
      'recommended_actions'
    ),
    confidence_note: normalizeRequiredString(
      input.confidence_note,
      'confidence_note'
    ),
  };
}
