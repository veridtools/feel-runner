import type { AstNode, FeelType, RangeLiteral } from '@veridtools/feel-parser';
import {
  checkBuiltinArity,
  getBuiltin,
  getBuiltinParams,
  resolveParamName,
} from '../builtins/registry.js';
import { asDecimal, D, isDecimal, isNum } from '../decimal.js';
import { dateToDays, daysToDate } from '../temporal/arithmetic.js';
import { parseDuration } from '../temporal/duration.js';
import { parseDate, parseDateTime, parseTime } from '../temporal/parse.js';
import type {
  EvaluationResult,
  FeelContext,
  FeelFunction,
  FeelRange,
  FeelValue,
  PublicFeelValue,
} from '../types.js';
import {
  isDayTimeDuration,
  isFeelContext,
  isFeelDate,
  isFeelRange,
  isYearMonthDuration,
} from '../types.js';
import { evalBinaryOp } from './binary.js';
import { feelCompare, feelEqual } from './equality.js';
import { instanceOf } from './instance-of.js';
import { getProperty } from './property.js';
import type { EvalContext } from './types.js';

export type { EvalContext } from './types.js';

function warn(
  ctx: EvalContext,
  code: import('../types.js').EvaluationWarning['code'],
  message: string,
): null {
  ctx.warnings.push({ code, message });
  return null;
}

function inRange(value: FeelValue, range: FeelRange, _ctx: EvalContext): boolean | null {
  if (value === null) return null;

  const { start, end, startIncluded, endIncluded } = range;

  if (start === null || end === null) return null;

  const lo = feelCompare(value, start);
  if (lo === null) return null;

  const hi = feelCompare(value, end);
  if (hi === null) return null;

  const loOk = startIncluded ? lo >= 0 : lo > 0;
  const hiOk = endIncluded ? hi <= 0 : hi < 0;
  return loOk && hiOk;
}

function testUnaryValue(candidate: FeelValue, test: FeelValue, ctx: EvalContext): boolean | null {
  if (test === null) return null;
  if (typeof test === 'boolean') return test;
  if (isFeelRange(test)) return inRange(candidate, test, ctx);
  if (Array.isArray(test)) {
    // List membership: x in list → true if any element equals x
    for (const elem of test as FeelValue[]) {
      if (isFeelRange(elem)) {
        if (inRange(candidate, elem, ctx) === true) return true;
      } else {
        if (candidate === null && elem === null) return true;
        if (feelEqual(candidate, elem) === true) return true;
      }
    }
    return false;
  }
  return feelEqual(candidate, test);
}

