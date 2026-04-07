import { CARE_TYPES } from '@/constants/careTypes';
import { getPlantGuideEntryByName } from '@/constants/plantGuide';
import { getDaysSince } from '@/lib/date';
import { buildPlantRiskAssessment } from '@/lib/risk-assessment';
import type { CareLog } from '@/types/log';
import { parseConditionTags, type Plant } from '@/types/plant';
import type { PlantGuideEntry, RecommendationResult } from '@/types/recommendation';
import type { RiskAssessmentResult } from '@/types/risk';
import type { CareTask, CareTaskType } from '@/types/task';

type RecommendationInput = {
  plant: Plant;
  tasks?: CareTask[];
  logs?: CareLog[];
  guideEntry?: PlantGuideEntry | null;
  riskAssessment?: RiskAssessmentResult;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function pushUnique(list: string[], value: string) {
  if (!list.includes(value)) {
    list.push(value);
  }
}

function pushTaskType(list: CareTaskType[], value: CareTaskType) {
  if (!list.includes(value)) {
    list.push(value);
  }
}

function getLightAdvice(lightCondition: string, guideEntry: PlantGuideEntry | null) {
  if (!guideEntry) {
    return 'Ориентируйтесь на реакцию растения: вытягивание и бледность часто указывают на нехватку света.';
  }

  const normalizedCurrent = normalizeText(lightCondition);
  const normalizedTarget = normalizeText(guideEntry.lightLevel);

  if (!normalizedCurrent) {
    return `Сверьте текущее место с ориентиром из справочника: ${guideEntry.lightLevel}.`;
  }

  if (normalizedCurrent.includes(normalizedTarget) || normalizedTarget.includes(normalizedCurrent)) {
    return 'Освещение выглядит близким к рекомендуемому для выбранного вида.';
  }

  if (normalizedTarget.includes('яркий') && !normalizedCurrent.includes('яркий')) {
    return 'Света может быть меньше рекомендованного. Стоит проверить, не вытягиваются ли листья и побеги.';
  }

  if (normalizedTarget.includes('полутень') && normalizedCurrent.includes('прямой')) {
    return 'Свет может быть слишком интенсивным. Лучше убедиться, что листья не получают ожогов.';
  }

  if (normalizedTarget.includes('прямой') && !normalizedCurrent.includes('прямой')) {
    return 'Для этого вида обычно нужен более яркий режим. Стоит проверить, хватает ли растению солнца.';
  }

  return `Сравните текущий свет с ориентиром из справочника: ${guideEntry.lightLevel}.`;
}

function getHumidityAdvice(humidityCondition: string, guideEntry: PlantGuideEntry | null) {
  if (!guideEntry) {
    return 'Следите за листьями: сухие кончики и потеря тургора часто связаны с неподходящей влажностью воздуха.';
  }

  const normalizedCurrent = normalizeText(humidityCondition);
  const normalizedTarget = normalizeText(guideEntry.humidityLevel);

  if (!normalizedCurrent) {
    return `Для этого вида обычно подходит влажность: ${guideEntry.humidityLevel}.`;
  }

  if (normalizedCurrent.includes(normalizedTarget) || normalizedTarget.includes(normalizedCurrent)) {
    return 'Влажность воздуха выглядит близкой к рекомендуемой.';
  }

  if (normalizedTarget.includes('высок') && normalizedCurrent.includes('низ')) {
    return 'Воздух может быть слишком сухим. Стоит чаще проверять края листьев и общее состояние растения.';
  }

  if (normalizedTarget.includes('низ') && normalizedCurrent.includes('высок')) {
    return 'Слишком влажный воздух для этого вида не всегда полезен. Проверьте вентиляцию и состояние почвы.';
  }

  return `Сверьте текущую влажность с ориентиром из справочника: ${guideEntry.humidityLevel}.`;
}

export function buildPlantRecommendations({
  plant,
  tasks = [],
  logs = [],
  guideEntry = getPlantGuideEntryByName(plant.species),
  riskAssessment = buildPlantRiskAssessment(plant, tasks, logs, guideEntry),
}: RecommendationInput): RecommendationResult {
  const tags = parseConditionTags(plant.conditionTags);
  const daysSinceWatering = getDaysSince(plant.lastWateringDate);
  const pendingTasks = tasks.filter((task) => task.isCompleted === 0);
  const overdueTasks = pendingTasks.filter((task) => task.scheduledDate < new Date().toISOString().slice(0, 10));
  const suggestedCareTypes: CareTaskType[] = [];
  const riskWarnings = [...riskAssessment.reasons];
  const diagnosisHints: string[] = [];
  const personalizedTips: string[] = [];
  const priorityChecks = [...riskAssessment.recommendations];
  const highlights: string[] = [];

  let wateringAdvice =
    daysSinceWatering === null
      ? 'Последний полив не указан. Начните с проверки влажности почвы перед следующими действиями.'
      : daysSinceWatering >= plant.wateringIntervalDays
        ? 'Срок полива уже близок или наступил. Проверьте влажность грунта и только потом решайте, нужен ли полив прямо сейчас.'
        : 'Текущий режим полива выглядит относительно близким к выбранному интервалу.';

  if (guideEntry?.name === 'Кактус') {
    wateringAdvice =
      'Для кактуса обычно лучше редкий полив после полного просыхания субстрата. Если есть сомнения, безопаснее сначала проверить почву.';
  }

  if (tags.includes('yellow_leaves')) {
    pushUnique(
      diagnosisHints,
      'Желтеющие листья могут быть связаны как с переливом, так и с недостатком света. Стоит проверить оба фактора.'
    );
  }

  if (tags.includes('dry_tips')) {
    pushUnique(
      diagnosisHints,
      'Сухие кончики часто появляются при сухом воздухе. Если это совпадает с низкой влажностью, полезно добавить опрыскивание или другой способ увлажнения.'
    );
    pushTaskType(suggestedCareTypes, CARE_TYPES.SPRAYING);
  }

  if (tags.includes('brown_spots')) {
    pushUnique(
      diagnosisHints,
      'Коричневые пятна могут быть следствием ожогов, стресса от полива или перепадов условий. Лучше провести внимательный осмотр листьев.'
    );
    pushTaskType(suggestedCareTypes, CARE_TYPES.INSPECTION);
  }

  if (tags.includes('wilting')) {
    pushUnique(
      diagnosisHints,
      'Поникшее состояние часто требует проверки влажности почвы и состояния корней. Это не всегда связано только с нехваткой воды.'
    );
  }

  if (tags.includes('slow_growth')) {
    pushUnique(
      diagnosisHints,
      'Медленный рост может быть связан с нехваткой света, питания или естественной сезонностью. Стоит проверить условия комплексно.'
    );
    pushTaskType(suggestedCareTypes, CARE_TYPES.FERTILIZING);
  }

  if (!plant.lastInspectionDate || overdueTasks.some((task) => task.type === CARE_TYPES.INSPECTION)) {
    pushTaskType(suggestedCareTypes, CARE_TYPES.INSPECTION);
    pushUnique(priorityChecks, 'Проведите осмотр листьев, стеблей и поверхности почвы.');
  }

  if (
    normalizeText(plant.humidityCondition) === 'низкая' ||
    tags.includes('dry_tips') ||
    guideEntry?.humidityLevel === 'высокая'
  ) {
    pushUnique(personalizedTips, 'Если воздух в комнате сухой, стоит обратить внимание на опрыскивание и общее увлажнение пространства вокруг растения.');
    pushTaskType(suggestedCareTypes, CARE_TYPES.SPRAYING);
  }

  if (riskAssessment.riskLevel === 'high') {
    pushUnique(priorityChecks, 'Сначала проверьте почву, листья и условия освещения, а затем уже меняйте режим ухода.');
    pushUnique(personalizedTips, 'При высоком риске лучше действовать поэтапно и не менять сразу несколько условий одновременно.');
  }

  if (riskAssessment.riskLevel !== 'low') {
    pushUnique(highlights, `Уровень риска: ${riskAssessment.summary}`);
  }

  if (suggestedCareTypes.length === 0 && pendingTasks.length === 0) {
    pushUnique(personalizedTips, 'Сейчас можно ограничиться профилактическим наблюдением и поддержанием стабильного режима ухода.');
  }

  if (guideEntry?.careTips) {
    pushUnique(personalizedTips, guideEntry.careTips);
  }

  if (guideEntry?.riskNotes) {
    pushUnique(personalizedTips, `Типичный риск для этого вида: ${guideEntry.riskNotes}`);
  }

  if (plant.customCareComment.trim()) {
    pushUnique(personalizedTips, `Учитывайте и собственные наблюдения: ${plant.customCareComment.trim()}`);
  }

  const lightAdvice = getLightAdvice(plant.lightCondition, guideEntry);
  const humidityAdvice = getHumidityAdvice(plant.humidityCondition, guideEntry);

  if (riskWarnings.length === 0) {
    pushUnique(highlights, 'Серьёзных факторов риска сейчас не видно.');
  } else {
    riskWarnings.slice(0, 2).forEach((reason) => pushUnique(highlights, reason));
  }

  if (highlights.length === 0) {
    pushUnique(highlights, 'Полив и базовые условия ухода пока выглядят относительно стабильными.');
  }

  const summary =
    riskAssessment.riskLevel === 'high'
      ? 'Приложение видит несколько факторов риска. Стоит начать с самых заметных симптомов и просроченных задач.'
      : riskAssessment.riskLevel === 'medium'
        ? 'Есть отдельные признаки, которые требуют внимания, но ситуацию можно стабилизировать последовательным уходом.'
        : 'Состояние выглядит спокойным. Рекомендации сейчас в основном профилактические.';

  return {
    summary,
    wateringAdvice,
    lightAdvice,
    humidityAdvice,
    riskWarnings,
    diagnosisHints,
    personalizedTips,
    priorityChecks: priorityChecks.slice(0, 4),
    suggestedCareTypes,
    highlights: highlights.slice(0, 3),
  };
}

export function getRecommendationHighlights(input: RecommendationInput) {
  return buildPlantRecommendations(input).highlights.slice(0, 2);
}
