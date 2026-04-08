import type { AiOverallCondition, AiUrgency } from '@/types/ai-analysis';
import { getCareTypeLabel } from '@/constants/careTypes';
import { getRiskLevelLabel } from '@/constants/healthTags';
import {
  getDateStatusLabel,
  isValidDateString,
  tryParseDateString,
} from '@/lib/date';
import type { RiskLevel } from '@/types/risk';
import type { CareTaskType } from '@/types/task';

const DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDisplayDate(
  value: string | null | undefined,
  fallback: string = 'Не указано'
) {
  if (!value || !isValidDateString(value)) {
    return fallback;
  }

  return DATE_FORMATTER.format(tryParseDateString(value) as Date);
}

export function formatShortDate(
  value: string | null | undefined,
  fallback: string = 'Не указано'
) {
  if (!value || !isValidDateString(value)) {
    return fallback;
  }

  return SHORT_DATE_FORMATTER.format(tryParseDateString(value) as Date);
}

export function formatDateTime(
  value: string | null | undefined,
  fallback: string = 'Не указано'
) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return DATE_TIME_FORMATTER.format(date);
}

export function formatTaskDate(
  value: string | null | undefined,
  fallback: string = 'Не указано'
) {
  if (!value || !isValidDateString(value)) {
    return fallback;
  }

  return `${formatShortDate(value)} | ${getDateStatusLabel(value)}`;
}

export function formatRiskLabel(level: RiskLevel) {
  return getRiskLevelLabel(level);
}

export function formatCareType(type: CareTaskType) {
  return getCareTypeLabel(type);
}

export function formatAiOverallCondition(condition: AiOverallCondition) {
  if (condition === 'healthy') {
    return 'Состояние выглядит стабильным';
  }

  if (condition === 'at_risk') {
    return 'Есть выраженные признаки риска';
  }

  return 'Есть признаки, требующие внимания';
}

export function formatAiUrgency(urgency: AiUrgency) {
  if (urgency === 'high') {
    return 'Высокая';
  }

  if (urgency === 'medium') {
    return 'Средняя';
  }

  return 'Низкая';
}
