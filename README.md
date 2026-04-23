# @veridtools/feel-runner

<img src="./docs/public/verid-logo.webp" alt="Veridtools Logo" width="150" />

[![npm](https://img.shields.io/npm/v/@veridtools/feel-runner)](https://www.npmjs.com/package/@veridtools/feel-runner)
[![license](https://img.shields.io/github/license/veridtools/feel-runner)](./LICENSE)
[![ci](https://img.shields.io/github/actions/workflow/status/veridtools/feel-runner/ci.yml?label=ci)](https://github.com/veridtools/feel-runner/actions)
[![docs](https://img.shields.io/badge/docs-github%20pages-blue)](https://veridtools.github.io/feel-runner/)
![dependencies](https://img.shields.io/badge/dependencies-1-success)

> Full FEEL expression engine for DMN 1.5 — zero dependencies, Decimal128 precision, 97%+ OMG conformance.

`@veridtools/feel-runner` evaluates [FEEL](https://www.omg.org/spec/DMN/1.5) (Friendly Enough Expression Language) expressions as defined in the OMG DMN 1.5 specification. It covers all 80+ standard builtins, temporal types, ranges, contexts, quantified expressions, and unary tests — the complete language.

## Install

```bash
pnpm add @veridtools/feel-runner
# or
npm install @veridtools/feel-runner
```

## Quick start

```ts
import { evaluate, unaryTest } from '@veridtools/feel-runner'

// Evaluate any FEEL expression
evaluate('sum([1, 2, 3]) * 2').value          // 12
evaluate('upper case("hello")').value          // "HELLO"
evaluate('date("2024-01-15").month').value     // 1
evaluate('0.1 + 0.2 = 0.3').value             // true (Decimal128!)

// With context variables
evaluate('price * quantity', { price: 10, quantity: 5 }).value  // 50

// Unary tests — for DMN decision table input cells
unaryTest('[18..65]', { '?': 30 }).value       // true
unaryTest('"A","B","C"', { '?': 'D' }).value   // false
unaryTest('not([1..10])', { '?': 15 }).value   // true
```

## CLI

`feel-runner` ships a standalone CLI. Run without installing:

```bash
npx @veridtools/feel-runner "(1 + 2) * 3 - 4 / 2"
# → 7
```

Or install globally:

```bash
pnpm add -g @veridtools/feel-runner
# then
feel-runner "sum([1,2,3,4,5])"
```

### Examples

```bash
# Arithmetic
feel-runner "(1 + 2) * 3 - 4 / 2"

# With context variables
feel-runner "price * qty" --ctx '{"price":10,"qty":5}'

# Builtin functions
feel-runner "sum([1,2,3,4,5])"

# Temporal
feel-runner 'date("2024-01-15").month'

# Unary test — value in range
feel-runner "[18..65]" --unary --input 30

# Unary test — value in list
feel-runner '"A","B","C"' --unary --ctx '{"?":"B"}'

# Warnings are shown in yellow with code
feel-runner "price * 2"
# ⚠ [NO_VARIABLE_FOUND] Variable not found: price
# → null
```

### Options

```
feel-runner <expression> [options]

  -u, --unary         Evaluate as unary test (requires "?" in context)
  -i, --input <v>     Input value for unary test (shorthand for --ctx '{"?": v}')
  -c, --ctx <json>    Context variables as JSON object
  -n, --no-color      Disable ANSI colors
  -h, --help          Show help
```

## Documentation

Full docs with interactive playground:

```bash
pnpm docs:dev       # Start docs server at localhost:5173
pnpm docs:build     # Build for production
pnpm docs:preview   # Preview production build
```

### Documentation sections

- **Playground** — Interactive FEEL evaluator in the browser
- **Getting Started** — Install, quickstart, return types
- **Expressions** — Arithmetic, strings, comparisons, if/for/some/every, functions, instance of
- **Unary Tests** — Ranges, disjunctions, negation, wildcards
- **Types** — All FEEL types and null semantics
- **Built-in Functions** — All 80+ builtins with examples
- **Temporal** — Dates, times, durations, timezone handling, calendar functions
- **Context & Variables** — Passing variables, path expressions, recursion
- **API Reference** — `evaluate()`, `unaryTest()`, `FeelValue`, `EvaluationResult`

## Development

```bash
pnpm install          # Install dependencies
pnpm test             # Run all tests (unit + conformance)
pnpm test:watch       # Watch mode
pnpm typecheck        # TypeScript type checking
pnpm build            # Build the package (ESM + CJS)
```

## Tests

The project has three test layers. See [`tests/README.md`](./tests/README.md) for the full breakdown.

### Unit tests — `src/**/*.test.ts`

1271+ hand-written assertions across 23 test files, colocated next to the source files they test — covering every builtin, edge case, combination scenario, and language construct — including `safeParse`, `ParseSyntaxError`, `ErrorNode`, compile/cache behavior, and all negative/error paths.

```bash
npx vitest run src/
```

### Conformance tests — `tests/tck/`

**2965 official OMG TCK test cases** from the DMN 1.5 specification, covering compliance levels 2 and 3. These are the authoritative spec tests — passing them means conforming to the standard.

```bash
npx vitest run tests/tck/   # ~2 min
```

### DMN fixture tests — `tests/fixtures/`

Data-driven tests from the [`@veridtools/dmn-fixtures`](https://www.npmjs.com/package/@veridtools/dmn-fixtures) catalog — real DMN documents paired with expected outputs, validated against the OMG TCK and FEEL spec.

```bash
npx vitest run tests/fixtures/
```

## Features

- **Zero dependencies** — only `decimal.js` for Decimal128 arithmetic
- **Decimal128 precision** — `0.1 + 0.2 = 0.3`, exactly, always
- **Complete temporal support** — date, time, date and time, year-month duration, day-time duration, timezone/offset, leap year validation, ISO 8601 formatting
- **Full builtin library** — all 80+ standard DMN 1.5 functions + practical extensions (`is blank`, `get or else`, `error`, `assert`, `uuid`, `to/from base64`, `last day of month`, `unix timestamps`, `partition`)
- **Unary tests** — DMN decision table input cells, all forms
- **Named arguments** — `substring(string: "hello", start position: 2)`
- **Typed function params** — `function(x: number) x + 1`
- **Recursion** — functions in contexts can call themselves
- **Structured warnings** — non-fatal issues returned alongside the value (`PARSE_ERROR`, `NO_VARIABLE_FOUND`, `INVALID_TYPE`, …)
- **`safeParse()` + `ParseSyntaxError`** — error-recovering parser for IDE/tooling use cases; returns partial AST with `ErrorNode` sentinels and `start`/`end` character positions on every error
- **ESM + CJS** — works in Node.js, Bun, and modern bundlers

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT — [LICENSE](./LICENSE)
