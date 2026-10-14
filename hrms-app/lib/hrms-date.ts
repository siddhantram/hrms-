export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === value ? date : null;
}

export function parseTimeOnDate(date: Date, value: string | null | undefined): Date | null {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;

  const [hours, minutes] = value.split(":").map(Number);
  const result = new Date(date);
  result.setUTCHours(hours, minutes, 0, 0);
  return result;
}

export function elapsedHours(start: Date, end: Date): number {
  let milliseconds = end.getTime() - start.getTime();
  if (milliseconds < 0) milliseconds += 24 * 60 * 60 * 1000;
  return Number((milliseconds / (60 * 60 * 1000)).toFixed(2));
}

export function countWorkingDays(start: Date, end: Date, holidays: string[] = []): number {
  if (start.getTime() > end.getTime()) return 0;

  const holidaySet = new Set(holidays);
  const current = new Date(start);
  let days = 0;

  while (current.getTime() <= end.getTime()) {
    const weekday = current.getUTCDay();
    const dateKey = current.toISOString().slice(0, 10);
    if (weekday !== 0 && weekday !== 6 && !holidaySet.has(dateKey)) days += 1;
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}

export function clockTime(date: Date | null): string | null {
  if (!date) return null;
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}