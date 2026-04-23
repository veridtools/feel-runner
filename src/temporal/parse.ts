import type { FeelDate, FeelDateTime, FeelTime } from '../types.js';

const DATE_RE = /^(-?\d{4,})-(\d{2})-(\d{2})$/;
const TIME_RE =
  /^(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:Z|([+-]\d{2}):(\d{2})(?::(\d{2}))?|@(.+))?$/;
const DATETIME_RE =
  /^(-?\d{4,})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:Z|([+-]\d{2}):(\d{2})(?::(\d{2}))?|@(.+))?$/;

function parseFrac(s: string | undefined): number {
  if (!s) return 0;
  // pad/trim to 9 digits for nanoseconds
  const padded = s.slice(0, 9).padEnd(9, '0');
  return parseInt(padded, 10);
}

function parseOffset(
  sign: string | undefined,
  hh: string | undefined,
  mm: string | undefined,
  ss: string | undefined,
): number | null {
  if (sign === undefined) return null;
  const s = sign === '+' ? 1 : -1;
  const h = parseInt(hh ?? '0', 10);
  const m = parseInt(mm ?? '0', 10);
  const sec = parseInt(ss ?? '0', 10);
  return s * (h * 3600 + m * 60 + sec);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isValidIANATimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function parseDate(str: string): FeelDate | null {
  const m = DATE_RE.exec(str);
  if (!m) return null;
  const yearStr = m[1]!;
  // Positive years: no leading zeros beyond exactly 4 digits (e.g. "00099" invalid, "99999" valid)
  if (!yearStr.startsWith('-') && yearStr.length > 4 && yearStr[0] === '0') return null;
  const year = parseInt(yearStr, 10);
  if (Math.abs(year) > 999999999) return null;
  const month = parseInt(m[2]!, 10);
  const day = parseInt(m[3]!, 10);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { kind: 'date', year, month, day };
}

export function parseTime(str: string): FeelTime | null {
  const m = TIME_RE.exec(str);
  if (!m) return null;
  const isZ = str.includes('Z');
  const timezone = m[8] ?? null;
  if (timezone !== null && !isValidIANATimezone(timezone)) return null;
  const offset = isZ ? 0 : parseOffset(m[5]?.[0], m[5]?.slice(1), m[6], m[7]);
  if (offset !== null && (offset > 64800 || offset < -64800)) return null;
  return {
    kind: 'time',
    hour: parseInt(m[1]!, 10),
    minute: parseInt(m[2]!, 10),
    second: parseInt(m[3]!, 10),
    nanosecond: parseFrac(m[4]),
    offset,
    timezone,
  };
}

export function parseDateTime(str: string): FeelDateTime | null {
  const m = DATETIME_RE.exec(str);
  if (!m) return null;
  const yearStr = m[1]!;
  if (!yearStr.startsWith('-') && yearStr.length > 4 && yearStr[0] === '0') return null;
  const yearVal = parseInt(yearStr, 10);
  if (Math.abs(yearVal) > 999999999) return null;
  const month = parseInt(m[2]!, 10);
  const day = parseInt(m[3]!, 10);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(yearVal, month)) return null;
  const hour = parseInt(m[4]!, 10);
  const minute = parseInt(m[5]!, 10);
  const second = parseInt(m[6]!, 10);
  if (minute > 59 || second > 59) return null;
  if (hour > 24) return null;
  if (hour === 24 && (minute !== 0 || second !== 0)) return null;
  const isZ = str.endsWith('Z');
  const timezone = m[11] ?? null;
  if (timezone !== null && !isValidIANATimezone(timezone)) return null;
  const offset = isZ ? 0 : parseOffset(m[8]?.[0], m[8]?.slice(1), m[9], m[10]);
  if (offset !== null && (offset > 64800 || offset < -64800)) return null;
  const nanosecond = parseFrac(m[7]);
  let year = yearVal;
  // T24:00:00 = start of next day
  if (hour === 24) {
    const d = new Date(Date.UTC(year, month - 1, day + 1));
    year = d.getUTCFullYear();
    const nextMonth = d.getUTCMonth() + 1;
    const nextDay = d.getUTCDate();
    return {
      kind: 'date-time',
      year,
      month: nextMonth,
      day: nextDay,
      hour: 0,
      minute: 0,
      second: 0,
      nanosecond,
      offset,
      timezone,
    };
  }
  return {
    kind: 'date-time',
    year,
    month,
    day,
    hour,
    minute,
    second,
    nanosecond,
    offset,
    timezone,
  };
}
