import type { DayTimeDuration, FeelDuration, YearMonthDuration } from '../types.js';

// ISO 8601 duration regex
// Matches: P[n]Y[n]M  or  P[n]DT[n]H[n]M[n]S  (with optional leading minus)
const YM_RE = /^(-?)P(?:(\d+)Y)?(?:(\d+)M)?$/;
const DT_RE = /^(-?)P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d*)?)S)?)?$/;

export function parseDuration(str: string): FeelDuration | null {
  const ymMatch = YM_RE.exec(str);
  if (ymMatch && (ymMatch[2] !== undefined || ymMatch[3] !== undefined)) {
    const neg = ymMatch[1] === '-';
    const years = parseInt(ymMatch[2] ?? '0', 10);
    const months = parseInt(ymMatch[3] ?? '0', 10);
    return normalizeYM(neg ? -years : years, neg ? -months : months);
  }

  const dtMatch = DT_RE.exec(str);
  if (
    dtMatch &&
    (dtMatch[2] !== undefined ||
      dtMatch[3] !== undefined ||
      dtMatch[4] !== undefined ||
      dtMatch[5] !== undefined)
  ) {
    const neg = dtMatch[1] === '-';
    const days = parseInt(dtMatch[2] ?? '0', 10);
    const hours = parseInt(dtMatch[3] ?? '0', 10);
    const minutes = parseInt(dtMatch[4] ?? '0', 10);
    const secFull = parseFloat(dtMatch[5] ?? '0');
    const seconds = Math.trunc(secFull);
    const nanoseconds = Math.round((secFull - seconds) * 1_000_000_000);
    if (neg) {
      return makeDT(-days, -hours, -minutes, -seconds, -nanoseconds);
    }
    return normalizeDT(makeDT(days, hours, minutes, seconds, nanoseconds));
  }

  return null;
}

// Normalize -0 to 0 (JavaScript quirk: -0 !== 0 in Object.is)
const n0 = (n: number) => (n === 0 ? 0 : n);

export function makeYM(years: number, months: number): YearMonthDuration {
  return { kind: 'year-month', years: n0(years), months: n0(months) };
}

// Carry months overflow into years (e.g. 14M → 1Y2M)
export function normalizeYM(years: number, months: number): YearMonthDuration {
  const totalMonths = years * 12 + months;
  const neg = totalMonths < 0;
  const absTotal = Math.abs(totalMonths);
  const ny = Math.floor(absTotal / 12);
  const nm = absTotal % 12;
  return makeYM(neg ? -ny : ny, neg ? -nm : nm);
}

export function makeDT(
  days: number,
  hours: number,
  minutes: number,
  seconds: number,
  nanoseconds: number,
): DayTimeDuration {
  return {
    kind: 'day-time',
    days: n0(days),
    hours: n0(hours),
    minutes: n0(minutes),
    seconds: n0(seconds),
    nanoseconds: n0(nanoseconds),
  };
}

export function formatDuration(d: FeelDuration): string {
  if (d.kind === 'year-month') {
    const neg = d.years < 0 || d.months < 0;
    const y = Math.abs(d.years);
    const m = Math.abs(d.months);
    const parts: string[] = [];
    if (y > 0) parts.push(`${y}Y`);
    if (m > 0) parts.push(`${m}M`);
    if (parts.length === 0) parts.push('0Y');
    return `${neg ? '-' : ''}P${parts.join('')}`;
  }

  // day-time
  const neg = d.days < 0 || d.hours < 0 || d.minutes < 0 || d.seconds < 0 || d.nanoseconds < 0;
  const days = Math.abs(d.days);
  const hours = Math.abs(d.hours);
  const minutes = Math.abs(d.minutes);
  const seconds = Math.abs(d.seconds);
  const nanos = Math.abs(d.nanoseconds);

  let result = `${neg ? '-' : ''}P`;
  if (days > 0) result += `${days}D`;

  const timeParts: string[] = [];
  if (hours > 0) timeParts.push(`${hours}H`);
  if (minutes > 0) timeParts.push(`${minutes}M`);
  if (seconds > 0 || nanos > 0) {
    if (nanos > 0) {
      const fracStr = String(nanos).padStart(9, '0').replace(/0+$/, '');
      timeParts.push(`${seconds}.${fracStr}S`);
    } else {
      timeParts.push(`${seconds}S`);
    }
  }

  if (timeParts.length > 0) {
    result += `T${timeParts.join('')}`;
  }

  if (result === 'P' || result === '-P') {
    result += '0D';
  }

  return result;
}

