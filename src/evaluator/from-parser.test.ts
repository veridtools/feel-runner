/**
 * Evaluation tests adapted from @veridtools/feel-parser language.test.ts and
 * index.test.ts — those files verify parsing only; this file verifies the
 * evaluated output of the same expressions.
 *
 * Coverage focus: patterns not already covered by the existing unit tests in
 * tests/feel/ or the generated TCK / fixture tests in tests/tck/ and
 * tests/fixtures/.
 */
import { describe, expect, it } from 'vitest';
import { evaluate, unaryTest } from '../index.js';

// ── arithmetic ────────────────────────────────────────────────────────────────

describe('arithmetic — from parser coverage', () => {
  it('large number precision', () => {
    expect(evaluate('1000000 + 999999').value).toBe(1999999);
  });

  it('decimal precision chain', () => {
    expect(evaluate('0.1 + 0.2 + 0.3').value).toBe(0.6);
    expect(evaluate('1.005 * 100').value).toBe(100.5);
    expect(evaluate('10 / 3 * 3').value).toBe(10);
  });

  it('null propagation through all arithmetic ops', () => {
    expect(evaluate('null + 1').value).toBeNull();
    expect(evaluate('1 + null').value).toBeNull();
    expect(evaluate('null - 1').value).toBeNull();
    expect(evaluate('null * 2').value).toBeNull();
    expect(evaluate('null / 2').value).toBeNull();
    expect(evaluate('null ** 2').value).toBeNull();
    expect(evaluate('-null').value).toBeNull();
  });

  it('division / 0 returns null', () => {
    expect(evaluate('1 / 0').value).toBeNull();
    expect(evaluate('0 / 0').value).toBeNull();
    expect(evaluate('-5 / 0').value).toBeNull();
    expect(evaluate('0.0 / 0.0').value).toBeNull();
  });

  it('0 ** 0 = 1', () => {
    expect(evaluate('0 ** 0').value).toBe(1);
  });

  it('exponent chain: 2 ** 3 ** 2 = 64 (left-associative)', () => {
    expect(evaluate('2 ** 3 ** 2').value).toBe(64);
    expect(evaluate('(2 ** 3) ** 2').value).toBe(64);
  });

  it('complex precedence: 2 + 3 * 4 - 8 / 2 ** 2 = 12', () => {
    expect(evaluate('2 + 3 * 4 - 8 / 2 ** 2').value).toBe(12);
  });

  it('leading-decimal number literals', () => {
    expect(evaluate('.872').value).toBeCloseTo(0.872, 10);
    expect(evaluate('-.872').value).toBeCloseTo(-0.872, 10);
  });

  it('no-space arithmetic', () => {
    expect(evaluate('10+5').value).toBe(15);
    expect(evaluate('-10*-5').value).toBe(50);
    expect(evaluate('-10+-5').value).toBe(-15);
    expect(evaluate('-10--5').value).toBe(-5);
    expect(evaluate('-10/-5').value).toBe(2);
  });
});

// ── logic ─────────────────────────────────────────────────────────────────────

describe('logic — three-valued', () => {
  it('and chains with null', () => {
    expect(evaluate('true and null and false').value).toBe(false);
    expect(evaluate('false and null and true').value).toBe(false);
    expect(evaluate('true and null and true').value).toBeNull();
    expect(evaluate('true and true and true').value).toBe(true);
  });

  it('or chains with null', () => {
    expect(evaluate('false or null or true').value).toBe(true);
    expect(evaluate('false or null or false').value).toBeNull();
    expect(evaluate('false or false or false').value).toBe(false);
  });

  it('not(null) = null', () => {
    expect(evaluate('not(null)').value).toBeNull();
  });

  it('not combined with and/or', () => {
    expect(evaluate('not(false) and true').value).toBe(true);
    expect(evaluate('not(true) or false').value).toBe(false);
  });
});

