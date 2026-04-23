import type {
  DayTimeDuration,
  FeelDate,
  FeelDateTime,
  FeelTime,
  YearMonthDuration,
} from '../types.js';
import { makeDT, makeYM, normalizeDT } from './duration.js';

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  const days = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (m === 2 && isLeapYear(y)) return 29;
  return days[m]!;
}

// Day number from year 0 (used for date arithmetic)
export function dateToDays(d: FeelDate): number {
  let { year, month, day } = d;
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524;
}

export function daysToDate(jdn: number): FeelDate {
  let l = jdn + 68569;
  const n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l) / 2447);
  const day = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const month = j + 2 - 12 * l;
  const year = 100 * (n - 49) + i + l;
  return { kind: 'date', year, month, day };
}

export function addDateAndYM(d: FeelDate, ym: YearMonthDuration): FeelDate {
  let year = d.year + ym.years;
  let month = d.month + ym.months;
  while (month > 12) {
    month -= 12;
    year++;
  }
  while (month < 1) {
    month += 12;
    year--;
  }
  const maxDay = daysInMonth(year, month);
  const day = Math.min(d.day, maxDay);
  return { kind: 'date', year, month, day };
}

export function addDateAndDT(d: FeelDate, dt: DayTimeDuration): FeelDate {
  const totalSec = dt.days * 86400 + dt.hours * 3600 + dt.minutes * 60 + dt.seconds;
  const deltaDays = Math.trunc(totalSec / 86400);
  const remSec = totalSec - deltaDays * 86400;
  return daysToDate(dateToDays(d) + deltaDays + (remSec < 0 ? -1 : 0));
}

export function subtractDates(a: FeelDate, b: FeelDate): DayTimeDuration {
  const diff = dateToDays(a) - dateToDays(b);
  return makeDT(diff, 0, 0, 0, 0);
}

export function yearsAndMonthsBetween(a: FeelDate, b: FeelDate): YearMonthDuration {
  // Total months difference
  let totalMonths = (b.year - a.year) * 12 + (b.month - a.month);
  // Adjust for partial month: if day of b hasn't reached day of a, the last month is incomplete
  if (totalMonths > 0 && b.day < a.day) totalMonths--;
  else if (totalMonths < 0 && b.day > a.day) totalMonths++;
  const years = Math.trunc(totalMonths / 12);
  const months = totalMonths - years * 12;
  return makeYM(years, months);
}

function namedTzOffsetMs(timezone: string, utcMs: number): number {
  // For dates outside Intl's reliable range (pre-year-100 or BCE), use a proxy modern date
  const MIN_RELIABLE_MS = Date.UTC(100, 0, 1);
  const probeMs =
    utcMs < MIN_RELIABLE_MS
      ? Date.UTC(
          2000,
          new Date(utcMs).getUTCMonth(),
          Math.max(1, new Date(utcMs).getUTCDate()),
          new Date(utcMs).getUTCHours(),
          new Date(utcMs).getUTCMinutes(),
          new Date(utcMs).getUTCSeconds(),
        )
      : utcMs;
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(probeMs));
    const p = (t: string) => parseInt(parts.find((x) => x.type === t)!.value, 10);
    return (
      Date.UTC(p('year'), p('month') - 1, p('day'), p('hour'), p('minute'), p('second')) - probeMs
    );
  } catch {
    return 0;
  }
}

export function dateTimeToEpochMs(dt: FeelDateTime): number {
  if (dt.timezone !== null) {
    // Local time in named timezone → convert to UTC
    const approxUtc = Date.UTC(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second);
    const offset1 = namedTzOffsetMs(dt.timezone, approxUtc);
    const utcMs = approxUtc - offset1;
    // Refine once for DST edge cases
    const offset2 = namedTzOffsetMs(dt.timezone, utcMs);
    return approxUtc - offset2 + dt.nanosecond / 1_000_000;
  }
  const utcOffset = dt.offset ?? 0;
  const d = Date.UTC(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second);
  return d - utcOffset * 1000 + dt.nanosecond / 1_000_000;
}

