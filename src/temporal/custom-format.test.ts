import { describe, expect, it } from 'vitest';
import { evaluate, validate } from '../index.js';

describe('Phase C', () => {
  // ─── C1: date/time/date-and-time with custom format ─────────────────────────

  describe('C1: date(string, format)', () => {
    it('dd.MM.yyyy', () => {
      const r = evaluate('date("18.01.2024", "dd.MM.yyyy")').value as {
        kind: string;
        year: number;
        month: number;
        day: number;
      };
      expect(r.kind).toBe('date');
      expect(r.year).toBe(2024);
      expect(r.month).toBe(1);
      expect(r.day).toBe(18);
    });
    it('dd/MM/yyyy', () => {
      const r = evaluate('date("26/08/2024", "dd/MM/yyyy")').value as {
        day: number;
        month: number;
        year: number;
      };
      expect(r.day).toBe(26);
      expect(r.month).toBe(8);
      expect(r.year).toBe(2024);
    });
    it('MM-dd-yyyy (US)', () => {
      const r = evaluate('date("01-18-2024", "MM-dd-yyyy")').value as {
        day: number;
        month: number;
        year: number;
      };
      expect(r.month).toBe(1);
      expect(r.day).toBe(18);
    });
    it('d/M/yyyy (no zero padding)', () => {
      const r = evaluate('date("5/3/2024", "d/M/yyyy")').value as { day: number; month: number };
      expect(r.day).toBe(5);
      expect(r.month).toBe(3);
    });
    it('2-digit year 00-49 → 2000+', () => {
      const r = evaluate('date("18.01.24", "dd.MM.yy")').value as { year: number };
      expect(r.year).toBe(2024);
    });
    it('2-digit year 50-99 → 1900+', () => {
      const r = evaluate('date("18.01.75", "dd.MM.yy")').value as { year: number };
      expect(r.year).toBe(1975);
    });
    it('month name full (MMMM)', () => {
      const ctx = { s: '18 January 2024' };
      const r = evaluate('date(s, "d MMMM yyyy")', ctx).value as { month: number };
      expect(r.month).toBe(1);
    });
    it('month name abbreviated (MMM)', () => {
      const ctx = { s: '18 Jan 2024' };
      const r = evaluate('date(s, "d MMM yyyy")', ctx).value as { month: number };
      expect(r.month).toBe(1);
    });
    it('month name in pt-BR', () => {
      const ctx = { s: '18 de Janeiro de 2024' };
      const r = evaluate("date(s, \"dd 'de' MMMM 'de' yyyy\")", ctx).value as { month: number };
      expect(r.month).toBe(1);
    });
    it('invalid format returns null', () => {
      expect(evaluate('date("not-a-date", "dd.MM.yyyy")').value).toBeNull();
    });
    it('standard ISO still works (regression)', () => {
      const r = evaluate('date("2024-01-18")').value as { year: number };
      expect(r.year).toBe(2024);
    });
  });

  describe('C1: time(string, format)', () => {
    it("HH'h'mm", () => {
      const r = evaluate('time("14h30", "HH\'h\'mm")').value as { hour: number; minute: number };
      expect(r.hour).toBe(14);
      expect(r.minute).toBe(30);
    });
    it('HH:mm:ss', () => {
      const r = evaluate('time("09:30:45", "HH:mm:ss")').value as {
        hour: number;
        minute: number;
        second: number;
      };
      expect(r.hour).toBe(9);
      expect(r.minute).toBe(30);
      expect(r.second).toBe(45);
    });
    it('h:mm a (12h AM)', () => {
      const r = evaluate('time("9:30 AM", "h:mm a")').value as { hour: number; minute: number };
      expect(r.hour).toBe(9);
      expect(r.minute).toBe(30);
    });
    it('h:mm a (12h PM)', () => {
      const r = evaluate('time("2:30 PM", "h:mm a")').value as { hour: number };
      expect(r.hour).toBe(14);
    });
    it('12 AM = midnight (hour 0)', () => {
      const r = evaluate('time("12:00 AM", "hh:mm a")').value as { hour: number };
      expect(r.hour).toBe(0);
    });
    it('12 PM = noon (hour 12)', () => {
      const r = evaluate('time("12:00 PM", "hh:mm a")').value as { hour: number };
      expect(r.hour).toBe(12);
    });
  });

  describe('C1: date and time(string, format)', () => {
    it('dd/MM/yyyy HH:mm', () => {
      const r = evaluate('date and time("26/08/2024 14:30", "dd/MM/yyyy HH:mm")').value as {
        year: number;
        month: number;
        day: number;
        hour: number;
        minute: number;
      };
      expect(r.year).toBe(2024);
      expect(r.month).toBe(8);
      expect(r.day).toBe(26);
      expect(r.hour).toBe(14);
      expect(r.minute).toBe(30);
    });
    it('standard ISO still works (regression)', () => {
      const r = evaluate('date and time("2024-01-18T10:30:00")').value as { year: number };
      expect(r.year).toBe(2024);
    });
  });

  // ─── C2: format number ───────────────────────────────────────────────────────

  describe('C2: format number(n, picture, locale?)', () => {
    it('basic mask no locale', () => {
      expect(evaluate('format number(1234.56, "#,##0.00")').value).toBe('1,234.56');
    });
    it('integer mask', () => {
      expect(evaluate('format number(42, "000")').value).toBe('042');
    });
    it('pt-BR locale swaps separators', () => {
      expect(evaluate('format number(1234567.89, "#,##0.00", "pt-BR")').value).toBe('1.234.567,89');
    });
    it('de locale swaps separators', () => {
      expect(evaluate('format number(1234.56, "#,##0.00", "de")').value).toBe('1.234,56');
    });
    it('en-US locale keeps default separators', () => {
      expect(evaluate('format number(1234.56, "#,##0.00", "en-US")').value).toBe('1,234.56');
    });
    it('currency prefix', () => {
      expect(evaluate('format number(1234.56, "$#,##0.00")').value).toBe('$1,234.56');
    });
    it('percentage', () => {
      expect(evaluate('format number(0.1234, "0.00%")').value).toBe('12.34%');
    });
    it('null input returns null', () => {
      expect(evaluate('format number(null, "#,##0")').value).toBeNull();
    });
    it('no picture returns null', () => {
      expect(evaluate('format number(42, null)').value).toBeNull();
    });
  });

  // ─── C3: format date / format time / format date and time ───────────────────

  describe('C3: format date(date, format, locale?)', () => {
    it('dd/MM/yyyy', () => {
      expect(evaluate('format date(date("2024-01-18"), "dd/MM/yyyy")').value).toBe('18/01/2024');
    });
    it('d/M/yyyy (no zero)', () => {
      expect(evaluate('format date(date("2024-01-05"), "d/M/yyyy")').value).toBe('5/1/2024');
    });
    it('MMMM d, yyyy (en)', () => {
      expect(evaluate('format date(date("2024-01-18"), "MMMM d, yyyy")').value).toBe(
        'January 18, 2024',
      );
    });
    it('MMM dd, yyyy (abbreviated)', () => {
      expect(evaluate('format date(date("2024-01-18"), "MMM dd, yyyy")').value).toBe(
        'Jan 18, 2024',
      );
    });
    it('pt-BR month name', () => {
      const r = evaluate(
        'format date(date("2024-01-18"), "dd \'de\' MMMM \'de\' yyyy", "pt-BR")',
      ).value;
      expect(r).toBe('18 de Janeiro de 2024');
    });
    it('de month name', () => {
      const r = evaluate('format date(date("2024-01-18"), "dd. MMMM yyyy", "de")').value;
      expect(r).toBe('18. Januar 2024');
    });
    it('works with date and time input', () => {
      const r = evaluate('format date(date and time("2024-03-15T10:30:00"), "dd/MM/yyyy")').value;
      expect(r).toBe('15/03/2024');
    });
    it('null returns null', () => {
      expect(evaluate('format date(null, "dd/MM/yyyy")').value).toBeNull();
    });
  });

  describe('C3: format time(time, format)', () => {
    it('HH:mm', () => {
      expect(evaluate('format time(time("14:30:00"), "HH:mm")').value).toBe('14:30');
    });
    it('h:mm a (PM)', () => {
      expect(evaluate('format time(time("14:30:00"), "h:mm a")').value).toBe('2:30 PM');
    });
    it('h:mm a (AM)', () => {
      expect(evaluate('format time(time("09:05:00"), "h:mm a")').value).toBe('9:05 AM');
    });
    it('HH:mm:ss', () => {
      expect(evaluate('format time(time("09:05:03"), "HH:mm:ss")').value).toBe('09:05:03');
    });
  });

  describe('C3: format date and time(dt, format, locale?)', () => {
    it('dd/MM/yyyy HH:mm', () => {
      const r = evaluate(
        'format date and time(date and time("2024-08-26T14:30:00"), "dd/MM/yyyy HH:mm")',
      ).value;
      expect(r).toBe('26/08/2024 14:30');
    });
    it('MMMM d, yyyy at h:mm a', () => {
      const r = evaluate(
        'format date and time(date and time("2024-01-18T14:30:00"), "MMMM d, yyyy \'at\' h:mm a")',
      ).value;
      expect(r).toBe('January 18, 2024 at 2:30 PM');
    });
  });

  // ─── C5: validate() ──────────────────────────────────────────────────────────

  describe('C5: validate(expression, schema?)', () => {
    it('valid expression returns valid:true', () => {
      const r = validate('1 + 1');
      expect(r.valid).toBe(true);
      expect(r.errors).toHaveLength(0);
    });
    it('syntax error returns valid:false', () => {
      const r = validate('1 + * 2');
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });
    it('unclosed string returns valid:false', () => {
      const r = validate('"unclosed');
      expect(r.valid).toBe(false);
    });
    it('no schema — no variable warnings', () => {
      const r = validate('score + bonus');
      expect(r.warnings).toHaveLength(0);
    });
    it('schema provided — unknown variable triggers warning', () => {
      const r = validate('score + bonus', { score: 'number' });
      expect(r.warnings.some((w) => w.code === 'UNKNOWN_VARIABLE' && w.name === 'bonus')).toBe(
        true,
      );
    });
    it('schema provided — all known variables: no warnings', () => {
      const r = validate('score + bonus', { score: 'number', bonus: 'number' });
      expect(r.warnings.filter((w) => w.code === 'UNKNOWN_VARIABLE')).toHaveLength(0);
    });
    it('unknown function triggers warning', () => {
      const r = validate('unknownFn(x)', { x: 'number' });
      expect(r.warnings.some((w) => w.code === 'UNKNOWN_FUNCTION' && w.name === 'unknownFn')).toBe(
        true,
      );
    });
    it('known builtin: no function warning', () => {
      const r = validate('sum([1, 2, 3])');
      expect(r.warnings.filter((w) => w.code === 'UNKNOWN_FUNCTION')).toHaveLength(0);
    });
    it('for-loop binding not flagged as unknown', () => {
      const r = validate('for x in [1,2,3] return x * 2', {});
      expect(
        r.warnings.filter((w) => w.code === 'UNKNOWN_VARIABLE' && w.name === 'x'),
      ).toHaveLength(0);
    });
    it('filter item binding not flagged as unknown', () => {
      const r = validate('[1,2,3][item > 2]', {});
      expect(
        r.warnings.filter((w) => w.code === 'UNKNOWN_VARIABLE' && w.name === 'item'),
      ).toHaveLength(0);
    });
    it('function params not flagged as unknown', () => {
      const r = validate('function(x) x * 2', {});
      expect(
        r.warnings.filter((w) => w.code === 'UNKNOWN_VARIABLE' && w.name === 'x'),
      ).toHaveLength(0);
    });
    it('complex expression validates cleanly with full schema', () => {
      const r = validate(
        'if score >= 700 and employment = "employed" then "approved" else "rejected"',
        { score: 'number', employment: 'string' },
      );
      expect(r.valid).toBe(true);
      expect(r.warnings.filter((w) => w.code === 'UNKNOWN_VARIABLE')).toHaveLength(0);
    });
    it('returns valid:true even with warnings', () => {
      const r = validate('score + missing', { score: 'number' });
      expect(r.valid).toBe(true);
      expect(r.warnings.length).toBeGreaterThan(0);
    });
  });
});
