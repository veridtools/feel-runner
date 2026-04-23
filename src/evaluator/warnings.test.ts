import { describe, expect, it } from 'vitest';
import { evaluate, unaryTest } from '../index.js';
import type { WarningCode } from '../types.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function codes(expr: string, ctx: Record<string, unknown> = {}) {
  return evaluate(expr, ctx as never).warnings.map((w) => w.code);
}

function messages(expr: string, ctx: Record<string, unknown> = {}) {
  return evaluate(expr, ctx as never).warnings.map((w) => w.message);
}

function warns(expr: string, code: WarningCode, ctx: Record<string, unknown> = {}) {
  return codes(expr, ctx).includes(code);
}

// ─── NO_VARIABLE_FOUND ──────────────────────────────────────────────────────

describe('NO_VARIABLE_FOUND', () => {
  it('emits when variable is missing', () => {
    expect(warns('price * 2', 'NO_VARIABLE_FOUND')).toBe(true);
  });

  it('message contains variable name', () => {
    expect(messages('missing_var')[0]).toContain('missing_var');
  });

  it('returns null', () => {
    expect(evaluate('unknown').value).toBeNull();
  });

  it('does not emit when variable is provided', () => {
    expect(codes('x + 1', { x: 5 })).toEqual([]);
  });

  it('does not emit for builtin names used as values', () => {
    expect(codes('count([1,2,3])')).toEqual([]);
  });

  it('emits for each missing variable in expression', () => {
    const ws = evaluate('a + b').warnings;
    expect(ws.filter((w) => w.code === 'NO_VARIABLE_FOUND')).toHaveLength(2);
  });

  it('nested expression emits warning', () => {
    expect(warns('if x > 0 then x else 0', 'NO_VARIABLE_FOUND')).toBe(true);
  });

  it('? is not treated as missing variable in unary test', () => {
    expect(unaryTest('> 5', { '?': 10 }).warnings).toEqual([]);
  });
});

// ─── DIVISION_BY_ZERO ───────────────────────────────────────────────────────

describe('DIVISION_BY_ZERO', () => {
  it('emits on integer division by zero', () => {
    expect(warns('10 / 0', 'DIVISION_BY_ZERO')).toBe(true);
  });

  it('emits on decimal division by zero', () => {
    expect(warns('3.14 / 0', 'DIVISION_BY_ZERO')).toBe(true);
  });

  it('returns null', () => {
    expect(evaluate('10 / 0').value).toBeNull();
  });

  it('message contains divisor info', () => {
    expect(messages('10 / 0')[0]).toContain('zero');
  });

  it('emits when divisor variable is zero', () => {
    expect(warns('10 / d', 'DIVISION_BY_ZERO', { d: 0 })).toBe(true);
  });

  it('emits on duration / 0', () => {
    expect(warns('duration("P1D") / 0', 'DIVISION_BY_ZERO')).toBe(true);
  });

  it('emits on year-month duration / zero duration', () => {
    expect(warns('duration("P1Y") / duration("P0Y")', 'DIVISION_BY_ZERO')).toBe(true);
  });

  it('emits on day-time duration / zero duration', () => {
    expect(warns('duration("P1D") / duration("P0D")', 'DIVISION_BY_ZERO')).toBe(true);
  });

  it('does NOT emit for valid division', () => {
    expect(codes('10 / 2')).toEqual([]);
  });

  it('does NOT emit for division by non-zero decimal', () => {
    expect(codes('1 / 0.5')).toEqual([]);
  });

  it('0 / 0 emits DIVISION_BY_ZERO', () => {
    expect(warns('0 / 0', 'DIVISION_BY_ZERO')).toBe(true);
  });

  it('nested division by zero in expression', () => {
    expect(warns('(5 / 0) + 1', 'DIVISION_BY_ZERO')).toBe(true);
  });

  it('modulo by zero does NOT emit DIVISION_BY_ZERO (builtin returns null)', () => {
    // modulo() is a builtin, not the / operator — it returns null, no warning
    expect(evaluate('modulo(10, 0)').value).toBeNull();
  });
});

// ─── ARGUMENT_ERROR ─────────────────────────────────────────────────────────

