import { describe, expect, it } from 'vitest';
import { compile, evaluate } from '../index.js';

describe('compile()', () => {
  describe('returns a CompiledExpression', () => {
    it('has ast property', () => {
      const compiled = compile('1 + 1');
      expect(compiled.ast).toBeDefined();
      expect(compiled.ast.type).toBe('BinaryOp');
    });

    it('has dialect property defaulting to expression', () => {
      const compiled = compile('1 + 1');
      expect(compiled.dialect).toBe('expression');
    });

    it('has evaluate() method', () => {
      const compiled = compile('1 + 1');
      expect(typeof compiled.evaluate).toBe('function');
    });
  });

  describe('evaluate() produces correct results', () => {
    it('simple arithmetic', () => {
      const compiled = compile('a + b');
      const result = compiled.evaluate({ a: 1, b: 2 });
      expect(result.value).toBe(3);
    });

    it('matches evaluate() function output', () => {
      const expr = 'price * qty';
      const ctx = { price: 10, qty: 5 };
      const compiled = compile(expr);
      expect(compiled.evaluate(ctx).value).toBe(evaluate(expr, ctx).value);
    });

    it('empty context defaults to {}', () => {
      const compiled = compile('1 + 1');
      expect(compiled.evaluate().value).toBe(2);
    });

    it('returns warnings alongside value', () => {
      const compiled = compile('missingVar + 1');
      const result = compiled.evaluate({});
      expect(result.value).toBeNull();
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'NO_VARIABLE_FOUND' }),
      );
    });

    it('called multiple times with different contexts', () => {
      const compiled = compile('x * 2');
      expect(compiled.evaluate({ x: 3 }).value).toBe(6);
      expect(compiled.evaluate({ x: 10 }).value).toBe(20);
      expect(compiled.evaluate({ x: 0 }).value).toBe(0);
    });
  });

  describe('dialects', () => {
    it('expression dialect is the default', () => {
      const compiled = compile('1 + 1', 'expression');
      expect(compiled.dialect).toBe('expression');
      expect(compiled.ast.type).toBe('BinaryOp');
    });

    it('unary-tests dialect parses test lists', () => {
      const compiled = compile('1, [5..10]', 'unary-tests');
      expect(compiled.dialect).toBe('unary-tests');
      expect(compiled.ast.type).toBe('UnaryTestList');
    });

    it('unary-tests compiled expression evaluates against ?', () => {
      const compiled = compile('[1..10]', 'unary-tests');
      expect(compiled.evaluate({ '?': 5 }).value).toBe(true);
      expect(compiled.evaluate({ '?': 15 }).value).toBe(false);
    });
  });

  describe('parse-once semantic (AST reuse)', () => {
    it('same expression returns the same ast reference', () => {
      const a = compile('1 + 1');
      const b = compile('1 + 1');
      // The default cache should return the same AST object
      expect(a.ast).toBe(b.ast);
    });

    it('different dialects are cached separately', () => {
      const expr = compile('1 + 1', 'expression');
      const unary = compile('1 + 1', 'unary-tests');
      // Different dialects → different ASTs
      expect(expr.ast).not.toBe(unary.ast);
    });

    it('different expressions are cached separately', () => {
      const a = compile('1 + 1');
      const b = compile('2 + 2');
      expect(a.ast).not.toBe(b.ast);
    });
  });

  describe('throws on syntax error (compile uses parse, not safeParse)', () => {
    it('invalid expression throws during compile', () => {
      expect(() => compile('1 + * 2')).toThrow();
    });

    it('unterminated string throws during compile', () => {
      expect(() => compile('"unclosed')).toThrow();
    });
  });

  describe('complex expressions', () => {
    it('if/then/else', () => {
      const compiled = compile('if x > 0 then "positive" else "non-positive"');
      expect(compiled.evaluate({ x: 5 }).value).toBe('positive');
      expect(compiled.evaluate({ x: -1 }).value).toBe('non-positive');
    });

    it('for loop', () => {
      const compiled = compile('for i in [1,2,3] return i * 2');
      expect(compiled.evaluate({}).value).toEqual([2, 4, 6]);
    });

    it('builtin function call', () => {
      const compiled = compile('sum(items)');
      expect(compiled.evaluate({ items: [1, 2, 3, 4] }).value).toBe(10);
    });

    it('context access', () => {
      const compiled = compile('order.total');
      expect(compiled.evaluate({ order: { total: 250 } }).value).toBe(250);
    });
  });
});
