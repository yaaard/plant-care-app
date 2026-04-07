import type { PlantConditionTag } from '@/types/plant';
import type { PlantGuideEntry } from '@/types/recommendation';

export const PLANT_GUIDE: PlantGuideEntry[] = [
  {
    id: 'ficus',
    name: 'Фикус',
    recommendedWateringIntervalDays: 7,
    lightLevel: 'яркий рассеянный свет',
    humidityLevel: 'средняя',
    temperatureRange: '18-25°C',
    careTips:
      'Поливайте после подсыхания верхнего слоя почвы и периодически протирайте листья от пыли.',
    riskNotes:
      'Частые переливы и холодные сквозняки нередко приводят к пожелтению и сбросу листьев.',
  },
  {
    id: 'spathiphyllum',
    name: 'Спатифиллум',
    recommendedWateringIntervalDays: 4,
    lightLevel: 'полутень',
    humidityLevel: 'высокая',
    temperatureRange: '18-26°C',
    careTips:
      'Поддерживайте равномерную влажность почвы и более влажный воздух, особенно в отопительный сезон.',
    riskNotes:
      'Сухой воздух и пересушивание субстрата часто вызывают подсыхание кончиков листьев.',
  },
  {
    id: 'cactus',
    name: 'Кактус',
    recommendedWateringIntervalDays: 14,
    lightLevel: 'прямой свет',
    humidityLevel: 'низкая',
    temperatureRange: '18-30°C',
    careTips:
      'Поливайте редко, только после заметного просыхания грунта. Для кактусов опаснее перелив, чем краткая засуха.',
    riskNotes:
      'Переувлажнение и отсутствие дренажа быстрее всего приводят к загниванию корней.',
  },
  {
    id: 'sansevieria',
    name: 'Сансевиерия',
    recommendedWateringIntervalDays: 12,
    lightLevel: 'полутень',
    humidityLevel: 'низкая',
    temperatureRange: '18-28°C',
    careTips:
      'Сансевиерия хорошо переносит сухой воздух и не любит переувлажнение. Поливайте умеренно.',
    riskNotes:
      'При частом поливе и холодной почве может появляться вялость и потемнение основания листьев.',
  },
  {
    id: 'aloe',
    name: 'Алоэ',
    recommendedWateringIntervalDays: 10,
    lightLevel: 'яркий рассеянный свет',
    humidityLevel: 'низкая',
    temperatureRange: '18-28°C',
    careTips:
      'Поливайте после просыхания грунта и держите растение ближе к светлому окну.',
    riskNotes:
      'Недостаток света приводит к вытягиванию, а слишком частый полив может вызывать мягкость листьев.',
  },
  {
    id: 'monstera',
    name: 'Монстера',
    recommendedWateringIntervalDays: 6,
    lightLevel: 'яркий рассеянный свет',
    humidityLevel: 'высокая',
    temperatureRange: '20-28°C',
    careTips:
      'Монстера любит стабильную влажность воздуха, рассеянный свет и умеренный регулярный полив.',
    riskNotes:
      'В сухом воздухе и при нехватке света листья мельчают, а края могут подсыхать.',
  },
  {
    id: 'orchid',
    name: 'Орхидея',
    recommendedWateringIntervalDays: 7,
    lightLevel: 'яркий рассеянный свет',
    humidityLevel: 'средняя',
    temperatureRange: '18-24°C',
    careTips:
      'Следите, чтобы корни просыхали между поливами, и не оставляйте воду в точке роста.',
    riskNotes:
      'Застой воды, плотный субстрат и холодное содержание повышают риск гнилей.',
  },
];

export const LIGHT_CONDITION_OPTIONS = [
  'яркий рассеянный свет',
  'полутень',
  'прямой свет',
  'тень',
] as const;

export const HUMIDITY_CONDITION_OPTIONS = ['низкая', 'средняя', 'высокая'] as const;

export const CONDITION_TAG_OPTIONS: Array<{ value: PlantConditionTag; label: string }> = [
  { value: 'healthy', label: 'Выглядит здоровым' },
  { value: 'yellow_leaves', label: 'Желтеют листья' },
  { value: 'dry_tips', label: 'Сухие кончики' },
  { value: 'brown_spots', label: 'Коричневые пятна' },
  { value: 'wilting', label: 'Поникшее состояние' },
  { value: 'slow_growth', label: 'Медленный рост' },
];

export function getPlantGuideEntryByName(name: string): PlantGuideEntry | null {
  const normalizedName = name.trim().toLowerCase();

  return PLANT_GUIDE.find((item) => item.name.toLowerCase() === normalizedName) ?? null;
}

export function getConditionTagLabel(tag: PlantConditionTag): string {
  return CONDITION_TAG_OPTIONS.find((item) => item.value === tag)?.label ?? tag;
}