describe('logic — if / between / in', () => {
  it('if null = null then ok', () => {
    expect(evaluate('if null = null then "ok" else "fail"').value).toBe('ok');
  });

  it('nested if with score tiers', () => {
    expect(
      evaluate('if score >= 90 then "A" else if score >= 80 then "B" else "C"', { score: 95 })
        .value,
    ).toBe('A');
    expect(
      evaluate('if score >= 90 then "A" else if score >= 80 then "B" else "C"', { score: 82 })
        .value,
    ).toBe('B');
    expect(
      evaluate('if score >= 90 then "A" else if score >= 80 then "B" else "C"', { score: 70 })
        .value,
    ).toBe('C');
  });

  it('between — string comparisons', () => {
    expect(evaluate('"b" between "a" and "c"').value).toBe(true);
    expect(evaluate('"d" between "a" and "c"').value).toBe(false);
    expect(evaluate('"A" between "a" and "z"').value).toBe(false);
  });

  it('between — cross-type returns null', () => {
    expect(evaluate('1 between "a" and "z"').value).toBeNull();
  });

  it('in — exclusive-start range', () => {
    expect(evaluate('1 in (1..5]').value).toBe(false);
    expect(evaluate('2 in (1..5]').value).toBe(true);
  });

  it('in — null in list with null element', () => {
    expect(evaluate('null in [1, 2, null]').value).toBe(true);
    expect(evaluate('null in [1, 2]').value).toBe(false);
  });
});

// ── quantifiers ───────────────────────────────────────────────────────────────

describe('quantifiers — edge cases from parser', () => {
  it('some with empty list → false', () => {
    expect(evaluate('some x in [] satisfies x > 0').value).toBe(false);
  });

  it('every with empty list → true (vacuously)', () => {
    expect(evaluate('every x in [] satisfies x > 0').value).toBe(true);
  });

  it('some x in [], y in [3, 4] → false (no elements from empty list)', () => {
    expect(evaluate('some x in [], y in [3, 4] satisfies x + y = 5').value).toBe(false);
  });

  it('every x in [1, 2], y in [3, 4] satisfies x + y > 3 → true', () => {
    expect(evaluate('every x in [1, 2], y in [3, 4] satisfies x + y > 3').value).toBe(true);
  });

  it('some x in [1, 2], y in [1, 2] satisfies x + y > 3 → true (2+2=4)', () => {
    expect(evaluate('some x in [1, 2], y in [1, 2] satisfies x + y > 3').value).toBe(true);
  });

  it('some x in [1, 2], y in [2, 3] satisfies x = y → true (x=2, y=2)', () => {
    expect(evaluate('some x in [1, 2], y in [2, 3] satisfies x = y').value).toBe(true);
  });

  it('every x in [2, 4, 6], y in [1, 2] satisfies x > y → false (x=2,y=2 fails)', () => {
    expect(evaluate('every x in [2, 4, 6], y in [1, 2] satisfies x > y').value).toBe(false);
  });

  it('every x in [2, 4, 6], y in [1, 2] satisfies x > 0 → true', () => {
    expect(evaluate('every x in [2, 4, 6], y in [1, 2] satisfies x > 0').value).toBe(true);
  });

  it('some x in [null, 2, 3] satisfies x > 1 → true (x=2 or x=3)', () => {
    expect(evaluate('some x in [null, 2, 3] satisfies x > 1').value).toBe(true);
  });

  it('some x in ["hello","world"] satisfies starts with(x, "w")', () => {
    expect(evaluate('some x in ["hello","world"] satisfies starts with(x, "w")').value).toBe(true);
  });

  it('every x in [2, 4, 6] satisfies even(x)', () => {
    expect(evaluate('every x in [2, 4, 6] satisfies even(x)').value).toBe(true);
  });
});

// ── list operations ───────────────────────────────────────────────────────────

