import { describe, expect, it } from 'vitest';
import { evaluate } from '../index.js';

describe('builtins/temporal', () => {
  describe('date()', () => {
    it('from string', () => {
      expect(evaluate('date("2024-01-15")').value).toMatchObject({ year: 2024, month: 1, day: 15 });
      expect(evaluate('date("2024-12-31")').value).toMatchObject({
        year: 2024,
        month: 12,
        day: 31,
      });
    });

    it('from year, month, day', () => {
      expect(evaluate('date(2024, 1, 15)').value).toMatchObject({ year: 2024, month: 1, day: 15 });
    });

    it('from date-time', () => {
      expect(evaluate('date(date and time("2024-01-15T10:30:00"))').value).toMatchObject({
        year: 2024,
        month: 1,
        day: 15,
      });
    });

    it('null string returns null', () => {
      expect(evaluate('date("invalid")').value).toBeNull();
    });
  });

  describe('time()', () => {
    it('from string', () => {
      expect(evaluate('time("10:30:00")').value).toMatchObject({ hour: 10, minute: 30, second: 0 });
      expect(evaluate('time("00:00:00")').value).toMatchObject({ hour: 0, minute: 0, second: 0 });
    });

    it('from hour, minute, second', () => {
      expect(evaluate('time(10, 30, 0)').value).toMatchObject({ hour: 10, minute: 30, second: 0 });
    });

    it('from date-time extracts time', () => {
      expect(evaluate('time(date and time("2024-01-15T10:30:00"))').value).toMatchObject({
        hour: 10,
        minute: 30,
      });
    });

    it('with offset', () => {
      expect(evaluate('time("10:30:00+02:00")').value).toMatchObject({ hour: 10, minute: 30 });
    });
  });

  describe('date and time()', () => {
    it('from string', () => {
      expect(evaluate('date and time("2024-01-15T10:30:00")').value).toMatchObject({
        year: 2024,
        month: 1,
        day: 15,
        hour: 10,
      });
    });

    it('from date and time', () => {
      expect(evaluate('date and time(date("2024-01-15"), time("10:30:00"))').value).toMatchObject({
        year: 2024,
        hour: 10,
      });
    });

    it('from date-only string defaults time to 00:00:00', () => {
      const dt = evaluate('date and time("2024-01-15")').value as Record<string, unknown>;
      expect(dt?.hour).toBe(0);
    });
  });

  describe('duration()', () => {
    it('year-month duration', () => {
      expect(evaluate('duration("P1Y2M")').value).toMatchObject({
        kind: 'year-month',
        years: 1,
        months: 2,
      });
    });

    it('day-time duration', () => {
      expect(evaluate('duration("P1DT2H3M4S")').value).toMatchObject({
        kind: 'day-time',
        days: 1,
        hours: 2,
        minutes: 3,
        seconds: 4,
      });
    });

    it('negative duration', () => {
      expect(evaluate('duration("-P1Y")').value).toMatchObject({ years: -1 });
    });

    it('invalid string returns null', () => {
      expect(evaluate('duration("invalid")').value).toBeNull();
    });
  });

  describe('years and months duration()', () => {
    it('between two dates', () => {
      expect(
        evaluate('years and months duration(date("2020-01-01"), date("2024-06-01"))').value,
      ).toMatchObject({ years: 4, months: 5 });
    });

    it('same date = P0Y0M', () => {
      expect(
        evaluate('years and months duration(date("2024-01-01"), date("2024-01-01"))').value,
      ).toMatchObject({ years: 0, months: 0 });
    });

    it('backward in time = negative', () => {
      const result = evaluate('years and months duration(date("2024-01-01"), date("2020-01-01"))')
        .value as Record<string, unknown>;
      expect(Number(result?.years)).toBeLessThan(0);
    });
  });

  describe('day of week()', () => {
    it('known days', () => {
      expect(evaluate('day of week(date("2024-01-15"))').value).toBe('Monday');
      expect(evaluate('day of week(date("2024-01-14"))').value).toBe('Sunday');
      expect(evaluate('day of week(date("2024-01-20"))').value).toBe('Saturday');
    });

    it('works with date-time', () => {
      expect(evaluate('day of week(date and time("2024-01-15T12:00:00"))').value).toBe('Monday');
    });

    it('null returns null', () => {
      expect(evaluate('day of week(null)').value).toBeNull();
    });
  });

  describe('day of year()', () => {
    it('first and last day', () => {
      expect(evaluate('day of year(date("2024-01-01"))').value).toBe(1);
      expect(evaluate('day of year(date("2024-12-31"))').value).toBe(366);
    });

    it('mid year', () => {
      expect(evaluate('day of year(date("2024-02-01"))').value).toBe(32);
    });
  });

  describe('week of year()', () => {
    it('first week', () => {
      expect(evaluate('week of year(date("2024-01-01"))').value).toBe(1);
    });

    it('various weeks', () => {
      expect(evaluate('week of year(date("2024-06-15"))').value).toBeGreaterThan(0);
    });
  });

  describe('month of year()', () => {
    it('returns month name', () => {
      expect(evaluate('month of year(date("2024-01-15"))').value).toBe('January');
      expect(evaluate('month of year(date("2024-03-15"))').value).toBe('March');
      expect(evaluate('month of year(date("2024-12-15"))').value).toBe('December');
    });

    it('null returns null', () => {
      expect(evaluate('month of year(null)').value).toBeNull();
    });
  });

  describe('temporal property access via path', () => {
    it('date properties', () => {
      expect(evaluate('date("2024-01-15").year').value).toBe(2024);
      expect(evaluate('date("2024-01-15").month').value).toBe(1);
      expect(evaluate('date("2024-01-15").day').value).toBe(15);
      expect(evaluate('date("2024-01-15").weekday').value).toBe(1);
    });

    it('time properties', () => {
      expect(evaluate('time("10:30:15").hour').value).toBe(10);
      expect(evaluate('time("10:30:15").minute').value).toBe(30);
      expect(evaluate('time("10:30:15").second').value).toBe(15);
    });

    it('duration properties (year-month)', () => {
      expect(evaluate('duration("P1Y2M").years').value).toBe(1);
      expect(evaluate('duration("P1Y2M").months').value).toBe(2);
    });

    it('duration properties (day-time)', () => {
      expect(evaluate('duration("P1DT2H30M").days').value).toBe(1);
      expect(evaluate('duration("P1DT2H30M").hours').value).toBe(2);
      expect(evaluate('duration("P1DT2H30M").minutes').value).toBe(30);
    });

    it('negative duration properties', () => {
      expect(evaluate('duration("-P1D").days').value).toBe(-1);
    });
  });

  describe('date and time path properties .date and .time', () => {
    it('.date extracts the date part', () => {
      const d = evaluate('date and time("2024-01-15T10:30:00").date').value as Record<
        string,
        unknown
      >;
      expect(d?.kind).toBe('date');
      expect(d?.year).toBe(2024);
      expect(d?.month).toBe(1);
      expect(d?.day).toBe(15);
    });

    it('.time extracts the time part', () => {
      const t = evaluate('date and time("2024-01-15T10:30:00").time').value as Record<
        string,
        unknown
      >;
      expect(t?.kind).toBe('time');
      expect(t?.hour).toBe(10);
      expect(t?.minute).toBe(30);
      expect(t?.second).toBe(0);
    });

    it('.offset returns a day-time duration for datetime with offset', () => {
      const off = evaluate('date and time("2024-01-15T10:30:00+02:00").offset').value as Record<
        string,
        unknown
      >;
      expect(off?.kind).toBe('day-time');
      expect(off?.hours).toBe(2);
    });

    it('.offset returns null for datetime without offset', () => {
      expect(evaluate('date and time("2024-01-15T10:30:00").offset').value).toBeNull();
    });

    it('.date from composed date and time', () => {
      const d = evaluate('date and time(date("2024-06-15"), time("08:00:00")).date')
        .value as Record<string, unknown>;
      expect(d?.month).toBe(6);
      expect(d?.day).toBe(15);
    });
  });

  describe('time zone property', () => {
    it('.time zone returns timezone string', () => {
      expect(evaluate('time("10:30:00@Europe/Paris").time zone').value).toBe('Europe/Paris');
    });

    it('.time zone on datetime', () => {
      expect(evaluate('date and time("2024-01-15T10:00:00@UTC").time zone').value).toBe('UTC');
    });

    it('.time zone returns null when no timezone', () => {
      expect(evaluate('time("10:30:00").time zone').value).toBeNull();
    });

    it('.time offset for time with numeric offset', () => {
      const off = evaluate('time("10:30:00+02:00").time offset').value as Record<string, unknown>;
      expect(off?.hours).toBe(2);
    });
  });

  describe('leap year validation', () => {
    it('Feb 29 in leap year is valid', () => {
      expect(evaluate('date("2024-02-29")').value).toMatchObject({ year: 2024, month: 2, day: 29 });
    });

    it('Feb 29 in non-leap year returns null', () => {
      expect(evaluate('date("2023-02-29")').value).toBeNull();
    });

    it('Feb 29 in century non-leap year returns null', () => {
      expect(evaluate('date("1900-02-29")').value).toBeNull();
    });

    it('Feb 29 in 400-year cycle leap year is valid', () => {
      expect(evaluate('date("2000-02-29")').value).toMatchObject({ year: 2000, month: 2, day: 29 });
    });

    it('April 31 is invalid', () => {
      expect(evaluate('date("2024-04-31")').value).toBeNull();
    });

    it('January 31 is valid', () => {
      expect(evaluate('date("2024-01-31")').value).toMatchObject({ day: 31 });
    });
  });

  describe('date construction edge cases', () => {
    it('month 0 is invalid', () => {
      expect(evaluate('date("2024-00-01")').value).toBeNull();
    });

    it('month 13 is invalid', () => {
      expect(evaluate('date("2024-13-01")').value).toBeNull();
    });

    it('day 0 is invalid', () => {
      expect(evaluate('date("2024-01-00")').value).toBeNull();
    });

    it('day 32 is invalid', () => {
      expect(evaluate('date("2024-01-32")').value).toBeNull();
    });

    it('April 31 is invalid', () => {
      expect(evaluate('date("2024-04-31")').value).toBeNull();
    });

    it('June 31 is invalid', () => {
      expect(evaluate('date("2024-06-31")').value).toBeNull();
    });

    it('Feb 29 in non-leap century year 2100 is invalid', () => {
      expect(evaluate('date("2100-02-29")').value).toBeNull();
    });
  });

  describe('time construction edge cases', () => {
    it('hour 24 is invalid', () => {
      expect(evaluate('time("24:00:00")').value).toBeNull();
    });

    it('minute 60 is invalid', () => {
      expect(evaluate('time("10:60:00")').value).toBeNull();
    });

    it('second 60 is invalid', () => {
      expect(evaluate('time("10:00:60")').value).toBeNull();
    });

    it('hour 0 is valid', () => {
      expect(evaluate('time("00:00:00")').value).toMatchObject({ hour: 0, minute: 0, second: 0 });
    });

    it('hour 23 is valid', () => {
      expect(evaluate('time("23:59:59")').value).toMatchObject({
        hour: 23,
        minute: 59,
        second: 59,
      });
    });
  });

  describe('temporal arithmetic edge cases', () => {
    it('Jan 31 + P1M → Feb 28 (month boundary)', () => {
      const r = evaluate('date("2024-01-31") + duration("P1M")').value as Record<string, unknown>;
      expect(r?.month).toBe(2);
      expect(Number(r?.day)).toBeLessThanOrEqual(29);
    });

    it('date - date = day-time duration with positive days', () => {
      const r = evaluate('date("2024-03-10") - date("2024-03-01")').value as Record<
        string,
        unknown
      >;
      expect(r?.kind).toBe('day-time');
      expect(r?.days).toBe(9);
    });

    it('date + duration crossing year boundary', () => {
      const r = evaluate('date("2024-12-15") + duration("P1M")').value as Record<string, unknown>;
      expect(r?.year).toBe(2025);
      expect(r?.month).toBe(1);
    });

    it('year-month + day-time is null (incompatible types)', () => {
      expect(evaluate('duration("P1Y") + duration("P1D")').value).toBeNull();
    });

    it('time + duration crossing midnight wraps', () => {
      const r = evaluate('time("23:00:00") + duration("PT2H")').value as Record<string, unknown>;
      expect(r?.hour).toBe(1);
    });

    it('duration / duration returns number', () => {
      expect(evaluate('duration("P4D") / duration("P2D")').value).toBe(2);
    });

    it('year-month duration / year-month duration', () => {
      expect(evaluate('duration("P4Y") / duration("P2Y")').value).toBe(2);
    });
  });

  describe('calendar edge cases', () => {
    it('day of year for Feb 29 in leap year is 60', () => {
      expect(evaluate('day of year(date("2024-02-29"))').value).toBe(60);
    });

    it('week of year for Jan 1 returns valid week number', () => {
      const w = evaluate('week of year(date("2024-01-01"))').value as number;
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(53);
    });

    it('day of week for each day of the week', () => {
      expect(evaluate('day of week(date("2024-01-15"))').value).toBe('Monday');
      expect(evaluate('day of week(date("2024-01-16"))').value).toBe('Tuesday');
      expect(evaluate('day of week(date("2024-01-17"))').value).toBe('Wednesday');
      expect(evaluate('day of week(date("2024-01-18"))').value).toBe('Thursday');
      expect(evaluate('day of week(date("2024-01-19"))').value).toBe('Friday');
      expect(evaluate('day of week(date("2024-01-20"))').value).toBe('Saturday');
      expect(evaluate('day of week(date("2024-01-21"))').value).toBe('Sunday');
    });

    it('month of year for each month', () => {
      const months = [
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
      for (let i = 0; i < 12; i++) {
        const m = String(i + 1).padStart(2, '0');
        expect(evaluate(`month of year(date("2024-${m}-01"))`).value).toBe(months[i]);
      }
    });
  });

  describe('duration edge cases', () => {
    it('P0Y0M is valid year-month duration', () => {
      expect(evaluate('duration("P0Y0M")').value).toMatchObject({
        kind: 'year-month',
        years: 0,
        months: 0,
      });
    });

    it('PT0S is valid day-time duration', () => {
      expect(evaluate('duration("PT0S")').value).toMatchObject({ kind: 'day-time', seconds: 0 });
    });

    it('negative day-time duration comparison', () => {
      expect(evaluate('duration("-P1D") < duration("P0D")').value).toBe(true);
    });

    it('duration equality: P1Y = P12M', () => {
      expect(evaluate('duration("P1Y") = duration("P12M")').value).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('today() returns a date', () => {
      const r = evaluate('today()').value as Record<string, unknown>;
      expect(r?.kind).toBe('date');
      expect(typeof r?.year).toBe('number');
    });

    it('now() returns a datetime', () => {
      const r = evaluate('now()').value as Record<string, unknown>;
      expect(r?.kind).toBe('date-time');
    });

    it('day-time duration equality: P1D = PT24H', () => {
      expect(evaluate('duration("P1D") = duration("PT24H")').value).toBe(true);
    });

    it('cross-timezone datetime comparison', () => {
      expect(
        evaluate(
          'date and time("2024-01-01T10:00:00+02:00") = date and time("2024-01-01T08:00:00Z")',
        ).value,
      ).toBe(true);
    });

    it('duration comparison', () => {
      expect(evaluate('duration("P1Y") > duration("P6M")').value).toBe(true);
    });
  });

  describe('temporal arithmetic', () => {
    it('date + duration', () => {
      const result = evaluate('date("2024-01-15") + duration("P1M")').value as Record<
        string,
        unknown
      >;
      expect(result?.month).toBe(2);
    });

    it('date - date = days duration', () => {
      const result = evaluate('date("2024-01-15") - date("2024-01-01")').value as Record<
        string,
        unknown
      >;
      expect(result?.kind).toBe('day-time');
    });

    it('date comparison', () => {
      expect(evaluate('date("2024-01-15") > date("2024-01-01")').value).toBe(true);
      expect(evaluate('date("2024-01-01") = date("2024-01-01")').value).toBe(true);
    });

    it('duration arithmetic', () => {
      const result = evaluate('duration("P1Y") + duration("P2M")').value as Record<string, unknown>;
      expect(result?.years).toBe(1);
      expect(result?.months).toBe(2);
    });
  });
});