export function evaluate(node: AstNode, ctx: EvalContext): FeelValue {
  switch (node.type) {
    case 'NumberLiteral':
      return D(node.value);
    case 'StringLiteral':
      return node.value;
    case 'BooleanLiteral':
      return node.value;
    case 'NullLiteral':
      return null;

    case 'TemporalLiteral': {
      const v = node.value;
      const d = parseDate(v);
      if (d) return d;
      const dt = parseDateTime(v);
      if (dt) return dt;
      const t = parseTime(v);
      if (t) return t;
      const dur = parseDuration(v);
      if (dur) return dur;
      return warn(ctx, 'INVALID_TYPE', `Cannot parse temporal literal: ${v}`);
    }

    case 'Identifier': {
      const name = node.name;
      if (name === '?') {
        if ('?' in ctx.vars) return ctx.vars['?'] ?? null;
        return null;
      }
      if (name in ctx.vars) return ctx.vars[name] ?? null;
      // Wrap builtin as a first-class FeelFunction value (params undefined = no arity check)
      const builtinFn = getBuiltin(name);
      if (builtinFn) {
        const fn: FeelFunction = {
          kind: 'function',
          params: undefined,
          body: (args: FeelValue[]) => builtinFn(args, ctx.warnings),
          _feelDefined: true,
        };
        return fn;
      }
      return warn(ctx, 'NO_VARIABLE_FOUND', `Variable not found: ${name}`);
    }

    case 'UnaryMinus': {
      const v = evaluate(node.operand, ctx);
      if (isDecimal(v)) return v.neg();
      if (typeof v === 'number') return D(v).neg();
      if (isDayTimeDuration(v))
        return {
          ...v,
          days: -v.days,
          hours: -v.hours,
          minutes: -v.minutes,
          seconds: -v.seconds,
          nanoseconds: -v.nanoseconds,
        };
      if (isYearMonthDuration(v)) return { ...v, years: -v.years, months: -v.months };
      return null;
    }

    case 'BinaryOp':
      return evalBinaryOp(node, ctx, evaluate);

    case 'IfExpression': {
      const cond = evaluate(node.condition, ctx);
      if (cond === true) return evaluate(node.consequent, ctx);
      if (cond === false || cond === null) return evaluate(node.alternate, ctx);
      return evaluate(node.consequent, ctx);
    }

    case 'ForExpression': {
      const fNode = node;
      const partial: FeelValue[] = [];
      function forLoop(
        bindings: typeof fNode.bindings,
        idx: number,
        loopCtx: EvalContext,
      ): FeelValue[] | null {
        if (idx >= bindings.length) {
          const v = evaluate(fNode.body, loopCtx);
          partial.push(v);
          return [v];
        }
        const binding = bindings[idx]!;
        const domainNode = binding.domain;
        const domain = evaluate(domainNode, loopCtx);
        // Bare a..b ranges (no brackets) allow descending iteration
        const bare =
          domainNode.type === 'RangeLiteral' && (domainNode as RangeLiteral).bare === true;
        const items = domainToList(domain, loopCtx, bare);
        if (items === null) return null;
        const results: FeelValue[] = [];
        for (const item of items) {
          const nested: EvalContext = {
            vars: { ...loopCtx.vars, [binding.name]: item, partial },
            warnings: loopCtx.warnings,
          };
          const r = forLoop(bindings, idx + 1, nested);
          if (r === null) return null;
          results.push(...r);
        }
        return results;
      }
      return forLoop(fNode.bindings, 0, ctx);
    }

    case 'QuantifiedExpression': {
      const qNode = node;
      function quantLoop(
        bindings: typeof qNode.bindings,
        idx: number,
        loopCtx: EvalContext,
      ): FeelValue[] {
        if (idx >= bindings.length) {
          return [evaluate(qNode.condition, loopCtx)];
        }
        const binding = bindings[idx]!;
        const domain = evaluate(binding.domain, loopCtx);
        const items = domainToList(domain, loopCtx);
        if (items === null) return [];
        const results: FeelValue[] = [];
        for (const item of items) {
          const nested: EvalContext = {
            vars: { ...loopCtx.vars, [binding.name]: item },
            warnings: loopCtx.warnings,
          };
          results.push(...quantLoop(bindings, idx + 1, nested));
        }
        return results;
      }

      const results = quantLoop(qNode.bindings, 0, ctx);
      const hasNonBoolean = results.some((r) => r !== true && r !== false && r !== null);
      if (node.quantifier === 'some') {
        if (results.some((r) => r === true)) return true;
        if (hasNonBoolean || results.some((r) => r === null)) return null;
        return false;
      } else {
        // every
        if (results.every((r) => r === true)) return true;
        if (hasNonBoolean || results.some((r) => r === null)) return null;
        return false;
      }
    }

    case 'FunctionDefinition': {
      const paramDefs = node.params;
      const fn: FeelFunction = {
        kind: 'function',
        params: paramDefs.map((p) => p.name),
        _feelDefined: true,
        body: (args: FeelValue[]) => {
          const fnVars: FeelContext = { ...ctx.vars };
          for (let i = 0; i < paramDefs.length; i++) {
            const p = paramDefs[i]!;
            const arg = args[i] ?? null;
            if (p.type && arg !== null) {
              const pType = p.type;
              const feelTypeName =
                pType === 'date and time'
                  ? 'date and time'
                  : pType === 'years and months duration'
                    ? 'years and months duration'
                    : pType === 'days and time duration'
                      ? 'days and time duration'
                      : pType;
              if (!instanceOf(arg, { name: feelTypeName } as FeelType, ctx.vars)) return null;
            }
            fnVars[p.name] = arg;
          }
          return evaluate(node.body, { vars: fnVars, warnings: ctx.warnings });
        },
      };
      return fn;
    }

    case 'FunctionCall': {
      const rawArgs = node.args.map((a) => ({ name: a.name, value: evaluate(a.value, ctx) }));
      const hasNamedArgs = rawArgs.some((a) => a.name !== undefined);

      // Named builtin takes priority over variable lookup (avoids builtin-as-value interference)
      if (node.callee.type === 'Identifier') {
        const calleeFromCtx = evaluate(node.callee, ctx);
        // If the callee resolved to a user-defined FeelFunction (not a builtin wrapper),
        // handle it directly to support named-arg reordering and arity checking
        if (
          calleeFromCtx !== null &&
          typeof calleeFromCtx === 'object' &&
          !Array.isArray(calleeFromCtx) &&
          'kind' in calleeFromCtx &&
          (calleeFromCtx as FeelFunction).kind === 'function'
        ) {
          const fn = calleeFromCtx as FeelFunction;
          const fnParams = fn.params;
          if (fnParams !== undefined) {
            // User-defined function: apply named-arg reordering and arity check
            let args: FeelValue[];
            if (hasNamedArgs && fnParams.length > 0) {
              for (const a of rawArgs) {
                if (a.name !== undefined && !fnParams.includes(a.name)) return null;
              }
              args = fnParams.map((p) => {
                const named = rawArgs.find((a) => a.name === p);
                return named ? named.value : null;
              });
            } else {
              args = rawArgs.map((a) => a.value);
            }
            if (args.length !== fnParams.length)
              return warn(
                ctx,
                'ARGUMENT_ERROR',
                `Function expects ${fnParams.length} argument(s), got ${args.length}`,
              );
            const callArgs = fn._feelDefined ? args : args.map(toPublicValue);
            return fn.body(callArgs);
          }
          // params undefined = builtin wrapper
          if (!getBuiltin((node.callee as { name: string }).name)) {
            // Stored in a variable (not a direct builtin call) → call body directly
            const callArgs = fn._feelDefined
              ? rawArgs.map((a) => a.value)
              : rawArgs.map((a) => toPublicValue(a.value));
            return fn.body(callArgs);
          }
          // Direct builtin call → fall through to builtin path below
        }
      } else {
        const calleeVal = evaluate(node.callee, ctx);
        if (
          calleeVal !== null &&
          typeof calleeVal === 'object' &&
          !Array.isArray(calleeVal) &&
          'kind' in calleeVal &&
          (calleeVal as FeelFunction).kind === 'function'
        ) {
          const fn = calleeVal as FeelFunction;
          const fnParams = fn.params;
          let args: FeelValue[];
          if (hasNamedArgs && fnParams && fnParams.length > 0) {
            for (const a of rawArgs) {
              if (a.name !== undefined && !fnParams.includes(a.name)) return null;
            }
            args = fnParams.map((p) => {
              const named = rawArgs.find((a) => a.name === p);
              return named ? named.value : null;
            });
          } else {
            args = rawArgs.map((a) => a.value);
          }
          if (fnParams !== undefined && args.length !== fnParams.length)
            return warn(
              ctx,
              'ARGUMENT_ERROR',
              `Function expects ${fnParams.length} argument(s), got ${args.length}`,
            );
          const callArgs2 = fn._feelDefined ? args : args.map(toPublicValue);
          return fn.body(callArgs2);
        }
        return warn(ctx, 'FUNCTION_NOT_FOUND', 'Not a function');
      }

      // Try named builtin
      if (node.callee.type === 'Identifier') {
        const name = node.callee.name;
        const builtin = getBuiltin(name);
        if (!builtin) return warn(ctx, 'FUNCTION_NOT_FOUND', `Function not found: ${name}`);

        if (hasNamedArgs) {
          const paramNames = getBuiltinParams(name);
          if (!paramNames) {
            // No param spec: pass positionally
            return builtin(
              rawArgs.map((a) => a.value),
              ctx.warnings,
            );
          }
          // Validate: all named args must match known param names (with alias resolution)
          for (const a of rawArgs) {
            if (a.name !== undefined && !paramNames.includes(resolveParamName(name, a.name)))
              return null;
          }
          // Build positional args array using param names
          const posArgs: FeelValue[] = Array(paramNames.length).fill(undefined) as FeelValue[];
          let positionalIdx = 0;
          for (const a of rawArgs) {
            if (a.name !== undefined) {
              posArgs[paramNames.indexOf(resolveParamName(name, a.name))] = a.value;
            } else {
              posArgs[positionalIdx] = a.value;
              positionalIdx++;
            }
          }
          const arityErrNamed = checkBuiltinArity(name, rawArgs.length);
          if (arityErrNamed) return warn(ctx, 'ARGUMENT_ERROR', arityErrNamed);
          return builtin(posArgs, ctx.warnings);
        }

        const posArgs2 = rawArgs.map((a) => a.value);
        const arityErr = checkBuiltinArity(name, posArgs2.length);
        if (arityErr) return warn(ctx, 'ARGUMENT_ERROR', arityErr);
        const r2 = builtin(posArgs2, ctx.warnings);
        // Retry with singleton list coercion if result is null and any arg is a singleton list
        if (r2 === null && posArgs2.some((a) => Array.isArray(a) && a.length === 1)) {
          const coercedArgs = posArgs2.map((a) =>
            Array.isArray(a) && a.length === 1 ? (a[0] ?? null) : a,
          );
          const r3 = builtin(coercedArgs, ctx.warnings);
          if (r3 !== null) return r3;
        }
        return r2;
      }

      return warn(ctx, 'FUNCTION_NOT_FOUND', 'Not a function');
    }

    case 'PathExpression': {
      let obj = evaluate(node.object, ctx);
      // Unary comparison test used as range: (<10).start → range (null..10)
      if (obj === null || obj === false || obj === true) {
        const o = node.object;
        if (o.type === 'BinaryOp' && o.left.type === 'Identifier' && o.left.name === '?') {
          const rv = evaluate(o.right, ctx);
          if (o.op === '<')
            obj = { kind: 'range', start: null, end: rv, startIncluded: false, endIncluded: false };
          else if (o.op === '<=')
            obj = { kind: 'range', start: null, end: rv, startIncluded: false, endIncluded: true };
          else if (o.op === '>')
            obj = { kind: 'range', start: rv, end: null, startIncluded: false, endIncluded: false };
          else if (o.op === '>=')
            obj = { kind: 'range', start: rv, end: null, startIncluded: true, endIncluded: false };
          else if (o.op === '=')
            obj = { kind: 'range', start: rv, end: rv, startIncluded: true, endIncluded: true };
        }
        // DMN dotted flat-key lookup: if object wasn't found, try "Obj.path" as a flat key
        if (obj === null && node.object.type === 'Identifier') {
          const flatKey = `${node.object.name}.${node.path}`;
          if (flatKey in ctx.vars) return ctx.vars[flatKey] ?? null;
        }
      }
      return getProperty(obj, node.path, ctx);
    }

    case 'FilterExpression': {
      const list = evaluate(node.list, ctx);
      const items = Array.isArray(list) ? (list as FeelValue[]) : [list];

      const results: FeelValue[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const itemFields =
          item !== null && typeof item === 'object' && !Array.isArray(item) && !('kind' in item)
            ? (item as Record<string, FeelValue>)
            : {};
        const filterCtx: EvalContext = {
          vars: { ...ctx.vars, item, '?': item, ...itemFields },
          warnings: ctx.warnings,
        };
        const fval = evaluate(node.filter, filterCtx);
        // Numeric index filter
        if (isNum(fval)) {
          const n = asDecimal(fval)!.toNumber();
          const idx = n > 0 ? n - 1 : items.length + n;
          return items[idx] ?? null;
        }
        if (fval === true) results.push(item);
      }
      return results;
    }

    case 'RangeLiteral': {
      const start = node.start !== null ? evaluate(node.start, ctx) : null;
      const end = node.end !== null ? evaluate(node.end, ctx) : null;
      return {
        kind: 'range',
        start,
        end,
        startIncluded: node.startIncluded,
        endIncluded: node.endIncluded,
      } satisfies FeelRange;
    }

    case 'ListLiteral':
      return node.elements.map((el) => evaluate(el, ctx));

    case 'ContextLiteral': {
      const result: FeelContext = {};
      const seenKeys = new Set<string>();
      // Use a single mutable vars object so that function closures defined earlier
      // in the context can see entries defined later (enabling self-recursion).
      const innerVars: FeelContext = { ...ctx.vars };
      const innerCtx = { vars: innerVars, warnings: ctx.warnings };
      for (const entry of node.entries) {
        let key: string;
        if (typeof entry.key === 'string') {
          key = entry.key;
        } else {
          const computed = evaluate(entry.key, innerCtx);
          if (typeof computed !== 'string') return null;
          key = computed;
        }
        if (seenKeys.has(key)) return null; // duplicate key = error
        seenKeys.add(key);
        const val = evaluate(entry.value, innerCtx);
        result[key] = val;
        innerVars[key] = val; // mutate in place — existing closures see this
      }
      return result;
    }

    case 'UnaryTestList': {
      if (node.tests.length === 0) return !node.negated; // dash (-) = any
      const candidate = ctx.vars['?'] ?? null;
      const results = node.tests.map((t) => {
        const v = evaluate(t, ctx);
        return testUnaryValue(candidate, v, ctx);
      });

      let result: boolean | null;
      if (results.some((r) => r === true)) result = true;
      else if (results.some((r) => r === null)) result = null;
      else result = false;

      return node.negated ? (result === null ? null : !result) : result;
    }

    case 'InstanceOf': {
      const v = evaluate(node.value, ctx);
      if (v === null && node.targetType.name === 'Null') return true;
      if (v === null) return false;
      return instanceOf(v, node.targetType, ctx.vars);
    }

    case 'InExpression': {
      const v = evaluate(node.value, ctx);
      // List literal → membership test: always returns true/false (null = not equal)
      if (node.test.type === 'ListLiteral') {
        for (const elem of node.test.elements) {
          const ev = evaluate(elem, ctx);
          if (isFeelRange(ev)) {
            if (inRange(v, ev, ctx) === true) return true;
          } else {
            if (v === null && ev === null) return true;
            if (feelEqual(v, ev) === true) return true;
          }
        }
        return false;
      }
      const testCtx: EvalContext = { vars: { ...ctx.vars, '?': v }, warnings: ctx.warnings };
      const test = evaluate(node.test, testCtx);
      return testUnaryValue(v, test, ctx);
    }

    case 'BetweenExpression': {
      const v = evaluate(node.value, ctx);
      const lo = evaluate(node.low, ctx);
      const hi = evaluate(node.high, ctx);
      if (v === null || lo === null || hi === null) return null;
      const cmpLo = feelCompare(v, lo);
      const cmpHi = feelCompare(v, hi);
      if (cmpLo === null || cmpHi === null) return null;
      return cmpLo >= 0 && cmpHi <= 0;
    }

    case 'LetExpression': {
      const val = evaluate(node.value, ctx);
      return evaluate(node.body, {
        vars: { ...ctx.vars, [node.name]: val },
        warnings: ctx.warnings,
      });
    }

    case 'ErrorNode':
      return warn(ctx, 'PARSE_ERROR', node.message);

    case 'PipelineExpression': {
      const input = evaluate(node.left, ctx);
      const right = node.right;
      if (right.type === 'FunctionCall') {
        const hasQuestion = right.args.some(
          (a) => a.value.type === 'Identifier' && (a.value as { name: string }).name === '?',
        );
        if (hasQuestion) {
          return evaluate(right, { vars: { ...ctx.vars, '?': input }, warnings: ctx.warnings });
        }
        // No ? slot: prepend input as first argument
        return evaluate(
          {
            ...right,
            args: [
              { value: { type: 'Identifier' as const, name: '__pipe_input__', loc: right.loc } },
              ...right.args,
            ],
          },
          { vars: { ...ctx.vars, __pipe_input__: input }, warnings: ctx.warnings },
        );
      }
      if (right.type === 'Identifier') {
        return evaluate(
          {
            type: 'FunctionCall',
            callee: right,
            args: [
              { value: { type: 'Identifier' as const, name: '__pipe_input__', loc: right.loc } },
            ],
            loc: right.loc,
          },
          { vars: { ...ctx.vars, __pipe_input__: input }, warnings: ctx.warnings },
        );
      }
      // Fallback: evaluate right with ? = input
      return evaluate(right, { vars: { ...ctx.vars, '?': input }, warnings: ctx.warnings });
    }
  }
}

