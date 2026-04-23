import { parse as parseAst } from '@veridtools/feel-parser';
import { compile as compileExpr } from './cache/index.js';
import { evalExpression } from './evaluator/index.js';
import { parseDuration } from './temporal/duration.js';
import { parseDate, parseDateTime, parseTime } from './temporal/index.js';

export type {
  AstNode,
  ErrorNode,
  FeelType,
  Loc,
  ParseResult,
  Visitor,
} from '@veridtools/feel-parser';
export { KNOWN_NAMES, ParseSyntaxError, safeParse, walk } from '@veridtools/feel-parser';
export type { CompiledExpression } from './cache/index.js';
export type {
  DayTimeDuration,
  EvaluationResult,
  EvaluationWarning,
  FeelContext,
  FeelDate,
  FeelDateTime,
  FeelDialect,
  FeelDuration,
  FeelFunction,
  FeelRange,
  FeelTime,
  FeelValue,
  YearMonthDuration,
} from './types.js';

import type { EvaluationResult, FeelContext, FeelDialect } from './types.js';

export interface EvaluateOptions {
  strict?: boolean;
}

export function evaluate(
  expression: string,
  context: FeelContext = {},
  options?: FeelDialect | EvaluateOptions,
): EvaluationResult {
  const dialect: FeelDialect = typeof options === 'string' ? options : 'expression';
  const strict = typeof options === 'object' ? (options.strict ?? false) : false;
  const knownNames = new Set(Object.keys(context));
  for (const v of Object.values(context)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && !('kind' in (v as object))) {
      for (const k of Object.keys(v as object)) knownNames.add(k);
    }
  }
  const ast = parseAst(expression, dialect, knownNames);
  const result = evalExpression(ast, context);
  if (strict && result.warnings.length > 0) {
    const first = result.warnings[0]!;
    throw new Error(`[FEEL strict] ${first.code}: ${first.message}`);
  }
  return result;
}

export function unaryTest(
  expression: string,
  context: FeelContext = {},
): EvaluationResult<boolean | null> {
  const knownNames = new Set(Object.keys(context));
  const ast = parseAst(expression, 'unary-tests', knownNames);
  const result = evalExpression(ast, context);
  const value = result.value;
  const coerced =
    value === true || value === false || value === null ? value : value !== null ? true : null;
  return { value: coerced as boolean | null, warnings: result.warnings };
}

export { parseAst as parse };
export const compile = compileExpr;
export type { ExplainResult } from './explain.js';
export { explain } from './explain.js';
export type { ValidationError, ValidationResult, ValidationWarning } from './validate.js';
export { validate } from './validate.js';
export {
  parseDate as date,
  parseDateTime as dateTime,
  parseDuration as duration,
  parseTime as time,
};

export async function evaluateAsync(
  expression: string,
  context: FeelContext = {},
  options?: FeelDialect | EvaluateOptions,
): Promise<EvaluationResult> {
  return evaluate(expression, context, options);
}
