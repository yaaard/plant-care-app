import { CARE_TYPES } from '@/constants/careTypes';
import { getPlantGuideEntryByName } from '@/constants/plantGuide';
import { getDaysSince, isDateBeforeToday } from '@/lib/date';
import type { CareLog } from '@/types/log';
import { parseConditionTags, type Plant } from '@/types/plant';
import type { PlantGuideEntry } from '@/types/recommendation';
import type { RiskAssessmentResult } from '@/types/risk';
import type { CareTask } from '@/types/task';

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function getLatestActionDate(logs: CareLog[], actionType: CareLog['actionType']): string | null {
  return logs.find((log) => log.actionType === actionType)?.actionDate ?? null;
}

function pushUnique(list: string[], value: string) {
  if (!list.includes(value)) {
    list.push(value);
  }
}

export function buildPlantRiskAssessment(
  plant: Plant,
  tasks: CareTask[] = [],
  logs: CareLog[] = [],
  guideEntry: PlantGuideEntry | null = getPlantGuideEntryByName(plant.species)
): RiskAssessmentResult {
  const tags = parseConditionTags(plant.conditionTags);
  const reasons: string[] = [];
  const recommendations: string[] = [];
  const pendingTasks = tasks.filter((task) => task.isCompleted === 0);
  const overdueTasks = pendingTasks.filter((task) => isDateBeforeToday(task.scheduledDate));
  const overdueWateringTask = overdueTasks.find((task) => task.type === CARE_TYPES.WATERING);
  const daysSinceWatering = getDaysSince(plant.lastWateringDate);
  const daysSinceInspection = getDaysSince(plant.lastInspectionDate);
  const lastFertilizingDate = getLatestActionDate(logs, CARE_TYPES.FERTILIZING);
  const daysSinceFertilizing = getDaysSince(lastFertilizingDate);
  const recommendedWateringInterval =
    guideEntry?.recommendedWateringIntervalDays ?? plant.wateringIntervalDays;
  const guideLightLevel = guideEntry?.lightLevel ?? '';
  const guideHumidityLevel = guideEntry?.humidityLevel ?? '';
  const frequentWatering = plant.wateringIntervalDays <= recommendedWateringInterval - 2;
  const lightMismatch =
    Boolean(plant.lightCondition.trim()) &&
    Boolean(guideLightLevel) &&
    !normalizeText(guideLightLevel).includes(normalizeText(plant.lightCondition)) &&
    !normalizeText(plant.lightCondition).includes(normalizeText(guideLightLevel));
  const humidityMismatch =
    Boolean(plant.humidityCondition.trim()) &&
    Boolean(guideHumidityLevel) &&
    !normalizeText(guideHumidityLevel).includes(normalizeText(plant.humidityCondition)) &&
    !normalizeText(plant.humidityCondition).includes(normalizeText(guideHumidityLevel));

  let score = 0;

  if (overdueTasks.length > 0) {
    score += Math.min(30, overdueTasks.length * 12);
    pushUnique(
      reasons,
      `Есть ${overdueTasks.length} просроченных задач по уходу. Это повышает риск пропустить важные действия.`
    );
    pushUnique(
      recommendations,
      'Сначала закройте просроченные задачи и проверьте текущее состояние растения.'
    );
  }

  if (!plant.lastInspectionDate || (daysSinceInspection !== null && daysSinceInspection > 21)) {
    score += 10;
    pushUnique(reasons, 'Осмотр растения давно не проводился или ещё не фиксировался.');
    pushUnique(recommendations, 'Проведите осмотр листьев, стеблей и поверхности почвы.');
  }

  if (tags.includes('yellow_leaves')) {
    score += 18;
    pushUnique(
      reasons,
      'Пожелтение листьев может указывать на проблемы с режимом полива или освещением.'
    );
    pushUnique(recommendations, 'Проверьте влажность почвы, дренаж и количество света.');
  }

  if (tags.includes('yellow_leaves') && frequentWatering) {
    score += 12;
    pushUnique(
      reasons,
      'При более частом поливе желтеющие листья могут быть признаком перелива.'
    );
    pushUnique(
      recommendations,
      'Рекомендуется обратить внимание на переувлажнение и состояние корней.'
    );
  }

  if (tags.includes('dry_tips')) {
    score += 14;
    pushUnique(
      reasons,
      'Сухие кончики листьев часто связаны с сухим воздухом или нерегулярным поливом.'
    );
    pushUnique(
      recommendations,
      'Проверьте влажность воздуха и, если нужно, добавьте опрыскивание.'
    );
  }

  if (tags.includes('brown_spots')) {
    score += 15;
    pushUnique(
      reasons,
      'Коричневые пятна требуют внимания к освещению, влажности и состоянию листьев.'
    );
    pushUnique(
      recommendations,
      'Осмотрите листья и убедитесь, что растение не получает ожоги.'
    );
  }

  if (tags.includes('wilting')) {
    score += 20;
    pushUnique(
      reasons,
      'Поникшее состояние говорит о стрессе и требует проверки полива и условий содержания.'
    );
    pushUnique(
      recommendations,
      'Проверьте влажность почвы и не спешите поливать без проверки грунта.'
    );
  }

  if (
    tags.includes('wilting') &&
    (overdueWateringTask ||
      daysSinceWatering === null ||
      (daysSinceWatering ?? 0) >= plant.wateringIntervalDays)
  ) {
    score += 12;
    pushUnique(reasons, 'Есть риск, что растению не хватает влаги.');
    pushUnique(
      recommendations,
      'В первую очередь оцените сухость почвы и тургор листьев.'
    );
  }

  if (tags.includes('slow_growth')) {
    score += 10;
    pushUnique(
      reasons,
      'Медленный рост может быть связан с нехваткой света, питания или сезонным замедлением.'
    );
    pushUnique(
      recommendations,
      'Проверьте освещение, режим подкормки и общее состояние корневой системы.'
    );
  }

  if (lightMismatch) {
    score += 10;
    pushUnique(
      reasons,
      'Текущий уровень освещения отличается от справочного ориентира для этого вида.'
    );
    pushUnique(
      recommendations,
      'Стоит проверить, подходит ли текущая позиция растения по свету.'
    );
  }

  if (humidityMismatch) {
    score += 10;
    pushUnique(
      reasons,
      'Фактическая влажность воздуха отличается от условий, которые обычно подходят виду.'
    );
    pushUnique(
      recommendations,
      'Рекомендуется обратить внимание на влажность воздуха и вентиляцию.'
    );
  }

  if (daysSinceFertilizing !== null && daysSinceFertilizing > 45 && !tags.includes('healthy')) {
    score += 8;
    pushUnique(
      reasons,
      'Подкормка давно не проводилась, а растение показывает признаки стресса.'
    );
    pushUnique(
      recommendations,
      'Если сезон подходит, стоит проверить, нужна ли растению подкормка.'
    );
  }

  if (tags.includes('healthy') && tags.length === 1 && overdueTasks.length === 0) {
    score = Math.max(0, score - 10);
    pushUnique(
      recommendations,
      'Сохраняйте стабильный режим ухода и периодически проводите осмотр.'
    );
  }

  const riskLevel = score >= 55 ? 'high' : score >= 25 ? 'medium' : 'low';

  const summary =
    riskLevel === 'high'
      ? 'Есть повышенный риск проблем с уходом. Лучше проверить растение и условия содержания в ближайшее время.'
      : riskLevel === 'medium'
        ? 'Есть несколько факторов, на которые стоит обратить внимание. Ситуация пока управляемая, но лучше не откладывать проверку.'
        : 'Состояние выглядит относительно стабильным. Продолжайте регулярный уход и профилактический осмотр.';

  return {
    riskLevel,
    score: Math.min(100, Math.max(0, score)),
    summary,
    reasons: reasons.slice(0, 5),
    recommendations: recommendations.slice(0, 5),
  };
}