describe('list operations — from parser', () => {
  it('count(null) = null', () => {
    expect(evaluate('count(null)').value).toBeNull();
  });

  it('count(42) = 1 (scalar treated as singleton list)', () => {
    const v = evaluate('count(42)').value;
    expect(v).toBe(1);
  });

  it('filter by instance of in list', () => {
    expect(evaluate('[true, 1, "hello", null][item instance of boolean]').value).toEqual([true]);
    expect(evaluate('[1, "two", 3, "four", 5][item instance of number]').value).toEqual([1, 3, 5]);
  });

  it('duplicate values', () => {
    expect(evaluate('duplicate values([1, 2, 1, 3, 2])').value).toEqual([1, 2]);
    expect(evaluate('duplicate values([1, 2, 3])').value).toEqual([]);
    expect(evaluate('duplicate values([5, 5, 5])').value).toEqual([5]);
    expect(evaluate('duplicate values([])').value).toEqual([]);
  });

  it('mode', () => {
    expect(evaluate('mode([1, 2, 2, 3])').value).toEqual([2]);
    expect(evaluate('mode([1, 2, 1, 2, 3])').value).toEqual([1, 2]);
    expect(evaluate('mode([])').value).toEqual([]);
  });

  it('list replace by index', () => {
    expect(evaluate('list replace([1, 2, 3], 2, 20)').value).toEqual([1, 20, 3]);
    expect(evaluate('list replace([1, 2, 3], -1, 30)').value).toEqual([1, 2, 30]);
  });

  it('list replace by function', () => {
    expect(
      evaluate('list replace([1, 2, 3], function(item, replacement) item = 2, 20)').value,
    ).toEqual([1, 20, 3]);
  });

  it('chained list builtins', () => {
    expect(evaluate('count([1,2,3,4,5][item > 2]) * 10').value).toBe(30);
    expect(evaluate('flatten(for x in [1, 2, 3] return [x, x * 2])').value).toEqual([
      1, 2, 2, 4, 3, 6,
    ]);
    expect(evaluate('for s in ["hello", "world"] return upper case(s)').value).toEqual([
      'HELLO',
      'WORLD',
    ]);
    expect(evaluate('["hi", "bye", "hello", "ok"][string length(item) > 2]').value).toEqual([
      'bye',
      'hello',
    ]);
  });

  it('for with reversed range', () => {
    expect(evaluate('for x in 3..1 return x').value).toEqual([3, 2, 1]);
  });

  it('stddev', () => {
    const v = evaluate('stddev([2, 4, 6, 8])').value as number;
    expect(typeof v).toBe('number');
    expect(Math.abs(v - 2.581988897)).toBeLessThan(1e-6);
  });

  it('stddev of single element = null', () => {
    expect(evaluate('stddev([1])').value).toBeNull();
  });
});

// ── context / recursive patterns ──────────────────────────────────────────────

describe('context — recursive / closure patterns', () => {
  it('double function defined and called in context', () => {
    expect(evaluate('{double: function(x) x * 2, result: double(3)}.result').value).toBe(6);
  });

  it('function defined in context, called via path', () => {
    expect(evaluate('{f: function(x) x + 1}.f(5)').value).toBe(6);
  });

  it('factorial in context', () => {
    expect(
      evaluate('{fact: function(n) if n <= 1 then 1 else n * fact(n - 1), result: fact(5)}.result')
        .value,
    ).toBe(120);
  });

  it('fibonacci in context', () => {
    expect(
      evaluate(
        '{fib: function(n) if n <= 1 then n else fib(n-1) + fib(n-2), result: fib(7)}.result',
      ).value,
    ).toBe(13);
  });

  it('curried addition in context', () => {
    expect(
      evaluate('{add: function(x) function(y) x + y, add5: add(5), result: add5(3)}.result').value,
    ).toBe(8);
  });

  it('for-loop builds context list', () => {
    const r = evaluate('for x in [1, 2, 3] return context put({}, "double", x * 2)').value as {
      double: number;
    }[];
    expect(r[0]!.double).toBe(2);
    expect(r[2]!.double).toBe(6);
  });

  it('every on list of contexts satisfies nested condition', () => {
    expect(
      evaluate(
        'every x in [{items:[1,2,3]},{items:[4,5,6]}] satisfies every n in x.items satisfies n > 0',
      ).value,
    ).toBe(true);
  });
});

// ── functions — invocation forms ──────────────────────────────────────────────

