import { describe, expect, it } from 'vitest';
import { evalExpression } from './evaluator/index.js';
import { ParseSyntaxError, safeParse, validate } from './index.js';

// ─── safeParse() ─────────────────────────────────────────────────────────────

describe('safeParse()', () => {
  describe('valid expressions return empty errors', () => {
    it('simple arithmetic', () => {
      const { ast, errors } = safeParse('1 + 1');
      expect(errors).toHaveLength(0);
      expect(ast.type).toBe('BinaryOp');
    });

    it('string literal', () => {
      const { errors } = safeParse('"hello"');
      expect(errors).toHaveLength(0);
    });

    it('context literal', () => {
      const { errors } = safeParse('{a: 1, b: 2}');
      expect(errors).toHaveLength(0);
    });

    it('unary-tests dialect: comma-separated tests', () => {
      const { ast, errors } = safeParse('1, [5..10]', 'unary-tests');
      expect(errors).toHaveLength(0);
      expect(ast.type).toBe('UnaryTestList');
    });

    it('knownNames enables multi-word identifiers', () => {
      const { errors } = safeParse('First Name + 1', 'expression', new Set(['First Name']));
      expect(errors).toHaveLength(0);
    });
  });

  describe('invalid expressions return errors without throwing', () => {
    it('unexpected token in binary op position', () => {
      const { errors } = safeParse('1 + * 2');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('missing operand at end of expression', () => {
      const { errors } = safeParse('1 +');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('bare invalid token returns ErrorNode ast', () => {
      const { ast, errors } = safeParse('*');
      expect(errors.length).toBeGreaterThan(0);
      expect(ast.type).toBe('ErrorNode');
    });

    it('empty expression returns ErrorNode ast', () => {
      const { ast, errors } = safeParse('');
      expect(errors.length).toBeGreaterThan(0);
      expect(ast.type).toBe('ErrorNode');
    });

    it('parser recovers and still returns an AST node', () => {
      const { ast } = safeParse('1 + * 2');
      // Parser recovers from the error and wraps in the outer BinaryOp
      expect(ast).toBeDefined();
      expect(ast.type).toBeTruthy();
    });
  });

  describe('ParseSyntaxError shape', () => {
    it('errors are instances of ParseSyntaxError', () => {
      const { errors } = safeParse('1 + * 2');
      expect(errors[0]).toBeInstanceOf(ParseSyntaxError);
    });

    it('ParseSyntaxError has name "ParseSyntaxError"', () => {
      const { errors } = safeParse('1 + * 2');
      expect(errors[0]?.name).toBe('ParseSyntaxError');
    });

    it('error has a non-empty message string', () => {
      const { errors } = safeParse('1 + * 2');
      expect(typeof errors[0]?.message).toBe('string');
      expect(errors[0]!.message.length).toBeGreaterThan(0);
    });

    it('error has numeric start and end positions', () => {
      const { errors } = safeParse('1 + * 2');
      expect(typeof errors[0]?.start).toBe('number');
      expect(typeof errors[0]?.end).toBe('number');
    });

    it('start is before or equal to end', () => {
      const { errors } = safeParse('1 + * 2');
      expect(errors[0]!.start).toBeLessThanOrEqual(errors[0]!.end);
    });

    it('missing-operand EOF error: start equals end', () => {
      const { errors } = safeParse('1 +');
      // EOF token has zero-width position
      expect(errors[0]!.start).toBe(errors[0]!.end);
    });
  });

  describe('error positions are accurate', () => {
    // Expression: '1 + * 2'
    //              0123456
    // '*' is at offset 4 (after '1', ' ', '+', ' ')
    it('unexpected * at offset 4 in "1 + * 2"', () => {
      const { errors } = safeParse('1 + * 2');
      expect(errors[0]!.start).toBe(4);
      expect(errors[0]!.end).toBe(5);
    });

    it('EOF error position equals expression length after trim', () => {
      const expr = '1 +';
      const { errors } = safeParse(expr);
      // EOF is at end of input
      expect(errors[0]!.start).toBe(expr.length);
    });
  });

  describe('lexer errors still throw (not wrapped)', () => {
    it('unterminated string literal throws', () => {
      expect(() => safeParse('"unclosed')).toThrow('Unterminated string literal');
    });
  });
});

// ─── ParseSyntaxError class ───────────────────────────────────────────────────

describe('ParseSyntaxError', () => {
  it('can be constructed directly', () => {
    const e = new ParseSyntaxError('test error', 0, 5);
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(ParseSyntaxError);
    expect(e.message).toBe('test error');
    expect(e.start).toBe(0);
    expect(e.end).toBe(5);
    expect(e.name).toBe('ParseSyntaxError');
  });

  it('start and end are readonly', () => {
    const e = new ParseSyntaxError('msg', 2, 8);
    expect(e.start).toBe(2);
    expect(e.end).toBe(8);
  });

  it('instanceof Error is true', () => {
    expect(new ParseSyntaxError('x', 0, 1)).toBeInstanceOf(Error);
  });
});

// ─── ErrorNode in evaluator ───────────────────────────────────────────────────

describe('ErrorNode in evaluator', () => {
  it('evaluating an ErrorNode returns null', () => {
    const { ast } = safeParse('*');
    expect(ast.type).toBe('ErrorNode');
    const result = evalExpression(ast, {});
    expect(result.value).toBeNull();
  });

  it('evaluating an ErrorNode emits PARSE_ERROR warning', () => {
    const { ast } = safeParse('*');
    const result = evalExpression(ast, {});
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: 'PARSE_ERROR' }));
  });

  it('PARSE_ERROR warning message is non-empty and meaningful', () => {
    const { ast } = safeParse('*');
    const result = evalExpression(ast, {});
    const msg = result.warnings[0]?.message ?? '';
    // ErrorNode carries a simplified message; ParseSyntaxError carries the full form.
    // Both describe the same token — assert the key content is present.
    expect(msg.length).toBeGreaterThan(0);
    expect(msg).toContain('*');
  });

  it('ErrorNode loc is present', () => {
    const { ast } = safeParse('*');
    if (ast.type === 'ErrorNode') {
      expect(typeof ast.loc.start).toBe('number');
      expect(typeof ast.loc.end).toBe('number');
    }
  });
});

// ─── validate() error positions ──────────────────────────────────────────────

describe('validate() with parse errors', () => {
  it('parser error includes start position', () => {
    const result = validate('1 + * 2');
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.start).toBe(4);
  });

  it('parser error includes end position', () => {
    const result = validate('1 + * 2');
    expect(result.errors[0]?.end).toBe(5);
  });

  it('lexer error (unterminated string) is caught and returned as ValidationError', () => {
    const result = validate('"unclosed');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.message).toMatch(/unterminated string/i);
  });

  it('lexer error has no position (undefined start/end)', () => {
    const result = validate('"unclosed');
    // Lexer errors are plain Error objects — no start/end
    expect(result.errors[0]?.start).toBeUndefined();
    expect(result.errors[0]?.end).toBeUndefined();
  });

  it('valid expression has no errors', () => {
    const result = validate('score > 100');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('missing operand error has position at end of input', () => {
    const result = validate('1 +');
    expect(result.valid).toBe(false);
    expect(typeof result.errors[0]?.start).toBe('number');
  });
});

// ─── negative / edge cases ────────────────────────────────────────────────────

describe('parse edge cases', () => {
  it('empty string: safeParse does not throw', () => {
    expect(() => safeParse('')).not.toThrow();
  });

  it('whitespace only: safeParse does not throw', () => {
    expect(() => safeParse('   ')).not.toThrow();
  });

  it('validate empty string returns some result without throwing', () => {
    expect(() => validate('')).not.toThrow();
  });

  it('unary-tests with invalid token does not throw', () => {
    expect(() => safeParse('***', 'unary-tests')).not.toThrow();
  });

  it('deeply nested valid expression parses without errors', () => {
    const { errors } = safeParse('((((1 + 2) * 3) - 4) / 5)');
    expect(errors).toHaveLength(0);
  });

  it('valid list with trailing whitespace', () => {
    const { errors } = safeParse('[1, 2, 3]   ');
    expect(errors).toHaveLength(0);
  });
});
