import { getPlantGuideEntryByName } from '@/constants/plantGuide';
import { getDaysSince } from '@/lib/date';
import { parseConditionTags, type Plant } from '@/types/plant';
import type { PlantGuideEntry, RecommendationResult } from '@/types/recommendation';

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function buildHighlights(params: {
  overdue: boolean;
  possibleOverwatering: boolean;
  possibleDryAir: boolean;
  possibleUnderwatering: boolean;
  lightMismatch: boolean;
}): string[] {
  const highlights: string[] = [];

  if (params.possibleOverwatering) {
    highlights.push('Возможен перелив');
  }

  if (params.possibleUnderwatering) {
    highlights.push('Растению может не хватать воды');
  }

  if (params.possibleDryAir && highlights.length < 2) {
    highlights.push('Стоит проверить влажность воздуха');
  }

  if (params.lightMismatch && highlights.length < 2) {
    highlights.push('Стоит проверить уровень освещения');
  }

  if (highlights.length === 0) {
    highlights.push(params.overdue ? 'Полив близок к сроку' : 'Полив близок к норме');
  }

  return highlights.slice(0, 2);
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

  if (normalizedCurrent.includes(normalizedTarget)) {
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

  if (normalizedCurrent.includes(normalizedTarget)) {
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

function getTemperatureTip(roomTemperature: string, guideEntry: PlantGuideEntry | null) {
  if (!guideEntry || !roomTemperature.trim()) {
    return null;
  }

  const guideNumbers = guideEntry.temperatureRange.match(/\d+/g)?.map(Number) ?? [];
  const currentNumber = Number(roomTemperature.match(/\d+/)?.[0]);

  if (guideNumbers.length < 2 || Number.isNaN(currentNumber)) {
    return null;
  }

  const [minTemp, maxTemp] = guideNumbers;

  if (currentNumber < minTemp) {
    return `Температура может быть ниже комфортной для этого вида. Ориентир: ${guideEntry.temperatureRange}.`;
  }

  if (currentNumber > maxTemp) {
    return `Температура может быть выше рекомендуемой. Для этого вида обычно подходит диапазон ${guideEntry.temperatureRange}.`;
  }

  return `Температура выглядит приемлемой для выбранного вида: ${guideEntry.temperatureRange}.`;
}

function createNeutralAdvice(guideEntry: PlantGuideEntry | null): RecommendationResult {
  const personalizedTips = [
    guideEntry?.careTips ??
      'Продолжайте наблюдать за почвой, освещением и общим состоянием растения.',
  ];

  if (guideEntry?.riskNotes) {
    personalizedTips.push(`Стоит помнить: ${guideEntry.riskNotes}`);
  }

  return {
    summary:
      'Для точного анализа пока мало данных, поэтому приложение даёт только мягкие рекомендации по базовому уходу.',
    wateringAdvice:
      'Оценивайте влажность почвы перед поливом и не ориентируйтесь только на календарь.',
    lightAdvice: guideEntry
      ? `Для вида "${guideEntry.name}" обычно подходит режим: ${guideEntry.lightLevel}.`
      : 'Оцените, хватает ли растению стабильного света без резких перепадов.',
    humidityAdvice: guideEntry
      ? `Ориентир по влажности для этого вида: ${guideEntry.humidityLevel}.`
      : 'Если воздух дома сухой, полезно чаще следить за состоянием листьев.',
    riskWarnings: [],
    diagnosisHints: [],
    personalizedTips,
    highlights: ['Стоит собрать больше данных о состоянии растения'],
  };
}

export function buildPlantRecommendations(
  plant: Plant,
  guideEntry: PlantGuideEntry | null = getPlantGuideEntryByName(plant.species)
): RecommendationResult {
  if (!plant.species && !guideEntry) {
    return createNeutralAdvice(guideEntry);
  }

  const tags = parseConditionTags(plant.conditionTags);
  const daysSinceWatering = getDaysSince(plant.lastWateringDate);
  const recommendedInterval =
    guideEntry?.recommendedWateringIntervalDays ?? plant.wateringIntervalDays;
  const intervalDifference = plant.wateringIntervalDays - recommendedInterval;
  const overdue = daysSinceWatering !== null && daysSinceWatering >= plant.wateringIntervalDays;
  const lightMismatch =
    Boolean(guideEntry?.lightLevel) &&
    Boolean(plant.lightCondition.trim()) &&
    !normalizeText(guideEntry!.lightLevel).includes(normalizeText(plant.lightCondition)) &&
    !normalizeText(plant.lightCondition).includes(normalizeText(guideEntry!.lightLevel));

  const possibleOverwatering =
    intervalDifference <= -3 ||
    (tags.includes('yellow_leaves') && intervalDifference <= -2) ||
    (guideEntry?.name === 'Кактус' && plant.wateringIntervalDays < recommendedInterval);

  const possibleDryAir =
    tags.includes('dry_tips') ||
    (guideEntry?.humidityLevel === 'высокая' && plant.humidityCondition === 'низкая');

  const possibleUnderwatering =
    tags.includes('wilting') &&
    (daysSinceWatering === null || daysSinceWatering >= plant.wateringIntervalDays);

  const riskWarnings: string[] = [];
  const diagnosisHints: string[] = [];
  const personalizedTips: string[] = [];

  let wateringAdvice =
    daysSinceWatering === null
      ? 'Последний полив не указан. Начните с наблюдения за почвой и реакцией растения.'
      : overdue
        ? 'Срок полива уже близок или наступил. Проверьте влажность почвы и состояние листьев.'
        : 'Текущий режим полива выглядит близким к выбранному интервалу.';

  if (guideEntry?.name === 'Кактус') {
    wateringAdvice =
      'Для кактуса обычно лучше редкий полив после полного просыхания субстрата. Важно избегать переувлажнения.';
  }

  if (guideEntry?.name === 'Спатифиллум') {
    personalizedTips.push(
      'Спатифиллум любит более стабильную влажность почвы и воздуха, чем большинство неприхотливых видов.'
    );
  }

  if (possibleOverwatering) {
    riskWarnings.push(
      'Выбранный интервал полива выглядит более частым, чем обычно рекомендуют для этого вида. Стоит проверить, не переувлажняется ли растение.'
    );
  }

  if (intervalDifference >= 5) {
    riskWarnings.push(
      'Выбранный интервал полива заметно длиннее справочного. Если листья теряют тургор, возможно, влаги не хватает.'
    );
  }

  if (tags.includes('yellow_leaves')) {
    diagnosisHints.push(
      possibleOverwatering
        ? 'Желтеющие листья могут быть связаны с переливом. Рекомендуется проверить влажность почвы и дренаж.'
        : 'Желтизна листьев может быть связана и с освещением, и с режимом полива. Полезно оценить оба фактора вместе.'
    );
  }

  if (tags.includes('dry_tips')) {
    diagnosisHints.push(
      'Сухие кончики часто появляются при сухом воздухе или нерегулярном поливе. Стоит оценить влажность воздуха.'
    );
  }

  if (tags.includes('brown_spots')) {
    diagnosisHints.push(
      'Коричневые пятна могут быть связаны с ожогами, переувлажнением или резкими перепадами температуры.'
    );
  }

  if (tags.includes('wilting')) {
    diagnosisHints.push(
      possibleUnderwatering
        ? 'Поникшее состояние может указывать на недостаток воды. Стоит проверить, насколько сухой грунт.'
        : 'Поникание возможно и при переувлажнении. Если почва сырая, лучше не спешить с новым поливом.'
    );
  }

  if (tags.includes('slow_growth')) {
    diagnosisHints.push(
      'Медленный рост часто связан с нехваткой света, тесным горшком или истощением почвы.'
    );
  }

  if (tags.includes('healthy') && tags.length === 1) {
    personalizedTips.push(
      'Растение выглядит стабильным. Сейчас полезнее всего сохранять текущий режим и не делать резких изменений.'
    );
  }

  const lightAdvice = getLightAdvice(plant.lightCondition, guideEntry);
  const humidityAdvice = getHumidityAdvice(plant.humidityCondition, guideEntry);
  const temperatureTip = getTemperatureTip(plant.roomTemperature, guideEntry);

  if (temperatureTip) {
    personalizedTips.push(temperatureTip);
  }

  if (guideEntry?.careTips) {
    personalizedTips.push(guideEntry.careTips);
  }

  if (guideEntry?.riskNotes) {
    personalizedTips.push(`Типичный риск для этого вида: ${guideEntry.riskNotes}`);
  }

  if (plant.customCareComment.trim()) {
    personalizedTips.push(`Учитывайте и свои наблюдения: ${plant.customCareComment.trim()}`);
  }

  if (!guideEntry) {
    personalizedTips.push(
      'Если вид указан необычно, попробуйте выбрать ближайший вариант из справочника для более точных советов.'
    );
  }

  const summary =
    tags.includes('healthy') && tags.length === 1 && riskWarnings.length === 0
      ? 'Сейчас растение выглядит устойчиво. Главная задача — сохранить стабильные условия и не сбивать режим ухода.'
      : riskWarnings.length > 0 || diagnosisHints.length > 0
        ? 'Есть признаки, на которые стоит обратить внимание. Ниже приведены возможные причины и мягкие рекомендации по проверке условий.'
        : 'Условия выглядят относительно стабильными, но полезно периодически сверять уход с особенностями выбранного вида.';

  return {
    summary,
    wateringAdvice,
    lightAdvice,
    humidityAdvice,
    riskWarnings,
    diagnosisHints,
    personalizedTips,
    highlights: buildHighlights({
      overdue,
      possibleOverwatering,
      possibleDryAir,
      possibleUnderwatering,
      lightMismatch,
    }),
  };
}

export function getRecommendationHighlights(
  plant: Plant,
  guideEntry: PlantGuideEntry | null = getPlantGuideEntryByName(plant.species)
) {
  return buildPlantRecommendations(plant, guideEntry).highlights;
}
