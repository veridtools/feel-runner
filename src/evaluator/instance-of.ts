import type { FeelType } from '@veridtools/feel-parser';
import { isNum } from '../decimal.js';
import type { FeelContext, FeelValue } from '../types.js';
import {
  isDayTimeDuration,
  isFeelContext,
  isFeelDate,
  isFeelDateTime,
  isFeelDuration,
  isFeelFunction,
  isFeelRange,
  isFeelTime,
  isYearMonthDuration,
} from '../types.js';

export function instanceOf(value: FeelValue, type: FeelType, ctx?: FeelContext): boolean {
  if (value === null) return false;

  switch (type.name) {
    case 'Any':
      return value !== null;
    case 'Null':
      return false; // null already returned above
    case 'number':
      return isNum(value);
    case 'string':
      return typeof value === 'string';
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return isFeelDate(value);
    case 'time':
      return isFeelTime(value);
    case 'date and time':
      return isFeelDateTime(value);
    case 'duration':
      return isFeelDuration(value);
    case 'years and months duration':
      return isYearMonthDuration(value);
    case 'days and time duration':
      return isDayTimeDuration(value);
    case 'context': {
      if (!isFeelContext(value)) return false;
      const props = (type as { properties?: Array<{ name: string; type: FeelType }> }).properties;
      if (!props || props.length === 0) return true;
      // Each required property must exist with conforming type (null is always conforming)
      return props.every(({ name, type: propType }) => {
        if (!Object.hasOwn(value, name)) return false;
        const propVal = (value as Record<string, FeelValue>)[name] ?? null;
        if (propVal === null) return true; // null conforms to any type
        return instanceOf(propVal, propType, ctx);
      });
    }
    case 'list': {
      if (!Array.isArray(value)) return false;
      if (type.elementType === undefined) return true;
      return (value as FeelValue[]).every(
        (el) => el === null || instanceOf(el, type.elementType!, ctx),
      );
    }
    case 'function':
      return isFeelFunction(value);
    case 'range':
      return isFeelRange(value);
    case 'Unknown': {
      // Try to resolve user-defined type from context registry
      const ref = (type as { ref?: string }).ref;
      if (ref && ctx) {
        const aliases = (ctx as Record<string, unknown>).__typeAliases__;
        if (aliases && typeof aliases === 'object') {
          const resolved = (aliases as Record<string, FeelType>)[ref];
          if (resolved) return instanceOf(value, resolved, ctx);
        }
      }
      return false;
    }
    default:
      return false;
  }
}
