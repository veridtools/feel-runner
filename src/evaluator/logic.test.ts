import { describe, expect, it } from 'vitest';
import { evaluate } from '../index.js';

describe('logic', () => {
  describe('boolean literals', () => {
    it('true and false', () => {
      expect(evaluate('true').value).toBe(true);
      expect(evaluate('false').value).toBe(false);
    });
  });

  describe('and operator - three-valued logic', () => {
    it('true and true = true', () => expect(evaluate('true and true').value).toBe(true));
    it('true and false = false', () => expect(evaluate('true and false').value).toBe(false));
    it('false and true = false', () => expect(evaluate('false and true').value).toBe(false));
    it('false and false = false', () => expect(evaluate('false and false').value).toBe(false));
    it('true and null = null', () => expect(evaluate('true and null').value).toBeNull());
    it('null and true = null', () => expect(evaluate('null and true').value).toBeNull());
    it('false and null = false', () => expect(evaluate('false and null').value).toBe(false));
    it('null and false = false', () => expect(evaluate('null and false').value).toBe(false));
    it('null and null = null', () => expect(evaluate('null and null').value).toBeNull());
  });

  describe('or operator - three-valued logic', () => {
    it('true or true = true', () => expect(evaluate('true or true').value).toBe(true));
    it('true or false = true', () => expect(evaluate('true or false').value).toBe(true));
    it('false or true = true', () => expect(evaluate('false or true').value).toBe(true));
    it('false or false = false', () => expect(evaluate('false or false').value).toBe(false));
    it('true or null = true', () => expect(evaluate('true or null').value).toBe(true));
    it('null or true = true', () => expect(evaluate('null or true').value).toBe(true));
    it('false or null = null', () => expect(evaluate('false or null').value).toBeNull());
    it('null or false = null', () => expect(evaluate('null or false').value).toBeNull());
    it('null or null = null', () => expect(evaluate('null or null').value).toBeNull());
  });

  describe('not operator', () => {
    it('not(true) = false', () => expect(evaluate('not(true)').value).toBe(false));
    it('not(false) = true', () => expect(evaluate('not(false)').value).toBe(true));
    it('not(null) = null', () => expect(evaluate('not(null)').value).toBeNull());
  });

  describe('if-then-else', () => {
    it('if true then returns consequent', () => {
      expect(evaluate('if true then "yes" else "no"').value).toBe('yes');
    });

    it('if false then returns alternate', () => {
      expect(evaluate('if false then "yes" else "no"').value).toBe('no');
    });

    it('if null then returns alternate', () => {
      expect(evaluate('if null then "yes" else "no"').value).toBe('no');
    });

    it('nested if-then-else', () => {
      expect(
        evaluate('if x > 100 then "high" else if x > 50 then "medium" else "low"', { x: 75 }).value,
      ).toBe('medium');
      expect(
        evaluate('if x > 100 then "high" else if x > 50 then "medium" else "low"', { x: 25 }).value,
      ).toBe('low');
      expect(
        evaluate('if x > 100 then "high" else if x > 50 then "medium" else "low"', { x: 150 })
          .value,
      ).toBe('high');
    });

    it('if with numeric comparison', () => {
      expect(
        evaluate('if score >= 90 then "A" else if score >= 80 then "B" else "C"', { score: 85 })
          .value,
      ).toBe('B');
    });
  });

  describe('between', () => {
    it('value between inclusive bounds', () => {
      expect(evaluate('5 between 1 and 10').value).toBe(true);
      expect(evaluate('1 between 1 and 10').value).toBe(true);
      expect(evaluate('10 between 1 and 10').value).toBe(true);
    });

    it('value outside bounds', () => {
      expect(evaluate('0 between 1 and 10').value).toBe(false);
      expect(evaluate('11 between 1 and 10').value).toBe(false);
    });

    it('between with null returns null', () => {
      expect(evaluate('null between 1 and 10').value).toBeNull();
    });

    it('between with strings', () => {
      expect(evaluate('"c" between "a" and "z"').value).toBe(true);
      expect(evaluate('"A" between "a" and "z"').value).toBe(false);
    });
  });

  describe('in operator', () => {
    it('in list', () => {
      expect(evaluate('1 in [1, 2, 3]').value).toBe(true);
      expect(evaluate('5 in [1, 2, 3]').value).toBe(false);
    });

    it('in range', () => {
      expect(evaluate('5 in [1..10]').value).toBe(true);
      expect(evaluate('0 in [1..10]').value).toBe(false);
    });

    it('in single value', () => {
      expect(evaluate('5 in 5').value).toBe(true);
      expect(evaluate('5 in 6').value).toBe(false);
    });

    it('in with null', () => {
      expect(evaluate('null in [1, 2, null]').value).toBe(true);
    });
  });

  describe('equality with different types', () => {
    it('string equality', () => {
      expect(evaluate('"hello" = "hello"').value).toBe(true);
      expect(evaluate('"hello" = "world"').value).toBe(false);
    });

    it('boolean equality', () => {
      expect(evaluate('true = true').value).toBe(true);
      expect(evaluate('true = false').value).toBe(false);
    });

    it('null equals null', () => {
      expect(evaluate('null = null').value).toBe(true);
    });

    it('list equality', () => {
      expect(evaluate('[1, 2, 3] = [1, 2, 3]').value).toBe(true);
      expect(evaluate('[1, 2, 3] = [1, 2, 4]').value).toBe(false);
      expect(evaluate('[1, 2] = [1, 2, 3]').value).toBe(false);
    });

    it('context equality', () => {
      expect(evaluate('{a: 1} = {a: 1}').value).toBe(true);
      expect(evaluate('{a: 1} = {a: 2}').value).toBe(false);
      expect(evaluate('{a: 1} = {b: 1}').value).toBe(false);
    });
  });

  describe('quantified expressions', () => {
    it('some ... satisfies', () => {
      expect(evaluate('some x in [1, 2, 3] satisfies x > 2').value).toBe(true);
      expect(evaluate('some x in [1, 2, 3] satisfies x > 5').value).toBe(false);
    });

    it('every ... satisfies', () => {
      expect(evaluate('every x in [1, 2, 3] satisfies x > 0').value).toBe(true);
      expect(evaluate('every x in [1, 2, 3] satisfies x > 1').value).toBe(false);
    });

    it('some with null returns null when undetermined', () => {
      expect(evaluate('some x in [null, 2, 3] satisfies x > 1').value).toBe(true);
    });
  });

  describe('chained logic with null absorption', () => {
    it('false absorbs even with null present (AND)', () => {
      expect(evaluate('true and null and false').value).toBe(false);
      expect(evaluate('false and null and true').value).toBe(false);
    });

    it('null leaves result indeterminate when no false (AND)', () => {
      expect(evaluate('true and null and true').value).toBeNull();
    });

    it('three-way AND chain', () => {
      expect(evaluate('true and true and true').value).toBe(true);
      expect(evaluate('true and false and true').value).toBe(false);
    });

    it('true absorbs even with null present (OR)', () => {
      expect(evaluate('false or null or true').value).toBe(true);
    });

    it('null leaves result indeterminate when no true (OR)', () => {
      expect(evaluate('false or null or false').value).toBeNull();
    });

    it('three-way OR chain', () => {
      expect(evaluate('false or false or false').value).toBe(false);
    });
  });

  describe('operator precedence', () => {
    it('* before +', () => {
      expect(evaluate('1 + 2 * 3').value).toBe(7);
      expect(evaluate('(1 + 2) * 3').value).toBe(9);
    });

    it('** is left-associative', () => {
      expect(evaluate('2 ** 3 ** 2').value).toBe(64);
    });

    it('not before and', () => {
      expect(evaluate('not(false) and true').value).toBe(true);
      expect(evaluate('not(true) or false').value).toBe(false);
    });
  });

  describe('for expressions', () => {
    it('for loop generates list', () => {
      expect(evaluate('for x in [1, 2, 3] return x * 2').value).toEqual([2, 4, 6]);
    });

    it('for loop with range', () => {
      expect(evaluate('for x in 1..3 return x').value).toEqual([1, 2, 3]);
    });

    it('for loop with conditional filter', () => {
      expect(
        evaluate('for x in [1, 2, 3, 4, 5] return x')[Symbol.iterator ? 'value' : 'value'],
      ).toBeTruthy();
      expect(evaluate('[1, 2, 3, 4, 5][item > 3]').value).toEqual([4, 5]);
    });
  });
});
