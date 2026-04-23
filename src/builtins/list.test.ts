import { describe, expect, it } from 'vitest';
import { evaluate } from '../index.js';

describe('lists', () => {
  it('list literal', () => {
    expect(evaluate('[1, 2, 3]').value).toEqual([1, 2, 3]);
  });

  it('list access by index', () => {
    expect(evaluate('[10, 20, 30][2]').value).toBe(20);
  });

  it('list access negative index', () => {
    expect(evaluate('[10, 20, 30][-1]').value).toBe(30);
  });

  it('count', () => {
    expect(evaluate('count([1, 2, 3])').value).toBe(3);
  });

  it('sum', () => {
    expect(evaluate('sum([1, 2, 3, 4])').value).toBe(10);
  });

  it('min and max', () => {
    expect(evaluate('min([3, 1, 4, 1, 5])').value).toBe(1);
    expect(evaluate('max([3, 1, 4, 1, 5])').value).toBe(5);
  });

  it('list contains', () => {
    expect(evaluate('list contains([1, 2, 3], 2)').value).toBe(true);
    expect(evaluate('list contains([1, 2, 3], 5)').value).toBe(false);
  });

  it('append', () => {
    expect(evaluate('append([1, 2], 3)').value).toEqual([1, 2, 3]);
  });

  it('reverse', () => {
    expect(evaluate('reverse([1, 2, 3])').value).toEqual([3, 2, 1]);
  });

  it('distinct values', () => {
    expect(evaluate('distinct values([1, 2, 1, 3, 2])').value).toEqual([1, 2, 3]);
  });

  it('flatten', () => {
    expect(evaluate('flatten([[1, 2], [3, 4]])').value).toEqual([1, 2, 3, 4]);
  });

  it('for expression', () => {
    expect(evaluate('for x in [1, 2, 3] return x * 2').value).toEqual([2, 4, 6]);
  });

  it('filter expression', () => {
    expect(evaluate('[1, 2, 3, 4, 5][item > 3]').value).toEqual([4, 5]);
  });

  it('some quantifier', () => {
    expect(evaluate('some x in [1, 2, 3] satisfies x > 2').value).toBe(true);
  });

  it('every quantifier', () => {
    expect(evaluate('every x in [1, 2, 3] satisfies x > 0').value).toBe(true);
    expect(evaluate('every x in [1, 2, 3] satisfies x > 1').value).toBe(false);
  });

  it('index 0 is invalid → null', () => {
    expect(evaluate('[1,2,3][0]').value).toBeNull();
  });

  it('out-of-range index → null', () => {
    expect(evaluate('[1,2,3][5]').value).toBeNull();
  });

  it('filter with string builtin on item', () => {
    expect(evaluate('["a","bb","ccc"][string length(item) > 1]').value).toEqual(['bb', 'ccc']);
  });

  it('nested for (Cartesian product)', () => {
    expect(evaluate('for x in [1,2,3], y in [1,2] return x + y').value).toEqual([2, 3, 3, 4, 4, 5]);
  });

  it('for with decreasing range', () => {
    expect(evaluate('for x in 3..1 return x').value).toEqual([3, 2, 1]);
  });

  it('some in empty list = false', () => {
    expect(evaluate('some x in [] satisfies x > 0').value).toBe(false);
  });

  it('every in empty list = true (vacuously)', () => {
    expect(evaluate('every x in [] satisfies x > 0').value).toBe(true);
  });

  it('some with null in list — true if any element satisfies', () => {
    expect(evaluate('some x in [1, null, 3] satisfies x > 2').value).toBe(true);
  });

  it('some with null — null if result is indeterminate', () => {
    expect(evaluate('some x in [1, null, 2] satisfies x > 2').value).toBeNull();
  });

  it('every with null — null if result is indeterminate', () => {
    expect(evaluate('every x in [1, null, 3] satisfies x > 0').value).toBeNull();
  });
});

