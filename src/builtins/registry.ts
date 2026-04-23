import type { EvaluationWarning, FeelValue } from '../types.js';
import { booleanBuiltins } from './boolean.js';
import { contextBuiltins } from './context.js';
import { conversionBuiltins } from './conversion.js';
import { extensionBuiltins } from './extensions.js';
import { listBuiltins } from './list.js';
import { numericBuiltins } from './numeric.js';
import { rangeBuiltins } from './range.js';
import { stringBuiltins } from './string.js';
import { temporalBuiltins } from './temporal.js';

type BuiltinFn = (args: FeelValue[], warnings: EvaluationWarning[]) => FeelValue;

// [min, max] — max null means variadic (no upper bound)
type AritySpec = [number, number | null];

const BUILTIN_ARITY: Record<string, AritySpec> = {
  // Numeric
  abs: [1, 1],
  modulo: [2, 2],
  sqrt: [1, 1],
  log: [1, 1],
  exp: [1, 1],
  odd: [1, 1],
  even: [1, 1],
  'random number': [0, 0],
  decimal: [2, 2],
  floor: [1, 2],
  ceiling: [1, 2],
  'round up': [1, 2],
  'round down': [1, 2],
  'round half up': [1, 2],
  'round half down': [1, 2],
  // String
  'string length': [1, 1],
  'upper case': [1, 1],
  'lower case': [1, 1],
  trim: [1, 1],
  substring: [2, 3],
  'substring before': [2, 2],
  'substring after': [2, 2],
  contains: [2, 2],
  'starts with': [2, 2],
  'ends with': [2, 2],
  matches: [2, 3],
  replace: [3, 4],
  split: [2, 2],
  extract: [2, 2],
  'pad left': [2, 3],
  'pad right': [2, 3],
  'encode for URI': [1, 1],
  'decode for URI': [1, 1],
  'is blank': [1, 1],
  'to base64': [1, 1],
  'from base64': [1, 1],
  // List
  'list contains': [2, 2],
  count: [1, 1],
  append: [2, null],
  concatenate: [2, null],
  'insert before': [3, 3],
  remove: [2, 2],
  reverse: [1, 1],
  'index of': [2, 2],
  'distinct values': [1, 1],
  'duplicate values': [1, 1],
  flatten: [1, 1],
  sort: [1, 2],
  'string join': [1, 4],
  'list replace': [3, 3],
  'is empty': [1, 1],
  partition: [2, 2],
  // Temporal
  duration: [1, 1],
  'years and months duration': [2, 2],
  'day of week': [1, 1],
  'day of year': [1, 1],
  'week of year': [1, 1],
  'month of year': [1, 1],
  'date and time': [1, 2],
  // Boolean
  is: [1, 2],
  'is defined': [1, 1],
  // Context
  'get value': [2, 2],
  'get entries': [1, 1],
  context: [1, 1],
  'context put': [3, 4],
  // Conversion
  'format number': [2, 3],
  number: [1, 3],
  // Range
  before: [2, 2],
  after: [2, 2],
  meets: [2, 2],
  'met by': [2, 2],
  overlaps: [2, 2],
  'overlaps before': [2, 2],
  'overlaps after': [2, 2],
  finishes: [2, 2],
  'finished by': [2, 2],
  includes: [2, 2],
  during: [2, 2],
  starts: [2, 2],
  'started by': [2, 2],
  coincides: [2, 2],
  // Extensions
  error: [1, 1],
  assert: [2, 2],
  'get or else': [2, 2],
  'to json': [1, 1],
  'from json': [1, 1],
  'last day of month': [1, 1],
  'from unix timestamp': [1, 1],
  'to unix timestamp': [1, 1],
};

/** Returns an error message string if arg count is out of range, or null if ok. */
export function checkBuiltinArity(name: string, count: number): string | null {
  const spec = BUILTIN_ARITY[name];
  if (!spec) return null;
  const [min, max] = spec;
  if (count < min || (max !== null && count > max)) {
    const expected = max === null ? `≥${min}` : min === max ? String(min) : `${min}–${max}`;
    return `${name} expects ${expected} argument(s), got ${count}`;
  }
  return null;
}

const registry = new Map<string, BuiltinFn>();
// Maps builtin name → ordered list of param names for named-arg validation
const paramsRegistry = new Map<string, string[]>();

function register(builtins: Record<string, (args: FeelValue[]) => FeelValue>): void {
  for (const [name, fn] of Object.entries(builtins)) {
    registry.set(name, (args, _warnings) => fn(args));
  }
}

function registerWithWarnings(
  builtins: Record<string, (args: FeelValue[], warnings: EvaluationWarning[]) => FeelValue>,
): void {
  for (const [name, fn] of Object.entries(builtins)) {
    registry.set(name, fn);
  }
}

register(stringBuiltins);
register(numericBuiltins);
register(listBuiltins);
register(temporalBuiltins);
register(rangeBuiltins);
register(contextBuiltins);
register(booleanBuiltins);
register(conversionBuiltins);
registerWithWarnings(extensionBuiltins);

