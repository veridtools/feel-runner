import { asDecimal, D, isNum } from '../decimal.js';
import {
  formatDateTimeWithPattern,
  formatDateWithPattern,
  formatTimeWithPattern,
  parseDateTimeWithFormat,
  parseDateWithFormat,
  parseTimeWithFormat,
} from '../temporal/custom-format.js';
import { parseDuration } from '../temporal/duration.js';
import {
  dayOfWeekName,
  dayOfYear,
  daysInMonth,
  monthOfYear,
  now as nowFn,
  parseDate,
  parseDateTime,
  parseTime,
  today as todayFn,
  weekOfYear,
  yearsAndMonthsBetween,
} from '../temporal/index.js';
import type { FeelDate, FeelDateTime, FeelValue } from '../types.js';
import {
  isDayTimeDuration,
  isFeelDate,
  isFeelDateTime,
  isFeelTime,
  isYearMonthDuration,
} from '../types.js';

export const temporalBuiltins: Record<string, (args: FeelValue[]) => FeelValue> = {
  date(args) {
    const [a = null, b = null, c = null] = args;
    if (typeof a === 'string' && typeof b === 'string') return parseDateWithFormat(a, b);
    if (typeof a === 'string') return parseDate(a);
    if (isFeelDate(a)) return a;
    if (isFeelDateTime(a)) {
      return { kind: 'date', year: a.year, month: a.month, day: a.day };
    }
    // Named form: date(year: y, month: m, day: d) → from=undefined, year=b, month=c, day=args[3]
    const isNamed = (a === undefined || a === null) && isNum(b);
    const yearN = isNamed ? b : a;
    const monthN = isNamed ? c : b;
    const dayN = isNamed ? args[3] : c;
    if (isNum(yearN) && isNum(monthN) && isNum(dayN)) {
      const y = asDecimal(yearN)!.toNumber();
      const mo = asDecimal(monthN)!.toNumber();
      const d = asDecimal(dayN)!.toNumber();
      if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(d)) return null;
      if (Math.abs(y) > 999999999) return null;
      if (mo < 1 || mo > 12) return null;
      if (d < 1 || d > daysInMonth(y, mo)) return null;
      return { kind: 'date', year: y, month: mo, day: d };
    }
    return null;
  },

  time(args) {
    const [a = null, b = null, c = null, d = null] = args;
    if (typeof a === 'string' && typeof b === 'string') return parseTimeWithFormat(a, b);
    if (typeof a === 'string') {
      const t = parseTime(a);
      if (!t) return null;
      if (t.hour > 23 || t.minute > 59 || t.second > 59) return null;
      return t;
    }
    if (isFeelDateTime(a)) {
      return {
        kind: 'time',
        hour: a.hour,
        minute: a.minute,
        second: a.second,
        nanosecond: a.nanosecond,
        offset: a.offset,
        timezone: a.timezone,
      };
    }
    if (isFeelDate(a)) {
      return {
        kind: 'time',
        hour: 0,
        minute: 0,
        second: 0,
        nanosecond: 0,
        offset: 0,
        timezone: null,
      };
    }
    // Named form: time(hour: h, minute: m, second: s[, offset: o]) → a=undefined, b=h, c=m, d=s, args[4]=o
    // Positional form: time(h, m, s[, o]) → a=h, b=m, c=s, d=o
    const isNamed = (a === undefined || a === null) && isNum(b);
    const hourN = isNamed ? b : a;
    const minN = isNamed ? c : b;
    const secN = isNamed ? d : c;
    const offsetArg = isNamed ? (args[4] ?? null) : d;
    if (isNum(hourN) && isNum(minN) && isNum(secN)) {
      const h = asDecimal(hourN)!.toNumber();
      const m = asDecimal(minN)!.toNumber();
      const sRaw = asDecimal(secN)!.toNumber();
      let offset: number | null = null;
      const timezone: string | null = null;
      if (offsetArg !== undefined && offsetArg !== null) {
        if (typeof offsetArg === 'string') {
          offset = parseOffsetString(offsetArg);
        } else if (isDayTimeDuration(offsetArg)) {
          const sign =
            offsetArg.days < 0 ||
            offsetArg.hours < 0 ||
            offsetArg.minutes < 0 ||
            offsetArg.seconds < 0
              ? -1
              : 1;
          offset =
            sign *
            (Math.abs(offsetArg.days) * 86400 +
              Math.abs(offsetArg.hours) * 3600 +
              Math.abs(offsetArg.minutes) * 60 +
              Math.abs(offsetArg.seconds));
        } else if (isFeelDateTime(offsetArg)) {
          offset = offsetArg.offset;
        }
      }
      const seconds = Math.trunc(sRaw);
      const nanosecond = Math.round((sRaw - seconds) * 1_000_000_000);
      if (h > 23 || m > 59 || seconds > 59 || h < 0 || m < 0 || seconds < 0) return null;
      return { kind: 'time', hour: h, minute: m, second: seconds, nanosecond, offset, timezone };
    }
    return null;
  },

  'date and time'(args) {
    const [a = null, b = null, c = null] = args;
    // date and time(string, format, locale?) — custom format parsing
    if (typeof a === 'string' && typeof b === 'string' && (c === null || typeof c === 'string')) {
      // Only treat as format if 'b' looks like a format pattern (not an ISO time string)
      if (!/^\d{2}:/.test(b))
        return parseDateTimeWithFormat(a, b, typeof c === 'string' ? c : 'en');
    }
    if (typeof a === 'string' && b === null) {
      const dt = parseDateTime(a);
      if (dt) return dt;
      // Fallback: try parsing as date-only, default time to 00:00:00
      const d = parseDate(a);
      if (d)
        return {
          kind: 'date-time',
          year: d.year,
          month: d.month,
          day: d.day,
          hour: 0,
          minute: 0,
          second: 0,
          nanosecond: 0,
          offset: null,
          timezone: null,
        };
      return null;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      const date = parseDate(a);
      const time = parseTime(b);
      if (!date || !time) return null;
      return {
        kind: 'date-time',
        year: date.year,
        month: date.month,
        day: date.day,
        hour: time.hour,
        minute: time.minute,
        second: time.second,
        nanosecond: time.nanosecond,
        offset: time.offset,
        timezone: time.timezone,
      } satisfies FeelDateTime;
    }
    if (isFeelDate(a) && isFeelTime(b)) {
      return {
        kind: 'date-time',
        year: a.year,
        month: a.month,
        day: a.day,
        hour: b.hour,
        minute: b.minute,
        second: b.second,
        nanosecond: b.nanosecond,
        offset: b.offset,
        timezone: b.timezone,
      } satisfies FeelDateTime;
    }
    if (isFeelDateTime(a) && isFeelTime(b)) {
      return {
        kind: 'date-time',
        year: a.year,
        month: a.month,
        day: a.day,
        hour: b.hour,
        minute: b.minute,
        second: b.second,
        nanosecond: b.nanosecond,
        offset: b.offset,
        timezone: b.timezone,
      } satisfies FeelDateTime;
    }
    return null;
  },

  duration([str = null]) {
    if (typeof str !== 'string') return null;
    return parseDuration(str);
  },

  'years and months duration'([from = null, to = null]) {
    const asDate = (v: FeelValue): FeelDate | null => {
      if (isFeelDate(v)) return v;
      if (isFeelDateTime(v)) return { kind: 'date', year: v.year, month: v.month, day: v.day };
      if (typeof v === 'string') return parseDate(v);
      return null;
    };
    const f = asDate(from);
    const t = asDate(to);
    if (!f || !t) return null;
    return yearsAndMonthsBetween(f, t);
  },

  now(args) {
    if (args.length > 0) return null;
    return nowFn();
  },

  today(args) {
    if (args.length > 0) return null;
    return todayFn();
  },

  'day of week'(args) {
    if (args.length !== 1) return null;
    const [d = null] = args;
    if (isFeelDate(d)) return dayOfWeekName(d);
    if (isFeelDateTime(d))
      return dayOfWeekName({ kind: 'date', year: d.year, month: d.month, day: d.day });
    return null;
  },

  'day of year'(args) {
    if (args.length !== 1) return null;
    const [d = null] = args;
    if (isFeelDate(d)) return D(dayOfYear(d));
    if (isFeelDateTime(d))
      return D(dayOfYear({ kind: 'date', year: d.year, month: d.month, day: d.day }));
    return null;
  },

  'week of year'(args) {
    if (args.length !== 1) return null;
    const [d = null] = args;
    if (isFeelDate(d)) return D(weekOfYear(d));
    if (isFeelDateTime(d))
      return D(weekOfYear({ kind: 'date', year: d.year, month: d.month, day: d.day }));
    return null;
  },

  'month of year'(args) {
    if (args.length !== 1) return null;
    const [d = null] = args;
    if (isFeelDate(d)) return monthOfYear(d);
    if (isFeelDateTime(d))
      return monthOfYear({ kind: 'date', year: d.year, month: d.month, day: d.day });
    return null;
  },

  'format date'(args) {
    const [d = null, fmt = null, locale = null] = args;
    if (typeof fmt !== 'string') return null;
    const loc = typeof locale === 'string' ? locale : 'en';
    if (isFeelDate(d)) return formatDateWithPattern(d, fmt, loc);
    if (isFeelDateTime(d))
      return formatDateWithPattern(
        { kind: 'date', year: d.year, month: d.month, day: d.day },
        fmt,
        loc,
      );
    return null;
  },

  'format time'(args) {
    const [t = null, fmt = null, locale = null] = args;
    if (typeof fmt !== 'string') return null;
    const loc = typeof locale === 'string' ? locale : 'en';
    if (isFeelTime(t)) return formatTimeWithPattern(t, fmt, loc);
    if (isFeelDateTime(t))
      return formatTimeWithPattern(
        {
          kind: 'time',
          hour: t.hour,
          minute: t.minute,
          second: t.second,
          nanosecond: t.nanosecond,
          offset: t.offset,
          timezone: t.timezone,
        },
        fmt,
        loc,
      );
    return null;
  },

  'format date and time'(args) {
    const [dt = null, fmt = null, locale = null] = args;
    if (typeof fmt !== 'string') return null;
    const loc = typeof locale === 'string' ? locale : 'en';
    if (isFeelDateTime(dt)) return formatDateTimeWithPattern(dt, fmt, loc);
    return null;
  },

  // Standalone temporal property accessors (FEEL spec §10.3.4.4)
  // These mirror path-expression access (a.year, a.hours, etc.) as function calls.
  year([v = null]) {
    if (isFeelDate(v) || isFeelDateTime(v)) return D(v.year);
    return null;
  },
  month([v = null]) {
    if (isFeelDate(v) || isFeelDateTime(v)) return D(v.month);
    return null;
  },
  day([v = null]) {
    if (isFeelDate(v) || isFeelDateTime(v)) return D(v.day);
    return null;
  },
  hour([v = null]) {
    if (isFeelTime(v) || isFeelDateTime(v)) return D(v.hour);
    return null;
  },
  minute([v = null]) {
    if (isFeelTime(v) || isFeelDateTime(v)) return D(v.minute);
    return null;
  },
  second([v = null]) {
    if (isFeelTime(v) || isFeelDateTime(v)) {
      return v.nanosecond !== 0 ? D(v.second + v.nanosecond / 1_000_000_000) : D(v.second);
    }
    return null;
  },
  years([v = null]) {
    if (isYearMonthDuration(v)) return D(v.years);
    return null;
  },
  months([v = null]) {
    if (isYearMonthDuration(v)) return D(v.months);
    return null;
  },
  days([v = null]) {
    if (isDayTimeDuration(v)) return D(v.days);
    return null;
  },
  hours([v = null]) {
    if (isDayTimeDuration(v)) return D(v.hours);
    return null;
  },
  minutes([v = null]) {
    if (isDayTimeDuration(v)) return D(v.minutes);
    return null;
  },
  seconds([v = null]) {
    if (isDayTimeDuration(v)) {
      return v.nanoseconds !== 0 ? D(v.seconds + v.nanoseconds / 1_000_000_000) : D(v.seconds);
    }
    return null;
  },
};

function parseOffsetString(s: string): number | null {
  const m = /^([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (!m) return null;
  const sign = m[1] === '+' ? 1 : -1;
  return sign * (parseInt(m[2]!, 10) * 3600 + parseInt(m[3]!, 10) * 60 + parseInt(m[4] ?? '0', 10));
}
