import { describe, expect, it } from 'vitest';
import { evaluate } from '../index.js';

describe('expressions', () => {
  describe('if-then-else', () => {
    it('true branch', () => {
      expect(evaluate('if true then 1 else 2').value).toBe(1);
      expect(evaluate('if 1 > 0 then "pos" else "neg"').value).toBe('pos');
    });

    it('false branch', () => {
      expect(evaluate('if false then 1 else 2').value).toBe(2);
    });

    it('null condition takes else branch', () => {
      expect(evaluate('if null then 1 else 2').value).toBe(2);
    });

    it('null = null is true — takes then branch', () => {
      expect(evaluate('if null = null then "ok" else "fail"').value).toBe('ok');
    });

    it('nested if-then-else', () => {
      expect(evaluate('if 1 > 0 then if 2 > 1 then "a" else "b" else "c"').value).toBe('a');
      expect(evaluate('if 1 > 0 then if 2 > 3 then "a" else "b" else "c"').value).toBe('b');
      expect(evaluate('if 0 > 1 then "a" else "c"').value).toBe('c');
    });
  });

  describe('between', () => {
    it('value within inclusive bounds', () => {
      expect(evaluate('5 between 1 and 10').value).toBe(true);
      expect(evaluate('1 between 1 and 10').value).toBe(true);
      expect(evaluate('10 between 1 and 10').value).toBe(true);
    });

    it('value outside bounds', () => {
      expect(evaluate('0 between 1 and 10').value).toBe(false);
      expect(evaluate('11 between 1 and 10').value).toBe(false);
    });

    it('null candidate returns null', () => {
      expect(evaluate('null between 1 and 10').value).toBeNull();
    });

    it('null bound returns null', () => {
      expect(evaluate('5 between null and 10').value).toBeNull();
    });

    it('string between', () => {
      expect(evaluate('"b" between "a" and "c"').value).toBe(true);
      expect(evaluate('"d" between "a" and "c"').value).toBe(false);
    });
  });

  describe('in expression', () => {
    it('in list', () => {
      expect(evaluate('1 in [1, 2, 3]').value).toBe(true);
      expect(evaluate('4 in [1, 2, 3]').value).toBe(false);
    });

    it('in singleton', () => {
      expect(evaluate('1 in 1').value).toBe(true);
      expect(evaluate('2 in 1').value).toBe(false);
    });

    it('in range (exclusive start)', () => {
      expect(evaluate('1 in (1..5]').value).toBe(false);
      expect(evaluate('2 in (1..5]').value).toBe(true);
    });

    it('null not in number list', () => {
      expect(evaluate('null in [1, 2]').value).toBe(false);
    });

    it('string in string list', () => {
      expect(evaluate('"a" in ["a", "b", "c"]').value).toBe(true);
      expect(evaluate('"z" in ["a", "b", "c"]').value).toBe(false);
    });
  });

  describe('path expression', () => {
    it('simple property access', () => {
      expect(evaluate('{a: 1, b: 2}.a').value).toBe(1);
    });

    it('nested property access', () => {
      expect(evaluate('{a: {b: 42}}.a.b').value).toBe(42);
    });

    it('missing key returns null', () => {
      expect(evaluate('{a: 1}.z').value).toBeNull();
    });
  });

  describe('filter expression', () => {
    it('filter with condition', () => {
      expect(evaluate('[1, 2, 3, 4, 5][item > 3]').value).toEqual([4, 5]);
    });

    it('filter with context property', () => {
      expect(evaluate('[{a:1},{a:2},{a:3}][a > 1]').value).toMatchObject([{ a: 2 }, { a: 3 }]);
    });

    it('filter returns empty list when no match', () => {
      expect(evaluate('[1, 2, 3][item > 10]').value).toEqual([]);
    });

    it('filter returns all items when all match', () => {
      expect(evaluate('[1, 2, 3][item > 0]').value).toEqual([1, 2, 3]);
    });

    it('filter with builtin on item', () => {
      expect(evaluate('["a","bb","ccc"][string length(item) = 2]').value).toEqual(['bb']);
    });

    it('filter with nested and', () => {
      expect(evaluate('[{a:1,b:2},{a:3,b:4},{a:1,b:9}][a = 1 and b > 5]').value).toMatchObject([
        { a: 1, b: 9 },
      ]);
    });
  });

  describe('path on list of contexts', () => {
    it('extracts property from each element', () => {
      expect(evaluate('[{a:1},{a:2},{a:3}].a').value).toEqual([1, 2, 3]);
    });

    it('missing key in element returns null in result', () => {
      expect(evaluate('[{a:1},{b:2}].a').value).toEqual([1, null]);
    });
  });

  describe('path edge cases', () => {
    it('deep path with null intermediate returns null', () => {
      expect(evaluate('{a: null}.a').value).toBeNull();
    });

    it('path on non-context returns null', () => {
      expect(evaluate('"string".length').value).toBeNull();
    });

    it('path on string returns null', () => {
      expect(evaluate('"hello".missing').value).toBeNull();
    });
  });

  describe('for expressions', () => {
    it('for with range', () => {
      expect(evaluate('for x in 1..5 return x * x').value).toEqual([1, 4, 9, 16, 25]);
    });

    it('for with multiple bindings (Cartesian product)', () => {
      expect(evaluate('for x in [1,2], y in [10,20] return x + y').value).toEqual([11, 21, 12, 22]);
    });

    it('for with empty list returns empty', () => {
      expect(evaluate('for x in [] return x').value).toEqual([]);
    });

    it('for accessing outer context', () => {
      expect(evaluate('for x in [1,2,3] return x + base', { base: 100 }).value).toEqual([
        101, 102, 103,
      ]);
    });
  });

  describe('quantified expressions', () => {
    it('some with multiple bindings satisfies cross-product', () => {
      expect(evaluate('some x in [1,2], y in [3,4] satisfies x + y = 5').value).toBe(true);
      expect(evaluate('some x in [1,2], y in [3,4] satisfies x + y = 100').value).toBe(false);
    });

    it('every with multiple bindings — all Cartesian combos must satisfy', () => {
      // x=2,y=1:✓ x=2,y=2:✗ → false
      expect(evaluate('every x in [2,4,6], y in [1,2] satisfies x > y').value).toBe(false);
      // all combos satisfy: x always > 0
      expect(evaluate('every x in [2,4,6], y in [1,2] satisfies x > 0').value).toBe(true);
    });

    it('some with builtin predicate', () => {
      expect(evaluate('some x in ["hello","world"] satisfies starts with(x, "w")').value).toBe(
        true,
      );
    });

    it('every with complex predicate', () => {
      expect(evaluate('every x in [2,4,6] satisfies even(x)').value).toBe(true);
    });
  });

  describe('between', () => {
    it('date between dates', () => {
      expect(
        evaluate('date("2024-06-15") between date("2024-01-01") and date("2024-12-31")').value,
      ).toBe(true);
    });

    it('cross-type between returns null', () => {
      expect(evaluate('1 between "a" and "z"').value).toBeNull();
    });
  });
});