// Register builtin param names for named-arg validation and ordering
const BUILTIN_PARAMS: Record<string, string[]> = {
  // Numeric
  floor: ['n', 'scale'],
  ceiling: ['n', 'scale'],
  'round up': ['n', 'scale'],
  'round down': ['n', 'scale'],
  'round half up': ['n', 'scale'],
  'round half down': ['n', 'scale'],
  decimal: ['n', 'scale'],
  abs: ['n'],
  modulo: ['dividend', 'divisor'],
  sqrt: ['number'],
  log: ['number'],
  exp: ['number'],
  odd: ['number'],
  even: ['number'],
  // String
  'string length': ['string'],
  'upper case': ['string'],
  'lower case': ['string'],
  substring: ['string', 'start position', 'length'],
  'substring before': ['string', 'match'],
  'substring after': ['string', 'match'],
  contains: ['string', 'match'],
  'starts with': ['string', 'match'],
  'ends with': ['string', 'match'],
  matches: ['input', 'pattern', 'flags'],
  replace: ['input', 'pattern', 'replacement', 'flags'],
  split: ['string', 'delimiter'],
  trim: ['string'],
  extract: ['input', 'pattern'],
  'pad left': ['string', 'length', 'character'],
  'pad right': ['string', 'length', 'character'],
  'encode for URI': ['string'],
  'decode for URI': ['string'],
  // List
  'list contains': ['list', 'element'],
  count: ['list'],
  min: ['list'],
  max: ['list'],
  sum: ['list'],
  mean: ['list'],
  product: ['list'],
  median: ['list'],
  stddev: ['list'],
  mode: ['list'],
  all: ['list'],
  any: ['list'],
  append: ['list', 'items'],
  concatenate: ['lists'],
  'insert before': ['list', 'position', 'newItem'],
  remove: ['list', 'position'],
  reverse: ['list'],
  'index of': ['list', 'match'],
  union: ['lists'],
  'distinct values': ['list'],
  'duplicate values': ['list'],
  flatten: ['list'],
  sort: ['list', 'precedes'],
  'string join': ['list', 'delimiter', 'prefix', 'suffix'],
  'list replace': ['list', 'position', 'newItem'],
  // Extended list
  'is empty': ['list'],
  partition: ['list', 'size'],
  // Temporal
  date: ['from', 'year', 'month', 'day'],
  time: ['from', 'hour', 'minute', 'second', 'offset'],
  'date and time': ['date', 'time'],
  duration: ['from'],
  'years and months duration': ['from', 'to'],
  'day of week': ['date'],
  'day of year': ['date'],
  'week of year': ['date'],
  'month of year': ['date'],
  // Extended temporal
  // Temporal property accessors
  year: ['date'],
  month: ['date'],
  day: ['date'],
  hour: ['time'],
  minute: ['time'],
  second: ['time'],
  years: ['duration'],
  months: ['duration'],
  days: ['duration'],
  hours: ['duration'],
  minutes: ['duration'],
  seconds: ['duration'],
  'last day of month': ['date'],
  'from unix timestamp': ['timestamp'],
  'to unix timestamp': ['date'],
  'format date': ['date', 'format', 'locale'],
  'format time': ['time', 'format', 'locale'],
  'format date and time': ['date', 'format', 'locale'],
  // Boolean
  is: ['value1', 'value2'],
  'is defined': ['value'],
  // Context
  'get value': ['m', 'key'],
  'get entries': ['m'],
  context: ['entries'],
  'context put': ['context', 'key', 'value', 'keys'],
  'context merge': ['contexts'],
  // Extended conversion
  'format number': ['number', 'picture', 'locale'],
  // Extended string
  'is blank': ['string'],
  'to base64': ['string'],
  'from base64': ['string'],
  'string format': ['template'],
  // Misc
  'get or else': ['value', 'default'],
  error: ['message'],
  assert: ['condition', 'message'],
  'to json': ['value'],
  'from json': ['string'],
  // Conversion
  number: ['from', 'grouping separator', 'decimal separator'],
  string: ['from', 'picture'],
  // Range
  range: ['from'],
  before: ['point', 'range'],
  after: ['point', 'range'],
  meets: ['range1', 'range2'],
  'met by': ['range1', 'range2'],
  overlaps: ['range1', 'range2'],
  'overlaps before': ['range1', 'range2'],
  'overlaps after': ['range1', 'range2'],
  finishes: ['point', 'range'],
  'finished by': ['range', 'point'],
  includes: ['range', 'point'],
  during: ['point', 'range'],
  starts: ['point', 'range'],
  'started by': ['range', 'point'],
  coincides: ['range1', 'range2'],
};
for (const [name, params] of Object.entries(BUILTIN_PARAMS)) {
  paramsRegistry.set(name, params);
}

// Maps builtin name → { alias → canonical param name } for param name aliasing
const PARAM_ALIASES: Record<string, Record<string, string>> = {
  'date and time': { from: 'date' },
  'list replace': { match: 'position' },
  append: { item: 'items' },
};

export function getBuiltin(name: string): BuiltinFn | undefined {
  return registry.get(name);
}

export function getBuiltinParams(name: string): string[] | undefined {
  return paramsRegistry.get(name);
}

export function resolveParamName(fnName: string, paramName: string): string {
  return PARAM_ALIASES[fnName]?.[paramName] ?? paramName;
}

export function listBuiltinNames(): string[] {
  return [...registry.keys()];
}
