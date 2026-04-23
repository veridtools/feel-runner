# Getting Started

## Overview

`@veridtools/feel-runner` is a full-featured FEEL (Friendly Enough Expression Language) engine for DMN 1.5. It evaluates FEEL expressions with:

- All 80+ standard builtin functions
- Decimal128 arithmetic precision
- Complete temporal type support (date, time, date and time, duration)
- Unary tests for DMN decision tables
- Typed contexts and closures

## Install {#install}

::: code-group

```bash [pnpm]
pnpm add @veridtools/feel-runner
```

```bash [npm]
npm install @veridtools/feel-runner
```

```bash [yarn]
yarn add @veridtools/feel-runner
```

:::

## Quickstart {#quickstart}

```ts
import { evaluate, unaryTest } from '@veridtools/feel-runner'

// Evaluate a FEEL expression
const result = evaluate('sum([1, 2, 3]) * 2')
console.log(result.value) // 12

// With context variables
const price = evaluate('price * quantity - discount', {
  price: 100,
  quantity: 3,
  discount: 50,
})
console.log(price.value) // 250

// Unary test (for DMN decision table cells)
const test = unaryTest('[18..65]', { '?': 30 })
console.log(test.value) // true
```

## Return type

`evaluate()` and `unaryTest()` return an `EvaluationResult`:

```ts
interface EvaluationResult {
  value: FeelValue        // the result (null if error)
  warnings: EvaluationWarning[]  // non-fatal issues
}
```

Warnings include things like undefined variables or unknown functions — the expression still evaluates, returning `null` for those parts.

## CLI {#cli}

`feel-runner` ships with a command-line interface you can run locally without writing any code.

### Install globally

::: code-group

```bash [pnpm]
pnpm add -g @veridtools/feel-runner
```

```bash [npm]
npm install -g @veridtools/feel-runner
```

:::

### Run locally with npx

No install needed:

```bash
npx @veridtools/feel-runner "1 + 2 * 3"
```

### Usage

```bash
feel-runner <expression> [options]

Options:
  -u, --unary         Evaluate as unary test (requires "?" in context)
  -i, --input <v>     Input value for unary test  (shorthand for --ctx '{"?": v}')
  -c, --ctx <json>    Context variables as JSON object
  -n, --no-color      Disable ANSI colors
  -h, --help          Show help
```

### Examples

```bash
# Simple arithmetic
feel-runner "(1 + 2) * 3 - 4 / 2"
# → 7

# With context variables
feel-runner "price * qty" --ctx '{"price":10,"qty":5}'
# → 50

# Builtin functions
feel-runner "sum([1,2,3,4,5])"
# → 15

# Temporal
feel-runner 'date("2024-06-15").month'
# → 6

# Unary test — check if value is in range
feel-runner "[18..65]" --unary --input 30
# → true

# Unary test — check if value is in list
feel-runner '"A","B","C"' --unary --ctx '{"?":"B"}'
# → true

# Warnings are shown in yellow
feel-runner "price * 2"
# ⚠ [NO_VARIABLE_FOUND] Variable not found: price
# → null
```

## FEEL in DMN

In DMN decision tables, FEEL is used in two places:

1. **Input cells** — evaluated as **unary tests** against the current input value
2. **Output cells / expressions** — evaluated as full FEEL expressions

Use `evaluate()` for output columns and full expressions.
Use `unaryTest()` for input column cells.
