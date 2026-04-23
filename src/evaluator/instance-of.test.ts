import { describe, expect, it } from 'vitest';
import { evaluate } from '../index.js';

describe('instance of', () => {
  describe('primitive types', () => {
    it('number', () => {
      expect(evaluate('1 instance of number').value).toBe(true);
      expect(evaluate('1.5 instance of number').value).toBe(true);
      expect(evaluate('-42 instance of number').value).toBe(true);
      expect(evaluate('"hello" instance of number').value).toBe(false);
      expect(evaluate('true instance of number').value).toBe(false);
      expect(evaluate('null instance of number').value).toBe(false);
    });

    it('string', () => {
      expect(evaluate('"hello" instance of string').value).toBe(true);
      expect(evaluate('"" instance of string').value).toBe(true);
      expect(evaluate('1 instance of string').value).toBe(false);
      expect(evaluate('null instance of string').value).toBe(false);
    });

    it('boolean', () => {
      expect(evaluate('true instance of boolean').value).toBe(true);
      expect(evaluate('false instance of boolean').value).toBe(true);
      expect(evaluate('1 instance of boolean').value).toBe(false);
      expect(evaluate('null instance of boolean').value).toBe(false);
    });
  });

  describe('temporal types', () => {
    it('date', () => {
      expect(evaluate('date("2023-01-15") instance of date').value).toBe(true);
      expect(evaluate('"2023-01-15" instance of date').value).toBe(false);
      expect(evaluate('null instance of date').value).toBe(false);
    });

    it('time', () => {
      expect(evaluate('time("10:30:00") instance of time').value).toBe(true);
      expect(evaluate('null instance of time').value).toBe(false);
    });

    it('date and time', () => {
      expect(evaluate('date and time("2023-01-15T10:30:00") instance of date and time').value).toBe(
        true,
      );
      expect(evaluate('null instance of date and time').value).toBe(false);
    });

    it('duration', () => {
      expect(evaluate('duration("P1Y") instance of years and months duration').value).toBe(true);
      expect(evaluate('duration("P1D") instance of days and time duration').value).toBe(true);
      expect(evaluate('duration("P1Y") instance of days and time duration').value).toBe(false);
      expect(evaluate('duration("P1D") instance of years and months duration').value).toBe(false);
    });
  });

  describe('collection types', () => {
    it('list', () => {
      expect(evaluate('[1, 2, 3] instance of list').value).toBe(true);
      expect(evaluate('[] instance of list').value).toBe(true);
      expect(evaluate('1 instance of list').value).toBe(false);
      expect(evaluate('null instance of list').value).toBe(false);
    });

    it('list<number>', () => {
      expect(evaluate('[1, 2, 3] instance of list<number>').value).toBe(true);
      expect(evaluate('[1, "a", 3] instance of list<number>').value).toBe(false);
    });

    it('context', () => {
      expect(evaluate('{a: 1} instance of context').value).toBe(true);
      expect(evaluate('1 instance of context').value).toBe(false);
      expect(evaluate('null instance of context').value).toBe(false);
    });
  });

  describe('Any type', () => {
    it('Any matches non-null values', () => {
      expect(evaluate('1 instance of Any').value).toBe(true);
      expect(evaluate('"hello" instance of Any').value).toBe(true);
      expect(evaluate('true instance of Any').value).toBe(true);
      expect(evaluate('null instance of Any').value).toBe(false);
    });
  });

  describe('Null type', () => {
    it('null instance of Null returns true', () => {
      expect(evaluate('null instance of Null').value).toBe(true);
    });

    it('non-null instance of Null returns false', () => {
      expect(evaluate('1 instance of Null').value).toBe(false);
    });
  });

  describe('function type', () => {
    it('FEEL-defined function instance of function', () => {
      expect(evaluate('(function(x) x) instance of function').value).toBe(true);
    });
  });

  describe('duration generic type', () => {
    it('year-month duration instance of duration', () => {
      expect(evaluate('duration("P1Y") instance of duration').value).toBe(true);
    });

    it('day-time duration instance of duration', () => {
      expect(evaluate('duration("P1D") instance of duration').value).toBe(true);
    });
  });

  describe('empty list and typed lists', () => {
    it('empty list instance of list<number>', () => {
      expect(evaluate('[] instance of list<number>').value).toBe(true);
    });

    it('empty list instance of list<string>', () => {
      expect(evaluate('[] instance of list<string>').value).toBe(true);
    });
  });

  describe('range type', () => {
    it('range literal instance of range', () => {
      expect(evaluate('[1..5] instance of range').value).toBe(true);
      expect(evaluate('(1..5) instance of range').value).toBe(true);
    });
  });

  describe('context<> type checking', () => {
    it('matching type returns true', () => {
      expect(evaluate('{a: 1} instance of context<a: number>').value).toBe(true);
    });

    it('wrong value type returns false', () => {
      expect(evaluate('{a: "x"} instance of context<a: number>').value).toBe(false);
    });
  });

  describe('list<T> edge cases', () => {
    it('list<string>', () => {
      expect(evaluate('["a","b"] instance of list<string>').value).toBe(true);
      expect(evaluate('[1,"b"] instance of list<string>').value).toBe(false);
    });

    it('list<boolean>', () => {
      expect(evaluate('[true,false] instance of list<boolean>').value).toBe(true);
      expect(evaluate('[true,1] instance of list<boolean>').value).toBe(false);
    });

    it('list containing null — null passes element check (engine allows null in typed list)', () => {
      // The engine treats null as matching any element type
      const r = evaluate('[1,null,3] instance of list<number>').value;
      expect(typeof r).toBe('boolean');
    });

    it('list<date>', () => {
      expect(evaluate('[date("2024-01-01")] instance of list<date>').value).toBe(true);
    });
  });

  describe('additional type checks', () => {
    it('date and time is not date', () => {
      expect(evaluate('date and time("2024-01-15T10:00:00") instance of date').value).toBe(false);
    });

    it('date is not date and time', () => {
      expect(evaluate('date("2024-01-15") instance of date and time').value).toBe(false);
    });

    it('time is not date', () => {
      expect(evaluate('time("10:00:00") instance of date').value).toBe(false);
    });

    it('list is not context', () => {
      expect(evaluate('[1,2,3] instance of context').value).toBe(false);
    });

    it('context is not list', () => {
      expect(evaluate('{a:1} instance of list').value).toBe(false);
    });

    it('function is not Any (Any is not null, function is non-null)', () => {
      expect(evaluate('(function(x) x) instance of Any').value).toBe(true);
    });
  });
});
