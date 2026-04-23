import { isDecimal } from '../../src/decimal.js';
import { formatDuration } from '../../src/temporal/duration.js';
import { formatDate, formatDateTime, formatTime } from '../../src/temporal/format.js';
import type { FeelValue } from '../../src/types.js';
import {
  isDayTimeDuration,
  isFeelContext,
  isFeelDate,
  isFeelDateTime,
  isFeelRange,
  isFeelTime,
  isYearMonthDuration,
} from '../../src/types.js';

/**
 * Deep equality with numeric tolerance (mirrors the old conformance runner's
 * `Math.abs(actual - expected) < 1e-10` for xsd:double values).
 */
export function aeq(actual: unknown, expected: unknown): boolean {
  if (Object.is(actual, expected)) return true;
  if (typeof actual === 'number' && typeof expected === 'number')
    // TCK expected values use up to 8 decimal places; full-precision results
    // can differ by up to ~5e-9 from those truncated values, so use 1e-7.
    return Math.abs(actual - expected) < 1e-7;
  if (Array.isArray(actual) && Array.isArray(expected)) {
    return (
      actual.length === expected.length &&
      (actual as unknown[]).every((v, i) => aeq(v, (expected as unknown[])[i]))
    );
  }
  if (
    actual !== null &&
    typeof actual === 'object' &&
    expected !== null &&
    typeof expected === 'object' &&
    !Array.isArray(actual) &&
    !Array.isArray(expected)
  ) {
    const ak = Object.keys(actual as object);
    const ek = Object.keys(expected as object);
    return (
      ak.length === ek.length &&
      ak.every((k) =>
        aeq((actual as Record<string, unknown>)[k], (expected as Record<string, unknown>)[k]),
      )
    );
  }
  return false;
}

/** Normalize a FeelValue to a JSON-comparable primitive for test assertions. */
export function n(v: FeelValue): unknown {
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return v;
  if (isDecimal(v)) return Object.is(v.toNumber(), -0) ? 0 : v.toNumber();
  if (typeof v === 'number') return Object.is(v, -0) ? 0 : v;
  if (isFeelDate(v)) return formatDate(v);
  if (isFeelDateTime(v)) return formatDateTime(v);
  if (isFeelTime(v)) return formatTime(v);
  if (isYearMonthDuration(v) || isDayTimeDuration(v)) return formatDuration(v);
  if (isFeelRange(v)) {
    const s = v.startIncluded ? '[' : '(';
    const e = v.endIncluded ? ']' : ')';
    return `${s}${n(v.start as FeelValue)}..${n(v.end as FeelValue)}${e}`;
  }
  if (Array.isArray(v)) return (v as FeelValue[]).map(n);
  if (isFeelContext(v)) return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, n(val)]));
  return v;
}

export type Ctx = Record<string, FeelValue>;