export function negateDuration(d: FeelDuration): FeelDuration {
  if (d.kind === 'year-month') {
    return makeYM(-d.years, -d.months);
  }
  return makeDT(-d.days, -d.hours, -d.minutes, -d.seconds, -d.nanoseconds);
}

export function absDuration(d: FeelDuration): FeelDuration {
  if (d.kind === 'year-month') {
    const neg = d.years < 0 || (d.years === 0 && d.months < 0);
    return neg ? negateDuration(d) : d;
  }
  const neg =
    d.days < 0 ||
    (d.days === 0 && d.hours < 0) ||
    (d.days === 0 && d.hours === 0 && d.minutes < 0) ||
    (d.days === 0 && d.hours === 0 && d.minutes === 0 && d.seconds < 0) ||
    (d.days === 0 && d.hours === 0 && d.minutes === 0 && d.seconds === 0 && d.nanoseconds < 0);
  return neg ? negateDuration(d) : d;
}

export function addDurations(a: FeelDuration, b: FeelDuration): FeelDuration | null {
  if (a.kind !== b.kind) return null;
  if (a.kind === 'year-month' && b.kind === 'year-month') {
    return normalizeYM(a.years + b.years, a.months + b.months);
  }
  if (a.kind === 'day-time' && b.kind === 'day-time') {
    return normalizeDT(
      makeDT(
        a.days + b.days,
        a.hours + b.hours,
        a.minutes + b.minutes,
        a.seconds + b.seconds,
        a.nanoseconds + b.nanoseconds,
      ),
    );
  }
  return null;
}

export function subtractDurations(a: FeelDuration, b: FeelDuration): FeelDuration | null {
  if (a.kind !== b.kind) return null;
  if (a.kind === 'year-month' && b.kind === 'year-month') {
    return normalizeYM(a.years - b.years, a.months - b.months);
  }
  if (a.kind === 'day-time' && b.kind === 'day-time') {
    return normalizeDT(
      makeDT(
        a.days - b.days,
        a.hours - b.hours,
        a.minutes - b.minutes,
        a.seconds - b.seconds,
        a.nanoseconds - b.nanoseconds,
      ),
    );
  }
  return null;
}

export function multiplyDuration(d: FeelDuration, n: number): FeelDuration {
  if (d.kind === 'year-month') {
    const totalMonths = d.years * 12 + d.months;
    const result = Math.trunc(totalMonths * n);
    return normalizeYM(0, result);
  }
  const totalNanos =
    (d.days * 86400 + d.hours * 3600 + d.minutes * 60 + d.seconds) * 1_000_000_000 + d.nanoseconds;
  return normalizeDT(makeDT(0, 0, 0, 0, Math.trunc(totalNanos * n)));
}

export function divideDuration(d: FeelDuration, n: number): FeelDuration {
  return multiplyDuration(d, 1 / n);
}

// Normalize duration so each component is in canonical range
export function normalizeDT(d: DayTimeDuration): DayTimeDuration {
  let totalNanos =
    (d.days * 86400 + d.hours * 3600 + d.minutes * 60 + d.seconds) * 1_000_000_000 + d.nanoseconds;
  const neg = totalNanos < 0;
  totalNanos = Math.abs(totalNanos);

  const ns = totalNanos % 1_000_000_000;
  let totalSec = Math.floor(totalNanos / 1_000_000_000);
  const secs = totalSec % 60;
  totalSec = Math.floor(totalSec / 60);
  const mins = totalSec % 60;
  totalSec = Math.floor(totalSec / 60);
  const hrs = totalSec % 24;
  const days = Math.floor(totalSec / 24);

  const sign = neg ? -1 : 1;
  return makeDT(sign * days, sign * hrs, sign * mins, sign * secs, sign * ns);
}

// Compare two durations of same type. Returns <0, 0, >0
export function compareDurations(a: FeelDuration, b: FeelDuration): number | null {
  if (a.kind !== b.kind) return null;

  if (a.kind === 'year-month' && b.kind === 'year-month') {
    const aM = a.years * 12 + a.months;
    const bM = b.years * 12 + b.months;
    return aM - bM;
  }

  if (a.kind === 'day-time' && b.kind === 'day-time') {
    const toNanos = (d: DayTimeDuration) =>
      (d.days * 86400 + d.hours * 3600 + d.minutes * 60 + d.seconds) * 1_000_000_000 +
      d.nanoseconds;
    return toNanos(a) - toNanos(b);
  }

  return null;
}