function domainToList(domain: FeelValue, ctx: EvalContext, bare = false): FeelValue[] | null {
  if (Array.isArray(domain)) return domain as FeelValue[];

  if (isFeelRange(domain)) {
    const { start, end } = domain;
    if (start === null || end === null) return [];

    // date range → list of dates
    if (isFeelDate(start) && isFeelDate(end)) {
      const result: FeelValue[] = [];
      const startDay = dateToDays(start);
      const endDay = dateToDays(end);
      if (startDay > endDay) {
        if (!bare) return null;
        const result: FeelValue[] = [];
        for (let cur = startDay; cur >= endDay; cur--) result.push(daysToDate(cur));
        return result;
      }
      for (let cur = startDay; cur <= endDay; cur++) {
        result.push(daysToDate(cur));
      }
      return result;
    }

    // numeric range → list of integers; bare ranges allow descending
    {
      const sd = asDecimal(start),
        ed = asDecimal(end);
      if (sd && ed) {
        const si = Math.trunc(sd.toNumber()),
          ei = Math.trunc(ed.toNumber());
        if (si > ei) {
          if (!bare) return null;
          const result: FeelValue[] = [];
          for (let i = si; i >= ei; i--) result.push(D(i));
          return result;
        }
        const result: FeelValue[] = [];
        for (let i = si; i <= ei; i++) result.push(D(i));
        return result;
      }
    }

    // Any other range type (string, datetime, etc.) is invalid for iteration
    return warn(ctx, 'INVALID_RANGE', `Range of type '${typeof start}' cannot be iterated`);
  }

  return [domain];
}

