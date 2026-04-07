const DATE_REGEXP = /^\d{4}-\d{2}-\d{2}$/;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayString(): string {
  return formatDate(new Date());
}

export function tryParseDateString(value: string | null | undefined): Date | null {
  if (!value || !DATE_REGEXP.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsedDate = new Date(year, month - 1, day, 12, 0, 0, 0);

  return formatDate(parsedDate) === value ? parsedDate : null;
}

export function parseDateString(value: string): Date {
  const parsedDate = tryParseDateString(value);

  if (!parsedDate) {
    throw new Error(`Некорректная дата: ${value}`);
  }

  return parsedDate;
}

export function isValidDateString(value: string): boolean {
  return Boolean(tryParseDateString(value));
}

export function addDays(dateString: string, days: number): string {
  const date = parseDateString(dateString);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

export function compareDateStrings(left: string, right: string): number {
  return parseDateString(left).getTime() - parseDateString(right).getTime();
}

export function differenceInDays(laterDate: string, earlierDate: string): number {
  return Math.round(
    (parseDateString(laterDate).getTime() - parseDateString(earlierDate).getTime()) / DAY_IN_MS
  );
}

export function getDaysSince(dateString: string | null): number | null {
  if (!dateString || !isValidDateString(dateString)) {
    return null;
  }

  return differenceInDays(todayString(), dateString);
}

export function getDaysUntil(dateString: string | null): number | null {
  if (!dateString || !isValidDateString(dateString)) {
    return null;
  }

  return differenceInDays(dateString, todayString());
}

export function isDateBeforeToday(value: string): boolean {
  return isValidDateString(value) && compareDateStrings(value, todayString()) < 0;
}

export function isDateToday(value: string | null): boolean {
  return Boolean(value && isValidDateString(value) && compareDateStrings(value, todayString()) === 0);
}

export function isDateTomorrow(value: string | null): boolean {
  if (!value || !isValidDateString(value)) {
    return false;
  }

  return compareDateStrings(value, addDays(todayString(), 1)) === 0;
}

export function getDateStatusLabel(value: string | null): string {
  if (!value || !isValidDateString(value)) {
    return 'Дата не указана';
  }

  if (isDateToday(value)) {
    return 'Сегодня';
  }

  if (isDateTomorrow(value)) {
    return 'Завтра';
  }

  const daysUntil = getDaysUntil(value);

  if (daysUntil === null) {
    return 'Дата не указана';
  }

  if (daysUntil < 0) {
    return `Просрочено на ${Math.abs(daysUntil)} дн.`;
  }

  return `Через ${daysUntil} дн.`;
}

export function getNextWateringDate(
  lastWateringDate: string | null,
  wateringIntervalDays: number,
  baseDate: string = todayString()
): string {
  const sourceDate =
    lastWateringDate && isValidDateString(lastWateringDate) ? lastWateringDate : baseDate;

  return addDays(sourceDate, wateringIntervalDays);
}

export function formatDateLabel(value: string | null, fallback: string = 'Не указано') {
  return value && isValidDateString(value) ? value : fallback;
}

export function combineDateAndTime(dateString: string, hour: number, minute: number): Date {
  const date = parseDateString(dateString);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function getNotificationDateForTask(
  scheduledDate: string,
  notificationHour: number,
  notificationMinute: number
): Date | null {
  if (!isValidDateString(scheduledDate)) {
    return null;
  }

  const targetDate = combineDateAndTime(scheduledDate, notificationHour, notificationMinute);
  const now = new Date();

  if (targetDate.getTime() > now.getTime()) {
    return targetDate;
  }

  if (compareDateStrings(scheduledDate, todayString()) <= 0) {
    const todayAtConfiguredTime = combineDateAndTime(
      todayString(),
      notificationHour,
      notificationMinute
    );

    if (todayAtConfiguredTime.getTime() > now.getTime()) {
      return todayAtConfiguredTime;
    }

    const oneMinuteLater = new Date(now.getTime() + 60_000);
    oneMinuteLater.setSeconds(0, 0);
    return oneMinuteLater;
  }

  return null;
}
