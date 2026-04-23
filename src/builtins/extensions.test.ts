import { describe, expect, it } from 'vitest';
import { evaluate, unaryTest } from '../index.js';

// Tests for Phase A extensions (feel-scala inspired)

describe('extensions', () => {
  describe('is blank()', () => {
    it('empty string', () => {
      expect(evaluate('is blank("")').value).toBe(true);
    });
    it('whitespace only', () => {
      expect(evaluate('is blank("   ")').value).toBe(true);
    });
    it('tab only', () => {
      expect(evaluate('is blank("\t")').value).toBe(true);
    });
    it('null', () => {
      expect(evaluate('is blank(null)').value).toBe(true);
    });
    it('non-blank string', () => {
      expect(evaluate('is blank("hello")').value).toBe(false);
    });
    it('string with leading/trailing spaces', () => {
      expect(evaluate('is blank("  x  ")').value).toBe(false);
    });
    it('null propagation — non-string non-null returns null', () => {
      expect(evaluate('is blank(42)').value).toBeNull();
    });
    it('used in conditional', () => {
      const r = evaluate('if is blank(name) then "unknown" else name', { name: '' }).value;
      expect(r).toBe('unknown');
    });
    it('used in conditional with value', () => {
      const r = evaluate('if is blank(name) then "unknown" else name', { name: 'Alice' }).value;
      expect(r).toBe('Alice');
    });
  });

  describe('is empty()', () => {
    it('empty list', () => {
      expect(evaluate('is empty([])').value).toBe(true);
    });
    it('null', () => {
      expect(evaluate('is empty(null)').value).toBe(true);
    });
    it('non-empty list', () => {
      expect(evaluate('is empty([1])').value).toBe(false);
    });
    it('list with null element', () => {
      expect(evaluate('is empty([null])').value).toBe(false);
    });
    it('non-list returns null', () => {
      expect(evaluate('is empty(42)').value).toBeNull();
    });
    it('used in conditional', () => {
      const r = evaluate('if is empty(items) then 0 else count(items)', { items: [1, 2, 3] }).value;
      expect(r).toBe(3);
    });
    it('empty list conditional', () => {
      const r = evaluate('if is empty(items) then 0 else count(items)', { items: [] }).value;
      expect(r).toBe(0);
    });
  });

  describe('get or else()', () => {
    it('null returns default', () => {
      expect(evaluate('get or else(null, "default")').value).toBe('default');
    });
    it('non-null value returned as-is', () => {
      expect(evaluate('get or else(42, 0)').value).toBe(42);
    });
    it('null default when both null', () => {
      expect(evaluate('get or else(null, null)').value).toBeNull();
    });
    it('empty string is NOT null', () => {
      expect(evaluate('get or else("", "fallback")').value).toBe('');
    });
    it('false is NOT null', () => {
      expect(evaluate('get or else(false, true)').value).toBe(false);
    });
    it('zero is NOT null', () => {
      expect(evaluate('get or else(0, 99)').value).toBe(0);
    });
    it('with context variable', () => {
      const r = evaluate('get or else(score, 0)', { score: null }).value;
      expect(r).toBe(0);
    });
    it('chained get or else', () => {
      const r = evaluate('get or else(get or else(null, null), "final")').value;
      expect(r).toBe('final');
    });
  });

  describe('error()', () => {
    it('returns null', () => {
      expect(evaluate('error("something wrong")').value).toBeNull();
    });
    it('emits EXPLICIT_ERROR warning', () => {
      const result = evaluate('error("oops")');
      expect(result.warnings.some((w) => w.code === 'EXPLICIT_ERROR')).toBe(true);
    });
    it('warning message matches', () => {
      const result = evaluate('error("bad input")');
      const w = result.warnings.find((w) => w.code === 'EXPLICIT_ERROR');
      expect(w?.message).toBe('bad input');
    });
    it('in conditional — only triggers when branch is taken', () => {
      const r = evaluate('if score < 0 then error("score negative") else score * 1.5', {
        score: 10,
      });
      expect(r.value).toBe(15);
      expect(r.warnings.some((w) => w.code === 'EXPLICIT_ERROR')).toBe(false);
    });
    it('in conditional — triggers when score negative', () => {
      const r = evaluate('if score < 0 then error("score negative") else score * 1.5', {
        score: -5,
      });
      expect(r.value).toBeNull();
      expect(r.warnings.some((w) => w.code === 'EXPLICIT_ERROR')).toBe(true);
    });
    it('non-string message defaults gracefully', () => {
      const r = evaluate('error(null)');
      expect(r.value).toBeNull();
      expect(r.warnings.some((w) => w.code === 'EXPLICIT_ERROR')).toBe(true);
    });
  });

  describe('assert()', () => {
    it('true condition returns true', () => {
      expect(evaluate('assert(1 > 0, "must be positive")').value).toBe(true);
    });
    it('false condition returns null', () => {
      expect(evaluate('assert(1 > 2, "one must be greater than two")').value).toBeNull();
    });
    it('false condition emits ASSERTION_FAILED', () => {
      const result = evaluate('assert(false, "failed")');
      expect(result.warnings.some((w) => w.code === 'ASSERTION_FAILED')).toBe(true);
    });
    it('warning message matches', () => {
      const result = evaluate('assert(false, "my message")');
      const w = result.warnings.find((w) => w.code === 'ASSERTION_FAILED');
      expect(w?.message).toBe('my message');
    });
    it('null condition fails', () => {
      const result = evaluate('assert(null, "null is not true")');
      expect(result.value).toBeNull();
      expect(result.warnings.some((w) => w.code === 'ASSERTION_FAILED')).toBe(true);
    });
    it('with context', () => {
      const r = evaluate('assert(x > 0, "must be positive")', { x: 5 });
      expect(r.value).toBe(true);
      expect(r.warnings).toHaveLength(0);
    });
  });

  describe('uuid()', () => {
    it('returns a string', () => {
      expect(typeof evaluate('uuid()').value).toBe('string');
    });
    it('matches UUID v4 format', () => {
      const v = evaluate('uuid()').value as string;
      expect(v).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
    it('each call generates unique value', () => {
      const a = evaluate('uuid()').value;
      const b = evaluate('uuid()').value;
      expect(a).not.toBe(b);
    });
  });

  describe('to base64() / from base64()', () => {
    it('encodes ASCII string', () => {
      expect(evaluate('to base64("hello")').value).toBe('aGVsbG8=');
    });
    it('encodes empty string', () => {
      expect(evaluate('to base64("")').value).toBe('');
    });
    it('decodes base64', () => {
      expect(evaluate('from base64("aGVsbG8=")').value).toBe('hello');
    });
    it('roundtrip', () => {
      const r = evaluate('from base64(to base64("FEEL engine"))').value;
      expect(r).toBe('FEEL engine');
    });
    it('roundtrip with special chars', () => {
      const r = evaluate('from base64(to base64("hello world 123!@#"))').value;
      expect(r).toBe('hello world 123!@#');
    });
    it('null returns null', () => {
      expect(evaluate('to base64(null)').value).toBeNull();
      expect(evaluate('from base64(null)').value).toBeNull();
    });
    it('invalid base64 returns null', () => {
      expect(evaluate('from base64("not valid base64!!!")').value).toBeNull();
    });
  });

  describe('string format()', () => {
    it('single placeholder', () => {
      expect(evaluate('string format("Hello {}!", "World")').value).toBe('Hello World!');
    });
    it('multiple placeholders', () => {
      expect(evaluate('string format("{} + {} = {}", 1, 2, 3)').value).toBe('1 + 2 = 3');
    });
    it('with context vars', () => {
      const r = evaluate('string format("Hello {}, your score is {}!", name, score)', {
        name: 'Alice',
        score: 720,
      }).value;
      expect(r).toBe('Hello Alice, your score is 720!');
    });
    it('no placeholders', () => {
      expect(evaluate('string format("no placeholders")').value).toBe('no placeholders');
    });
    it('fewer args than placeholders keeps {}', () => {
      expect(evaluate('string format("{} and {}", "one")').value).toBe('one and {}');
    });
    it('null template returns null', () => {
      expect(evaluate('string format(null, "x")').value).toBeNull();
    });
  });

  describe('to json() / from json()', () => {
    it('number to JSON', () => {
      expect(evaluate('to json(42)').value).toBe('42');
    });
    it('string to JSON', () => {
      expect(evaluate('to json("hello")').value).toBe('"hello"');
    });
    it('boolean to JSON', () => {
      expect(evaluate('to json(true)').value).toBe('true');
    });
    it('null to JSON', () => {
      expect(evaluate('to json(null)').value).toBe('null');
    });
    it('list to JSON', () => {
      expect(evaluate('to json([1, 2, 3])').value).toBe('[1,2,3]');
    });
    it('context to JSON', () => {
      const r = evaluate('to json({a: 1, b: "x"})').value as string;
      expect(JSON.parse(r)).toEqual({ a: 1, b: 'x' });
    });
    it('from json string', () => {
      expect(evaluate('from json("42")').value).toBe(42);
    });
    it('from json object', () => {
      const r = evaluate('from json(json)', { json: '{"a":1,"b":"x"}' }).value as Record<
        string,
        unknown
      >;
      expect(r.a).toBe(1);
      expect(r.b).toBe('x');
    });
    it('from json array', () => {
      expect(evaluate('from json("[1,2,3]")').value).toEqual([1, 2, 3]);
    });
    it('from json invalid returns null', () => {
      expect(evaluate('from json("not json")').value).toBeNull();
    });
    it('roundtrip context', () => {
      const r = evaluate('from json(to json({score: 720, name: "Alice"}))').value as Record<
        string,
        unknown
      >;
      expect(r.score).toBe(720);
      expect(r.name).toBe('Alice');
    });
    it('from json null literal', () => {
      expect(evaluate('from json("null")').value).toBeNull();
    });
    it('from json non-string returns null', () => {
      expect(evaluate('from json(42)').value).toBeNull();
    });
  });

  describe('string ranges (B4)', () => {
    it('char in range', () => {
      expect(evaluate('"b" in ["a".."z"]').value).toBe(true);
    });
    it('char outside range', () => {
      expect(evaluate('"z" in ["a".."m"]').value).toBe(false);
    });
    it('uppercase range', () => {
      expect(evaluate('"C" in ["A".."Z"]').value).toBe(true);
    });
    it('boundary inclusive start', () => {
      expect(evaluate('"a" in ["a".."z"]').value).toBe(true);
    });
    it('boundary inclusive end', () => {
      expect(evaluate('"z" in ["a".."z"]').value).toBe(true);
    });
    it('unary test with string range', () => {
      expect(unaryTest('["a".."z"]', { '?': 'b' }).value).toBe(true);
      expect(unaryTest('["a".."z"]', { '?': 'A' }).value).toBe(false);
    });
    it('multi-char lexicographic', () => {
      expect(evaluate('"banana" in ["apple".."cherry"]').value).toBe(true);
      expect(evaluate('"zoo" in ["apple".."cherry"]').value).toBe(false);
    });
  });

  describe('strict mode (B5)', () => {
    it('no warnings — no throw', () => {
      expect(() => evaluate('1 + 1', {}, { strict: true })).not.toThrow();
    });
    it('missing variable throws in strict mode', () => {
      expect(() => evaluate('score + bonus', { score: 720 }, { strict: true })).toThrow(/strict/);
    });
    it('missing variable without strict — returns result with warning', () => {
      const r = evaluate('score + bonus', { score: 720 });
      expect(r.warnings.length).toBeGreaterThan(0);
    });
    it('error() throws in strict mode', () => {
      expect(() => evaluate('error("oh no")', {}, { strict: true })).toThrow(/EXPLICIT_ERROR/);
    });
    it('assert failure throws in strict mode', () => {
      expect(() => evaluate('assert(false, "bad")', {}, { strict: true })).toThrow(
        /ASSERTION_FAILED/,
      );
    });
    it('strict mode preserves normal results', () => {
      const r = evaluate('1 + 2 * 3', {}, { strict: true });
      expect(r.value).toBe(7);
    });
    it('backward compat — string dialect still works', () => {
      const r = evaluate('[18..65]', { '?': 30 }, 'unary-tests');
      expect(r.value).toBe(true);
    });
  });

  describe('is empty() + partition() — list extensions', () => {
    describe('partition()', () => {
      it('partitions evenly', () => {
        expect(evaluate('partition([1,2,3,4,5,6], 2)').value).toEqual([
          [1, 2],
          [3, 4],
          [5, 6],
        ]);
      });
      it('last chunk smaller', () => {
        expect(evaluate('partition([1,2,3,4,5], 2)').value).toEqual([[1, 2], [3, 4], [5]]);
      });
      it('size larger than list', () => {
        expect(evaluate('partition([1,2,3], 10)').value).toEqual([[1, 2, 3]]);
      });
      it('size 1', () => {
        expect(evaluate('partition([1,2,3], 1)').value).toEqual([[1], [2], [3]]);
      });
      it('empty list', () => {
        expect(evaluate('partition([], 3)').value).toEqual([]);
      });
      it('null returns null', () => {
        expect(evaluate('partition(null, 3)').value).toBeNull();
      });
      it('size 0 returns null', () => {
        expect(evaluate('partition([1,2,3], 0)').value).toBeNull();
      });
    });
  });

  describe('last day of month()', () => {
    it('January — 31', () => {
      expect(evaluate('last day of month(date("2024-01-01"))').value).toBe(31);
    });
    it('February leap year — 29', () => {
      expect(evaluate('last day of month(date("2024-02-01"))').value).toBe(29);
    });
    it('February non-leap — 28', () => {
      expect(evaluate('last day of month(date("2023-02-01"))').value).toBe(28);
    });
    it('April — 30', () => {
      expect(evaluate('last day of month(date("2024-04-01"))').value).toBe(30);
    });
    it('December — 31', () => {
      expect(evaluate('last day of month(date("2024-12-31"))').value).toBe(31);
    });
    it('works with date and time', () => {
      expect(evaluate('last day of month(date and time("2024-02-15T12:00:00"))').value).toBe(29);
    });
    it('null returns null', () => {
      expect(evaluate('last day of month(null)').value).toBeNull();
    });
    it('useful for last day calculation', () => {
      // Can we construct the last day of a given month?
      const r = evaluate(
        'date(date("2024-03-01").year, date("2024-03-01").month, last day of month(date("2024-03-01")))',
      ).value as { kind: string; day: number };
      expect(r.day).toBe(31);
    });
  });

  describe('from unix timestamp() / to unix timestamp()', () => {
    it('epoch is 1970-01-01T00:00:00Z', () => {
      const r = evaluate('from unix timestamp(0)').value as {
        kind: string;
        year: number;
        month: number;
        day: number;
        hour: number;
        minute: number;
        second: number;
      };
      expect(r.year).toBe(1970);
      expect(r.month).toBe(1);
      expect(r.day).toBe(1);
      expect(r.hour).toBe(0);
      expect(r.minute).toBe(0);
      expect(r.second).toBe(0);
    });

    it('known timestamp round-trip', () => {
      // 2023-06-09T16:18:41Z = 1686327521
      const r = evaluate('from unix timestamp(1686327521)').value as {
        year: number;
        month: number;
        day: number;
        hour: number;
        minute: number;
        second: number;
      };
      expect(r.year).toBe(2023);
      expect(r.month).toBe(6);
      expect(r.day).toBe(9);
      expect(r.hour).toBe(16);
      expect(r.minute).toBe(18);
      expect(r.second).toBe(41);
    });

    it('to unix timestamp from date', () => {
      const r = evaluate('to unix timestamp(date("1970-01-01"))').value;
      expect(r).toBe(0);
    });

    it('to unix timestamp from date and time', () => {
      const r = evaluate('to unix timestamp(date and time("2023-06-09T16:18:41Z"))').value;
      expect(r).toBe(1686327521);
    });

    it('null returns null', () => {
      expect(evaluate('from unix timestamp(null)').value).toBeNull();
      expect(evaluate('to unix timestamp(null)').value).toBeNull();
    });

    it('round-trip: to then from', () => {
      const r = evaluate(
        'from unix timestamp(to unix timestamp(date and time("2024-06-15T10:30:00Z")))',
      ).value as { year: number; month: number; day: number; hour: number; minute: number };
      expect(r.year).toBe(2024);
      expect(r.month).toBe(6);
      expect(r.day).toBe(15);
      expect(r.hour).toBe(10);
      expect(r.minute).toBe(30);
    });
  });
});