describe('function invocation — from parser', () => {
  it('IIFE with single arg', () => {
    expect(evaluate('(function(x) x * 2)(5)').value).toBe(10);
  });

  it('IIFE with two args', () => {
    expect(evaluate('(function(x, y) x + y)(3, 4)').value).toBe(7);
  });

  it('IIFE with three args', () => {
    expect(evaluate('(function(a, b, c) a + b + c)(1, 2, 3)').value).toBe(6);
  });

  it('IIFE with named params (reversed order)', () => {
    expect(evaluate('(function(a, b) a - b)(b: 1, a: 5)').value).toBe(4);
  });

  it('typed parameter: number accepted', () => {
    expect(evaluate('(function(x: number) x + 1)(5)').value).toBe(6);
  });

  it('typed parameter: wrong type returns null', () => {
    expect(evaluate('(function(x: number) x + 1)("a")').value).toBeNull();
  });

  it('named param — substring', () => {
    expect(evaluate('substring(string: "hello", start position: 2, length: 3)').value).toBe('ell');
  });

  it('named param — floor', () => {
    expect(evaluate('floor(n: 3.7)').value).toBe(3);
  });

  it('named param — ceiling with scale', () => {
    expect(evaluate('ceiling(n: 1.5, scale: 1)').value).toBe(1.5);
  });

  it('named param — abs', () => {
    expect(evaluate('abs(n: -1)').value).toBe(1);
  });

  it('named param — modulo', () => {
    expect(evaluate('modulo(dividend: 10, divisor: 3)').value).toBe(1);
  });

  it('named param — contains', () => {
    expect(evaluate('contains(string: "foobar", match: "b")').value).toBe(true);
  });

  it('named param — get value', () => {
    expect(evaluate('get value(m: {a: 1}, key: "a")').value).toBe(1);
  });

  it('named param — context merge', () => {
    expect(evaluate('context merge(contexts: [{a: 1}, {b: 2}])').value).toEqual({ a: 1, b: 2 });
  });

  it('named param — string join', () => {
    expect(evaluate('string join(list: ["a","b"], delimiter: ",")').value).toBe('a,b');
  });

  it('named param — split', () => {
    expect(evaluate('split(string: "a,b,c", delimiter: ",")').value).toEqual(['a', 'b', 'c']);
  });

  it('named param — sort', () => {
    expect(evaluate('sort(list: [3,1,2], precedes: function(x,y) x < y)').value).toEqual([1, 2, 3]);
  });

  it('named param — is (positional form)', () => {
    expect(evaluate('is(null, null)').value).toBe(true);
  });

  it('named param — list replace', () => {
    expect(evaluate('list replace(list: [1,2,3], position: 2, newItem: 9)').value).toEqual([
      1, 9, 3,
    ]);
  });
});

// ── duration component functions ──────────────────────────────────────────────

describe('duration component functions (hours, years, months, etc.)', () => {
  it('hours(duration("P1DT2H")) = 2', () => {
    expect(evaluate('hours(duration("P1DT2H"))').value).toBe(2);
  });

  it('minutes(duration("PT90M")) = 30', () => {
    // PT90M normalises to PT1H30M; .minutes = 30
    expect(evaluate('minutes(duration("PT90M"))').value).toBe(30);
  });

  it('seconds(duration("PT90S")) = 30', () => {
    // PT90S normalises to PT1M30S; .seconds = 30
    expect(evaluate('seconds(duration("PT90S"))').value).toBe(30);
  });

  it('years(duration("P1Y2M")) = 1', () => {
    expect(evaluate('years(duration("P1Y2M"))').value).toBe(1);
  });

  it('months(duration("P1Y2M")) = 2', () => {
    expect(evaluate('months(duration("P1Y2M"))').value).toBe(2);
  });

  it('days(duration("P1DT2H")) = 1', () => {
    expect(evaluate('days(duration("P1DT2H"))').value).toBe(1);
  });

  it('hours on year-month duration returns null', () => {
    expect(evaluate('hours(duration("P1Y"))').value).toBeNull();
  });

  it('years on day-time duration returns null', () => {
    expect(evaluate('years(duration("P1D"))').value).toBeNull();
  });

  it('hours(duration(null)) = null', () => {
    expect(evaluate('hours(null)').value).toBeNull();
  });
});

// ── numeric builtins — from parser ────────────────────────────────────────────

