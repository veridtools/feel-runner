import type { AstNode } from '@veridtools/feel-parser';
import { asDecimal, D, isNum } from '../decimal.js';
import {
  addDateAndDT,
  addDateAndYM,
  addDateTimeAndDT,
  addDateTimeAndYM,
  addTimeAndDT,
  dateTimeToEpochMs,
  subtractDates,
} from '../temporal/arithmetic.js';
import {
  addDurations,
  divideDuration,
  makeDT,
  multiplyDuration,
  normalizeDT,
  subtractDurations,
} from '../temporal/duration.js';
import type { FeelDateTime, FeelValue } from '../types.js';
import {
  isDayTimeDuration,
  isFeelDate,
  isFeelDateTime,
  isFeelDuration,
  isFeelTime,
  isYearMonthDuration,
} from '../types.js';
import { feelCompare, feelEqual } from './equality.js';
import type { EvalContext } from './types.js';

function warn(
  ctx: EvalContext,
  code: import('../types.js').EvaluationWarning['code'],
  message: string,
): null {
  ctx.warnings.push({ code, message });
  return null;
}

type EvalFn = (node: AstNode, ctx: EvalContext) => FeelValue;

export function evalBinaryOp(
  node: Extract<AstNode, { type: 'BinaryOp' }>,
  ctx: EvalContext,
  evalNode: EvalFn,
): FeelValue {
  const { op, left, right } = node;

  // Short-circuit for and/or (3-valued logic; non-boolean treated as null)
  if (op === 'and') {
    const l = evalNode(left, ctx);
    const lv = typeof l === 'boolean' ? l : null;
    if (lv === false) return false;
    const r = evalNode(right, ctx);
    const rv = typeof r === 'boolean' ? r : null;
    if (rv === false) return false;
    if (lv === null || rv === null) return null;
    return true;
  }
  if (op === 'or') {
    const l = evalNode(left, ctx);
    const lv = typeof l === 'boolean' ? l : null;
    if (lv === true) return true;
    const r = evalNode(right, ctx);
    const rv = typeof r === 'boolean' ? r : null;
    if (rv === true) return true;
    if (lv === null || rv === null) return null;
    return false;
  }

  const l = evalNode(left, ctx);
  const r = evalNode(right, ctx);

  if (op === '=') {
    if (l === null && r === null) return true;
    if (l === null || r === null) return false;
    return feelEqual(l, r);
  }
  if (op === '!=') {
    if (l === null && r === null) return false;
    if (l === null || r === null) return true;
    const eq = feelEqual(l, r);
    if (eq === null) return null;
    return !eq;
  }

  if (op === '<' || op === '>' || op === '<=' || op === '>=') {
    if (l === null || r === null) return null;
    const cmp = feelCompare(l, r);
    if (cmp === null) return null;
    if (op === '<') return cmp < 0;
    if (op === '>') return cmp > 0;
    if (op === '<=') return cmp <= 0;
    return cmp >= 0;
  }

  // Arithmetic
  if (op === '+') return evalAdd(l, r);
  if (op === '-') return evalSubtract(l, r);
  if (op === '*') return evalMultiply(l, r);
  if (op === '/') return evalDivide(l, r, ctx);
  if (op === '**') {
    const ld = asDecimal(l),
      rd = asDecimal(r);
    if (!ld || !rd) return null;
    const result = ld.pow(rd);
    if (!result.isFinite() || result.isNaN()) return null;
    const asNum = result.toNumber();
    if (!Number.isFinite(asNum)) return null;
    if (!result.isZero() && asNum === 0) return null;
    return result;
  }

  return null;
}

export function evalAdd(l: FeelValue, r: FeelValue): FeelValue {
  if (l === null || r === null) return null;
  const ld = asDecimal(l),
    rd = asDecimal(r);
  if (ld && rd) return ld.plus(rd);
  if (typeof l === 'string' && typeof r === 'string') return l + r;

  if (isFeelDuration(l) && isFeelDuration(r)) return addDurations(l, r);

  if (isFeelDate(l) && isDayTimeDuration(r)) return addDateAndDT(l, r);
  if (isDayTimeDuration(l) && isFeelDate(r)) return addDateAndDT(r, l);
  if (isFeelDate(l) && isYearMonthDuration(r)) return addDateAndYM(l, r);
  if (isYearMonthDuration(l) && isFeelDate(r)) return addDateAndYM(r, l);

  if (isFeelDateTime(l) && isDayTimeDuration(r)) return addDateTimeAndDT(l, r);
  if (isDayTimeDuration(l) && isFeelDateTime(r)) return addDateTimeAndDT(r, l);
  if (isFeelDateTime(l) && isYearMonthDuration(r)) return addDateTimeAndYM(l, r);
  if (isYearMonthDuration(l) && isFeelDateTime(r)) return addDateTimeAndYM(r, l);

  if (isFeelTime(l) && isDayTimeDuration(r)) return addTimeAndDT(l, r);
  if (isDayTimeDuration(l) && isFeelTime(r)) return addTimeAndDT(r, l);

  return null;
}

