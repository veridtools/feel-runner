import { describe, expect, it } from 'vitest';
import { evaluate } from '../index.js';

describe('contexts', () => {
  it('context literal', () => {
    expect(evaluate('{a: 1, b: 2}').value).toEqual({ a: 1, b: 2 });
  });

  it('context property access', () => {
    expect(evaluate('{a: 1}.a').value).toBe(1);
  });

  it('nested context', () => {
    expect(evaluate('{a: {b: 42}}.a.b').value).toBe(42);
  });

  it('context from variable', () => {
    expect(evaluate('x.name', { x: { name: 'Alice' } }).value).toBe('Alice');
  });

  it('get value', () => {
    expect(evaluate('get value({a: 1}, "a")').value).toBe(1);
  });

  it('get entries', () => {
    const result = evaluate('get entries({a: 1, b: 2})');
    expect(Array.isArray(result.value)).toBe(true);
    expect((result.value as Array<{ key: string; value: number }>).length).toBe(2);
  });

  it('context put', () => {
    expect(evaluate('context put({a: 1}, "b", 2)').value).toEqual({ a: 1, b: 2 });
  });

  it('context merge', () => {
    expect(evaluate('context merge([{a: 1}, {b: 2}])').value).toEqual({ a: 1, b: 2 });
  });

  it('context equality', () => {
    expect(evaluate('{a: 1} = {a: 1}').value).toBe(true);
    expect(evaluate('{a: 1} = {a: 2}').value).toBe(false);
  });

  it('missing key returns null', () => {
    expect(evaluate('{a: 1}.z').value).toBeNull();
  });

  it('path access on list of contexts returns list of values', () => {
    expect(evaluate('[{a:1},{a:2},{a:3}].a').value).toEqual([1, 2, 3]);
  });

  it('filter context list by property', () => {
    expect(evaluate('[{a:1,b:2},{a:3,b:4}][a > 1]').value).toMatchObject([{ a: 3, b: 4 }]);
  });

  it('null property value is accessible', () => {
    expect(evaluate('{a: null}.a').value).toBeNull();
  });

  describe('computed context key', () => {
    it('string literal key in brackets', () => {
      expect(evaluate('{ ["ab"]: 1 }.ab').value).toBe(1);
    });

    it('concatenated key expression', () => {
      expect(evaluate('{ ["x" + "y"]: 99 }.xy').value).toBe(99);
    });

    it('builtin-computed key', () => {
      expect(evaluate('{ [upper case("key")]: 7 }.KEY').value).toBe(7);
    });

    it('non-string key returns null', () => {
      expect(evaluate('{ [1]: "a" }').value).toBeNull();
    });

    it('null key returns null', () => {
      expect(evaluate('{ [null]: "a" }').value).toBeNull();
    });
  });

  describe('context put() edge cases', () => {
    it('adds new key', () => {
      expect(evaluate('context put({a: 1}, "b", 2)').value).toEqual({ a: 1, b: 2 });
    });

    it('overwrites existing key', () => {
      expect(evaluate('context put({a: 1, b: 2}, "a", 99)').value).toEqual({ a: 99, b: 2 });
    });

    it('nested path creates deep structure', () => {
      const r = evaluate('context put({}, "a", 1)').value as Record<string, unknown>;
      expect(r?.a).toBe(1);
    });

    it('null context returns null', () => {
      expect(evaluate('context put(null, "a", 1)').value).toBeNull();
    });
  });

  describe('get value() edge cases', () => {
    it('existing key returns value', () => {
      expect(evaluate('get value({a: 42}, "a")').value).toBe(42);
    });

    it('missing key returns null', () => {
      expect(evaluate('get value({a: 1}, "z")').value).toBeNull();
    });

    it('null context returns null', () => {
      expect(evaluate('get value(null, "a")').value).toBeNull();
    });
  });

  describe('context merge() edge cases', () => {
    it('later context overrides earlier on conflict', () => {
      expect(evaluate('context merge([{a: 1, b: 2}, {b: 99}])').value).toEqual({ a: 1, b: 99 });
    });

    it('empty list returns empty context', () => {
      expect(evaluate('context merge([])').value).toEqual({});
    });

    it('single context returns same context', () => {
      expect(evaluate('context merge([{x: 5}])').value).toEqual({ x: 5 });
    });
  });

  describe('get entries() edge cases', () => {
    it('empty context returns empty list', () => {
      const r = evaluate('get entries({})').value as unknown[];
      expect(r).toEqual([]);
    });

    it('entries have key and value fields', () => {
      const entries = evaluate('get entries({a: 1})').value as Array<{
        key: string;
        value: number;
      }>;
      expect(entries[0]?.key).toBe('a');
      expect(entries[0]?.value).toBe(1);
    });
  });

  describe('path expressions — deep and edge cases', () => {
    it('null value property accessible', () => {
      expect(evaluate('{a: null}.a').value).toBeNull();
    });

    it('access property on null returns null', () => {
      expect(evaluate('{a: null}.a').value).toBeNull();
    });

    it('deeply nested access', () => {
      expect(evaluate('{a: {b: {c: 42}}}.a.b.c').value).toBe(42);
    });

    it('list path returns list of values', () => {
      expect(evaluate('[{x:1},{x:2},{x:3}].x').value).toEqual([1, 2, 3]);
    });

    it('property missing in one list element returns null in that position', () => {
      expect(evaluate('[{x:1},{y:2}].x').value).toEqual([1, null]);
    });
  });
});

