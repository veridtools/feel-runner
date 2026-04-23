import { feelEqual } from '../evaluator/equality.js';
import type { FeelValue } from '../types.js';
import { isFeelDateTime, isFeelTime } from '../types.js';

// Structural equality: same value AND same timezone representation
function feelIs(a: FeelValue, b: FeelValue): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (isFeelTime(a) && isFeelTime(b)) {
    return (
      a.hour === b.hour &&
      a.minute === b.minute &&
      a.second === b.second &&
      a.nanosecond === b.nanosecond &&
      a.offset === b.offset &&
      a.timezone === b.timezone
    );
  }
  if (isFeelDateTime(a) && isFeelDateTime(b)) {
    return (
      a.year === b.year &&
      a.month === b.month &&
      a.day === b.day &&
      a.hour === b.hour &&
      a.minute === b.minute &&
      a.second === b.second &&
      a.nanosecond === b.nanosecond &&
      a.offset === b.offset &&
      a.timezone === b.timezone
    );
  }
  const eq = feelEqual(a, b);
  return eq === true;
}

export const booleanBuiltins: Record<string, (args: FeelValue[]) => FeelValue> = {
  is(args) {
    if (args.length !== 2) return null;
    return feelIs(args[0]!, args[1]!);
  },

  'is defined'([v = null]) {
    return v !== null;
  },
};
