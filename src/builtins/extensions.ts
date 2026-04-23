import { asDecimal, D, isDecimal, isNum } from '../decimal.js';
import { dateTimeToEpochMs, daysInMonth } from '../temporal/arithmetic.js';
import { formatDuration } from '../temporal/duration.js';
import { formatDate, formatDateTime, formatTime } from '../temporal/format.js';
import type { EvaluationWarning, FeelDate, FeelDateTime, FeelValue } from '../types.js';
import {
  isDayTimeDuration,
  isFeelContext,
  isFeelDate,
  isFeelDateTime,
  isFeelRange,
  isFeelTime,
  isYearMonthDuration,
} from '../types.js';

// --- String extensions ---

function toJsonValue(v: FeelValue): unknown {
  if (v === null || typeof v === 'boolean') return v;
  if (isDecimal(v)) return v.toNumber();
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return v;
  if (isFeelDate(v)) return formatDate(v);
  if (isFeelTime(v)) return formatTime(v);
  if (isFeelDateTime(v)) return formatDateTime(v);
  if (isYearMonthDuration(v) || isDayTimeDuration(v)) return formatDuration(v);
  if (isFeelRange(v)) return null;
  if (Array.isArray(v)) return (v as FeelValue[]).map(toJsonValue);
  if (isFeelContext(v)) {
    const obj: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) obj[k] = toJsonValue(val);
    return obj;
  }
  return null;
}

function fromJsonValue(v: unknown): FeelValue {
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return v;
  if (typeof v === 'number') return v;
  if (Array.isArray(v)) return v.map(fromJsonValue);
  if (typeof v === 'object') {
    const ctx: Record<string, FeelValue> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>))
      ctx[k] = fromJsonValue(val);
    return ctx;
  }
  return null;
}

export const extensionBuiltins: Record<
  string,
  (args: FeelValue[], warnings: EvaluationWarning[]) => FeelValue
> = {
  // --- String ---

  'is blank'([str]) {
    if (str === null || str === undefined) return true;
    if (typeof str !== 'string') return null;
    return str.trim().length === 0;
  },

  'to base64'([str]) {
    if (typeof str !== 'string') return null;
    return btoa(unescape(encodeURIComponent(str)));
  },

  'from base64'([str]) {
    if (typeof str !== 'string') return null;
    try {
      return decodeURIComponent(escape(atob(str)));
    } catch {
      return null;
    }
  },

  'string format'(args) {
    const [template, ...rest] = args;
    if (typeof template !== 'string') return null;
    let i = 0;
    return template.replace(/\{\}/g, () => {
      const val = rest[i++];
      if (val === undefined) return '{}';
      if (typeof val === 'string') return val;
      return String(val);
    });
  },

  // --- List ---

  'is empty'([list = null]) {
    if (list === null || list === undefined) return true;
    if (!Array.isArray(list)) return null;
    return (list as FeelValue[]).length === 0;
  },

  partition([list = null, size = null]) {
    if (!Array.isArray(list)) return null;
    if (!isNum(size)) return null;
    const n = asDecimal(size)!.toNumber();
    if (!Number.isInteger(n) || n < 1) return null;
    const arr = list as FeelValue[];
    const result: FeelValue[] = [];
    for (let i = 0; i < arr.length; i += n) {
      result.push(arr.slice(i, i + n));
    }
    return result;
  },

  // --- Temporal ---

  'last day of month'(args) {
    const [d = null] = args;
    let year: number, month: number;
    if (isFeelDate(d)) {
      year = d.year;
      month = d.month;
    } else if (isFeelDateTime(d)) {
      year = d.year;
      month = d.month;
    } else return null;
    return D(daysInMonth(year, month));
  },

  'from unix timestamp'([ts = null]) {
    if (!isNum(ts)) return null;
    const secs = asDecimal(ts)!.toNumber();
    const d = new Date(secs * 1000);
    return {
      kind: 'date-time' as const,
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      second: d.getUTCSeconds(),
      nanosecond: 0,
      offset: 0,
      timezone: 'UTC',
    };
  },

  'to unix timestamp'([dt = null]) {
    if (!isFeelDateTime(dt)) {
      if (isFeelDate(dt)) {
        const d: FeelDateTime = {
          kind: 'date-time',
          year: (dt as FeelDate).year,
          month: (dt as FeelDate).month,
          day: (dt as FeelDate).day,
          hour: 0,
          minute: 0,
          second: 0,
          nanosecond: 0,
          offset: 0,
          timezone: 'UTC',
        };
        return D(Math.floor(dateTimeToEpochMs(d) / 1000));
      }
      return null;
    }
    return D(Math.floor(dateTimeToEpochMs(dt) / 1000));
  },

  // --- Utilities ---

  'get or else'([value = null, fallback = null]) {
    return value === null || value === undefined ? (fallback ?? null) : value;
  },

  error([message = null], warnings) {
    const msg = typeof message === 'string' ? message : 'explicit error';
    warnings.push({ code: 'EXPLICIT_ERROR', message: msg });
    return null;
  },

  assert([condition = null, message = null], warnings) {
    if (condition === true) return true;
    const msg = typeof message === 'string' ? message : 'assertion failed';
    warnings.push({ code: 'ASSERTION_FAILED', message: msg });
    return null;
  },

  uuid(_args) {
    return (globalThis as unknown as { crypto: { randomUUID(): string } }).crypto.randomUUID();
  },

  'to json'([value = null]) {
    try {
      return JSON.stringify(toJsonValue(value)) ?? null;
    } catch {
      return null;
    }
  },

  'from json'([str = null]) {
    if (typeof str !== 'string') return null;
    try {
      return fromJsonValue(JSON.parse(str));
    } catch {
      return null;
    }
  },
};
