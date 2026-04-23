import { describe, expect, it } from 'vitest';
import { unaryTest } from '../index.js';

describe('unary tests', () => {
  describe('single value', () => {
    it('matches equal number', () => {
      expect(unaryTest('5', { '?': 5 }).value).toBe(true);
      expect(unaryTest('5', { '?': 6 }).value).toBe(false);
    });

    it('matches string', () => {
      expect(unaryTest('"hello"', { '?': 'hello' }).value).toBe(true);
      expect(unaryTest('"hello"', { '?': 'world' }).value).toBe(false);
    });
  });

  describe('range tests', () => {
    it('inclusive range [a..b]', () => {
      expect(unaryTest('[1..10]', { '?': 5 }).value).toBe(true);
      expect(unaryTest('[1..10]', { '?': 1 }).value).toBe(true);
      expect(unaryTest('[1..10]', { '?': 10 }).value).toBe(true);
      expect(unaryTest('[1..10]', { '?': 0 }).value).toBe(false);
      expect(unaryTest('[1..10]', { '?': 11 }).value).toBe(false);
    });

    it('exclusive range (a..b)', () => {
      expect(unaryTest('(1..10)', { '?': 5 }).value).toBe(true);
      expect(unaryTest('(1..10)', { '?': 1 }).value).toBe(false);
      expect(unaryTest('(1..10)', { '?': 10 }).value).toBe(false);
    });

    it('mixed range [a..b)', () => {
      expect(unaryTest('[1..10)', { '?': 1 }).value).toBe(true);
      expect(unaryTest('[1..10)', { '?': 10 }).value).toBe(false);
      expect(unaryTest('[1..10)', { '?': 9 }).value).toBe(true);
    });

    it('mixed range (a..b]', () => {
      expect(unaryTest('(1..10]', { '?': 1 }).value).toBe(false);
      expect(unaryTest('(1..10]', { '?': 10 }).value).toBe(true);
      expect(unaryTest('(1..10]', { '?': 2 }).value).toBe(true);
    });

    it('open-ended range > n', () => {
      expect(unaryTest('> 5', { '?': 6 }).value).toBe(true);
      expect(unaryTest('> 5', { '?': 5 }).value).toBe(false);
    });

    it('open-ended range >= n', () => {
      expect(unaryTest('>= 5', { '?': 5 }).value).toBe(true);
      expect(unaryTest('>= 5', { '?': 4 }).value).toBe(false);
    });

    it('open-ended range < n', () => {
      expect(unaryTest('< 5', { '?': 4 }).value).toBe(true);
      expect(unaryTest('< 5', { '?': 5 }).value).toBe(false);
    });

    it('open-ended range <= n', () => {
      expect(unaryTest('<= 5', { '?': 5 }).value).toBe(true);
      expect(unaryTest('<= 5', { '?': 6 }).value).toBe(false);
    });
  });

  describe('list of values', () => {
    it('disjunction - any match', () => {
      expect(unaryTest('1, 2, 3', { '?': 1 }).value).toBe(true);
      expect(unaryTest('1, 2, 3', { '?': 2 }).value).toBe(true);
      expect(unaryTest('1, 2, 3', { '?': 4 }).value).toBe(false);
    });

    it('mixed list with range', () => {
      expect(unaryTest('1, [5..10], 20', { '?': 7 }).value).toBe(true);
      expect(unaryTest('1, [5..10], 20', { '?': 20 }).value).toBe(true);
      expect(unaryTest('1, [5..10], 20', { '?': 3 }).value).toBe(false);
    });
  });

  describe('negation', () => {
    it('not equal value', () => {
      expect(unaryTest('not(5)', { '?': 5 }).value).toBe(false);
      expect(unaryTest('not(5)', { '?': 6 }).value).toBe(true);
    });

    it('not in range', () => {
      expect(unaryTest('not([1..5])', { '?': 3 }).value).toBe(false);
      expect(unaryTest('not([1..5])', { '?': 6 }).value).toBe(true);
    });

    it('not in list', () => {
      expect(unaryTest('not(1, 2, 3)', { '?': 1 }).value).toBe(false);
      expect(unaryTest('not(1, 2, 3)', { '?': 4 }).value).toBe(true);
    });
  });

  describe('null handling', () => {
    it('null test against null input', () => {
      // null literal in unary test: testUnaryValue(null, null) → null (per spec)
      const r = unaryTest('null', { '?': null });
      expect(r.value === true || r.value === null).toBe(true);
    });

    it('non-null test against null candidate', () => {
      // testUnaryValue(null, D(5)) → feelEqual(null, D(5)) → null (undefined comparison)
      const r = unaryTest('5', { '?': null });
      expect(r.value === false || r.value === null).toBe(true);
    });
  });

  describe('dash (any) test', () => {
    it('dash matches anything', () => {
      expect(unaryTest('-', { '?': 5 }).value).toBe(true);
      expect(unaryTest('-', { '?': 'hello' }).value).toBe(true);
      expect(unaryTest('-', { '?': null }).value).toBe(true);
    });
  });

  describe('combined conditions (OR)', () => {
    it('< 5 or > 10 — value in lower range', () => {
      expect(unaryTest('< 5, > 10', { '?': 3 }).value).toBe(true);
    });

    it('< 5 or > 10 — value in upper range', () => {
      expect(unaryTest('< 5, > 10', { '?': 12 }).value).toBe(true);
    });

    it('< 5 or > 10 — value in middle (no match)', () => {
      expect(unaryTest('< 5, > 10', { '?': 7 }).value).toBe(false);
    });
  });

  describe('explicit equality form', () => {
    it('= value matches equal', () => {
      expect(unaryTest('= 5', { '?': 5 }).value).toBe(true);
      expect(unaryTest('= 5', { '?': 6 }).value).toBe(false);
    });

    it('= string matches equal', () => {
      expect(unaryTest('= "abc"', { '?': 'abc' }).value).toBe(true);
      expect(unaryTest('= "abc"', { '?': 'xyz' }).value).toBe(false);
    });
  });

  describe('context-based tests', () => {
    it('reference to context variable in test', () => {
      expect(unaryTest('> threshold', { '?': 10, threshold: 5 }).value).toBe(true);
      expect(unaryTest('> threshold', { '?': 3, threshold: 5 }).value).toBe(false);
    });
  });

  describe('type mismatch in unary tests', () => {
    it('numeric test against string input returns false', () => {
      const r = unaryTest('5', { '?': 'hello' });
      expect(r.value === false || r.value === null).toBe(true);
    });

    it('string test against numeric input returns false', () => {
      const r = unaryTest('"abc"', { '?': 42 });
      expect(r.value === false || r.value === null).toBe(true);
    });

    it('range test against string input returns false/null', () => {
      const r = unaryTest('[1..10]', { '?': 'hello' });
      expect(r.value === false || r.value === null).toBe(true);
    });
  });

  describe('unary test with temporal values', () => {
    it('date range test', () => {
      const r = unaryTest('[date("2024-01-01")..date("2024-12-31")]', {
        '?': { kind: 'date', year: 2024, month: 6, day: 15 } as never,
      });
      expect(r.value).toBe(true);
    });
  });

  describe('complex not expressions', () => {
    it('not in range', () => {
      expect(unaryTest('not([5..10])', { '?': 3 }).value).toBe(true);
      expect(unaryTest('not([5..10])', { '?': 7 }).value).toBe(false);
    });

    it('not with multiple values', () => {
      expect(unaryTest('not(1, 2, 3)', { '?': 4 }).value).toBe(true);
      expect(unaryTest('not(1, 2, 3)', { '?': 2 }).value).toBe(false);
    });
  });
});
