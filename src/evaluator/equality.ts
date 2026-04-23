import { asDecimal, isNum } from '../decimal.js';
import { compareDates, compareDateTimes, compareTimes } from '../temporal/arithmetic.js';
import { compareDurations } from '../temporal/duration.js';
import type { FeelRange, FeelValue } from '../types.js';
import {
  isDayTimeDuration,
  isFeelContext,
  isFeelDate,
  isFeelDateTime,
  isFeelRange,
  isFeelTime,
  isYearMonthDuration,
} from '../types.js';

// Returns true/false for equal/not-equal, or null if not comparable
export function feelEqual(a: FeelValue, b: FeelValue): boolean | null {
  // null = null → true per FEEL spec section 10.3.2.7
  if (a === null && b === null) return true;
  if (a === null || b === null) return null;

  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b;
  if (isNum(a) && isNum(b)) return asDecimal(a)!.eq(asDecimal(b)!);
  if (typeof a === 'string' && typeof b === 'string') return a === b;

  if (isFeelDate(a) && isFeelDate(b)) return compareDates(a, b) === 0;
  if (isFeelTime(a) && isFeelTime(b)) {
    const aHasZone = a.timezone !== null || a.offset !== null;
    const bHasZone = b.timezone !== null || b.offset !== null;
    if (aHasZone !== bHasZone) return false;
    return compareTimes(a, b) === 0;
  }
  if (isFeelDateTime(a) && isFeelDateTime(b)) {
    const aHasZone = a.timezone !== null || a.offset !== null;
    const bHasZone = b.timezone !== null || b.offset !== null;
    if (aHasZone !== bHasZone) return false;
    return compareDateTimes(a, b) === 0;
  }
  // Cross-type temporal comparisons (e.g. date vs date-and-time) are never equal
  if (
    (isFeelDate(a) || isFeelDateTime(a) || isFeelTime(a)) &&
    (isFeelDate(b) || isFeelDateTime(b) || isFeelTime(b))
  )
    return false;

  if (isYearMonthDuration(a) && isYearMonthDuration(b)) {
    return compareDurations(a, b) === 0;
  }
  if (isDayTimeDuration(a) && isDayTimeDuration(b)) {
    return compareDurations(a, b) === 0;
  }
  // Different duration types are not comparable
  if (isYearMonthDuration(a) && isDayTimeDuration(b)) return null;
  if (isDayTimeDuration(a) && isYearMonthDuration(b)) return null;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const eq = feelEqual(a[i]!, b[i]!);
      if (eq !== true) return eq;
    }
    return true;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return null;

  if (isFeelRange(a) && isFeelRange(b)) return rangeEqual(a, b);
  if (isFeelRange(a) !== isFeelRange(b)) return false;

  if (isFeelContext(a) && isFeelContext(b)) {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) return false;
    if (aKeys.join(',') !== bKeys.join(',')) return false;
    for (const k of aKeys) {
      const eq = feelEqual(a[k]!, b[k]!);
      if (eq !== true) return eq;
    }
    return true;
  }

  return null;
}

function rangeEqual(a: FeelRange, b: FeelRange): boolean | null {
  if (a.startIncluded !== b.startIncluded || a.endIncluded !== b.endIncluded) return false;
  const startEq = a.start === null && b.start === null ? true : feelEqual(a.start, b.start);
  const endEq = a.end === null && b.end === null ? true : feelEqual(a.end, b.end);
  if (startEq === null || endEq === null) return null;
  return startEq && endEq;
}

// FEEL ordering — returns <0, 0, >0 or null if not ordered
export function feelCompare(a: FeelValue, b: FeelValue): number | null {
  if (a === null || b === null) return null;

  if (isNum(a) && isNum(b)) return asDecimal(a)!.cmp(asDecimal(b)!);
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  if (isFeelDate(a) && isFeelDate(b)) return compareDates(a, b);
  if (isFeelTime(a) && isFeelTime(b)) return compareTimes(a, b);
  if (isFeelDateTime(a) && isFeelDateTime(b)) return compareDateTimes(a, b);

  if (isYearMonthDuration(a) && isYearMonthDuration(b)) return compareDurations(a, b);
  if (isDayTimeDuration(a) && isDayTimeDuration(b)) return compareDurations(a, b);

  return null;
}
