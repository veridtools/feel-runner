import type { AstNode } from '@veridtools/feel-parser';
import { parse } from '@veridtools/feel-parser';
import { feelCompare } from '../evaluator/equality.js';
import { evaluate } from '../evaluator/index.js';
import type { FeelRange, FeelValue } from '../types.js';
import { isFeelRange } from '../types.js';

function isLiteralEndpoint(node: AstNode | null): boolean {
  if (node === null) return true;
  switch (node.type) {
    case 'NumberLiteral':
    case 'StringLiteral':
    case 'BooleanLiteral':
    case 'NullLiteral':
    case 'TemporalLiteral':
      return true;
    case 'UnaryMinus':
      return isLiteralEndpoint(node.operand);
    case 'FunctionCall':
      return node.args.every(
        (a) => a.value !== null && a.value.type !== 'FunctionCall' && isLiteralEndpoint(a.value),
      );
    default:
      return false;
  }
}

function toRange(v: FeelValue): FeelRange | null {
  if (isFeelRange(v)) return v;
  // Scalar becomes a degenerate range [v..v]
  if (v !== null)
    return { kind: 'range', start: v, end: v, startIncluded: true, endIncluded: true };
  return null;
}

// Compare endpoints, handling null (unbounded) semantics
// For start points: null = -infinity
// For end points: null = +infinity
function cmpStart(a: FeelValue, b: FeelValue): number | null {
  if (a === null && b === null) return 0;
  if (a === null) return -1; // -∞ < anything
  if (b === null) return 1; // anything > -∞
  return feelCompare(a, b);
}

function cmpEnd(a: FeelValue, b: FeelValue): number | null {
  if (a === null && b === null) return 0;
  if (a === null) return 1; // +∞ > anything
  if (b === null) return -1; // anything < +∞
  return feelCompare(a, b);
}

