export const CARE_TYPES = {
  WATERING: 'watering',
} as const;

export const CARE_TYPE_LABELS: Record<(typeof CARE_TYPES)[keyof typeof CARE_TYPES], string> = {
  watering: 'Полив',
};