describe('numeric builtins — from parser', () => {
  it("decimal — half-even (banker's) rounding", () => {
    expect(evaluate('decimal(1.115, 2)').value).toBe(1.12);
    expect(evaluate('decimal(2.5, 0)').value).toBe(2);
    expect(evaluate('decimal(3.5, 0)').value).toBe(4);
    expect(evaluate('decimal(1.5, 0)').value).toBe(2);
  });

  it('floor with scale', () => {
    expect(evaluate('floor(1.675, 2)').value).toBe(1.67);
    expect(evaluate('floor(-1.675, 2)').value).toBe(-1.68);
  });

  it('ceiling with scale', () => {
    expect(evaluate('ceiling(1.675, 2)').value).toBe(1.68);
    expect(evaluate('ceiling(-1.675, 2)').value).toBe(-1.67);
  });

  it('round up', () => {
    expect(evaluate('round up(1.5, 0)').value).toBe(2);
    expect(evaluate('round up(-1.5, 0)').value).toBe(-2);
    expect(evaluate('round up(1.1, 0)').value).toBe(2);
    expect(evaluate('round up(-1.1, 0)').value).toBe(-2);
    expect(evaluate('round up(1.235, 2)').value).toBe(1.24);
  });

  it('round down', () => {
    expect(evaluate('round down(1.5, 0)').value).toBe(1);
    expect(evaluate('round down(-1.5, 0)').value).toBe(-1);
    expect(evaluate('round down(1.9, 0)').value).toBe(1);
    expect(evaluate('round down(-1.9, 0)').value).toBe(-1);
  });

  it('round half up', () => {
    expect(evaluate('round half up(1.5, 0)').value).toBe(2);
    expect(evaluate('round half up(2.5, 0)').value).toBe(3);
    expect(evaluate('round half up(-1.5, 0)').value).toBe(-2);
  });

  it('round half down', () => {
    expect(evaluate('round half down(1.5, 0)').value).toBe(1);
    expect(evaluate('round half down(2.5, 0)').value).toBe(2);
    expect(evaluate('round half down(-1.5, 0)').value).toBe(-1);
  });

  it('abs on duration', () => {
    const r = evaluate('abs(duration("-P1D"))').value as Record<string, unknown>;
    expect(r?.days).toBe(1);
  });

  it('modulo signs follow FEEL spec (sign of divisor)', () => {
    expect(evaluate('modulo(10, 3)').value).toBe(1);
    expect(evaluate('modulo(-10, 3)').value).toBe(2);
    expect(evaluate('modulo(10, -3)').value).toBe(-2);
    expect(evaluate('modulo(-10, -3)').value).toBe(-1);
    expect(evaluate('modulo(10, 10)').value).toBe(0);
    expect(evaluate('modulo(0, 5)').value).toBe(0);
  });

  it('sqrt', () => {
    expect(evaluate('sqrt(9)').value).toBe(3);
    expect(evaluate('sqrt(4)').value).toBe(2);
    expect(evaluate('sqrt(0)').value).toBe(0);
    expect(evaluate('sqrt(-1)').value).toBeNull();
  });

  it('log', () => {
    expect(evaluate('log(1)').value).toBe(0);
    expect(evaluate('log(0)').value).toBeNull();
    expect(evaluate('log(-1)').value).toBeNull();
  });

  it('exp', () => {
    expect(evaluate('exp(0)').value).toBe(1);
    const e = evaluate('exp(1)').value as number;
    expect(Math.abs(e - Math.E)).toBeLessThan(1e-7);
  });

  it('log(exp(1)) = 1', () => {
    const v = evaluate('log(exp(1))').value as number;
    expect(Math.abs(v - 1)).toBeLessThan(1e-9);
  });

  it('odd / even', () => {
    expect(evaluate('odd(1)').value).toBe(true);
    expect(evaluate('odd(2)').value).toBe(false);
    expect(evaluate('even(0)').value).toBe(true);
    expect(evaluate('even(1)').value).toBe(false);
    expect(evaluate('odd(1.5)').value).toBeNull();
    expect(evaluate('even(1.5)').value).toBeNull();
  });
});

// ── string builtins — from parser ─────────────────────────────────────────────

