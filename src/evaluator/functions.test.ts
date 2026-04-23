import { describe, expect, it } from 'vitest';
import { evaluate } from '../index.js';

describe('functions', () => {
  it('function definition and invocation', () => {
    expect(evaluate('(function(x) x * 2)(5)').value).toBe(10);
  });

  it('function in context', () => {
    expect(evaluate('{double: function(x) x * 2, result: double(3)}.result').value).toBe(6);
  });

  it('function passed as value', () => {
    const fn = {
      kind: 'function',
      params: ['x'],
      body: (args: unknown[]) => (args[0] as number) + 1,
    };
    expect(evaluate('f(10)', { f: fn as never }).value).toBe(11);
  });

  it('named parameter invocation', () => {
    expect(evaluate('substring(string: "hello", start position: 2, length: 3)').value).toBe('ell');
  });

  it('if-then-else', () => {
    expect(evaluate('if 3 > 2 then "yes" else "no"').value).toBe('yes');
    expect(evaluate('if 1 > 2 then "yes" else "no"').value).toBe('no');
  });

  it('nested if-then-else', () => {
    expect(
      evaluate('if x > 100 then "high" else if x > 50 then "medium" else "low"', { x: 75 }).value,
    ).toBe('medium');
  });

  it('instance of', () => {
    expect(evaluate('1 instance of number').value).toBe(true);
    expect(evaluate('"hello" instance of string').value).toBe(true);
    expect(evaluate('true instance of boolean').value).toBe(true);
    expect(evaluate('1 instance of string').value).toBe(false);
  });

  it('multi-parameter function', () => {
    expect(evaluate('(function(x, y) x + y)(3, 4)').value).toBe(7);
    expect(evaluate('(function(a, b, c) a + b + c)(1, 2, 3)').value).toBe(6);
  });

  it('typed parameter — valid type is accepted', () => {
    expect(evaluate('(function(x: number) x + 1)(5)').value).toBe(6);
  });

  it('typed parameter — wrong type returns null', () => {
    expect(evaluate('(function(x: number) x + 1)("a")').value).toBeNull();
  });

  it('function stored in context', () => {
    expect(evaluate('{f: function(x) x + 1}.f(5)').value).toBe(6);
  });

  it('named arguments reordering', () => {
    expect(evaluate('(function(a, b) a - b)(b: 1, a: 5)').value).toBe(4);
  });

  describe('recursion', () => {
    it('factorial via context self-reference', () => {
      const expr =
        '{fact: function(n) if n <= 1 then 1 else n * fact(n - 1), result: fact(5)}.result';
      expect(evaluate(expr).value).toBe(120);
    });

    it('fibonacci', () => {
      const expr =
        '{fib: function(n) if n <= 1 then n else fib(n-1) + fib(n-2), result: fib(7)}.result';
      expect(evaluate(expr).value).toBe(13);
    });
  });

  describe('closures', () => {
    it('function closes over outer context variable', () => {
      expect(evaluate('(function(x) x + base)(5)', { base: 10 }).value).toBe(15);
    });

    it('higher-order: function returning function result', () => {
      const expr = '{add: function(x) function(y) x + y, add5: add(5), result: add5(3)}.result';
      expect(evaluate(expr).value).toBe(8);
    });
  });

  describe('function passed to builtin', () => {
    it('sort with custom comparator', () => {
      expect(evaluate('sort([3,1,2], function(a,b) a < b)').value).toEqual([1, 2, 3]);
    });

    it('list replace with function predicate (2-param signature: item, replacement)', () => {
      expect(evaluate('list replace([1,2,3,4], function(e, r) e > 2, 99)').value).toEqual([
        1, 2, 99, 99,
      ]);
    });
  });

  describe('named argument edge cases', () => {
    it('unknown named arg returns null', () => {
      expect(evaluate('(function(a, b) a + b)(a: 1, c: 2)').value).toBeNull();
    });

    it('named args work for builtins (named parameter call)', () => {
      expect(evaluate('floor(n: 3.7)').value).toBe(3);
    });
  });
});