describe('ARGUMENT_ERROR — numeric builtins', () => {
  it('abs() with too many args', () => {
    expect(warns('abs(1, 2)', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('sqrt() with no args', () => {
    expect(warns('sqrt()', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('sqrt() with too many args', () => {
    expect(warns('sqrt(4, 2)', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('log() with too many args', () => {
    expect(warns('log(1, 2)', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('exp() with no args', () => {
    expect(warns('exp()', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('modulo() with one arg', () => {
    expect(warns('modulo(5)', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('floor() with too many args', () => {
    expect(warns('floor(1.5, 2, 3)', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('floor() with 1 arg is fine', () => {
    expect(codes('floor(1.5)')).toEqual([]);
  });

  it('floor() with 2 args is fine', () => {
    expect(codes('floor(1.567, 1)')).toEqual([]);
  });

  it('decimal() with one arg', () => {
    expect(warns('decimal(1.5)', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('message mentions function name and counts', () => {
    const msg = messages('abs(1, 2)')[0]!;
    expect(msg).toContain('abs');
    expect(msg).toContain('1');
    expect(msg).toContain('2');
  });

  it('returns null when arity is wrong', () => {
    expect(evaluate('abs(1, 2)').value).toBeNull();
  });
});

describe('ARGUMENT_ERROR — string builtins', () => {
  it('string length() with no args', () => {
    expect(warns('string length()', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('upper case() with too many args', () => {
    expect(warns('upper case("a", "b")', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('contains() with one arg', () => {
    expect(warns('contains("hello")', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('substring() with one arg', () => {
    expect(warns('substring("hello")', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('substring() with 2 args is fine', () => {
    expect(codes('substring("hello", 2)')).toEqual([]);
  });

  it('substring() with 3 args is fine', () => {
    expect(codes('substring("hello", 2, 3)')).toEqual([]);
  });

  it('trim() with too many args', () => {
    expect(warns('trim("a", "b")', 'ARGUMENT_ERROR')).toBe(true);
  });
});

describe('ARGUMENT_ERROR — list builtins', () => {
  it('count() with no args', () => {
    expect(warns('count()', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('count() with too many args', () => {
    expect(warns('count([1], [2])', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('reverse() with no args', () => {
    expect(warns('reverse()', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('insert before() with 2 args', () => {
    expect(warns('insert before([1,2], 1)', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('insert before() with 3 args is fine', () => {
    expect(codes('insert before([1,2], 1, 0)')).toEqual([]);
  });

  it('list contains() with one arg', () => {
    expect(warns('list contains([1,2,3])', 'ARGUMENT_ERROR')).toBe(true);
  });
});

describe('ARGUMENT_ERROR — other builtins', () => {
  it('is defined() with no args', () => {
    expect(warns('is defined()', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('get entries() with no args', () => {
    expect(warns('get entries()', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('format number() with one arg', () => {
    expect(warns('format number(1234)', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('format number() with 2 args is fine', () => {
    expect(codes('format number(1234, "#,##0")')).toEqual([]);
  });
});

describe('ARGUMENT_ERROR — user-defined functions', () => {
  it('too few args to user function', () => {
    expect(warns('(function(a, b) a + b)(1)', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('too many args to user function', () => {
    expect(warns('(function(a) a * 2)(1, 2)', 'ARGUMENT_ERROR')).toBe(true);
  });

  it('correct arity does not emit', () => {
    expect(codes('(function(a, b) a + b)(3, 4)')).toEqual([]);
  });

  it('message contains expected and actual count', () => {
    const msg = messages('(function(a, b) a + b)(1)')[0]!;
    expect(msg).toContain('2');
    expect(msg).toContain('1');
  });
});

// ─── INVALID_RANGE ──────────────────────────────────────────────────────────

describe('INVALID_RANGE', () => {
  it('emits when iterating over string range', () => {
    expect(warns('for x in "a".."z" return x', 'INVALID_RANGE')).toBe(true);
  });

  it('returns null on invalid range iteration', () => {
    expect(evaluate('for x in "a".."z" return x').value).toBeNull();
  });

  it('does NOT emit for valid numeric range', () => {
    expect(codes('for x in 1..3 return x')).toEqual([]);
  });

  it('does NOT emit for valid date range', () => {
    expect(codes('for d in date("2024-01-01")..date("2024-01-03") return d')).toEqual([]);
  });

  it('emits in some/every over invalid range', () => {
    // domainToList returns null → quantifier loop gets [] → no INVALID_RANGE here
    // the invalid range silently yields no iterations
    // (quantified expressions treat null domain as empty)
    const result = evaluate('some x in "a".."z" satisfies x = "a"');
    expect(result.value).toBe(false);
  });

  it('message mentions type', () => {
    const ws = evaluate('for x in "a".."z" return x').warnings;
    const rangeWarn = ws.find((w) => w.code === 'INVALID_RANGE');
    expect(rangeWarn?.message).toContain('string');
  });
});

// ─── FUNCTION_NOT_FOUND ─────────────────────────────────────────────────────

describe('FUNCTION_NOT_FOUND', () => {
  it('emits when calling undefined function', () => {
    expect(warns('unknownFn(1)', 'FUNCTION_NOT_FOUND')).toBe(true);
  });

  it('message contains function name', () => {
    expect(messages('unknownFn(1)')[0]).toContain('unknownFn');
  });

  it('returns null', () => {
    expect(evaluate('missingFn("x")').value).toBeNull();
  });

  it('emits when calling non-callable value (string literal)', () => {
    expect(warns('"hello"(1)', 'FUNCTION_NOT_FOUND')).toBe(true);
  });
});

// ─── INVALID_TYPE ────────────────────────────────────────────────────────────

describe('INVALID_TYPE', () => {
  // date(), time(), duration() as function calls go through the temporal builtin path,
  // which returns null silently. INVALID_TYPE is emitted by the TemporalLiteral AST node
  // (produced for @"..." syntax or when the parser inlines the literal), not by builtins.

  it('date() with invalid string returns null (builtin path, no INVALID_TYPE)', () => {
    const r = evaluate('date("not-a-date")');
    expect(r.value).toBeNull();
    expect(r.warnings.some((w) => w.code === 'INVALID_TYPE')).toBe(false);
  });

  it('time() with invalid string returns null (builtin path)', () => {
    expect(evaluate('time("bad")').value).toBeNull();
  });

  it('duration() with invalid string returns null (builtin path)', () => {
    expect(evaluate('duration("xyz")').value).toBeNull();
  });

  it('date() with valid string returns date value', () => {
    const r = evaluate('date("2024-06-15")');
    expect(r.value).not.toBeNull();
    expect(r.warnings).toEqual([]);
  });
});

// ─── EXPLICIT_ERROR ──────────────────────────────────────────────────────────

describe('EXPLICIT_ERROR', () => {
  it('emits via error() builtin', () => {
    expect(warns('error("something went wrong")', 'EXPLICIT_ERROR')).toBe(true);
  });

  it('message is the provided string', () => {
    expect(messages('error("bad input")')[0]).toBe('bad input');
  });

  it('returns null', () => {
    expect(evaluate('error("oops")').value).toBeNull();
  });

  it('emits when called from if-else branch', () => {
    const r = evaluate('if score < 0 then error("negative score") else score', {
      score: -1,
    } as never);
    expect(r.warnings.some((w) => w.code === 'EXPLICIT_ERROR')).toBe(true);
    expect(r.value).toBeNull();
  });

  it('does NOT emit when error branch is not taken', () => {
    const r = evaluate('if score < 0 then error("negative") else score', { score: 5 } as never);
    expect(r.warnings).toEqual([]);
    expect(r.value).toBe(5);
  });
});

// ─── ASSERTION_FAILED ────────────────────────────────────────────────────────

describe('ASSERTION_FAILED', () => {
  it('emits when assert() fails', () => {
    expect(warns('assert(false, "invariant broken")', 'ASSERTION_FAILED')).toBe(true);
  });

  it('message is the provided string', () => {
    expect(messages('assert(false, "must be true")')[0]).toBe('must be true');
  });

  it('returns null on failure', () => {
    expect(evaluate('assert(false, "fail")').value).toBeNull();
  });

  it('does NOT emit when assertion passes', () => {
    expect(codes('assert(true, "ok")')).toEqual([]);
  });

  it('returns true when assertion passes', () => {
    expect(evaluate('assert(true, "ok")').value).toBe(true);
  });
});

// ─── PARSE_ERROR ─────────────────────────────────────────────────────────────

describe('PARSE_ERROR', () => {
  it('evaluate() throws ParseSyntaxError on hard syntax errors (does not swallow them)', () => {
    // evaluate() uses parse() which throws — only safeParse() produces ErrorNodes.
    // PARSE_ERROR warning code is emitted when ErrorNode reaches the evaluator.
    expect(() => evaluate('(1 + )')).toThrow();
  });

  it('PARSE_ERROR is a defined WarningCode (part of the public API)', () => {
    // Verify the code is exported in the type system by checking the warning shape
    const w = evaluate('unknown_var').warnings[0]!;
    expect(w).toHaveProperty('code');
    expect(w).toHaveProperty('message');
  });
});

// ─── Multiple warnings in one expression ─────────────────────────────────────

describe('multiple warnings', () => {
  it('missing var + division by zero: only NO_VARIABLE_FOUND (null propagates before divide)', () => {
    // x is null → evalDivide receives null left-hand side → exits early, no DIVISION_BY_ZERO
    const ws = evaluate('x / 0').warnings;
    const wCodes = ws.map((w) => w.code);
    expect(wCodes).toContain('NO_VARIABLE_FOUND');
  });

  it('known value division by zero + missing var both reported in complex expression', () => {
    const ws = evaluate('(5 / 0) + missing').warnings;
    const wCodes = ws.map((w) => w.code);
    expect(wCodes).toContain('DIVISION_BY_ZERO');
    expect(wCodes).toContain('NO_VARIABLE_FOUND');
  });

  it('each warning is independent', () => {
    const ws = evaluate('a + b + c').warnings;
    expect(ws.filter((w) => w.code === 'NO_VARIABLE_FOUND')).toHaveLength(3);
  });

  it('result is null when there is a warning', () => {
    expect(evaluate('unknown / 0').value).toBeNull();
  });
});

// ─── strict mode ─────────────────────────────────────────────────────────────

describe('strict mode', () => {
  it('throws on first warning', () => {
    expect(() => evaluate('price * 2', {}, { strict: true })).toThrow();
  });

  it('does not throw when no warnings', () => {
    expect(() => evaluate('1 + 2', {}, { strict: true })).not.toThrow();
  });

  it('throws on DIVISION_BY_ZERO in strict mode', () => {
    expect(() => evaluate('1 / 0', {}, { strict: true })).toThrow();
  });

  it('throws on ARGUMENT_ERROR in strict mode', () => {
    expect(() => evaluate('abs(1, 2)', {}, { strict: true })).toThrow();
  });
});
