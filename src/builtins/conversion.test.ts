import { describe, expect, it } from 'vitest';
import { evaluate } from '../index.js';

describe('builtins/conversion', () => {
  describe('string()', () => {
    it('numbers', () => {
      expect(evaluate('string(42)').value).toBe('42');
      expect(evaluate('string(3.14)').value).toBe('3.14');
      expect(evaluate('string(-5)').value).toBe('-5');
      expect(evaluate('string(0)').value).toBe('0');
    });

    it('boolean', () => {
      expect(evaluate('string(true)').value).toBe('true');
      expect(evaluate('string(false)').value).toBe('false');
    });

    it('null', () => {
      expect(evaluate('string(null)').value).toBeNull();
    });

    it('string passthrough', () => {
      expect(evaluate('string("hello")').value).toBe('hello');
      expect(evaluate('string("")').value).toBe('');
    });

    it('date', () => {
      expect(evaluate('string(date("2024-01-15"))').value).toBe('2024-01-15');
    });

    it('time', () => {
      expect(evaluate('string(time("10:30:00"))').value).toBe('10:30:00');
    });

    it('date and time', () => {
      expect(evaluate('string(date and time("2024-01-15T10:30:00"))').value).toBe(
        '2024-01-15T10:30:00',
      );
    });

    it('duration', () => {
      expect(evaluate('string(duration("P1Y2M"))').value).toBe('P1Y2M');
      expect(evaluate('string(duration("P1DT2H3M4S"))').value).toBe('P1DT2H3M4S');
    });

    it('list', () => {
      expect(evaluate('string([1, 2, 3])').value).toBe('[1, 2, 3]');
    });

    it('context', () => {
      expect(evaluate('string({a: 1})').value).toBe('{a: 1}');
    });

    it('nested list', () => {
      expect(evaluate('string([1, [2, 3]])').value).toBe('[1, [2, 3]]');
    });

    it('time with offset', () => {
      expect(evaluate('string(time("10:30:00+02:00"))').value).toBe('10:30:00+02:00');
    });

    it('negative duration', () => {
      expect(evaluate('string(duration("-P1D"))').value).toBe('-P1D');
    });
  });

  describe('string() with picture mask', () => {
    it('no mask — behaves as before', () => {
      expect(evaluate('string(42)').value).toBe('42');
      expect(evaluate('string(42, null)').value).toBe('42');
    });

    it('zero-padded integer', () => {
      expect(evaluate('string(7, "000")').value).toBe('007');
      expect(evaluate('string(7, "0")').value).toBe('7');
    });

    it('fixed decimal places', () => {
      expect(evaluate('string(1234.5, "##,##0.00")').value).toBe('1,234.50');
      expect(evaluate('string(0.5, "0.000")').value).toBe('0.500');
    });

    it('thousands grouping', () => {
      expect(evaluate('string(1234, "#,##0")').value).toBe('1,234');
      expect(evaluate('string(1234567, "#,##0")').value).toBe('1,234,567');
    });

    it('negative number with default sign', () => {
      expect(evaluate('string(-42, "##0")').value).toBe('-42');
    });

    it('negative number with explicit negative subpicture', () => {
      expect(evaluate('string(-42, "##0;(##0)")').value).toBe('(42)');
    });

    it('percent', () => {
      expect(evaluate('string(0.1234, "0.00%")').value).toBe('12.34%');
    });

    it('non-number with mask returns null', () => {
      expect(evaluate('string("abc", "##0")').value).toBeNull();
    });
  });

  describe('number()', () => {
    it('simple string', () => {
      expect(evaluate('number("42")').value).toBe(42);
      expect(evaluate('number("3.14")').value).toBe(3.14);
      expect(evaluate('number("-5")').value).toBe(-5);
    });

    it('with group and decimal separators', () => {
      expect(evaluate('number("1,234.56", ",", ".")').value).toBe(1234.56);
      expect(evaluate('number("1.234,56", ".", ",")').value).toBe(1234.56);
    });

    it('space as thousands separator', () => {
      expect(evaluate('number("1 500", " ", ".")').value).toBe(1500);
    });

    it('identical separators returns null', () => {
      expect(evaluate('number("1.5", ".", ".")').value).toBeNull();
    });

    it('number passthrough', () => {
      expect(evaluate('number(1)').value).toBe(1);
      expect(evaluate('number(3.14)').value).toBe(3.14);
    });

    it('invalid string returns null', () => {
      expect(evaluate('number("abc")').value).toBeNull();
      expect(evaluate('number("")').value).toBeNull();
    });

    it('null returns null', () => {
      expect(evaluate('number(null)').value).toBeNull();
    });
  });

  describe('string join()', () => {
    it('basic join', () => {
      expect(evaluate('string join(["a", "b", "c"], "-")').value).toBe('a-b-c');
    });

    it('with prefix and suffix', () => {
      expect(evaluate('string join(["a", "b", "c"], "-", "[", "]")').value).toBe('[a-b-c]');
    });

    it('no separator', () => {
      expect(evaluate('string join(["a", "b", "c"])').value).toBe('abc');
      expect(evaluate('string join(["a", "b", "c"], "")').value).toBe('abc');
    });

    it('null items are skipped', () => {
      expect(evaluate('string join(["a", null, "c"], ",")').value).toBe('a,c');
    });

    it('empty list', () => {
      expect(evaluate('string join([], ",")').value).toBe('');
    });
  });

  describe('string() with edge-case values', () => {
    it('list with nulls', () => {
      expect(evaluate('string([1, null, 3])').value).toBe('[1, null, 3]');
    });

    it('nested context', () => {
      expect(evaluate('string({a: {b: 1}})').value).toBe('{a: {b: 1}}');
    });

    it('range', () => {
      expect(evaluate('string([1..3])').value).toBe('[1..3]');
    });

    it('exclusive range', () => {
      expect(evaluate('string((1..3))').value).toBe('(1..3)');
    });

    it('duration year-month', () => {
      expect(evaluate('string(duration("P2Y6M"))').value).toBe('P2Y6M');
    });
  });

  describe('string() format mask edge cases', () => {
    it('percent with large value', () => {
      expect(evaluate('string(1.0, "0%")').value).toBe('100%');
    });

    it('no grouping separator', () => {
      expect(evaluate('string(1234, "0")').value).toBe('1234');
    });

    it('negative subpicture with percent', () => {
      expect(evaluate('string(-0.05, "0.0%;(0.0%)")').value).toBe('(5.0%)');
    });

    it('literal prefix and suffix', () => {
      expect(evaluate('string(42, "$#0.00")').value).toBe('$42.00');
    });

    it('non-number with mask returns null', () => {
      expect(evaluate('string(true, "0")').value).toBeNull();
      expect(evaluate('string(null, "0")').value).toBeNull();
    });

    it('non-string mask returns null', () => {
      expect(evaluate('string(42, 5)').value).toBeNull();
    });
  });

  describe('number() edge cases', () => {
    it('scientific notation parsed correctly', () => {
      expect(evaluate('number("1e3")').value).toBe(1000);
      expect(evaluate('number("1.5e-2")').value).toBe(0.015);
    });

    it('negative string', () => {
      expect(evaluate('number("-42")').value).toBe(-42);
    });

    it('with space group separator', () => {
      expect(evaluate('number("1 000 000", " ", ".")').value).toBe(1000000);
    });

    it('invalid: group sep same as decimal sep', () => {
      expect(evaluate('number("1.5", ".", ".")').value).toBeNull();
    });

    it('invalid decimal separator', () => {
      expect(evaluate('number("1;5", ";", ".")').value).toBeNull();
    });

    it('string with letters is null', () => {
      expect(evaluate('number("12abc")').value).toBeNull();
    });

    it('too many args returns null', () => {
      expect(evaluate('number("1", ",", ".", "x")').value).toBeNull();
    });
  });
});
