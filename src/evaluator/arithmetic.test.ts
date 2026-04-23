import { describe, expect, it } from 'vitest';
import { evaluate } from '../index.js';

describe('arithmetic', () => {
  describe('basic operations', () => {
    it('addition', () => {
      expect(evaluate('1 + 2').value).toBe(3);
      expect(evaluate('0 + 0').value).toBe(0);
      expect(evaluate('-1 + 1').value).toBe(0);
      expect(evaluate('1000000 + 999999').value).toBe(1999999);
    });

    it('subtraction', () => {
      expect(evaluate('10 - 3').value).toBe(7);
      expect(evaluate('0 - 5').value).toBe(-5);
      expect(evaluate('-3 - -2').value).toBe(-1);
    });

    it('multiplication', () => {
      expect(evaluate('4 * 5').value).toBe(20);
      expect(evaluate('-3 * 4').value).toBe(-12);
      expect(evaluate('0 * 999').value).toBe(0);
    });

    it('division', () => {
      expect(evaluate('10 / 4').value).toBe(2.5);
      expect(evaluate('1 / 3').value).toBeCloseTo(0.3333333333, 9);
      expect(evaluate('-10 / 2').value).toBe(-5);
    });

    it('exponentiation', () => {
      expect(evaluate('2 ** 10').value).toBe(1024);
      expect(evaluate('2 ** 0').value).toBe(1);
      expect(evaluate('2 ** -1').value).toBe(0.5);
      expect(evaluate('9 ** 0.5').value).toBe(3);
    });

    it('unary minus', () => {
      expect(evaluate('-5').value).toBe(-5);
      expect(evaluate('- -5').value).toBe(5);
      expect(evaluate('-(3 + 2)').value).toBe(-5);
    });

    it('operator precedence', () => {
      expect(evaluate('2 + 3 * 4').value).toBe(14);
      expect(evaluate('10 - 2 * 3').value).toBe(4);
      expect(evaluate('2 ** 3 + 1').value).toBe(9);
      expect(evaluate('6 / 2 + 1').value).toBe(4);
    });

    it('parentheses override precedence', () => {
      expect(evaluate('(2 + 3) * 4').value).toBe(20);
      expect(evaluate('(10 - 2) * (3 + 1)').value).toBe(32);
    });

    it('division by zero returns null', () => {
      expect(evaluate('1 / 0').value).toBeNull();
      expect(evaluate('0 / 0').value).toBeNull();
      expect(evaluate('-5 / 0').value).toBeNull();
    });
  });

  describe('decimal precision (IEEE 754 decimal128)', () => {
    it('0.1 + 0.2 = 0.3 exactly', () => {
      expect(evaluate('0.1 + 0.2').value).toBe(0.3);
      expect(evaluate('0.1 + 0.2 = 0.3').value).toBe(true);
    });

    it('0.1 + 0.2 + 0.3 = 0.6 exactly', () => {
      expect(evaluate('0.1 + 0.2 + 0.3').value).toBe(0.6);
    });

    it('decimal arithmetic precision', () => {
      expect(evaluate('1.005 * 100').value).toBe(100.5);
      expect(evaluate('0.7 + 0.1 = 0.8').value).toBe(true);
      expect(evaluate('1.1 + 2.2 = 3.3').value).toBe(true);
    });

    it('high precision intermediate results', () => {
      expect(evaluate('10 / 3 * 3').value).toBe(10);
    });

    it('large number precision', () => {
      expect(evaluate('9999999999999999 + 1').value).toBe(10000000000000000);
    });

    it('decimal subtraction precision', () => {
      expect(evaluate('1 - 0.9').value).toBe(0.1);
      expect(evaluate('0.9 - 0.8').value).toBe(0.1);
    });
  });

  describe('null propagation', () => {
    it('null in arithmetic returns null', () => {
      expect(evaluate('null + 1').value).toBeNull();
      expect(evaluate('1 + null').value).toBeNull();
      expect(evaluate('null - 1').value).toBeNull();
      expect(evaluate('null * 2').value).toBeNull();
      expect(evaluate('null / 2').value).toBeNull();
      expect(evaluate('null ** 2').value).toBeNull();
    });

    it('null context variable propagates', () => {
      expect(evaluate('x + 1', { x: null }).value).toBeNull();
    });
  });

  describe('numeric comparison', () => {
    it('greater than', () => {
      expect(evaluate('3 > 2').value).toBe(true);
      expect(evaluate('2 > 3').value).toBe(false);
      expect(evaluate('2 > 2').value).toBe(false);
    });

    it('greater than or equal', () => {
      expect(evaluate('2 >= 2').value).toBe(true);
      expect(evaluate('3 >= 2').value).toBe(true);
      expect(evaluate('1 >= 2').value).toBe(false);
    });

    it('less than', () => {
      expect(evaluate('1 < 2').value).toBe(true);
      expect(evaluate('2 < 1').value).toBe(false);
      expect(evaluate('2 < 2').value).toBe(false);
    });

    it('less than or equal', () => {
      expect(evaluate('2 <= 2').value).toBe(true);
      expect(evaluate('1 <= 2').value).toBe(true);
      expect(evaluate('3 <= 2').value).toBe(false);
    });

    it('equal', () => {
      expect(evaluate('2 = 2').value).toBe(true);
      expect(evaluate('2 = 3').value).toBe(false);
    });

    it('not equal', () => {
      expect(evaluate('2 != 3').value).toBe(true);
      expect(evaluate('2 != 2').value).toBe(false);
    });

    it('null equality semantics', () => {
      expect(evaluate('null = null').value).toBe(true);
      expect(evaluate('null = 1').value).toBe(false);
      expect(evaluate('1 = null').value).toBe(false);
      expect(evaluate('null != null').value).toBe(false);
      expect(evaluate('null != 1').value).toBe(true);
      // Ordering with null returns null
      expect(evaluate('null > 1').value).toBeNull();
      expect(evaluate('null < 1').value).toBeNull();
      expect(evaluate('null >= 1').value).toBeNull();
      expect(evaluate('null <= 1').value).toBeNull();
    });
  });

  describe('context variables', () => {
    it('numeric variables', () => {
      expect(evaluate('x + y', { x: 10, y: 20 }).value).toBe(30);
      expect(evaluate('x * y + z', { x: 3, y: 4, z: 5 }).value).toBe(17);
    });

    it('decimal variables retain precision', () => {
      expect(evaluate('x + y', { x: 0.1, y: 0.2 }).value).toBe(0.3);
    });
  });

  describe('string concatenation', () => {
    it('concatenates strings with +', () => {
      expect(evaluate('"hello" + " " + "world"').value).toBe('hello world');
    });

    it('null in string concat returns null', () => {
      expect(evaluate('"hello" + null').value).toBeNull();
    });
  });

  describe('complex precedence chains', () => {
    it('mixes all operators in a single expression', () => {
      // 2 + 3 * 4 - 8 / 2 ** 2 → 2 + 12 - 8/4 → 2 + 12 - 2 = 12
      expect(evaluate('2 + 3 * 4 - 8 / 2 ** 2').value).toBe(12);
    });

    it('unary minus after binary operator', () => {
      expect(evaluate('1 + -2').value).toBe(-1);
      expect(evaluate('5 * -3').value).toBe(-15);
      expect(evaluate('10 / -2').value).toBe(-5);
    });

    it('unary minus precedence vs exponentiation: -(2**3) = -8', () => {
      expect(evaluate('-2 ** 3').value).toBe(-8);
    });

    it('double negation', () => {
      expect(evaluate('- -5').value).toBe(5);
    });

    it('not before and, and before or', () => {
      expect(evaluate('not true and false or true').value).toBe(true);
    });

    it('comparison chained with arithmetic', () => {
      expect(evaluate('2 + 3 > 4').value).toBe(true);
      expect(evaluate('2 * 3 = 6').value).toBe(true);
    });
  });

  describe('division edge cases', () => {
    it('exponentiation by zero gives 1', () => {
      expect(evaluate('0 ** 0').value).toBe(1);
    });

    it('modulo zero returns null', () => {
      expect(evaluate('5 / 0').value).toBeNull();
    });

    it('very large exponent', () => {
      // Should not crash; result should be a large number or infinity handled as null
      const r = evaluate('10 ** 30').value;
      expect(r).not.toBeNull();
    });
  });

  describe('comparison — cross-type returns null', () => {
    it('integer equals decimal', () => {
      expect(evaluate('1 = 1.0').value).toBe(true);
    });

    it('number vs string → null', () => {
      expect(evaluate('1 < "a"').value).toBeNull();
      expect(evaluate('"a" > 1').value).toBeNull();
    });

    it('boolean vs number → null', () => {
      expect(evaluate('true < 1').value).toBeNull();
      expect(evaluate('false > 0').value).toBeNull();
    });

    it('string comparison', () => {
      expect(evaluate('"a" < "b"').value).toBe(true);
      expect(evaluate('"b" > "a"').value).toBe(true);
      expect(evaluate('"abc" = "abc"').value).toBe(true);
      expect(evaluate('"abc" != "xyz"').value).toBe(true);
    });

    it('boolean equality', () => {
      expect(evaluate('true = true').value).toBe(true);
      expect(evaluate('false != true').value).toBe(true);
    });

    it('unary minus on null returns null', () => {
      expect(evaluate('-null').value).toBeNull();
    });
  });

  describe('temporal arithmetic', () => {
    it('date + day-time duration', () => {
      const r = evaluate('date("2024-01-15") + duration("P1D")').value as Record<string, unknown>;
      expect(r?.year).toBe(2024);
      expect(r?.month).toBe(1);
      expect(r?.day).toBe(16);
    });

    it('date - day-time duration', () => {
      const r = evaluate('date("2024-01-15") - duration("P1D")').value as Record<string, unknown>;
      expect(r?.day).toBe(14);
    });

    it('date + year-month duration', () => {
      const r = evaluate('date("2024-01-15") + duration("P1M")').value as Record<string, unknown>;
      expect(r?.month).toBe(2);
    });

    it('date + P1Y', () => {
      const r = evaluate('date("2024-01-15") + duration("P1Y")').value as Record<string, unknown>;
      expect(r?.year).toBe(2025);
      expect(r?.month).toBe(1);
      expect(r?.day).toBe(15);
    });

    it('date - date → day-time duration', () => {
      const r = evaluate('date("2024-03-01") - date("2024-01-01")').value as Record<
        string,
        unknown
      >;
      expect(r?.kind).toBe('day-time');
    });

    it('date and time + duration', () => {
      const r = evaluate('date and time("2024-01-15T10:00:00") + duration("PT2H")').value as Record<
        string,
        unknown
      >;
      expect(r?.hour).toBe(12);
    });

    it('date and time - duration', () => {
      const r = evaluate('date and time("2024-01-15T10:00:00") - duration("P1D")').value as Record<
        string,
        unknown
      >;
      expect(r?.day).toBe(14);
    });

    it('time + duration', () => {
      const r = evaluate('time("10:00:00") + duration("PT30M")').value as Record<string, unknown>;
      expect(r?.minute).toBe(30);
    });

    it('duration + duration (year-month)', () => {
      const r = evaluate('duration("P1Y") + duration("P6M")').value as Record<string, unknown>;
      expect(r?.years).toBe(1);
      expect(r?.months).toBe(6);
    });

    it('duration - duration', () => {
      const r = evaluate('duration("P1Y") - duration("P6M")').value as Record<string, unknown>;
      expect(r?.months).toBe(6);
    });

    it('duration * number', () => {
      const r = evaluate('duration("P1D") * 3').value as Record<string, unknown>;
      expect(r?.days).toBe(3);
    });

    it('number * duration', () => {
      const r = evaluate('3 * duration("P1D")').value as Record<string, unknown>;
      expect(r?.days).toBe(3);
    });

    it('duration / number', () => {
      const r = evaluate('duration("P6D") / 2').value as Record<string, unknown>;
      expect(r?.days).toBe(3);
    });

    it('duration / duration → number', () => {
      expect(evaluate('duration("P3D") / duration("P1D")').value).toBe(3);
    });

    it('temporal comparison', () => {
      expect(evaluate('date("2024-01-15") < date("2024-01-16")').value).toBe(true);
      expect(evaluate('date("2024-01-15") = date("2024-01-15")').value).toBe(true);
      expect(evaluate('time("10:00:00") < time("11:00:00")').value).toBe(true);
    });
  });
});
