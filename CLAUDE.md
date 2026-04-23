# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Commands

```bash
pnpm build          # tsup → dist/ (library ESM+CJS+IIFE + CLI ESM with shebang)
pnpm dev            # tsup --watch
pnpm test           # vitest run
pnpm test:watch     # vitest
pnpm typecheck      # tsc --noEmit
pnpm docs:dev       # vitepress dev docs
```

## Architecture

This is a **FEEL expression evaluator and DMN decision runner**, published as both a library (`@veridtools/feel-runner`) and a CLI (`feel-runner`).

### Pipeline: `evaluate(expression, context?)`

```
lexer/index.ts        → tokenize FEEL source into token stream
parser/index.ts       → parse token stream into AST (respects dialect: 'expression' | 'unary-tests')
evaluator/index.ts    → evalExpression(ast, context) → { value, warnings }
```

### Key files

| File | Responsibility |
|------|---------------|
| `src/types.ts` | All public types — `FeelValue`, `EvaluationResult`, `FeelDate`, `FeelDuration`, `WarningCode`, etc. |
| `src/index.ts` | Public API: `evaluate`, `unaryTest`, `parse`, `safeParse`, `compile`, `validate`, `explain`, `walk` |
| `src/evaluator/index.ts` | `evalExpression` — walks AST against context; handles `ErrorNode` → `PARSE_ERROR` warning |
| `src/evaluator/binary.ts` | Binary operator evaluation — `evalBinaryOp` + arithmetic helpers (`evalAdd`, `evalSubtract`, `evalMultiply`, `evalDivide`) |
| `src/evaluator/property.ts` | Property access — `getProperty` for temporal types, ranges, contexts, lists |
| `src/evaluator/equality.ts` | FEEL equality semantics (type-aware) |
| `src/evaluator/instance-of.ts` | `instance of` / type check evaluation |
| `src/builtins/registry.ts` | Registry of all 80+ built-in functions + `BUILTIN_ARITY` table + `checkBuiltinArity()` |
| `src/builtins/*.ts` | Built-in implementations by category |
| `src/cache/index.ts` | Compiled expression cache — parse once, evaluate many |
| `src/temporal/index.ts` | Parsers for `date`, `time`, `date and time` |
| `src/temporal/duration.ts` | Duration parsing — `years-months` and `days-time` |
| `src/temporal/locale.ts` | Month name tables and helpers for locale-aware date formatting |
| `src/decimal.ts` | Decimal.js wrapper for arbitrary-precision numbers |
| `src/validate.ts` | Static validation — checks expression without evaluating |
| `src/explain.ts` | Expression introspection — what names/functions are used |
| `bin/feel-runner.ts` | CLI entry — parses args, calls evaluate/unaryTest, renders output |

### Warning system

All 9 `WarningCode` values are actively emitted — no dead codes:
- `DIVISION_BY_ZERO` — emitted by `evalDivide` in `binary.ts` for all zero-divisor cases (numeric, duration ÷ 0, duration ÷ zero duration)
- `ARGUMENT_ERROR` — emitted centrally by the evaluator using `checkBuiltinArity()` before calling any builtin; also emitted for user-defined function arity mismatches
- `INVALID_RANGE` — emitted by `domainToList` in `evaluator/index.ts` when iterating over a non-iterable range type (e.g. string range)
- `NO_VARIABLE_FOUND`, `FUNCTION_NOT_FOUND`, `INVALID_TYPE`, `EXPLICIT_ERROR`, `ASSERTION_FAILED`, `PARSE_ERROR` — emitted by the evaluator or extension builtins

Comprehensive warning tests live in `src/evaluator/warnings.test.ts`.

### Test structure

- `src/**/*.test.ts` — 1362+ hand-written unit tests across 24 files, colocated next to the source files they test (evaluator, builtins, temporal, cache, validate, public API)
- `tests/tck/` — 2965 OMG TCK conformance test cases (≥97% pass rate)
- `tests/fixtures/` — data-driven DMN fixture tests from `@veridtools/dmn-fixtures`

```bash
npx vitest run src/           # unit tests only
npx vitest run tests/tck/     # conformance (~2 min)
npx vitest run tests/fixtures/ # fixture tests
npx vitest run               # everything
```

### Build output

```
dist/index.js              ESM library
dist/index.cjs             CJS library
dist/index.iife.js         IIFE bundle (browser, globalName: FeelRunner)
dist/index.d.ts            TypeScript declarations
dist/bin/feel-runner.js    Standalone CLI (ESM, shebang)
```

### Dialects

`evaluate(expr, ctx)` defaults to `'expression'` dialect. Pass `'unary-tests'` as the third argument (or use `unaryTest()`) to evaluate unary test lists. The parser adapts its grammar based on the dialect.

### Critical design decisions

**`decimal.js` for numbers** — FEEL requires arbitrary-precision decimal arithmetic. All numeric literals become `Decimal` instances. The `isDecimal()` helper distinguishes them from JS numbers.

**`unaryTest` coercion** — A unary test list `"A","B"` has implicit context key `?` for the input value. The result is always coerced to `boolean | null` (null = wildcard `-`).

**`compile()` / cache** — `compile(expression)` returns a `CompiledExpression` that pre-parses once. Calling `compiled.evaluate(context)` skips the parse step. Use for hot paths (decision tables with many rows).

**`safeParse()` / `ErrorNode`** — The parser is imported from `@veridtools/feel-parser`. `safeParse()` never throws on parser errors: it returns `{ ast: AstNode; errors: ParseSyntaxError[] }` where the AST may contain `ErrorNode` sentinels at positions where recovery happened. `parse()` (used by `evaluate`, `compile`, `validate`) still throws on first error. The evaluator handles `ErrorNode` by emitting a `PARSE_ERROR` warning and returning `null`. Lexer errors (e.g. unterminated strings) always throw — even `safeParse()` does not catch them; `validate()` wraps `safeParse` in try/catch to handle both cases.

**`validate()` error positions** — `ValidationError` now carries optional `start`/`end` character offsets (from `ParseSyntaxError`). Lexer errors produce a `ValidationError` without position fields.

**`exactOptionalPropertyTypes: true`** — optional fields on result objects must be explicitly absent, not `undefined`.

**`noUncheckedIndexedAccess: true`** — all array/object index access returns `T | undefined`. Use `!` only where the index is provably in-bounds.

### Changeset and commit conventions

Conventional Commits enforced. Every PR with source changes needs `pnpm changeset`. Use `[skip changeset]` for docs/chore-only PRs.
