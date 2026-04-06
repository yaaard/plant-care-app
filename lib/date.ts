const DATE_REGEXP = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayString(): string {
  return formatDate(new Date());
}

export function parseDateString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function isValidDateString(value: string): boolean {
  if (!DATE_REGEXP.test(value)) {
    return false;
  }

  const parsedDate = parseDateString(value);
  return formatDate(parsedDate) === value;
}

export function addDays(dateString: string, days: number): string {
  const date = parseDateString(dateString);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

export function compareDateStrings(left: string, right: string): number {
  return parseDateString(left).getTime() - parseDateString(right).getTime();
}

export function isDateBeforeToday(value: string): boolean {
  return compareDateStrings(value, todayString()) < 0;
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

export function formatDateLabel(value: string | null, fallback: string = 'Не указана') {
  return value ?? fallback;
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
