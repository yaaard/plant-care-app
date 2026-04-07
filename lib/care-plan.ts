import { CARE_TYPES } from '@/constants/careTypes';
import { addDays, todayString } from '@/lib/date';
import type { CareLog } from '@/types/log';
import { parseConditionTags, type Plant } from '@/types/plant';
import type { PlantGuideEntry } from '@/types/recommendation';
import type { CareTaskType } from '@/types/task';

export interface AdaptiveCarePlanResult {
  taskDates: Partial<Record<CareTaskType, string>>;
  reasons: string[];
}

function getLatestActionDate(logs: CareLog[], actionType: CareTaskType): string | null {
  return logs.find((log) => log.actionType === actionType)?.actionDate ?? null;
}

export function buildAdaptiveCarePlan(
  plant: Plant,
  guideEntry: PlantGuideEntry | null,
  logs: CareLog[]
): AdaptiveCarePlanResult {
  const tags = parseConditionTags(plant.conditionTags);
  const taskDates: Partial<Record<CareTaskType, string>> = {
    [CARE_TYPES.WATERING]: addDays(
      plant.lastWateringDate ?? todayString(),
      plant.wateringIntervalDays
    ),
  };
  const reasons: string[] = [];

  const inspectionIntervalDays = guideEntry?.inspectionIntervalDays ?? 14;
  taskDates[CARE_TYPES.INSPECTION] = plant.lastInspectionDate
    ? addDays(plant.lastInspectionDate, inspectionIntervalDays)
    : todayString();

  if (!plant.lastInspectionDate) {
    reasons.push('Полезно провести первый осмотр растения и зафиксировать его состояние.');
  }

  const shouldSpray =
    Boolean(guideEntry?.sprayingIntervalDays) ||
    plant.humidityCondition.trim().toLowerCase() === 'низкая' ||
    tags.includes('dry_tips');

  if (shouldSpray) {
    const lastSprayingDate = getLatestActionDate(logs, CARE_TYPES.SPRAYING);
    const sprayingIntervalDays = guideEntry?.sprayingIntervalDays ?? 3;
    taskDates[CARE_TYPES.SPRAYING] = lastSprayingDate
      ? addDays(lastSprayingDate, sprayingIntervalDays)
      : todayString();

    reasons.push('Растению может пригодиться регулярное опрыскивание или контроль влажности воздуха.');
  }

  const shouldFertilize =
    Boolean(guideEntry?.fertilizingIntervalDays) &&
    guideEntry?.name !== 'Кактус' &&
    guideEntry?.name !== 'Алоэ';

  if (shouldFertilize) {
    const lastFertilizingDate = getLatestActionDate(logs, CARE_TYPES.FERTILIZING);
    const fertilizingIntervalDays = guideEntry?.fertilizingIntervalDays ?? 30;

    if (tags.includes('slow_growth') && !lastFertilizingDate) {
      taskDates[CARE_TYPES.FERTILIZING] = todayString();
      reasons.push('При медленном росте стоит проверить, не нужна ли растению подкормка.');
    } else {
      taskDates[CARE_TYPES.FERTILIZING] = lastFertilizingDate
        ? addDays(lastFertilizingDate, fertilizingIntervalDays)
        : addDays(todayString(), fertilizingIntervalDays);
    }
  }

  return {
    taskDates,
    reasons,
  };
}