export function evalSubtract(l: FeelValue, r: FeelValue): FeelValue {
  if (l === null || r === null) return null;
  const ld = asDecimal(l),
    rd = asDecimal(r);
  if (ld && rd) return ld.minus(rd);

  if (isFeelDuration(l) && isFeelDuration(r)) return subtractDurations(l, r);

  if (isFeelDate(l) && isFeelDate(r)) {
    return subtractDates(l, r);
  }
  if (isFeelDate(l) && isDayTimeDuration(r)) {
    return addDateAndDT(l, {
      ...r,
      days: -r.days,
      hours: -r.hours,
      minutes: -r.minutes,
      seconds: -r.seconds,
      nanoseconds: -r.nanoseconds,
    });
  }
  if (isFeelDate(l) && isYearMonthDuration(r)) {
    return addDateAndYM(l, { ...r, years: -r.years, months: -r.months });
  }

  if (isFeelDateTime(l) && isDayTimeDuration(r)) {
    const neg = {
      ...r,
      days: -r.days,
      hours: -r.hours,
      minutes: -r.minutes,
      seconds: -r.seconds,
      nanoseconds: -r.nanoseconds,
    };
    return addDateTimeAndDT(l, neg);
  }
  if (isFeelDateTime(l) && isYearMonthDuration(r)) {
    return addDateTimeAndYM(l, { ...r, years: -r.years, months: -r.months });
  }
  if (isFeelTime(l) && isDayTimeDuration(r)) {
    const neg = {
      ...r,
      days: -r.days,
      hours: -r.hours,
      minutes: -r.minutes,
      seconds: -r.seconds,
      nanoseconds: -r.nanoseconds,
    };
    return addTimeAndDT(l, neg);
  }

  if (isFeelTime(l) && isFeelTime(r)) {
    const lNs =
      (l.hour * 3600 + l.minute * 60 + l.second) * 1_000_000_000 +
      l.nanosecond -
      (l.offset ?? 0) * 1_000_000_000;
    const rNs =
      (r.hour * 3600 + r.minute * 60 + r.second) * 1_000_000_000 +
      r.nanosecond -
      (r.offset ?? 0) * 1_000_000_000;
    const diffNs = lNs - rNs;
    return normalizeDT(makeDT(0, 0, 0, 0, diffNs));
  }

  const hasTz = (dt: { offset: number | null; timezone: string | null }) =>
    dt.offset !== null || dt.timezone !== null;

  if (isFeelDateTime(l) && isFeelDateTime(r)) {
    if (hasTz(l) !== hasTz(r)) return null;
    const diffMs = dateTimeToEpochMs(l) - dateTimeToEpochMs(r);
    const diffSec = Math.trunc(diffMs / 1000);
    const diffNs = Math.round((diffMs % 1000) * 1_000_000);
    return normalizeDT(makeDT(0, 0, 0, diffSec, diffNs));
  }

  if (isFeelDateTime(l) && isFeelDate(r)) {
    if (!hasTz(l)) return null;
    const rDt: FeelDateTime = {
      kind: 'date-time',
      year: r.year,
      month: r.month,
      day: r.day,
      hour: 0,
      minute: 0,
      second: 0,
      nanosecond: 0,
      offset: 0,
      timezone: null,
    };
    const diffMs = dateTimeToEpochMs(l) - dateTimeToEpochMs(rDt);
    const diffSec = Math.trunc(diffMs / 1000);
    const diffNs = Math.round((diffMs % 1000) * 1_000_000);
    return normalizeDT(makeDT(0, 0, 0, diffSec, diffNs));
  }

  if (isFeelDate(l) && isFeelDateTime(r)) {
    if (!hasTz(r)) return null;
    const lDt: FeelDateTime = {
      kind: 'date-time',
      year: l.year,
      month: l.month,
      day: l.day,
      hour: 0,
      minute: 0,
      second: 0,
      nanosecond: 0,
      offset: 0,
      timezone: null,
    };
    const diffMs = dateTimeToEpochMs(lDt) - dateTimeToEpochMs(r);
    const diffSec = Math.trunc(diffMs / 1000);
    const diffNs = Math.round((diffMs % 1000) * 1_000_000);
    return normalizeDT(makeDT(0, 0, 0, diffSec, diffNs));
  }

  return null;
}

export function evalMultiply(l: FeelValue, r: FeelValue): FeelValue {
  if (l === null || r === null) return null;
  const ld = asDecimal(l),
    rd = asDecimal(r);
  if (ld && rd) return ld.times(rd);
  if (isFeelDuration(l) && isNum(r)) return multiplyDuration(l, asDecimal(r)!.toNumber());
  if (isNum(l) && isFeelDuration(r)) return multiplyDuration(r, asDecimal(l)!.toNumber());
  return null;
}

export function evalDivide(l: FeelValue, r: FeelValue, ctx: EvalContext): FeelValue {
  if (l === null || r === null) return null;
  const ld = asDecimal(l),
    rd = asDecimal(r);
  if (ld && rd) {
    if (rd.isZero()) return warn(ctx, 'DIVISION_BY_ZERO', `Division by zero: ${ld} / 0`);
    return ld.div(rd);
  }
  if (isFeelDuration(l) && isNum(r)) {
    const rn = asDecimal(r)!.toNumber();
    if (rn === 0) return warn(ctx, 'DIVISION_BY_ZERO', 'Division by zero: duration / 0');
    return divideDuration(l, rn);
  }
  if (isYearMonthDuration(l) && isYearMonthDuration(r)) {
    const rTotal = r.years * 12 + r.months;
    if (rTotal === 0)
      return warn(ctx, 'DIVISION_BY_ZERO', 'Division by zero: duration / zero duration');
    return D(l.years * 12 + l.months).div(rTotal);
  }
  if (isDayTimeDuration(l) && isDayTimeDuration(r)) {
    const rNs =
      (r.days * 86400 + r.hours * 3600 + r.minutes * 60 + r.seconds) * 1_000_000_000 +
      r.nanoseconds;
    if (rNs === 0)
      return warn(ctx, 'DIVISION_BY_ZERO', 'Division by zero: duration / zero duration');
    const lNs =
      (l.days * 86400 + l.hours * 3600 + l.minutes * 60 + l.seconds) * 1_000_000_000 +
      l.nanoseconds;
    return D(lNs).div(rNs);
  }
  return null;
}
