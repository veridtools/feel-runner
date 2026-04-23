# Tests

The test suite has three layers, each with a distinct role and scope.

```
src/**/*.test.ts    Unit tests — colocated next to the source files they test
tests/tck/          Official OMG TCK — 2965 authoritative spec test cases
tests/fixtures/     Data-driven DMN fixture tests — @veridtools/dmn-fixtures catalog
```

## Unit tests — `src/**/*.test.ts`

1271+ hand-written assertions across 23 test files, colocated with the source files they test:

| File | What it covers |
|---|---|
| `src/evaluator/arithmetic.test.ts` | `+`, `-`, `*`, `/`, `**`, unary minus, Decimal128 precision, null propagation |
| `src/evaluator/logic.test.ts` | `and`, `or`, `not`, `between`, `in`, operator precedence |
| `src/evaluator/expressions.test.ts` | `if/then/else`, quantifiers, function definitions, closures, recursion |
| `src/evaluator/functions.test.ts` | Named args, typed params, higher-order functions, self-recursion |
| `src/evaluator/instance-of.test.ts` | `instance of` for all types including `list<T>`, `context<>`, `function<>->` |
| `src/evaluator/unary.test.ts` | Unary test lists — ranges, disjunctions, negation, wildcards, temporal |
| `src/evaluator/edge-cases.test.ts` | Overflow, underflow, null propagation edge cases |
| `src/evaluator/errors.test.ts` | Warning types, non-fatal issues alongside results |
| `src/evaluator/combinations.test.ts` | Cross-construct scenarios |
| `src/evaluator/from-parser.test.ts` | Complex expression combinations |
| `src/builtins/string.test.ts` | String builtins — substring, upper case, matches, etc. |
| `src/builtins/list.test.ts` | List builtins — count, flatten, sort, distinct values, etc. |
| `src/builtins/context.test.ts` | Context builtins — get value, get entries, put, merge, etc. |
| `src/builtins/numeric.test.ts` | Numeric builtins — floor, ceiling, abs, modulo, etc. |
| `src/builtins/temporal.test.ts` | Temporal builtins — years/months/days between, etc. |
| `src/builtins/range.test.ts` | Range builtins — before, after, includes, overlaps, etc. |
| `src/builtins/conversion.test.ts` | Conversion builtins — string(), number(), date(), etc. |
| `src/builtins/extensions.test.ts` | Extension builtins — is blank, uuid, base64, partition, etc. |
| `src/temporal/index.test.ts` | Date, time, date-and-time, duration literals and arithmetic |
| `src/temporal/custom-format.test.ts` | Custom date/time format parsing and formatting |
| `src/cache/index.test.ts` | `compile()` — pre-parse, cache reuse, AST identity |
| `src/validate.test.ts` | `safeParse()`, `ParseSyntaxError`, `ErrorNode`, `validate()` error positions |
| `src/index.test.ts` | Public API integration — `evaluate`, `evaluateAsync`, `explain`, `validate` |

```bash
npx vitest run src/
```

## `tck/` — OMG TCK

2965 official test cases from the DMN 1.5 Test Compatibility Kit. These are the authoritative source of truth for FEEL conformance — passing them means conforming to the OMG standard.

```bash
npx vitest run tests/tck/   # ~2 min
```

## `fixtures/` — DMN fixture tests

Data-driven tests powered by the [`@veridtools/dmn-fixtures`](https://www.npmjs.com/package/@veridtools/dmn-fixtures) catalog. The harness auto-discovers every fixture in the `feel-types` and `feel-functions` categories, evaluates the embedded FEEL expression against the JSON expected values, and asserts equality — no test code changes needed when new fixtures are added to the package.

Each fixture is a pair of files:
- `.dmn` — a single-decision DMN document containing the FEEL expression under test
- `.json` — one or more test cases with input context and expected output

The catalog currently covers:

| Category | Groups |
|---|---|
| `feel-types` | number, string, boolean, date, time, date-and-time, duration, list, context, function |
| `feel-functions` | string, list, numeric, datetime, range, context, conversion, boolean, error-cases |

All expected values are validated against the OMG TCK and FEEL spec before being added to the fixture package.

```bash
npx vitest run tests/fixtures/
```
