import { describe, expect, it } from 'vitest';
import { evaluate, evaluateAsync, explain, validate } from './index.js';

describe('Phase D', () => {
  // ─── D1: let expressions ────────────────────────────────────────────────────

  describe('D1: let expressions', () => {
    it('basic let', () => {
      expect(evaluate('let x = 5 in x + 1').value).toBe(6);
    });
    it('let with multiplication', () => {
      expect(evaluate('let rate = 0.1 in rate * 1000').value).toBe(100);
    });
    it('chained lets', () => {
      expect(evaluate('let x = 3 in let y = 4 in x + y').value).toBe(7);
    });
    it('chained lets — body uses both bindings', () => {
      expect(evaluate('let a = 10 in let b = a * 2 in a + b').value).toBe(30);
    });
    it('let with string', () => {
      expect(evaluate('let greeting = "Hello" in greeting + " World"').value).toBe('Hello World');
    });
    it('let with list expression', () => {
      expect(evaluate('let nums = [1,2,3] in count(nums)').value).toBe(3);
    });
    it('let with if/else body', () => {
      expect(evaluate('let x = 10 in if x > 5 then "big" else "small"').value).toBe('big');
    });
    it('let inside for', () => {
      const r = evaluate('for i in [1,2,3] return let doubled = i * 2 in doubled').value;
      expect(r).toEqual([2, 4, 6]);
    });
    it('let with context variable', () => {
      const r = evaluate('let monthly = annual / 12 in monthly * 3', { annual: 1200 });
      expect(r.value).toBe(300);
    });
    it('nested lets referencing outer', () => {
      expect(evaluate('let base = 100 in let tax = base * 0.1 in base + tax').value).toBe(110);
    });
    it('validate: let binding not flagged as unknown variable', () => {
      const r = validate('let x = 5 in x + 1', {});
      expect(
        r.warnings.filter((w) => w.code === 'UNKNOWN_VARIABLE' && w.name === 'x'),
      ).toHaveLength(0);
    });
  });

  // ─── D2: pipeline operator |> ────────────────────────────────────────────────

  describe('D2: pipeline operator |>', () => {
    it('simple function pipe', () => {
      expect(evaluate('"hello" |> upper case').value).toBe('HELLO');
    });
    it('pipe to count', () => {
      expect(evaluate('[1,2,3] |> count').value).toBe(3);
    });
    it('pipe to lower case', () => {
      expect(evaluate('"WORLD" |> lower case').value).toBe('world');
    });
    it('chained pipes', () => {
      expect(evaluate('"Hello" |> upper case |> lower case').value).toBe('hello');
    });
    it('pipe with ? slot', () => {
      expect(evaluate('"hello world" |> substring(?, 1, 5)').value).toBe('hello');
    });
    it('pipe with ? in non-first position', () => {
      expect(evaluate('"world" |> string length(?)').value).toBe(5);
    });
    it('pipe to reverse', () => {
      expect(evaluate('[1,2,3] |> reverse').value).toEqual([3, 2, 1]);
    });
    it('pipe to sum', () => {
      expect(evaluate('[1,2,3,4] |> sum').value).toBe(10);
    });
    it('pipe to flatten', () => {
      expect(evaluate('[[1,2],[3,4]] |> flatten').value).toEqual([1, 2, 3, 4]);
    });
    it('pipe from context variable', () => {
      expect(evaluate('name |> upper case', { name: 'alice' }).value).toBe('ALICE');
    });
    it('pipe to trim', () => {
      expect(evaluate('"  spaces  " |> trim').value).toBe('spaces');
    });
    it('chained pipe with ? slot in middle', () => {
      expect(evaluate('"hello" |> upper case |> substring(?, 1, 3)').value).toBe('HEL');
    });
  });

  // ─── D3: evaluateAsync ───────────────────────────────────────────────────────

  describe('D3: evaluateAsync', () => {
    it('returns same result as evaluate', async () => {
      const r = await evaluateAsync('1 + 1');
      expect(r.value).toBe(2);
    });
    it('returns promise', () => {
      const p = evaluateAsync('42');
      expect(p).toBeInstanceOf(Promise);
    });
    it('works with context', async () => {
      const r = await evaluateAsync('x * 2', { x: 5 });
      expect(r.value).toBe(10);
    });
    it('returns warnings', async () => {
      const r = await evaluateAsync('x + 1');
      expect(r.warnings.length).toBeGreaterThan(0);
    });
    it('works with let expressions', async () => {
      const r = await evaluateAsync('let n = 10 in n * n');
      expect(r.value).toBe(100);
    });
  });

  // ─── D4: explain ─────────────────────────────────────────────────────────────

  describe('D4: explain(expression, context)', () => {
    it('returns result value', () => {
      const r = explain('1 + 2');
      expect(r.result).toBe(3);
    });
    it('returns explanation string', () => {
      const r = explain('1 + 2');
      expect(typeof r.explanation).toBe('string');
      expect(r.explanation.length).toBeGreaterThan(0);
    });
    it('explanation contains result', () => {
      const r = explain('42');
      expect(r.explanation).toContain('42');
    });
    it('if/else: true branch', () => {
      const r = explain('if 5 > 3 then "yes" else "no"');
      expect(r.result).toBe('yes');
      expect(r.explanation).toContain('then');
    });
    it('if/else: false branch', () => {
      const r = explain('if 2 > 3 then "yes" else "no"');
      expect(r.result).toBe('no');
      expect(r.explanation).toContain('else');
    });
    it('if/else with variable', () => {
      const r = explain('if score >= 700 then "approved" else "rejected"', { score: 580 });
      expect(r.result).toBe('rejected');
      expect(r.explanation).toContain('score');
      expect(r.explanation).toContain('580');
    });
    it('and/or in condition', () => {
      const r = explain('if x > 0 and y > 0 then "both" else "not both"', { x: 1, y: -1 });
      expect(r.result).toBe('not both');
      expect(r.explanation).toContain('AND');
    });
    it('let in explanation', () => {
      const r = explain('let x = 10 in x * 2');
      expect(r.result).toBe(20);
      expect(r.explanation).toContain('x = 10');
    });
    it('pipeline in explanation', () => {
      const r = explain('"hello" |> upper case');
      expect(r.result).toBe('HELLO');
      expect(r.explanation).toContain('HELLO');
    });
    it('works with null result', () => {
      const r = explain('null');
      expect(r.result).toBeNull();
      expect(r.explanation).toContain('null');
    });
  });
});