export const rangeBuiltins: Record<string, (args: FeelValue[]) => FeelValue> = {
  range(args) {
    if (args.length !== 1) return null;
    const a = args[0];
    if (typeof a !== 'string') return null;
    try {
      const ast = parse(a);
      if (ast.type !== 'RangeLiteral') return null;
      // Endpoints must be literal expressions (no variables, no nested fn calls)
      if (!isLiteralEndpoint(ast.start) || !isLiteralEndpoint(ast.end)) return null;
      const result = evaluate(ast, { vars: {}, warnings: [] });
      if (!isFeelRange(result)) return null;
      const { start, end, startIncluded, endIncluded } = result;
      // Closed endpoint with null value is invalid
      if (startIncluded && start === null) return null;
      if (endIncluded && end === null) return null;
      // Both null endpoints invalid
      if (start === null && end === null) return null;
      // Mismatching types or descending range
      if (start !== null && end !== null) {
        const cmp = feelCompare(start, end);
        if (cmp === null) return null; // incompatible types
        if (cmp > 0) return null; // descending
      }
      return result;
    } catch {
      return null;
    }
  },

  before([a = null, b = null]) {
    const ra = toRange(a);
    const rb = toRange(b);
    if (!ra || !rb) return null;

    const aEnd = ra.end;
    const bStart = rb.start;

    if (aEnd === null || bStart === null) return false;

    const cmp = feelCompare(aEnd, bStart);
    if (cmp === null) return null;
    if (cmp < 0) return true;
    if (cmp === 0) return !ra.endIncluded || !rb.startIncluded;
    return false;
  },

  after([a = null, b = null]) {
    const ra = toRange(a);
    const rb = toRange(b);
    if (!ra || !rb) return null;
    const aStart = ra.start;
    const bEnd = rb.end;

    if (aStart === null || bEnd === null) return false;

    const cmp = feelCompare(aStart, bEnd);
    if (cmp === null) return null;
    if (cmp > 0) return true;
    if (cmp === 0) return !ra.startIncluded || !rb.endIncluded;
    return false;
  },

  meets([a = null, b = null]) {
    const ra = toRange(a);
    const rb = toRange(b);
    if (!ra || !rb) return null;

    if (ra.end === null || rb.start === null) return false;
    const cmp = feelCompare(ra.end, rb.start);
    if (cmp === null) return null;
    return cmp === 0 && ra.endIncluded && rb.startIncluded;
  },

  'met by'([a = null, b = null]) {
    return rangeBuiltins.meets!([b, a]);
  },

  overlaps([a = null, b = null]) {
    const ra = toRange(a);
    const rb = toRange(b);
    if (!ra || !rb) return null;

    const s1 = cmpStart(ra.start, rb.end);
    const s2 = cmpStart(rb.start, ra.end);
    if (s1 === null || s2 === null) return null;

    const ok1 = s1 < 0 || (s1 === 0 && ra.startIncluded && rb.endIncluded);
    const ok2 = s2 < 0 || (s2 === 0 && rb.startIncluded && ra.endIncluded);
    return ok1 && ok2;
  },

  'overlaps before'([a = null, b = null]) {
    const ra = toRange(a);
    const rb = toRange(b);
    if (!ra || !rb) return null;

    const s = cmpStart(rb.start, ra.end);
    if (s === null) return null;
    const ok1 = s < 0 || (s === 0 && rb.startIncluded && ra.endIncluded);

    const e = cmpEnd(ra.end, rb.end);
    if (e === null) return null;
    const ok2 = e < 0 || (e === 0 && (!ra.endIncluded || rb.endIncluded));

    const s2 = cmpStart(ra.start, rb.start);
    if (s2 === null) return null;
    const ok3 = s2 < 0 || (s2 === 0 && ra.startIncluded && !rb.startIncluded);

    return ok1 && ok2 && ok3;
  },

  'overlaps after'([a = null, b = null]) {
    return rangeBuiltins['overlaps before']!([b, a]);
  },

  finishes([a = null, b = null]) {
    const ra = toRange(a);
    const rb = toRange(b);
    if (!ra || !rb) return null;

    const eEnd = cmpEnd(ra.end, rb.end);
    if (eEnd === null) return null;
    if (eEnd !== 0 || ra.endIncluded !== rb.endIncluded) return false;

    const sStart = cmpStart(rb.start, ra.start);
    if (sStart === null) return null;
    return sStart <= 0;
  },

  'finished by'([a = null, b = null]) {
    return rangeBuiltins.finishes!([b, a]);
  },

  includes([a = null, b = null]) {
    const ra = toRange(a);
    const rb = toRange(b);
    if (!ra || !rb) return null;

    const sStart = cmpStart(ra.start, rb.start);
    if (sStart === null) return null;
    const ok1 = sStart < 0 || (sStart === 0 && (ra.startIncluded || !rb.startIncluded));

    const eEnd = cmpEnd(rb.end, ra.end);
    if (eEnd === null) return null;
    const ok2 = eEnd < 0 || (eEnd === 0 && (ra.endIncluded || !rb.endIncluded));

    return ok1 && ok2;
  },

  during([a = null, b = null]) {
    return rangeBuiltins.includes!([b, a]);
  },

  starts([a = null, b = null]) {
    const ra = toRange(a);
    const rb = toRange(b);
    if (!ra || !rb) return null;

    const sStart = cmpStart(ra.start, rb.start);
    if (sStart === null) return null;
    if (sStart !== 0 || ra.startIncluded !== rb.startIncluded) return false;

    const eEnd = cmpEnd(ra.end, rb.end);
    if (eEnd === null) return null;
    return eEnd <= 0;
  },

  'started by'([a = null, b = null]) {
    return rangeBuiltins.starts!([b, a]);
  },

  coincides([a = null, b = null]) {
    const ra = toRange(a);
    const rb = toRange(b);
    if (!ra || !rb) return null;

    const sStart = cmpStart(ra.start, rb.start);
    const eEnd = cmpEnd(ra.end, rb.end);
    if (sStart === null || eEnd === null) return null;

    return (
      sStart === 0 &&
      ra.startIncluded === rb.startIncluded &&
      eEnd === 0 &&
      ra.endIncluded === rb.endIncluded
    );
  },
};
