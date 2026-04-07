export const CARE_TYPES = {
  WATERING: 'watering',
  FERTILIZING: 'fertilizing',
  SPRAYING: 'spraying',
  REPOTTING: 'repotting',
  INSPECTION: 'inspection',
} as const;

export type CareType = (typeof CARE_TYPES)[keyof typeof CARE_TYPES];

export const CARE_TYPE_VALUES: CareType[] = [
  CARE_TYPES.WATERING,
  CARE_TYPES.FERTILIZING,
  CARE_TYPES.SPRAYING,
  CARE_TYPES.REPOTTING,
  CARE_TYPES.INSPECTION,
];

export const CARE_TYPE_LABELS: Record<CareType, string> = {
  watering: 'Полив',
  fertilizing: 'Подкормка',
  spraying: 'Опрыскивание',
  repotting: 'Пересадка',
  inspection: 'Осмотр',
};

export const CARE_TYPE_SORT_ORDER: Record<CareType, number> = {
  watering: 1,
  inspection: 2,
  spraying: 3,
  fertilizing: 4,
  repotting: 5,
};

export const CARE_TYPE_DEFAULT_COMMENTS: Record<CareType, string> = {
  watering: 'Полив отмечен в приложении',
  fertilizing: 'Подкормка отмечена в приложении',
  spraying: 'Опрыскивание отмечено в приложении',
  repotting: 'Пересадка отмечена в приложении',
  inspection: 'Осмотр растения отмечен в приложении',
};

export function getCareTypeLabel(type: CareType): string {
  return CARE_TYPE_LABELS[type];
}
