import { CARE_TYPE_VALUES } from '@/constants/careTypes';
import { PLANT_CONDITION_TAG_VALUES, parseConditionTags } from '@/types/plant';
import { differenceInDays, todayString } from '@/lib/date';
import { getLogs } from '@/lib/logs-repo';
import { getPlants } from '@/lib/plants-repo';
import { getPendingTasks } from '@/lib/tasks-repo';
import type { CareTaskType } from '@/types/task';
import type { PlantConditionTag } from '@/types/plant';
import type { RiskLevel } from '@/types/risk';

export interface StatsSnapshot {
  actionsLast7Days: number;
  wateringsLast30Days: number;
  riskCounts: Record<RiskLevel, number>;
  overdueTasks: number;
  symptomCounts: { tag: PlantConditionTag; count: number }[];
  careTypeUsage: { type: CareTaskType; count: number }[];
}

export async function getStatsSnapshot(): Promise<StatsSnapshot> {
  const [plants, logs, pendingTasks] = await Promise.all([getPlants(), getLogs(), getPendingTasks()]);
  const today = todayString();

  const actionsLast7Days = logs.filter((log) => {
    const diff = differenceInDays(today, log.actionDate);
    return diff >= 0 && diff <= 7;
  }).length;
  const wateringsLast30Days = logs.filter(
    (log) => {
      const diff = differenceInDays(today, log.actionDate);
      return log.actionType === 'watering' && diff >= 0 && diff <= 30;
    }
  ).length;

  const riskCounts: Record<RiskLevel, number> = {
    low: 0,
    medium: 0,
    high: 0,
  };

  plants.forEach((plant) => {
    riskCounts[plant.riskLevel] += 1;
  });

  const overdueTasks = pendingTasks.filter((task) => task.scheduledDate < today).length;

  const symptomCounts = PLANT_CONDITION_TAG_VALUES.map((tag) => ({
    tag,
    count: plants.filter((plant) => parseConditionTags(plant.conditionTags).includes(tag)).length,
  }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count);

  const careTypeUsage = CARE_TYPE_VALUES.map((type) => ({
    type,
    count: logs.filter((log) => log.actionType === type).length,
  }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count);

  return {
    actionsLast7Days,
    wateringsLast30Days,
    riskCounts,
    overdueTasks,
    symptomCounts,
    careTypeUsage,
  };
}
