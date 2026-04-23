import type { FeelDate, FeelDateTime } from '../types.js';
import { dateToDays } from './arithmetic.js';

export function today(): FeelDate {
  const d = new Date();
  return { kind: 'date', year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function now(): FeelDateTime {
  const d = new Date();
  const offset = -d.getTimezoneOffset() * 60;
  return {
    kind: 'date-time',
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
    second: d.getSeconds(),
    nanosecond: d.getMilliseconds() * 1_000_000,
    offset,
    timezone: null,
  };
}

export function dayOfWeek(d: FeelDate): number {
  // 1 = Monday, 7 = Sunday (ISO 8601); JDN % 7 == 0 → Monday
  const jdn = dateToDays(d);
  return (((jdn % 7) + 7) % 7) + 1;
}

export function dayOfYear(d: FeelDate): number {
  const jan1 = dateToDays({ kind: 'date', year: d.year, month: 1, day: 1 });
  return dateToDays(d) - jan1 + 1;
}

export function weekOfYear(d: FeelDate): number {
  // ISO 8601 week number — Thursday-based algorithm
  const date = new Date(d.year, d.month - 1, d.day);
  // Move to Thursday of the same ISO week
  const tmp = new Date(date.valueOf());
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
  // Jan 1 of the ISO year
  const yearStart = new Date(tmp.getFullYear(), 0, 1);
  return Math.ceil(((tmp.valueOf() - yearStart.valueOf()) / 86400000 + 1) / 7);
}

export function monthOfYear(d: FeelDate): string {
  const names = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return names[d.month - 1]!;
}

export function dayOfWeekName(d: FeelDate): string {
  const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return names[dayOfWeek(d) - 1]!;
}
