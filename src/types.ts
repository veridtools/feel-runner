import { type Decimal, isDecimal } from './decimal.js';

// Core FEEL value types

export interface FeelDate {
  readonly kind: 'date';
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface FeelTime {
  readonly kind: 'time';
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly nanosecond: number;
  readonly offset: number | null; // seconds from UTC, null means local/no offset
  readonly timezone: string | null;
}

export interface FeelDateTime {
  readonly kind: 'date-time';
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly nanosecond: number;
  readonly offset: number | null; // seconds from UTC
  readonly timezone: string | null;
}

export interface YearMonthDuration {
  readonly kind: 'year-month';
  readonly years: number;
  readonly months: number;
}

export interface DayTimeDuration {
  readonly kind: 'day-time';
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly nanoseconds: number;
}

export type FeelDuration = YearMonthDuration | DayTimeDuration;

export interface FeelRange {
  readonly kind: 'range';
  readonly start: FeelValue;
  readonly end: FeelValue;
  readonly startIncluded: boolean;
  readonly endIncluded: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface FeelContext extends Record<string, FeelValue> {}

export type FeelFunction = {
  readonly kind: 'function';
  readonly params: string[] | undefined;
  readonly body: (args: FeelValue[]) => FeelValue;
  readonly name?: string;
  readonly _feelDefined?: true;
};

export type FeelValue =
  | null
  | boolean
  | number
  | Decimal
  | string
  | FeelDate
  | FeelTime
  | FeelDateTime
  | FeelDuration
  | FeelRange
  | FeelContext
  | FeelFunction
  | FeelValue[];

// Type guards

export function isFeelDate(v: FeelValue): v is FeelDate {
  return (
    typeof v === 'object' && v !== null && !Array.isArray(v) && (v as FeelDate).kind === 'date'
  );
}

export function isFeelTime(v: FeelValue): v is FeelTime {
  return (
    typeof v === 'object' && v !== null && !Array.isArray(v) && (v as FeelTime).kind === 'time'
  );
}

export function isFeelDateTime(v: FeelValue): v is FeelDateTime {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    (v as FeelDateTime).kind === 'date-time'
  );
}

export function isYearMonthDuration(v: FeelValue): v is YearMonthDuration {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    (v as YearMonthDuration).kind === 'year-month'
  );
}

export function isDayTimeDuration(v: FeelValue): v is DayTimeDuration {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    (v as DayTimeDuration).kind === 'day-time'
  );
}

export function isFeelDuration(v: FeelValue): v is FeelDuration {
  return isYearMonthDuration(v) || isDayTimeDuration(v);
}

export function isFeelRange(v: FeelValue): v is FeelRange {
  return (
    typeof v === 'object' && v !== null && !Array.isArray(v) && (v as FeelRange).kind === 'range'
  );
}

export function isFeelFunction(v: FeelValue): v is FeelFunction {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    (v as FeelFunction).kind === 'function'
  );
}

export function isFeelContext(v: FeelValue): v is FeelContext {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    !isDecimal(v) &&
    !isFeelDate(v) &&
    !isFeelTime(v) &&
    !isFeelDateTime(v) &&
    !isFeelDuration(v) &&
    !isFeelRange(v) &&
    !isFeelFunction(v)
  );
}

// Warning types (compatible with feelin)

export type WarningCode =
  | 'NO_VARIABLE_FOUND'
  | 'INVALID_TYPE'
  | 'DIVISION_BY_ZERO'
  | 'INVALID_RANGE'
  | 'FUNCTION_NOT_FOUND'
  | 'ARGUMENT_ERROR'
  | 'EXPLICIT_ERROR'
  | 'ASSERTION_FAILED'
  | 'PARSE_ERROR';

export interface EvaluationWarning {
  readonly code: WarningCode;
  readonly message: string;
}

// Public type returned to callers — Decimal is always converted to number at the boundary
export type PublicFeelValue = Exclude<FeelValue, Decimal>;

export interface EvaluationResult<T extends FeelValue = PublicFeelValue> {
  readonly value: T;
  readonly warnings: EvaluationWarning[];
}

export type FeelDialect = 'expression' | 'unary-tests';
