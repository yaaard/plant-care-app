import type { PlantConditionTag } from '@/types/plant';
import type { RiskLevel } from '@/types/risk';
import { AppTheme } from '@/constants/theme';

export const HEALTH_TAG_LABELS: Record<PlantConditionTag, string> = {
  healthy: 'Выглядит здоровым',
  yellow_leaves: 'Желтеют листья',
  dry_tips: 'Сухие кончики',
  brown_spots: 'Коричневые пятна',
  wilting: 'Поникшее состояние',
  slow_growth: 'Медленный рост',
};

export const HEALTH_TAG_OPTIONS: { value: PlantConditionTag; label: string }[] = [
  { value: 'healthy', label: HEALTH_TAG_LABELS.healthy },
  { value: 'yellow_leaves', label: HEALTH_TAG_LABELS.yellow_leaves },
  { value: 'dry_tips', label: HEALTH_TAG_LABELS.dry_tips },
  { value: 'brown_spots', label: HEALTH_TAG_LABELS.brown_spots },
  { value: 'wilting', label: HEALTH_TAG_LABELS.wilting },
  { value: 'slow_growth', label: HEALTH_TAG_LABELS.slow_growth },
];

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'Низкий риск',
  medium: 'Средний риск',
  high: 'Высокий риск',
};

export const RISK_LEVEL_COLORS: Record<
  RiskLevel,
  {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
  }
> = {
  low: {
    backgroundColor: AppTheme.status.risk.low.background,
    borderColor: AppTheme.status.risk.low.border,
    textColor: AppTheme.status.risk.low.text,
  },
  medium: {
    backgroundColor: AppTheme.status.risk.medium.background,
    borderColor: AppTheme.status.risk.medium.border,
    textColor: AppTheme.status.risk.medium.text,
  },
  high: {
    backgroundColor: AppTheme.status.risk.high.background,
    borderColor: AppTheme.status.risk.high.border,
    textColor: AppTheme.status.risk.high.text,
  },
};

export function getHealthTagLabel(tag: PlantConditionTag): string {
  return HEALTH_TAG_LABELS[tag];
}

export function getRiskLevelLabel(level: RiskLevel): string {
  return RISK_LEVEL_LABELS[level];
}