describe('builtins/context', () => {
  describe('get value()', () => {
    it('returns value by key', () => {
      expect(evaluate('get value({a: 1, b: 2}, "a")').value).toBe(1);
      expect(evaluate('get value({a: 1, b: 2}, "b")').value).toBe(2);
    });

    it('missing key returns null', () => {
      expect(evaluate('get value({a: 1}, "missing")').value).toBeNull();
    });

    it('non-context returns null', () => {
      expect(evaluate('get value(null, "a")').value).toBeNull();
      expect(evaluate('get value(1, "a")').value).toBeNull();
    });
  });

  describe('get entries()', () => {
    it('returns list of key-value pairs', () => {
      const result = evaluate('get entries({a: 1})');
      const entries = result.value as Array<{ key: string; value: number }>;
      expect(entries.length).toBe(1);
      expect(entries[0]?.key).toBe('a');
      expect(entries[0]?.value).toBe(1);
    });

    it('empty context returns empty list', () => {
      const result = evaluate('get entries({})');
      expect((result.value as unknown[]).length).toBe(0);
    });

    it('non-context returns null', () => {
      expect(evaluate('get entries(null)').value).toBeNull();
      expect(evaluate('get entries(1)').value).toBeNull();
    });
  });

  describe('context()', () => {
    it('constructs context from entries list', () => {
      expect(evaluate('context([{key: "a", value: 1}, {key: "b", value: 2}])').value).toEqual({
        a: 1,
        b: 2,
      });
    });

    it('empty list', () => {
      expect(evaluate('context([])').value).toEqual({});
    });

    it('null values preserved', () => {
      expect(evaluate('context([{key: "a", value: null}])').value).toEqual({ a: null });
    });

    it('duplicate key returns null', () => {
      expect(evaluate('context([{key: "a", value: 1}, {key: "a", value: 2}])').value).toBeNull();
    });
  });

  describe('context put()', () => {
    it('adds new key', () => {
      expect(evaluate('context put({a: 1}, "b", 2)').value).toEqual({ a: 1, b: 2 });
    });

    it('overwrites existing key', () => {
      expect(evaluate('context put({a: 1}, "a", 99)').value).toEqual({ a: 99 });
    });

    it('nested path with keys list', () => {
      expect(evaluate('context put({a: {b: 1}}, ["a", "b"], 42)').value).toEqual({ a: { b: 42 } });
    });

    it('creates nested path if missing', () => {
      const result = evaluate('context put({}, ["a", "b"], 42)').value as Record<string, unknown>;
      expect((result.a as Record<string, unknown>).b).toBe(42);
    });
  });

  describe('context merge()', () => {
    it('merges two contexts', () => {
      expect(evaluate('context merge([{a: 1}, {b: 2}])').value).toEqual({ a: 1, b: 2 });
    });

    it('later entries win on conflict', () => {
      expect(evaluate('context merge([{a: 1}, {a: 2}])').value).toEqual({ a: 2 });
    });

    it('multiple contexts', () => {
      expect(evaluate('context merge([{a: 1}, {b: 2}, {c: 3}])').value).toEqual({
        a: 1,
        b: 2,
        c: 3,
      });
    });

    it('empty list returns empty context', () => {
      expect(evaluate('context merge([])').value).toEqual({});
    });

    it('non-context in list returns null', () => {
      expect(evaluate('context merge([{a: 1}, 3])').value).toBeNull();
    });
  });

  describe('get value edge cases', () => {
    it('null key returns null', () => {
      expect(evaluate('get value({a: 1}, null)').value).toBeNull();
    });
  });

  describe('context put edge cases', () => {
    it('sets null value', () => {
      expect(evaluate('context put({a: 1}, "x", null)').value).toEqual({ a: 1, x: null });
    });

    it('nested path on non-context target returns null', () => {
      expect(evaluate('context put({a: 1}, ["a", "b"], 2)').value).toBeNull();
    });
  });
});