// Deep-convert all Decimal to number before returning to public API
function toPublicValue(v: FeelValue): PublicFeelValue {
  if (isDecimal(v)) return v.toNumber();
  if (Array.isArray(v)) return (v as FeelValue[]).map(toPublicValue) as PublicFeelValue;
  if (isFeelContext(v))
    return Object.fromEntries(
      Object.entries(v).map(([k, val]) => [k, toPublicValue(val)]),
    ) as PublicFeelValue;
  return v as PublicFeelValue;
}

// Deep-convert all number to Decimal when entering the evaluator from user context
function toInternalVars(ctx: FeelContext): FeelContext {
  return Object.fromEntries(Object.entries(ctx).map(([k, v]) => [k, toInternalValue(v)]));
}

function toInternalValue(v: FeelValue): FeelValue {
  if (typeof v === 'number') return D(v);
  if (Array.isArray(v)) return (v as FeelValue[]).map(toInternalValue);
  if (isFeelContext(v)) return toInternalVars(v);
  return v; // dates, times, durations: fields are structural ints, leave unchanged
}

export function evalExpression(node: AstNode, vars: FeelContext = {}): EvaluationResult {
  const ctx: EvalContext = { vars: toInternalVars(vars), warnings: [] };
  const raw = evaluate(node, ctx);
  return { value: toPublicValue(raw), warnings: ctx.warnings };
}