describe('string builtins — from parser', () => {
  it('string length of emoji and unicode', () => {
    expect(evaluate('string length("😀")').value).toBe(1);
    expect(evaluate('string length("café")').value).toBe(4);
    expect(evaluate('string length("日本語")').value).toBe(3);
    expect(evaluate('string length("🎉")').value).toBe(1);
    expect(evaluate('string length("横綱")').value).toBe(2);
    expect(evaluate('string length("€£¥")').value).toBe(3);
  });

  it('substring of unicode string', () => {
    expect(evaluate('substring("café", 2)').value).toBe('afé');
  });

  it('contains with empty match always true', () => {
    expect(evaluate('contains("foobar", "")').value).toBe(true);
  });

  it('case-insensitive contains returns false (FEEL is case-sensitive)', () => {
    expect(evaluate('contains("foobar", "FOO")').value).toBe(false);
  });

  it('matches — flags', () => {
    expect(evaluate('matches("HELLO", "hello", "i")').value).toBe(true);
    // x flag: whitespace in pattern is ignored — "a b" pattern = "ab", string "a b" ≠ "ab"
    expect(evaluate('matches("a b", "a b", "x")').value).toBe(false);
    expect(evaluate('matches("first\\nsecond", "^second", "m")').value).toBe(true);
    const r = evaluate('matches("foo", "[invalid")').value;
    expect(r === null || r === false).toBe(true);
  });

  it('replace with back-reference', () => {
    expect(evaluate('replace("abc", "(a)", "$1$1")').value).toBe('aabc');
  });

  it('replace with case-insensitive flag', () => {
    expect(evaluate('replace("Hello World", "hello", "Hi", "i")').value).toBe('Hi World');
  });

  it('replace with no match leaves string unchanged', () => {
    expect(evaluate('replace("hello", "xyz", "Z")').value).toBe('hello');
  });

  it('split with multi-char delimiter patterns', () => {
    expect(evaluate('split("a,,b", ",")').value).toEqual(['a', '', 'b']);
  });

  it('round-trip encode/decode for URI', () => {
    expect(evaluate('decode for URI(encode for URI("hello world & more"))').value).toBe(
      'hello world & more',
    );
  });

  it('encode for URI — unicode chars', () => {
    const v = evaluate('encode for URI("café")').value as string;
    expect(v).toContain('%');
  });

  it('string join with prefix and suffix', () => {
    expect(evaluate('string join(["a", "b", "c"], "-", "[", "]")').value).toBe('[a-b-c]');
  });

  it('string join skips nulls', () => {
    expect(evaluate('string join(["a", null, "c"], ",")').value).toBe('a,c');
  });

  it('string join all-null produces empty string', () => {
    expect(evaluate('string join([null, null], ",")').value).toBe('');
  });

  it('pad left — length shorter than string returns original', () => {
    expect(evaluate('pad left("abc", -1)').value).toBe('abc');
    expect(evaluate('pad left("hello", 3)').value).toBe('hello');
  });

  it('pad left — multi-char pad string uses first code-point', () => {
    expect(evaluate('pad left("abc", 5, "xy")').value).toBe('xxabc');
  });

  it('pad left — empty pad string treated as space', () => {
    expect(evaluate('pad left("x", 3, "")').value).toBe('  x');
  });

  it('unicode equality', () => {
    expect(evaluate('"café" = "café"').value).toBe(true);
    expect(evaluate('"Ångström" = "Ångström"').value).toBe(true);
  });

  it('extract — capturing groups', () => {
    const r = evaluate('extract("2024-01-15", "(\\d{4})-(\\d{2})-(\\d{2})")').value as string[][];
    expect(r[0]).toEqual(['2024-01-15', '2024', '01', '15']);
  });

  it('extract — no match returns empty list', () => {
    expect(evaluate('extract("hello", "\\d+")').value).toEqual([]);
  });

  it('number() — three-arg form with custom separators', () => {
    // grouping sep=".", decimal sep="," → "1,5" = 1.5
    expect(evaluate('number("1,5", ".", ",")').value).toBe(1.5);
    // grouping sep=",", decimal sep="." → "1,500.50" = 1500.5
    expect(evaluate('number("1,500.50", ",", ".")').value).toBe(1500.5);
  });

  it('string() conversion', () => {
    expect(evaluate('string(date("2024-01-15"))').value).toBe('2024-01-15');
    expect(evaluate('string(42)').value).toBe('42');
    expect(evaluate('string(true)').value).toBe('true');
    expect(evaluate('string(null)').value).toBeNull();
  });
});

// ── instance of — from parser (additional) ────────────────────────────────────

describe('instance of — additional from parser', () => {
  it('Any: non-null values match', () => {
    expect(evaluate('1 instance of Any').value).toBe(true);
    expect(evaluate('"hello" instance of Any').value).toBe(true);
    expect(evaluate('true instance of Any').value).toBe(true);
    expect(evaluate('null instance of Any').value).toBe(false);
  });

  it('Null type', () => {
    expect(evaluate('null instance of Null').value).toBe(true);
    expect(evaluate('1 instance of Null').value).toBe(false);
  });

  it('function type', () => {
    expect(evaluate('(function(x) x) instance of function').value).toBe(true);
    expect(evaluate('(function(x) x) instance of Any').value).toBe(true);
  });

  it('range type', () => {
    expect(evaluate('[1..5] instance of range').value).toBe(true);
    expect(evaluate('(1..5) instance of range').value).toBe(true);
  });

  it('duration generic type', () => {
    expect(evaluate('duration("P1Y") instance of duration').value).toBe(true);
    expect(evaluate('duration("P1D") instance of duration').value).toBe(true);
  });

  it('typed list — list<string>', () => {
    expect(evaluate('["a","b"] instance of list<string>').value).toBe(true);
    expect(evaluate('[1,"b"] instance of list<string>').value).toBe(false);
  });

  it('typed list — list<boolean>', () => {
    expect(evaluate('[true,false] instance of list<boolean>').value).toBe(true);
    expect(evaluate('[true,1] instance of list<boolean>').value).toBe(false);
  });

  it('empty typed lists are always true', () => {
    expect(evaluate('[] instance of list<number>').value).toBe(true);
    expect(evaluate('[] instance of list<string>').value).toBe(true);
  });

  it('context<> type checking', () => {
    expect(evaluate('{a: 1} instance of context<a: number>').value).toBe(true);
    expect(evaluate('{a: "x"} instance of context<a: number>').value).toBe(false);
  });
});