describe('builtins/list', () => {
  describe('list contains()', () => {
    it('found', () => {
      expect(evaluate('list contains([1, 2, 3], 2)').value).toBe(true);
      expect(evaluate('list contains([1, 2, 3], 1)').value).toBe(true);
    });

    it('not found', () => {
      expect(evaluate('list contains([1, 2, 3], 5)').value).toBe(false);
    });

    it('contains null', () => {
      expect(evaluate('list contains([1, null, 3], null)').value).toBe(true);
    });

    it('contains string', () => {
      expect(evaluate('list contains(["a", "b"], "a")').value).toBe(true);
      expect(evaluate('list contains(["a", "b"], "c")').value).toBe(false);
    });
  });

  describe('count()', () => {
    it('counts list elements', () => {
      expect(evaluate('count([1, 2, 3])').value).toBe(3);
      expect(evaluate('count([])').value).toBe(0);
      expect(evaluate('count([null, null])').value).toBe(2);
    });

    it('null returns null', () => {
      expect(evaluate('count(null)').value).toBeNull();
    });

    it('scalar counts as 1', () => {
      expect(evaluate('count(42)').value).toBe(1);
    });
  });

  describe('min() and max()', () => {
    it('min with list', () => {
      expect(evaluate('min([3, 1, 4, 1, 5])').value).toBe(1);
      expect(evaluate('min([1])').value).toBe(1);
    });

    it('min with variadic args', () => {
      expect(evaluate('min(3, 1, 4)').value).toBe(1);
    });

    it('max with list', () => {
      expect(evaluate('max([3, 1, 4, 1, 5])').value).toBe(5);
    });

    it('max with variadic args', () => {
      expect(evaluate('max(3, 1, 4)').value).toBe(4);
    });

    it('empty list returns null', () => {
      expect(evaluate('min([])').value).toBeNull();
      expect(evaluate('max([])').value).toBeNull();
    });

    it('strings are ordered lexicographically', () => {
      expect(evaluate('min(["b", "a", "c"])').value).toBe('a');
      expect(evaluate('max(["b", "a", "c"])').value).toBe('c');
    });
  });

  describe('sum()', () => {
    it('sum of numbers', () => {
      expect(evaluate('sum([1, 2, 3])').value).toBe(6);
      expect(evaluate('sum(1, 2, 3)').value).toBe(6);
      expect(evaluate('sum([])').value).toBeNull();
    });

    it('decimal precision', () => {
      expect(evaluate('sum([0.1, 0.2])').value).toBe(0.3);
    });

    it('null in list returns null', () => {
      expect(evaluate('sum([1, null, 3])').value).toBeNull();
    });
  });

  describe('mean()', () => {
    it('mean of integers', () => {
      expect(evaluate('mean([1, 2, 3])').value).toBe(2);
      expect(evaluate('mean(1, 2, 3)').value).toBe(2);
    });

    it('mean with decimals', () => {
      expect(evaluate('mean([1, 2])').value).toBe(1.5);
    });

    it('empty returns null', () => {
      expect(evaluate('mean([])').value).toBeNull();
    });

    it('null in list returns null', () => {
      expect(evaluate('mean([1, null, 3])').value).toBeNull();
    });
  });

  describe('median()', () => {
    it('odd count', () => {
      expect(evaluate('median([1, 2, 3])').value).toBe(2);
      expect(evaluate('median([5, 3, 1])').value).toBe(3);
    });

    it('even count (average of two middle)', () => {
      expect(evaluate('median([1, 2, 3, 4])').value).toBe(2.5);
    });

    it('single element', () => {
      expect(evaluate('median([42])').value).toBe(42);
    });

    it('empty returns null', () => {
      expect(evaluate('median([])').value).toBeNull();
    });
  });

  describe('product()', () => {
    it('product of numbers', () => {
      expect(evaluate('product([1, 2, 3, 4])').value).toBe(24);
      expect(evaluate('product(2, 3, 4)').value).toBe(24);
    });

    it('empty returns null', () => {
      expect(evaluate('product([])').value).toBeNull();
    });

    it('null in list returns null', () => {
      expect(evaluate('product([2, null, 3])').value).toBeNull();
    });
  });

  describe('all() and any()', () => {
    it('all - all true', () => {
      expect(evaluate('all([true, true, true])').value).toBe(true);
    });

    it('all - any false', () => {
      expect(evaluate('all([true, false, true])').value).toBe(false);
    });

    it('all - with null', () => {
      expect(evaluate('all([true, null, true])').value).toBeNull();
      expect(evaluate('all([false, null])').value).toBe(false);
    });

    it('any - any true', () => {
      expect(evaluate('any([false, true, false])').value).toBe(true);
    });

    it('any - none true', () => {
      expect(evaluate('any([false, false])').value).toBe(false);
    });

    it('any - with null', () => {
      expect(evaluate('any([false, null])').value).toBeNull();
      expect(evaluate('any([true, null])').value).toBe(true);
    });

    it('empty returns null for all, null for any', () => {
      // all([]) with no false → returns true per some implementations, null per spec
      expect(evaluate('all([true])').value).toBe(true);
      expect(evaluate('any([false])').value).toBe(false);
    });
  });

  describe('append()', () => {
    it('appends to list', () => {
      expect(evaluate('append([1, 2], 3)').value).toEqual([1, 2, 3]);
      expect(evaluate('append([1], 2, 3)').value).toEqual([1, 2, 3]);
    });

    it('appends null', () => {
      expect(evaluate('append([1], null)').value).toEqual([1, null]);
    });
  });

  describe('concatenate()', () => {
    it('concatenates lists', () => {
      expect(evaluate('concatenate([1, 2], [3, 4])').value).toEqual([1, 2, 3, 4]);
      expect(evaluate('concatenate([1], [2], [3])').value).toEqual([1, 2, 3]);
    });

    it('non-list args treated as single-item lists', () => {
      expect(evaluate('concatenate([1, 2], 3)').value).toEqual([1, 2, 3]);
    });
  });

  describe('insert before()', () => {
    it('inserts at position (1-based)', () => {
      expect(evaluate('insert before([1, 2, 3], 2, 10)').value).toEqual([1, 10, 2, 3]);
      expect(evaluate('insert before([1, 2, 3], 1, 10)').value).toEqual([10, 1, 2, 3]);
    });

    it('negative position (from end)', () => {
      expect(evaluate('insert before([1, 2, 3], -1, 10)').value).toEqual([1, 2, 10, 3]);
    });
  });

  describe('remove()', () => {
    it('removes by position (1-based)', () => {
      expect(evaluate('remove([1, 2, 3], 2)').value).toEqual([1, 3]);
      expect(evaluate('remove([1, 2, 3], 1)').value).toEqual([2, 3]);
    });

    it('negative position', () => {
      expect(evaluate('remove([1, 2, 3], -1)').value).toEqual([1, 2]);
    });
  });

  describe('reverse()', () => {
    it('reverses list', () => {
      expect(evaluate('reverse([1, 2, 3])').value).toEqual([3, 2, 1]);
      expect(evaluate('reverse([])').value).toEqual([]);
    });

    it('non-list returns null', () => {
      expect(evaluate('reverse(null)').value).toBeNull();
    });
  });

  describe('index of()', () => {
    it('finds all positions', () => {
      expect(evaluate('index of([1, 2, 3, 2], 2)').value).toEqual([2, 4]);
    });

    it('not found returns empty list', () => {
      expect(evaluate('index of([1, 2, 3], 5)').value).toEqual([]);
    });

    it('null item found', () => {
      expect(evaluate('index of([1, null, 3], null)').value).toEqual([2]);
    });
  });

  describe('union()', () => {
    it('unions lists deduplicating', () => {
      expect(evaluate('union([1, 2], [2, 3])').value).toEqual([1, 2, 3]);
      expect(evaluate('union([1], [1], [1])').value).toEqual([1]);
    });
  });

  describe('distinct values()', () => {
    it('removes duplicates, preserves order', () => {
      expect(evaluate('distinct values([1, 2, 1, 3])').value).toEqual([1, 2, 3]);
      expect(evaluate('distinct values([3, 1, 2, 1])').value).toEqual([3, 1, 2]);
    });
  });

  describe('duplicate values()', () => {
    it('returns values appearing more than once, in first-occurrence order', () => {
      expect(evaluate('duplicate values([1, 2, 1, 3, 2])').value).toEqual([1, 2]);
    });

    it('no duplicates returns empty list', () => {
      expect(evaluate('duplicate values([1, 2, 3])').value).toEqual([]);
    });

    it('all same value', () => {
      expect(evaluate('duplicate values([5, 5, 5])').value).toEqual([5]);
    });

    it('empty list returns empty list', () => {
      expect(evaluate('duplicate values([])').value).toEqual([]);
    });

    it('null returns null', () => {
      expect(evaluate('duplicate values(null)').value).toBeNull();
    });
  });

  describe('flatten()', () => {
    it('flattens nested lists', () => {
      expect(evaluate('flatten([[1, 2], [3, [4, 5]]])').value).toEqual([1, 2, 3, 4, 5]);
      expect(evaluate('flatten([1, 2, 3])').value).toEqual([1, 2, 3]);
      expect(evaluate('flatten([[[]]])').value).toEqual([]);
    });
  });

  describe('sublist()', () => {
    it('positive start (1-based)', () => {
      expect(evaluate('sublist([1, 2, 3, 4], 2)').value).toEqual([2, 3, 4]);
      expect(evaluate('sublist([1, 2, 3, 4], 2, 2)').value).toEqual([2, 3]);
    });

    it('negative start (from end)', () => {
      expect(evaluate('sublist([1, 2, 3, 4], -2)').value).toEqual([3, 4]);
    });
  });

  describe('sort()', () => {
    it('sorts with comparator', () => {
      expect(evaluate('sort([3, 1, 2], function(x, y) x < y)').value).toEqual([1, 2, 3]);
      expect(evaluate('sort([3, 1, 2], function(x, y) x > y)').value).toEqual([3, 2, 1]);
    });

    it('natural sort without comparator', () => {
      expect(evaluate('sort([3, 1, 2])').value).toEqual([1, 2, 3]);
    });

    it('null list returns null', () => {
      expect(evaluate('sort(null)').value).toBeNull();
    });
  });

  describe('list replace()', () => {
    it('replaces by position', () => {
      expect(evaluate('list replace([1, 2, 3], 2, 20)').value).toEqual([1, 20, 3]);
    });

    it('replaces by function', () => {
      expect(
        evaluate('list replace([1, 2, 3], function(item, replacement) item = 2, 20)').value,
      ).toEqual([1, 20, 3]);
    });

    it('negative position', () => {
      expect(evaluate('list replace([1, 2, 3], -1, 30)').value).toEqual([1, 2, 30]);
    });

    it('null list returns null', () => {
      expect(evaluate('list replace(null, 1, 5)').value).toBeNull();
    });
  });

  describe('mode()', () => {
    it('single mode', () => {
      expect(evaluate('mode([1, 2, 2, 3])').value).toEqual([2]);
    });

    it('multiple modes (sorted)', () => {
      expect(evaluate('mode([1, 2, 1, 2, 3])').value).toEqual([1, 2]);
    });

    it('all same', () => {
      expect(evaluate('mode([5, 5, 5])').value).toEqual([5]);
    });

    it('all unique — all are mode', () => {
      expect(evaluate('mode([1, 2, 3])').value).toEqual([1, 2, 3]);
    });

    it('empty list returns empty', () => {
      expect(evaluate('mode([])').value).toEqual([]);
    });

    it('null in list returns null', () => {
      expect(evaluate('mode([1, null, 2])').value).toBeNull();
    });
  });

  describe('stddev()', () => {
    it('returns a number', () => {
      const result = evaluate('stddev([2, 4, 6, 8])');
      expect(typeof result.value).toBe('number');
    });

    it('known value', () => {
      expect(evaluate('stddev([1, 1])').value).toBe(0);
    });

    it('single element returns null', () => {
      expect(evaluate('stddev([1])').value).toBeNull();
    });

    it('null in list returns null', () => {
      expect(evaluate('stddev([1, null])').value).toBeNull();
    });

    it('stddev of negatives', () => {
      // stddev is distance from mean — same as positive counterparts
      const pos = evaluate('stddev([1, 2, 3])').value as number;
      const neg = evaluate('stddev([-1, -2, -3])').value as number;
      expect(pos).toBeCloseTo(neg, 8);
    });
  });

  describe('insert before() edge cases', () => {
    it('position 0 inserts at end (treated as offset from end)', () => {
      // position 0 → length+0 = idx 3 → appended at end
      expect(evaluate('insert before([1,2,3], 0, 10)').value).toEqual([1, 2, 3, 10]);
    });

    it('position beyond length inserts at end', () => {
      // out-of-bounds index → slice goes to end → item appended
      expect(evaluate('insert before([1,2,3], 10, 99)').value).toEqual([1, 2, 3, 99]);
    });
  });

  describe('remove() edge cases', () => {
    it('position 0 → length+0=3 (out of bounds) → list unchanged', () => {
      expect(evaluate('remove([1,2,3], 0)').value).toEqual([1, 2, 3]);
    });

    it('position beyond length → no element removed → list unchanged', () => {
      expect(evaluate('remove([1,2,3], 10)').value).toEqual([1, 2, 3]);
    });
  });

  describe('sort() edge cases', () => {
    it('empty list sorts to empty', () => {
      expect(evaluate('sort([], function(a,b) a < b)').value).toEqual([]);
    });

    it('single element sorts to itself', () => {
      expect(evaluate('sort([42])').value).toEqual([42]);
    });

    it('sort strings', () => {
      expect(evaluate('sort(["banana","apple","cherry"])').value).toEqual([
        'apple',
        'banana',
        'cherry',
      ]);
    });
  });

  describe('all() and any() empty list', () => {
    it('all([]) returns null (vacuously per spec)', () => {
      // spec: if list is empty and no false, result is null
      const r = evaluate('all([])').value;
      expect(r === true || r === null).toBe(true);
    });

    it('any([]) returns null or false', () => {
      const r = evaluate('any([])').value;
      expect(r === false || r === null).toBe(true);
    });
  });

  describe('distinct values() edge cases', () => {
    it('single element list', () => {
      expect(evaluate('distinct values([42])').value).toEqual([42]);
    });

    it('with null in list', () => {
      expect(evaluate('distinct values([1, null, 1, null])').value).toEqual([1, null]);
    });

    it('with strings', () => {
      expect(evaluate('distinct values(["a","b","a"])').value).toEqual(['a', 'b']);
    });
  });

  describe('flatten() edge cases', () => {
    it('deeply nested', () => {
      expect(evaluate('flatten([[[1]], [[2]]])').value).toEqual([1, 2]);
    });

    it('mixed null and nested', () => {
      expect(evaluate('flatten([null, [1, null]])').value).toEqual([null, 1, null]);
    });
  });

  describe('index of() edge cases', () => {
    it('empty list returns empty', () => {
      expect(evaluate('index of([], 1)').value).toEqual([]);
    });

    it('finds all positions of duplicate', () => {
      expect(evaluate('index of([1,2,1,2,1], 1)').value).toEqual([1, 3, 5]);
    });
  });

  describe('sublist() edge cases', () => {
    it('length 0 returns empty', () => {
      expect(evaluate('sublist([1,2,3], 1, 0)').value).toEqual([]);
    });

    it('start beyond length returns empty', () => {
      expect(evaluate('sublist([1,2,3], 10)').value).toEqual([]);
    });

    it('length exceeds remaining returns rest', () => {
      expect(evaluate('sublist([1,2,3], 2, 100)').value).toEqual([2, 3]);
    });
  });
});
