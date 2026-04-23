---
"@veridtools/feel-runner": minor
---

Initial release of `@veridtools/feel-runner`.

Full FEEL expression evaluator and CLI for DMN 1.5 — complete language coverage, Decimal128 precision, 80+ builtins, and a complete warning system (all 9 `WarningCode` values actively emitted).

**Engine**

- Complete FEEL language: arithmetic, strings, lists, contexts, ranges, temporal types, quantified expressions, for-loops, let-bindings, function definitions, pipelines, instance-of, unary tests
- Decimal128 precision via `decimal.js` (`0.1 + 0.2 = 0.3`, exactly)
- All 80+ standard DMN 1.5 builtins + practical extensions (`is blank`, `get or else`, `error`, `assert`, `uuid`, `to/from base64`, `last day of month`, unix timestamps, `partition`, `string format`)
- Named arguments and typed function parameters

**Warning system**

All 9 `WarningCode` values actively emitted — `DIVISION_BY_ZERO`, `ARGUMENT_ERROR`, `INVALID_RANGE`, `NO_VARIABLE_FOUND`, `FUNCTION_NOT_FOUND`, `INVALID_TYPE`, `EXPLICIT_ERROR`, `ASSERTION_FAILED`, `PARSE_ERROR`

**Public API**

- `evaluate(expr, ctx?, options?)` → `{ value, warnings }`
- `unaryTest(expr, ctx?)` → `{ value: boolean | null, warnings }`
- `compile(expr)` → `CompiledExpression` (parse-once, evaluate-many)
- `validate(expr, schema?)` → `{ valid, errors, warnings }` with char positions
- `safeParse(expr)` → `{ ast, errors }` — non-throwing parser for tooling
- `explain(expr, ctx?)` → `{ result, explanation }`
- Strict mode: throws on first warning

**CLI**

```bash
npx @veridtools/feel-runner "sum([1,2,3,4,5])"
feel-runner "[18..65]" --unary --input 30