// ── let expressions — from parser ─────────────────────────────────────────────

describe('let expressions — from parser', () => {
  it('let with function defined and called', () => {
    expect(evaluate('let double = function(a) a * 2 in double(5)').value).toBe(10);
  });

  it('let shadowing — inner overrides outer', () => {
    expect(evaluate('let x = 1 in let x = 2 in x').value).toBe(2);
  });

  it('let inside for returns list of results', () => {
    const r = evaluate('for i in [1,2,3] return let sq = i * i in sq + 1').value;
    expect(r).toEqual([2, 5, 10]);
  });

  it('triple chained lets', () => {
    expect(evaluate('let a = 2 in let b = a * 3 in let c = b + a in c').value).toBe(8);
  });

  it('let with in operator in value (must parse correctly)', () => {
    expect(evaluate('let result = (3 in [1,2,3]) in result').value).toBe(true);
  });
});

// ── pipeline — from parser ────────────────────────────────────────────────────

describe('pipeline — from parser', () => {
  it('chained pipe with ? slot', () => {
    expect(evaluate('"hello" |> upper case |> substring(?, 1, 3)').value).toBe('HEL');
  });

  it('pipe — feels null through', () => {
    expect(evaluate('null |> upper case').value).toBeNull();
  });

  it('pipe — multi-step: arithmetic then string', () => {
    // 1 + 2 = 3, then string(3)
    expect(evaluate('1 + 2 |> string').value).toBe('3');
  });
});

// ── unary tests — from parser ─────────────────────────────────────────────────

describe('unary tests — disjunctions and negation', () => {
  it('disjunction with range', () => {
    expect(unaryTest('1, [5..10], 20', { '?': 7 }).value).toBe(true);
    expect(unaryTest('1, [5..10], 20', { '?': 3 }).value).toBe(false);
  });

  it('string disjunction', () => {
    expect(unaryTest('"Medium","Low"', { '?': 'Medium' }).value).toBe(true);
    expect(unaryTest('"Medium","Low"', { '?': 'High' }).value).toBe(false);
  });

  it('negation: not(1, 2, 3)', () => {
    expect(unaryTest('not(1, 2, 3)', { '?': 4 }).value).toBe(true);
    expect(unaryTest('not(1, 2, 3)', { '?': 2 }).value).toBe(false);
  });

  it('negation: not([1..5])', () => {
    expect(unaryTest('not([1..5])', { '?': 6 }).value).toBe(true);
    expect(unaryTest('not([1..5])', { '?': 3 }).value).toBe(false);
  });

  it('negation: not("High","Medium")', () => {
    expect(unaryTest('not("High","Medium")', { '?': 'Low' }).value).toBe(true);
    expect(unaryTest('not("High","Medium")', { '?': 'High' }).value).toBe(false);
  });

  it('comparison tests: >=0, <=100', () => {
    expect(unaryTest('>=0, <=100', { '?': 50 }).value).toBe(true);
    expect(unaryTest('>=0, <=100', { '?': -1 }).value).toBe(true);
    expect(unaryTest('>=0, <=100', { '?': 101 }).value).toBe(true);
  });

  it('wildcard -', () => {
    expect(unaryTest('-', { '?': 'anything' }).value).toBe(true);
    expect(unaryTest('-', { '?': null }).value).toBe(true);
  });
});

// ── multi-word identifiers (knownNames via context) ───────────────────────────

describe('multi-word identifiers — resolved via context keys', () => {
  it('"Hello " + Full Name', () => {
    expect(evaluate('"Hello " + Full Name', { 'Full Name': 'John Doe' }).value).toBe(
      'Hello John Doe',
    );
  });

  it('Monthly Salary * 12', () => {
    expect(evaluate('Monthly Salary * 12', { 'Monthly Salary': 5000 }).value).toBe(60000);
  });

  it('Order Line Item count', () => {
    expect(evaluate('count(Order Line Items)', { 'Order Line Items': [1, 2, 3] }).value).toBe(3);
  });
});