export function addDateTimeAndDT(dt: FeelDateTime, dur: DayTimeDuration): FeelDateTime {
  const norm = normalizeDT(dur);
  const totalNanos =
    (norm.days * 86400 + norm.hours * 3600 + norm.minutes * 60 + norm.seconds) * 1_000_000_000 +
    norm.nanoseconds;

  const ms = dateTimeToEpochMs(dt) + totalNanos / 1_000_000;

  if (dt.timezone !== null) {
    const tzOffsetMs2 = namedTzOffsetMs(dt.timezone, ms);
    const localMs2 = ms + tzOffsetMs2;
    const localDate2 = new Date(localMs2);
    return {
      kind: 'date-time',
      year: localDate2.getUTCFullYear(),
      month: localDate2.getUTCMonth() + 1,
      day: localDate2.getUTCDate(),
      hour: localDate2.getUTCHours(),
      minute: localDate2.getUTCMinutes(),
      second: localDate2.getUTCSeconds(),
      nanosecond: dt.nanosecond,
      offset: null,
      timezone: dt.timezone,
    };
  }

  const offset = dt.offset ?? 0;
  const localMs = ms + offset * 1000;
  const localDate = new Date(localMs);

  return {
    kind: 'date-time',
    year: localDate.getUTCFullYear(),
    month: localDate.getUTCMonth() + 1,
    day: localDate.getUTCDate(),
    hour: localDate.getUTCHours(),
    minute: localDate.getUTCMinutes(),
    second: localDate.getUTCSeconds(),
    nanosecond: dt.nanosecond,
    offset: dt.offset,
    timezone: dt.timezone,
  };
}

export function addDateTimeAndYM(dt: FeelDateTime, ym: YearMonthDuration): FeelDateTime {
  const date = addDateAndYM({ kind: 'date', year: dt.year, month: dt.month, day: dt.day }, ym);
  return { ...dt, year: date.year, month: date.month, day: date.day };
}

export function addTimeAndDT(t: FeelTime, dur: DayTimeDuration): FeelTime {
  const norm = normalizeDT(dur);
  const totalNanos =
    (t.hour * 3600 + t.minute * 60 + t.second) * 1_000_000_000 +
    t.nanosecond +
    (norm.hours * 3600 + norm.minutes * 60 + norm.seconds) * 1_000_000_000 +
    norm.nanoseconds;
  const totalSec = Math.floor(totalNanos / 1_000_000_000);
  const ns = ((totalNanos % 1_000_000_000) + 1_000_000_000) % 1_000_000_000;
  const totalSecMod = ((totalSec % 86400) + 86400) % 86400;
  const hour = Math.floor(totalSecMod / 3600);
  const minute = Math.floor((totalSecMod % 3600) / 60);
  const second = totalSecMod % 60;
  return {
    kind: 'time',
    hour,
    minute,
    second,
    nanosecond: ns,
    offset: t.offset,
    timezone: t.timezone,
  };
}

export function compareDates(a: FeelDate, b: FeelDate): number {
  return dateToDays(a) - dateToDays(b);
}

export function compareTimes(a: FeelTime, b: FeelTime): number {
  // Compare at millisecond precision (per FEEL spec)
  const toMs = (t: FeelTime) =>
    (t.hour * 3600 + t.minute * 60 + t.second) * 1000 +
    Math.floor(t.nanosecond / 1_000_000) -
    (t.offset ?? 0) * 1000;
  return toMs(a) - toMs(b);
}

export function compareDateTimes(a: FeelDateTime, b: FeelDateTime): number {
  // Compare at millisecond precision
  return Math.floor(dateTimeToEpochMs(a)) - Math.floor(dateTimeToEpochMs(b));
}
