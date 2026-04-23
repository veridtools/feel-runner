/**
 * Edge-case tests covering gaps identified after Phase D completion.
 * Tests cases not covered by phase-c.test.ts / phase-d.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { evaluate, explain, validate } from '../index.js';

describe('Edge cases', () => {
  // ─── let expressions ────────────────────────────────────────────────────────

  describe('let: edge cases', () => {
    it('in operator inside let value (parenthesised)', () => {
      // The `in` inside (3 in [1,2,3]) must not be confused with the let delimiter
      expect(evaluate('let result = (3 in [1,2,3]) in result').value).toBe(true);
    });

    it('name shadowing — inner let overrides outer', () => {
      expect(evaluate('let x = 1 in let x = 2 in x').value).toBe(2);
    });

    it('null binding is fine', () => {
      expect(evaluate('let x = null in if x = null then "yes" else "no"').value).toBe('yes');
    });

    it('function defined in let, then called in body', () => {
      expect(evaluate('let double = function(a) a * 2 in double(5)').value).toBe(10);
    });

    it('operator precedence honoured inside let value', () => {
      // 1+2*3 = 7, not 9
      expect(evaluate('let x = 1 + 2 * 3 in x').value).toBe(7);
    });

    it('triple chained let, each binding references previous', () => {
      expect(evaluate('let a = 2 in let b = a * 3 in let c = b + a in c').value).toBe(8);
    });

    it('let in for body', () => {
      const r = evaluate('for i in [1,2,3] return let sq = i * i in sq + 1').value;
      expect(r).toEqual([2, 5, 10]);
    });

    it('validate: let-bound name not flagged as unknown', () => {
      const r = validate('let total = price * qty in total * 1.1', {
        price: 'number',
        qty: 'number',
      });
      expect(
        r.warnings.filter((w) => w.code === 'UNKNOWN_VARIABLE' && w.name === 'total'),
      ).toHaveLength(0);
    });

    it('validate: variable used in let value is checked against schema', () => {
      const r = validate('let x = missing_var in x', {});
      expect(
        r.warnings.some((w) => w.code === 'UNKNOWN_VARIABLE' && w.name === 'missing_var'),
      ).toBe(true);
    });

    it('validate: let variable not visible outside its scope', () => {
      // "x" is bound in the inner let but not in the outer schema
      const r = validate('let x = 5 in 1', {});
      // x is only used in the value expression "5" (a literal), body is "1"
      // No UNKNOWN_VARIABLE should be emitted for x since it's the bound name itself
      expect(r.warnings.filter((w) => w.name === 'x')).toHaveLength(0);
    });
  });

  // ─── pipeline: edge cases ───────────────────────────────────────────────────

  describe('pipeline |>: edge cases', () => {
    it('null input propagates through pipe', () => {
      // upper case(null) returns null
      expect(evaluate('null |> upper case').value).toBeNull();
    });

    it('pipe result is a number', () => {
      expect(evaluate('[1,2,3] |> count').value).toBe(3);
    });

    it('pipeline with no ? slot prepends as first arg', () => {
      // substring expects (string, start, length) — no ? so input prepended
      expect(evaluate('"hello world" |> substring(?, 1, 5)').value).toBe('hello');
    });

    it('pipe chain — three steps', () => {
      expect(evaluate('"  Hello  " |> trim |> lower case |> upper case').value).toBe('HELLO');
    });

    it('pipe with ? slot in first position explicitly', () => {
      expect(evaluate('"feel" |> upper case(?)').value).toBe('FEEL');
    });

    it('pipe to contains (? slot)', () => {
      expect(evaluate('"hello world" |> contains(?, "world")').value).toBe(true);
    });

    it('pipe to starts with', () => {
      expect(evaluate('"hello" |> starts with(?, "he")').value).toBe(true);
    });

    it('pipeline precedence: arithmetic before pipe', () => {
      // 1 + 2 = 3, then string(3)
      expect(evaluate('1 + 2 |> string').value).toBe('3');
    });

    it('pipeline with context variable', () => {
      expect(evaluate('items |> sum', { items: [10, 20, 30] }).value).toBe(60);
    });

    it('validate: ? inside pipeline right-hand side not flagged', () => {
      const r = validate('"hello" |> upper case(?)', {});
      expect(
        r.warnings.filter((w) => w.code === 'UNKNOWN_VARIABLE' && w.name === '?'),
      ).toHaveLength(0);
    });
  });

  // ─── format number: edge cases ──────────────────────────────────────────────

  describe('format number: edge cases', () => {
    it('negative number formatted correctly', () => {
      expect(evaluate('format number(-1234.56, "#,##0.00")').value).toBe('-1,234.56');
    });

    it('zero with #.## mask returns "0"', () => {
      // # means "digit, suppress if zero" — but at least one digit must show
      expect(evaluate('format number(0, "0.##")').value).toBe('0');
    });

    it('percentage: 1 → 100%', () => {
      expect(evaluate('format number(1, "0%")').value).toBe('100%');
    });

    it('very large number with grouping', () => {
      expect(evaluate('format number(1000000, "#,##0")').value).toBe('1,000,000');
    });

    it('zero decimal places', () => {
      expect(evaluate('format number(42.7, "0")').value).toBe('43');
    });

    it('negative with pt-BR locale', () => {
      expect(evaluate('format number(-1234.56, "#,##0.00", "pt-BR")').value).toBe('-1.234,56');
    });
  });

  // ─── format date / time / date-and-time: edge cases ─────────────────────────

  describe('format date/time: edge cases', () => {
    it('format time midnight → 12:00 AM (12h)', () => {
      expect(evaluate('format time(time("00:00:00"), "hh:mm a")').value).toBe('12:00 AM');
    });

    it('format time noon → 12:00 PM (12h)', () => {
      expect(evaluate('format time(time("12:00:00"), "hh:mm a")').value).toBe('12:00 PM');
    });

    it('format time 23:59 → 11:59 PM (12h)', () => {
      expect(evaluate('format time(time("23:59:00"), "h:mm a")').value).toBe('11:59 PM');
    });

    it('format date: leap year Feb 29', () => {
      expect(evaluate('format date(date("2024-02-29"), "dd/MM/yyyy")').value).toBe('29/02/2024');
    });

    it('format date with 2-digit year', () => {
      expect(evaluate('format date(date("2024-06-15"), "dd/MM/yy")').value).toBe('15/06/24');
    });

    it('parse date: invalid day for month returns null', () => {
      // February has at most 29 days; day 30 is always invalid
      expect(evaluate('date("30/02/2024", "dd/MM/yyyy")').value).toBeNull();
    });

    it('parse date: day 31 in month with 30 days returns null', () => {
      expect(evaluate('date("31/04/2024", "dd/MM/yyyy")').value).toBeNull();
    });

    it('parse time: 12:30 AM with hh:mm pattern → hour 0', () => {
      const r = evaluate('time("12:30 AM", "hh:mm a")').value as { hour: number };
      expect(r.hour).toBe(0);
    });

    it('format date and time: 12h AM/PM', () => {
      const r = evaluate(
        'format date and time(date and time("2024-01-18T00:30:00"), "dd/MM/yyyy hh:mm a")',
      ).value;
      expect(r).toBe('18/01/2024 12:30 AM');
    });
  });

  // ─── date(str, format): edge cases ──────────────────────────────────────────

  describe('date(str, format): edge cases', () => {
    it('2-digit year 50 → 1950', () => {
      const r = evaluate('date("01/01/50", "dd/MM/yy")').value as { year: number };
      expect(r.year).toBe(1950);
    });

    it('2-digit year 49 → 2049', () => {
      const r = evaluate('date("01/01/49", "dd/MM/yy")').value as { year: number };
      expect(r.year).toBe(2049);
    });

    it('mismatched format returns null', () => {
      // Format expects dd/MM/yyyy but input has dots
      expect(evaluate('date("18.01.2024", "dd/MM/yyyy")').value).toBeNull();
    });

    it('partial format with only day and month missing year returns null', () => {
      // Missing year → year would be undefined → return null
      expect(evaluate('date("18/01", "dd/MM")').value).toBeNull();
    });

    it('Spanish month name (MMMM) parsed via locale fallback', () => {
      const r = evaluate('date("15 Enero 2024", "dd MMMM yyyy")').value as { month: number };
      expect(r.month).toBe(1);
    });

    it('German month name (MMMM) parsed via locale fallback', () => {
      const r = evaluate('date("18 Januar 2024", "dd MMMM yyyy")').value as { month: number };
      expect(r.month).toBe(1);
    });
  });

  // ─── explain: edge cases ────────────────────────────────────────────────────

  describe('explain: edge cases', () => {
    it('explain nested AND condition', () => {
      const r = explain('if a > 0 and b > 0 then "yes" else "no"', { a: 1, b: -1 });
      expect(r.result).toBe('no');
      expect(r.explanation).toContain('AND');
    });

    it('explain OR condition', () => {
      const r = explain('if a > 5 or b > 5 then "big" else "small"', { a: 10, b: 1 });
      expect(r.result).toBe('big');
      expect(r.explanation).toContain('OR');
    });

    it('explain let: shows binding value', () => {
      const r = explain('let rate = 0.1 in 1000 * rate');
      expect(r.result).toBe(100);
      expect(r.explanation).toContain('rate = 0.1');
    });

    it('explain pipeline: shows final result', () => {
      const r = explain('"hello" |> upper case');
      expect(r.result).toBe('HELLO');
      expect(r.explanation).toContain('HELLO');
    });

    it('explain true condition takes then branch', () => {
      const r = explain('if 10 > 5 then "yes" else "no"');
      expect(r.result).toBe('yes');
      expect(r.explanation).toContain('then');
      expect(r.explanation).not.toContain('else branch');
    });

    it('explain false condition takes else branch', () => {
      const r = explain('if 2 > 5 then "yes" else "no"');
      expect(r.result).toBe('no');
      expect(r.explanation).toContain('else');
    });

    it('explain null result shows null', () => {
      const r = explain('null');
      expect(r.result).toBeNull();
      expect(r.explanation).toContain('null');
    });

    it('explain comparison with variable shows variable name and value', () => {
      const r = explain('score >= 700', { score: 580 });
      expect(r.explanation).toContain('score');
      expect(r.explanation).toContain('580');
    });
  });

  // ─── validate: edge cases ───────────────────────────────────────────────────

  describe('validate: edge cases', () => {
    it('pipeline rhs ? is not flagged as unknown variable', () => {
      const r = validate('"hello" |> upper case(?)', {});
      expect(
        r.warnings.filter((w) => w.code === 'UNKNOWN_VARIABLE' && w.name === '?'),
      ).toHaveLength(0);
    });

    it('let bound variable used in body — no warning', () => {
      const r = validate('let x = 5 in x * 2', {});
      expect(r.warnings.filter((w) => w.code === 'UNKNOWN_VARIABLE')).toHaveLength(0);
    });

    it('unknown variable in let value — warns', () => {
      const r = validate('let x = unknown_var in x', {});
      expect(
        r.warnings.some((w) => w.code === 'UNKNOWN_VARIABLE' && w.name === 'unknown_var'),
      ).toBe(true);
    });

    it('known variable in let value — no warn', () => {
      const r = validate('let x = score * 2 in x', { score: 'number' });
      expect(r.warnings.filter((w) => w.code === 'UNKNOWN_VARIABLE')).toHaveLength(0);
    });

    it('for loop binding not flagged', () => {
      const r = validate('for item in orders return item.total', { orders: 'list' });
      expect(
        r.warnings.filter((w) => w.code === 'UNKNOWN_VARIABLE' && w.name === 'item'),
      ).toHaveLength(0);
    });

    it('syntax error — parse exception returns valid:false', () => {
      const r = validate('1 ++ 2');
      expect(r.valid).toBe(false);
    });

    it('valid complex expression', () => {
      const r = validate('let tax = price * 0.1 in let total = price + tax in total', {
        price: 'number',
      });
      expect(r.valid).toBe(true);
      expect(r.warnings.filter((w) => w.code === 'UNKNOWN_VARIABLE')).toHaveLength(0);
    });
  });
});
