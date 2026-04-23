import { describe, expect, it } from 'vitest';
import { evaluate } from '../index.js';

describe('builtins/numeric', () => {
  describe('decimal()', () => {
    it('banker rounding (HALF_EVEN)', () => {
      expect(evaluate('decimal(1.115, 2)').value).toBe(1.12);
      expect(evaluate('decimal(1.145, 2)').value).toBe(1.14);
      expect(evaluate('decimal(1.125, 2)').value).toBe(1.12);
      expect(evaluate('decimal(1.135, 2)').value).toBe(1.14);
      expect(evaluate('decimal(1.175, 2)').value).toBe(1.18);
      expect(evaluate('decimal(2.5, 0)').value).toBe(2);
      expect(evaluate('decimal(3.5, 0)').value).toBe(4);
    });

    it('negative scale', () => {
      expect(evaluate('decimal(123.456, -1)').value).toBe(120);
      expect(evaluate('decimal(125, -2)').value).toBe(100);
    });

    it('zero scale', () => {
      expect(evaluate('decimal(1.5, 0)').value).toBe(2);
      expect(evaluate('decimal(2.5, 0)').value).toBe(2);
    });

    it('fractional scale uses floor', () => {
      expect(evaluate('decimal(1/3, 2.5)').value).toBeCloseTo(0.33, 5);
    });

    it('null inputs return null', () => {
      expect(evaluate('decimal(null, 2)').value).toBeNull();
      expect(evaluate('decimal(1.5, null)').value).toBeNull();
    });
  });

  describe('floor()', () => {
    it('positive numbers', () => {
      expect(evaluate('floor(1.7)').value).toBe(1);
      expect(evaluate('floor(1.0)').value).toBe(1);
      expect(evaluate('floor(0.9)').value).toBe(0);
    });

    it('negative numbers', () => {
      expect(evaluate('floor(-1.7)').value).toBe(-2);
      expect(evaluate('floor(-1.0)').value).toBe(-1);
    });

    it('with scale', () => {
      expect(evaluate('floor(1.675, 2)').value).toBe(1.67);
      expect(evaluate('floor(-1.675, 2)').value).toBe(-1.68);
      expect(evaluate('floor(1.23, 1)').value).toBe(1.2);
    });

    it('null scale returns null', () => {
      expect(evaluate('floor(1, null)').value).toBeNull();
    });

    it('null n returns null', () => {
      expect(evaluate('floor(null)').value).toBeNull();
    });
  });

  describe('ceiling()', () => {
    it('positive numbers', () => {
      expect(evaluate('ceiling(1.2)').value).toBe(2);
      expect(evaluate('ceiling(1.0)').value).toBe(1);
      expect(evaluate('ceiling(0.1)').value).toBe(1);
    });

    it('negative numbers', () => {
      expect(evaluate('ceiling(-1.2)').value).toBe(-1);
      expect(evaluate('ceiling(-1.7)').value).toBe(-1);
    });

    it('with scale', () => {
      expect(evaluate('ceiling(1.675, 2)').value).toBe(1.68);
      expect(evaluate('ceiling(-1.675, 2)').value).toBe(-1.67);
    });

    it('null scale returns null', () => {
      expect(evaluate('ceiling(1, null)').value).toBeNull();
    });
  });

  describe('round up()', () => {
    it('rounds away from zero', () => {
      expect(evaluate('round up(1.5, 0)').value).toBe(2);
      expect(evaluate('round up(-1.5, 0)').value).toBe(-2);
      expect(evaluate('round up(1.1, 0)').value).toBe(2);
      expect(evaluate('round up(-1.1, 0)').value).toBe(-2);
    });

    it('with decimal scale', () => {
      expect(evaluate('round up(1.235, 2)').value).toBe(1.24);
      expect(evaluate('round up(-1.235, 2)').value).toBe(-1.24);
    });

    it('null inputs return null', () => {
      expect(evaluate('round up(null, 2)').value).toBeNull();
      expect(evaluate('round up(1.5, null)').value).toBeNull();
    });
  });

  describe('round down()', () => {
    it('rounds toward zero', () => {
      expect(evaluate('round down(1.5, 0)').value).toBe(1);
      expect(evaluate('round down(-1.5, 0)').value).toBe(-1);
      expect(evaluate('round down(1.9, 0)').value).toBe(1);
      expect(evaluate('round down(-1.9, 0)').value).toBe(-1);
    });

    it('null inputs return null', () => {
      expect(evaluate('round down(null, 2)').value).toBeNull();
    });
  });

  describe('round half up()', () => {
    it('0.5 rounds up', () => {
      expect(evaluate('round half up(1.5, 0)').value).toBe(2);
      expect(evaluate('round half up(2.5, 0)').value).toBe(3);
    });

    it('below 0.5 rounds down', () => {
      expect(evaluate('round half up(1.4, 0)').value).toBe(1);
    });

    it('negative numbers', () => {
      expect(evaluate('round half up(-1.5, 0)').value).toBe(-2);
    });

    it('null inputs return null', () => {
      expect(evaluate('round half up(null, 2)').value).toBeNull();
    });
  });

  describe('round half down()', () => {
    it('0.5 rounds down', () => {
      expect(evaluate('round half down(1.5, 0)').value).toBe(1);
      expect(evaluate('round half down(2.5, 0)').value).toBe(2);
    });

    it('above 0.5 rounds up', () => {
      expect(evaluate('round half down(1.6, 0)').value).toBe(2);
    });

    it('negative numbers', () => {
      expect(evaluate('round half down(-1.5, 0)').value).toBe(-1);
    });
  });

  describe('abs()', () => {
    it('positive numbers', () => {
      expect(evaluate('abs(5)').value).toBe(5);
      expect(evaluate('abs(0)').value).toBe(0);
      expect(evaluate('abs(0.5)').value).toBe(0.5);
    });

    it('negative numbers', () => {
      expect(evaluate('abs(-5)').value).toBe(5);
      expect(evaluate('abs(-0.5)').value).toBe(0.5);
    });

    it('duration', () => {
      expect(evaluate('abs(duration("-P1D"))').value).toMatchObject({ kind: 'day-time', days: 1 });
      expect(evaluate('abs(duration("P1Y"))').value).toMatchObject({
        kind: 'year-month',
        years: 1,
      });
    });

    it('null returns null', () => {
      expect(evaluate('abs(null)').value).toBeNull();
    });
  });

  describe('modulo()', () => {
    it('FEEL modulo: result has sign of divisor', () => {
      expect(evaluate('modulo(10, 3)').value).toBe(1);
      expect(evaluate('modulo(-10, 3)').value).toBe(2);
      expect(evaluate('modulo(10, -3)').value).toBe(-2);
      expect(evaluate('modulo(-10, -3)').value).toBe(-1);
    });

    it('divisor zero returns null', () => {
      expect(evaluate('modulo(10, 0)').value).toBeNull();
    });

    it('null inputs return null', () => {
      expect(evaluate('modulo(null, 3)').value).toBeNull();
      expect(evaluate('modulo(10, null)').value).toBeNull();
    });
  });

  describe('sqrt()', () => {
    it('perfect squares', () => {
      expect(evaluate('sqrt(9)').value).toBe(3);
      expect(evaluate('sqrt(4)').value).toBe(2);
      expect(evaluate('sqrt(0)').value).toBe(0);
      expect(evaluate('sqrt(1)').value).toBe(1);
    });

    it('non-perfect squares', () => {
      expect(evaluate('sqrt(2)').value).toBeCloseTo(Math.SQRT2, 5);
    });

    it('negative returns null', () => {
      expect(evaluate('sqrt(-1)').value).toBeNull();
    });

    it('null returns null', () => {
      expect(evaluate('sqrt(null)').value).toBeNull();
    });
  });

  describe('log()', () => {
    it('log(1) = 0', () => {
      expect(evaluate('log(1)').value).toBe(0);
    });

    it('natural log', () => {
      expect(evaluate('log(4)').value).toBeCloseTo(1.38629436, 5);
    });

    it('log of zero or negative returns null', () => {
      expect(evaluate('log(0)').value).toBeNull();
      expect(evaluate('log(-1)').value).toBeNull();
    });

    it('null returns null', () => {
      expect(evaluate('log(null)').value).toBeNull();
    });
  });

  describe('exp()', () => {
    it('exp(0) = 1 exactly', () => {
      expect(evaluate('exp(0)').value).toBe(1);
    });

    it('exp(1) = Math.E (full double precision, not 8dp truncation)', () => {
      expect(evaluate('exp(1)').value).toBe(Math.E);
    });

    it('exp(-1) = full double precision', () => {
      expect(evaluate('exp(-1)').value).toBe(Math.exp(-1));
    });

    it('exp(4) close to known value', () => {
      expect(evaluate('exp(4)').value).toBeCloseTo(54.59815003, 5);
    });

    it('null returns null', () => {
      expect(evaluate('exp(null)').value).toBeNull();
    });
  });

  describe('odd() and even()', () => {
    it('odd integers', () => {
      expect(evaluate('odd(1)').value).toBe(true);
      expect(evaluate('odd(3)').value).toBe(true);
      expect(evaluate('odd(-1)').value).toBe(true);
      expect(evaluate('odd(0)').value).toBe(false);
      expect(evaluate('odd(2)').value).toBe(false);
    });

    it('even integers', () => {
      expect(evaluate('even(0)').value).toBe(true);
      expect(evaluate('even(2)').value).toBe(true);
      expect(evaluate('even(-2)').value).toBe(true);
      expect(evaluate('even(1)').value).toBe(false);
      expect(evaluate('even(3)').value).toBe(false);
    });

    it('non-integer returns null', () => {
      expect(evaluate('odd(1.5)').value).toBeNull();
      expect(evaluate('even(1.5)').value).toBeNull();
    });

    it('null returns null', () => {
      expect(evaluate('odd(null)').value).toBeNull();
      expect(evaluate('even(null)').value).toBeNull();
    });
  });

  describe('random number()', () => {
    it('returns a number in [0, 1)', () => {
      const v = evaluate('random number()').value as number;
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    });
  });

  describe('exp() and log() edge cases', () => {
    it('log(exp(1)) = 1 exactly (round-trip identity)', () => {
      expect(evaluate('log(exp(1))').value).toBe(1);
    });

    it('log(exp(x)) round-trip for several values', () => {
      expect(evaluate('log(exp(2))').value).toBeCloseTo(2, 10);
      expect(evaluate('log(exp(0.5))').value).toBeCloseTo(0.5, 10);
    });

    it('exp of large positive number returns a number', () => {
      const v = evaluate('exp(100)').value;
      expect(v).not.toBeNull();
      expect(typeof v).toBe('number');
    });

    it('exp of large negative number → very small or zero (underflow)', () => {
      const v = evaluate('exp(-100)').value as number;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(0.0001);
    });

    it('log of very small positive number', () => {
      const v = evaluate('log(0.0001)').value as number;
      expect(v).toBeLessThan(0);
    });

    it('sqrt(2) precision', () => {
      const v = evaluate('sqrt(2)').value as number;
      expect(v * v).toBeCloseTo(2, 8);
    });
  });

  describe('modulo edge cases', () => {
    it('10 mod 10 = 0', () => {
      expect(evaluate('modulo(10, 10)').value).toBe(0);
    });

    it('0 mod 5 = 0', () => {
      expect(evaluate('modulo(0, 5)').value).toBe(0);
    });

    it('decimal modulo', () => {
      expect(evaluate('modulo(1.5, 0.4)').value).toBeCloseTo(0.3, 8);
    });
  });

  describe('abs() with durations', () => {
    it('abs of negative year-month duration', () => {
      expect(evaluate('abs(duration("-P2Y3M"))').value).toMatchObject({ years: 2, months: 3 });
    });

    it('abs of positive duration unchanged', () => {
      expect(evaluate('abs(duration("P5D"))').value).toMatchObject({ days: 5 });
    });
  });

  describe('odd/even edge cases', () => {
    it('zero is even', () => {
      expect(evaluate('even(0)').value).toBe(true);
      expect(evaluate('odd(0)').value).toBe(false);
    });

    it('large odd integer', () => {
      expect(evaluate('odd(9999999)').value).toBe(true);
    });

    it('large even integer', () => {
      expect(evaluate('even(9999998)').value).toBe(true);
    });
  });

  describe('decimal() precision', () => {
    it('very small positive scale', () => {
      expect(evaluate('decimal(1.23456789, 4)').value).toBe(1.2346);
    });

    it('negative scale rounds to tens', () => {
      expect(evaluate('decimal(1234, -3)').value).toBe(1000);
    });

    it('result is exact with 0 scale on integer', () => {
      expect(evaluate('decimal(42, 0)').value).toBe(42);
    });
  });
});
