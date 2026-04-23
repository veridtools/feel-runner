import { describe, expect, it } from 'vitest';
import { evaluate } from '../index.js';

describe('errors and warnings', () => {
  describe('NO_VARIABLE_FOUND', () => {
    it('missing variable returns null with warning', () => {
      const r = evaluate('x + 1');
      expect(r.value).toBeNull();
      expect(r.warnings).toContainEqual(expect.objectContaining({ code: 'NO_VARIABLE_FOUND' }));
    });

    it('missing function emits NO_VARIABLE_FOUND then FUNCTION_NOT_FOUND', () => {
      const r = evaluate('foo(1, 2)');
      expect(r.value).toBeNull();
      expect(r.warnings).toContainEqual(expect.objectContaining({ code: 'NO_VARIABLE_FOUND' }));
      expect(r.warnings).toContainEqual(expect.objectContaining({ code: 'FUNCTION_NOT_FOUND' }));
    });
  });

  describe('arithmetic type errors return null without throwing', () => {
    it('string + number = null', () => {
      expect(evaluate('"a" + 1').value).toBeNull();
    });

    it('number - string = null', () => {
      expect(evaluate('1 - "a"').value).toBeNull();
    });

    it('boolean * number = null', () => {
      expect(evaluate('true * 2').value).toBeNull();
    });
  });

  describe('division by zero', () => {
    it('returns null', () => {
      expect(evaluate('1 / 0').value).toBeNull();
      expect(evaluate('0 / 0').value).toBeNull();
    });
  });

  describe('null propagation does not throw', () => {
    it('null in all arithmetic ops', () => {
      expect(() => evaluate('null + null')).not.toThrow();
      expect(() => evaluate('null - null')).not.toThrow();
      expect(() => evaluate('null * null')).not.toThrow();
      expect(() => evaluate('null / null')).not.toThrow();
      expect(() => evaluate('null ** null')).not.toThrow();
    });

    it('deeply nested null', () => {
      expect(evaluate('1 + (2 * null)').value).toBeNull();
    });
  });

  describe('invalid builtin arguments return null', () => {
    it('sqrt of string = null', () => {
      expect(evaluate('sqrt("abc")').value).toBeNull();
    });

    it('date of invalid string = null', () => {
      expect(evaluate('date("not-a-date")').value).toBeNull();
    });

    it('duration of invalid string = null', () => {
      expect(evaluate('duration("invalid")').value).toBeNull();
    });
  });
});
