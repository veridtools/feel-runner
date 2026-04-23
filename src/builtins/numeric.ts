import { asDecimal, D, Decimal, isNum } from '../decimal.js';
import { absDuration } from '../temporal/duration.js';
import type { FeelValue } from '../types.js';
import { isFeelDuration } from '../types.js';

const HALF_EVEN = Decimal.ROUND_HALF_EVEN;
const HALF_UP = Decimal.ROUND_HALF_UP;
const HALF_DOWN = Decimal.ROUND_HALF_DOWN;

function getScale(scale: unknown): number | null {
  if (!isNum(scale)) return null;
  const n = asDecimal(scale)!.toNumber();
  if (!Number.isInteger(n) || n < -6111 || n > 6176) return null;
  return n;
}

export const numericBuiltins: Record<string, (args: FeelValue[]) => FeelValue> = {
  decimal([n, scale]) {
    if (!isNum(n) || !isNum(scale)) return null;
    const raw = asDecimal(scale)!.toNumber();
    if (!Number.isFinite(raw)) return null;
    const s = Math.floor(raw);
    if (s < -6111 || s > 6176) return null;
    if (s >= 0) return asDecimal(n)!.toDecimalPlaces(s, HALF_EVEN);
    // Negative scale: round to 10^(-s) multiple
    const factor = D(10).pow(-s);
    return asDecimal(n)!.div(factor).toDecimalPlaces(0, HALF_EVEN).times(factor);
  },

  floor(args) {
    if (args.length > 2) return null;
    const [n, scale] = args;
    if (!isNum(n)) return null;
    const d = asDecimal(n)!;
    if (scale === undefined) return d.floor();
    if (scale === null) return null;
    const s = getScale(scale);
    if (s === null) return null;
    const factor = D(10).pow(s);
    return d.times(factor).floor().div(factor);
  },

  ceiling(args) {
    if (args.length > 2) return null;
    const [n, scale] = args;
    if (!isNum(n)) return null;
    const d = asDecimal(n)!;
    if (scale === undefined) return d.ceil();
    if (scale === null) return null;
    const s = getScale(scale);
    if (s === null) return null;
    const factor = D(10).pow(s);
    return d.times(factor).ceil().div(factor);
  },

  'round up'(args) {
    if (args.length > 2) return null;
    const [n, scale] = args;
    if (!isNum(n)) return null;
    if (scale === null) return null;
    const s = scale === undefined ? 0 : getScale(scale);
    if (s === null) return null;
    const d = asDecimal(n)!;
    if (s === 0) return d.isNegative() ? d.abs().ceil().neg() : d.ceil();
    const factor = D(10).pow(s);
    const shifted = d.abs().times(factor);
    const result = shifted.ceil().div(factor);
    return d.isNegative() ? result.neg() : result;
  },

  'round down'(args) {
    if (args.length > 2) return null;
    const [n, scale] = args;
    if (!isNum(n)) return null;
    if (scale === null) return null;
    const s = scale === undefined ? 0 : getScale(scale);
    if (s === null) return null;
    const d = asDecimal(n)!;
    if (s === 0) return d.isNegative() ? d.abs().floor().neg() : d.floor();
    const factor = D(10).pow(s);
    const shifted = d.abs().times(factor);
    const result = shifted.floor().div(factor);
    return d.isNegative() ? result.neg() : result;
  },

  'round half up'(args) {
    if (args.length > 2) return null;
    const [n, scale] = args;
    if (!isNum(n)) return null;
    if (scale === null) return null;
    const s = scale === undefined ? 0 : getScale(scale);
    if (s === null) return null;
    return asDecimal(n)!.toDecimalPlaces(s, HALF_UP);
  },

  'round half down'(args) {
    if (args.length > 2) return null;
    const [n = null, scale] = args;
    if (!isNum(n)) return null;
    if (scale === null) return null;
    const s = scale === undefined ? 0 : getScale(scale);
    if (s === null) return null;
    return asDecimal(n)!.toDecimalPlaces(s, HALF_DOWN);
  },

  abs(args) {
    if (args.length !== 1) return null;
    const [n = null] = args;
    if (isNum(n)) return asDecimal(n)!.abs();
    if (isFeelDuration(n)) return absDuration(n);
    return null;
  },

  modulo(args) {
    if (args.length !== 2) return null;
    const [dividend, divisor] = args;
    if (!isNum(dividend) || !isNum(divisor)) return null;
    const dd = asDecimal(dividend)!,
      dv = asDecimal(divisor)!;
    if (dv.isZero()) return null;
    // FEEL modulo: result has same sign as divisor
    return dd.mod(dv).plus(dv).mod(dv);
  },

  sqrt(args) {
    if (args.length !== 1) return null;
    const [n] = args;
    if (!isNum(n)) return null;
    const d = asDecimal(n)!;
    if (d.isNegative()) return null;
    return d.sqrt();
  },

  log(args) {
    if (args.length !== 1) return null;
    const [n] = args;
    if (!isNum(n)) return null;
    const d = asDecimal(n)!;
    if (d.lte(0)) return null;
    // Use Math.log for double-precision round-trip correctness (e.g. log(exp(1)) === 1)
    return D(Math.log(d.toNumber()));
  },

  exp(args) {
    if (args.length !== 1) return null;
    const [n] = args;
    if (!isNum(n)) return null;
    // Use Math.exp for double-precision results matching IEEE 754 expectations
    return D(Math.exp(asDecimal(n)!.toNumber()));
  },

  odd(args) {
    if (args.length !== 1) return null;
    const [n] = args;
    if (!isNum(n)) return null;
    const d = asDecimal(n)!;
    if (!d.isInteger()) return null;
    return d.abs().mod(2).eq(1);
  },

  even(args) {
    if (args.length !== 1) return null;
    const [n] = args;
    if (!isNum(n)) return null;
    const d = asDecimal(n)!;
    if (!d.isInteger()) return null;
    return d.abs().mod(2).eq(0);
  },

  'random number'(_args) {
    return D(Math.random());
  },
};
