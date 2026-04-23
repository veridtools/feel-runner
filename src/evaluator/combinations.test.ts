import { describe, expect, it } from 'vitest';
import { evaluate } from '../index.js';

// Integration tests: multiple language features combined in a single expression

describe('combinations', () => {
  describe('for-loop + temporal + filter', () => {
    it('filters dates by day of week', () => {
      const ctx = { dates: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'] };
      // Monday = 2024-01-01 (it's a Monday)
      const r = evaluate('for d in dates return day of week(date(d))', ctx).value as string[];
      expect(r).toContain('Monday');
    });

    it('adds duration inside for-loop', () => {
      const r = evaluate(
        'for d in [date("2024-01-01"), date("2024-01-15")] return d + duration("P7D")',
      ).value as { kind: string; day: number }[];
      expect(r[0]!.day).toBe(8);
      expect(r[1]!.day).toBe(22);
    });

    it('temporal filter + arithmetic return', () => {
      const r = evaluate(
        'for d in [date("2024-01-01"), date("2024-01-08"), date("2024-01-15")] ' +
          'return string(d + duration("P1D"))',
      ).value as string[];
      expect(r[0]).toBe('2024-01-02');
      expect(r[1]).toBe('2024-01-09');
    });
  });

  describe('quantifier + filter + context', () => {
    it('every in list of contexts satisfies condition', () => {
      const r = evaluate(
        'every item in [{score: 90}, {score: 85}, {score: 72}] satisfies item.score >= 70',
      ).value;
      expect(r).toBe(true);
    });

    it('some in list of contexts fails with low score', () => {
      const r = evaluate('some item in [{score: 90}, {score: 50}] satisfies item.score < 60').value;
      expect(r).toBe(true);
    });

    it('filter list of contexts then quantify', () => {
      const r = evaluate('every x in [{v:1},{v:2},{v:3}][item.v > 1] satisfies x.v > 1').value;
      expect(r).toBe(true);
    });

    it('quantifier accesses nested list in context', () => {
      const r = evaluate(
        'every x in [{items:[1,2,3]},{items:[4,5,6]}] satisfies every n in x.items satisfies n > 0',
      ).value;
      expect(r).toBe(true);
    });
  });

  describe('sort + temporal', () => {
    it('sorts dates with temporal comparator', () => {
      const r = evaluate(
        'sort([date("2024-03-01"), date("2024-01-01"), date("2024-02-01")], ' +
          'function(a, b) a < b)',
      ).value as { kind: string; month: number }[];
      expect(r[0]!.month).toBe(1);
      expect(r[1]!.month).toBe(2);
      expect(r[2]!.month).toBe(3);
    });

    it('sorts by computed temporal expression', () => {
      const r = evaluate('sort([date("2024-01-15"), date("2024-01-01")], function(a, b) a < b)')
        .value as { kind: string; day: number }[];
      expect(r[0]!.day).toBe(1);
      expect(r[1]!.day).toBe(15);
    });
  });

  describe('string builtins + quantifiers', () => {
    it('every string matches pattern', () => {
      const r = evaluate(
        'every s in ["foo@bar.com", "baz@qux.io"] satisfies matches(s, ".+@.+")',
      ).value;
      expect(r).toBe(true);
    });

    it('some string starts with prefix', () => {
      const r = evaluate(
        'some s in ["hello world", "goodbye"] satisfies starts with(s, "hello")',
      ).value;
      expect(r).toBe(true);
    });

    it('for-loop with upper case', () => {
      const r = evaluate('for s in ["hello", "world"] return upper case(s)').value;
      expect(r).toEqual(['HELLO', 'WORLD']);
    });

    it('filter list by string length', () => {
      const r = evaluate('["hi", "bye", "hello", "ok"][string length(item) > 2]').value;
      expect(r).toEqual(['bye', 'hello']);
    });
  });

  describe('range builtins + temporal', () => {
    it('overlaps with date ranges', () => {
      const r = evaluate(
        'overlaps([date("2024-01-01")..date("2024-01-31")], ' +
          '[date("2024-01-15")..date("2024-02-15")])',
      ).value;
      expect(r).toBe(true);
    });

    it('before with date ranges', () => {
      const r = evaluate(
        'before([date("2024-01-01")..date("2024-01-31")], ' +
          '[date("2024-02-01")..date("2024-02-28")])',
      ).value;
      expect(r).toBe(true);
    });

    it('includes date point in range', () => {
      const r = evaluate(
        'includes([date("2024-01-01")..date("2024-12-31")], date("2024-06-15"))',
      ).value;
      expect(r).toBe(true);
    });
  });

  describe('context + for-loop + arithmetic', () => {
    it('builds new contexts via for-loop', () => {
      const r = evaluate('for x in [1, 2, 3] return context put({}, "double", x * 2)').value as {
        double: number;
      }[];
      expect(r[0]!.double).toBe(2);
      expect(r[1]!.double).toBe(4);
      expect(r[2]!.double).toBe(6);
    });

    it('context merge in for-loop', () => {
      const r = evaluate('for x in [1, 2] return context merge([{base: 10}, {val: x}])').value as {
        base: number;
        val: number;
      }[];
      expect(r[0]!.base).toBe(10);
      expect(r[0]!.val).toBe(1);
    });

    it('extracts paths from list of contexts', () => {
      const r = evaluate('[{a:{b:1}},{a:{b:2}},{a:{b:3}}].a.b').value;
      expect(r).toEqual([1, 2, 3]);
    });
  });

  describe('instance of + filter', () => {
    it('filters list by type', () => {
      const r = evaluate('[1, "two", 3, "four", 5][item instance of number]').value;
      expect(r).toEqual([1, 3, 5]);
    });

    it('type check in quantifier', () => {
      const r = evaluate('every x in [1, 2, 3] satisfies x instance of number').value;
      expect(r).toBe(true);
    });

    it('mixed type filter', () => {
      const r = evaluate('[true, 1, "hello", null][item instance of boolean]').value;
      expect(r).toEqual([true]);
    });
  });

  describe('recursive context + arithmetic', () => {
    it('fibonacci via context recursion', () => {
      const r = evaluate(
        '{ fib: function(n) if n <= 1 then n else fib(n-1) + fib(n-2) }.fib(8)',
      ).value;
      expect(r).toBe(21);
    });

    it('recursive sum via context', () => {
      const r = evaluate(
        '{ rsum: function(lst, i) if i > count(lst) then 0 else lst[i] + rsum(lst, i+1) }.rsum([1,2,3,4,5], 1)',
      ).value;
      expect(r).toBe(15);
    });

    it('recursive factorial', () => {
      const r = evaluate('{ fact: function(n) if n <= 1 then 1 else n * fact(n-1) }.fact(6)').value;
      expect(r).toBe(720);
    });
  });

  describe('nested quantifiers', () => {
    it('some x, some y satisfies', () => {
      const r = evaluate('some x in [1, 2, 3], y in [4, 5, 6] satisfies x + y = 6').value;
      expect(r).toBe(true); // 1+5=6
    });

    it('every x, every y satisfies', () => {
      const r = evaluate('every x in [1, 2], y in [3, 4] satisfies x + y > 3').value;
      expect(r).toBe(true); // min is 1+3=4
    });

    it('nested quantifier false case', () => {
      const r = evaluate('every x in [1, 2], y in [1, 2] satisfies x + y > 3').value;
      expect(r).toBe(false); // 1+1=2 fails
    });
  });

  describe('list builtins chained', () => {
    it('sort then sublist', () => {
      const r = evaluate('sublist(sort([5, 3, 1, 4, 2], function(a, b) a < b), 1, 3)').value;
      expect(r).toEqual([1, 2, 3]);
    });

    it('flatten then distinct then sort', () => {
      const r = evaluate(
        'sort(distinct values(flatten([[3,1],[2,1],[3]])), function(a, b) a < b)',
      ).value;
      expect(r).toEqual([1, 2, 3]);
    });

    it('filter then count then arithmetic', () => {
      const r = evaluate('count([1,2,3,4,5][item > 2]) * 10').value;
      expect(r).toBe(30);
    });

    it('for-loop + flatten', () => {
      const r = evaluate('flatten(for x in [1, 2, 3] return [x, x * 2])').value;
      expect(r).toEqual([1, 2, 2, 4, 3, 6]);
    });
  });

  describe('conversion + arithmetic + type check', () => {
    it('string to number then arithmetic', () => {
      const r = evaluate('for s in ["1", "2", "3"] return number(s) * 10').value;
      expect(r).toEqual([10, 20, 30]);
    });

    it('conditional with conversion', () => {
      const r = evaluate(
        'if string length("hello") > 3 then upper case("hello") else lower case("WORLD")',
      ).value;
      expect(r).toBe('HELLO');
    });
  });

  describe('complex decision logic', () => {
    it('credit score + employment → loan decision', () => {
      const tiers = [
        { score: 750, employment: 'employed', expected: 'approved' },
        { score: 650, employment: 'employed', expected: 'manual review' },
        { score: 750, employment: 'unemployed', expected: 'manual review' },
        { score: 500, employment: 'unemployed', expected: 'rejected' },
      ];
      for (const { score, employment, expected } of tiers) {
        const r = evaluate(
          'if score >= 700 and employment = "employed" then "approved" ' +
            'else if score >= 600 or employment = "employed" then "manual review" ' +
            'else "rejected"',
          { score, employment },
        ).value;
        expect(r).toBe(expected);
      }
    });

    it('discount calculation with tiers', () => {
      const r = evaluate(
        'for qty in [1, 5, 10, 20] return ' +
          'if qty >= 20 then qty * 0.8 ' +
          'else if qty >= 10 then qty * 0.9 ' +
          'else if qty >= 5 then qty * 0.95 ' +
          'else qty',
      ).value as number[];
      expect(r[0]).toBe(1);
      expect(Number(r[3])).toBeCloseTo(16);
    });

    it('sum of filtered + transformed list', () => {
      const r = evaluate(
        'sum(for x in [1,2,3,4,5,6,7,8,9,10] return if modulo(x, 2) = 0 then x * x else 0)',
      ).value;
      // 4+16+36+64+100 = 220
      expect(r).toBe(220);
    });
  });
});