// ── temporal builtins — from parser ──────────────────────────────────────────

describe('temporal builtins — from parser', () => {
  it('date(year, month, day) constructor', () => {
    const r = evaluate('date(2024, 1, 15)').value as Record<string, unknown>;
    expect(r?.year).toBe(2024);
    expect(r?.month).toBe(1);
    expect(r?.day).toBe(15);
  });

  it('time(h, m, s) constructor', () => {
    const r = evaluate('time(10, 30, 0)').value as Record<string, unknown>;
    expect(r?.hour).toBe(10);
    expect(r?.minute).toBe(30);
  });

  it('date and time(date, time) constructor', () => {
    const r = evaluate('date and time(date("2024-01-15"), time("10:30:00"))').value as Record<
      string,
      unknown
    >;
    expect(r?.year).toBe(2024);
    expect(r?.hour).toBe(10);
  });

  it('day of year', () => {
    expect(evaluate('day of year(date("2024-01-15"))').value).toBe(15);
  });

  it('week of year', () => {
    const v = evaluate('week of year(date("2024-01-15"))').value as number;
    expect(typeof v).toBe('number');
    expect(v).toBeGreaterThan(0);
  });

  it('is() — same semantic value', () => {
    expect(evaluate('is(date("2024-01-01"), date("2024-01-01"))').value).toBe(true);
    expect(evaluate('is(null, null)').value).toBe(true);
    expect(evaluate('is(1, 1)').value).toBe(true);
    expect(evaluate('is(1, 1.0)').value).toBe(true);
    expect(evaluate('is(null, 1)').value).toBe(false);
  });

  it('years and months duration between dates', () => {
    const r = evaluate('years and months duration(date("2011-12-22"), date("2013-08-24"))')
      .value as Record<string, unknown>;
    expect(r?.years).toBe(1);
    expect(r?.months).toBe(8);
  });

  it('for loop with temporal + string conversion', () => {
    const r = evaluate(
      'for d in [date("2024-01-01"), date("2024-01-08"), date("2024-01-15")] return string(d + duration("P1D"))',
    ).value as string[];
    expect(r[0]).toBe('2024-01-02');
    expect(r[1]).toBe('2024-01-09');
  });
});

// ── context() function — from parser ─────────────────────────────────────────

describe('context() function — list-of-entries form', () => {
  it('builds context from key-value list', () => {
    expect(evaluate('context([{"key": "a", "value": 1}])').value).toEqual({ a: 1 });
  });

  it('builds context with multiple entries', () => {
    expect(
      evaluate('context([{"key": "x", "value": [1,2,3]}, {"key": "y", "value": true}])').value,
    ).toEqual({ x: [1, 2, 3], y: true });
  });
});

// ── combinations — from parser ────────────────────────────────────────────────

describe('combinations — from parser', () => {
  it('credit decision with complex condition', () => {
    const tiers: [number, string, string][] = [
      [750, 'employed', 'approved'],
      [650, 'employed', 'manual review'],
      [750, 'unemployed', 'manual review'],
      [500, 'unemployed', 'rejected'],
    ];
    for (const [score, employment, expected] of tiers) {
      const r = evaluate(
        'if score >= 700 and employment = "employed" then "approved" ' +
          'else if score >= 600 or employment = "employed" then "manual review" ' +
          'else "rejected"',
        { score, employment },
      ).value;
      expect(r).toBe(expected);
    }
  });

  it('sum of even-square elements', () => {
    // squares of even numbers 1-10: 4+16+36+64+100 = 220
    expect(
      evaluate('sum(for x in [1,2,3,4,5,6,7,8,9,10] return if modulo(x, 2) = 0 then x * x else 0)')
        .value,
    ).toBe(220);
  });

  it('string quantifiers: every email matches pattern', () => {
    expect(
      evaluate('every s in ["foo@bar.com", "baz@qux.io"] satisfies matches(s, ".+@.+")').value,
    ).toBe(true);
  });

  it('conversion + arithmetic', () => {
    expect(evaluate('for s in ["1", "2", "3"] return number(s) * 10').value).toEqual([10, 20, 30]);
  });

  it('conditional with string builtin', () => {
    expect(
      evaluate('if string length("hello") > 3 then upper case("hello") else lower case("WORLD")')
        .value,
    ).toBe('HELLO');
  });
});
