import { dayOfWeek } from '../temporal/calendar.js';
import type { FeelValue } from '../types.js';
import {
  isDayTimeDuration,
  isFeelContext,
  isFeelDate,
  isFeelDateTime,
  isFeelRange,
  isFeelTime,
  isYearMonthDuration,
} from '../types.js';
import type { EvalContext } from './types.js';

export function getProperty(obj: FeelValue, path: string, ctx: EvalContext): FeelValue {
  if (obj === null) return null;

  if (isFeelDate(obj)) {
    switch (path) {
      case 'year':
        return obj.year;
      case 'month':
        return obj.month;
      case 'day':
        return obj.day;
      case 'weekday':
        return dayOfWeek(obj);
      default:
        return null;
    }
  }

  if (isFeelTime(obj)) {
    switch (path) {
      case 'hour':
        return obj.hour;
      case 'minute':
        return obj.minute;
      case 'second':
        return obj.second;
      case 'nanosecond':
        return obj.nanosecond;
      case 'time offset':
        return obj.offset !== null
          ? {
              kind: 'day-time' as const,
              days: 0,
              hours: Math.floor(obj.offset / 3600),
              minutes: Math.floor((obj.offset % 3600) / 60),
              seconds: obj.offset % 60,
              nanoseconds: 0,
            }
          : null;
      case 'time zone':
        return obj.timezone;
      case 'timezone':
        return obj.timezone;
      default:
        return null;
    }
  }

  if (isFeelDateTime(obj)) {
    switch (path) {
      case 'year':
        return obj.year;
      case 'month':
        return obj.month;
      case 'day':
        return obj.day;
      case 'weekday':
        return dayOfWeek({ kind: 'date', year: obj.year, month: obj.month, day: obj.day });
      case 'hour':
        return obj.hour;
      case 'minute':
        return obj.minute;
      case 'second':
        return obj.second;
      case 'nanosecond':
        return obj.nanosecond;
      case 'date':
        return { kind: 'date' as const, year: obj.year, month: obj.month, day: obj.day };
      case 'time':
        return {
          kind: 'time' as const,
          hour: obj.hour,
          minute: obj.minute,
          second: obj.second,
          nanosecond: obj.nanosecond,
          offset: obj.offset,
          timezone: obj.timezone,
        };
      case 'time offset':
        return obj.offset !== null
          ? {
              kind: 'day-time' as const,
              days: 0,
              hours: Math.floor(obj.offset / 3600),
              minutes: Math.floor((obj.offset % 3600) / 60),
              seconds: obj.offset % 60,
              nanoseconds: 0,
            }
          : null;
      case 'time zone':
        return obj.timezone;
      case 'timezone':
        return obj.timezone;
      case 'offset':
        return obj.offset !== null
          ? {
              kind: 'day-time' as const,
              days: 0,
              hours: Math.floor(obj.offset / 3600),
              minutes: Math.floor((obj.offset % 3600) / 60),
              seconds: obj.offset % 60,
              nanoseconds: 0,
            }
          : null;
      default:
        return null;
    }
  }

  if (isYearMonthDuration(obj)) {
    switch (path) {
      case 'years':
        return obj.years;
      case 'months':
        return obj.months;
      case 'days':
        return null;
      case 'hours':
        return null;
      case 'minutes':
        return null;
      case 'seconds':
        return null;
      default:
        return null;
    }
  }

  if (isDayTimeDuration(obj)) {
    switch (path) {
      case 'days':
        return obj.days;
      case 'hours':
        return obj.hours;
      case 'minutes':
        return obj.minutes;
      case 'seconds':
        return obj.seconds;
      case 'years':
        return null;
      case 'months':
        return null;
      default:
        return null;
    }
  }

  if (Array.isArray(obj)) {
    return (obj as FeelValue[]).map((item) => getProperty(item, path, ctx));
  }

  if (isFeelRange(obj)) {
    switch (path) {
      case 'start included':
        return obj.startIncluded;
      case 'start':
        return obj.start;
      case 'end included':
        return obj.endIncluded;
      case 'end':
        return obj.end;
      default:
        return null;
    }
  }

  if (isFeelContext(obj)) {
    if (path in obj) return obj[path] ?? null;
    return null;
  }

  return null;
}
