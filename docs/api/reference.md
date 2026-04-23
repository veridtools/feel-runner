# API Reference

## evaluate() {#evaluate}

Evaluates a FEEL expression and returns the result.

```ts
function evaluate(
  expression: string,
  context?: Record<string, FeelValue>,
  options?: EvaluateOptions
): EvaluationResult
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `expression` | `string` | A FEEL expression |
| `context` | `Record<string, FeelValue>` | Optional variables |
| `options` | `EvaluateOptions` | Optional evaluation options |

**`EvaluateOptions`:**

```ts
interface EvaluateOptions {
  strict?: boolean  // throw on any warning instead of returning it
}
```

Strict mode throws a `Error` on the first warning (missing variable, type error, explicit `error()` call, etc.):

```ts
evaluate('score + bonus', { score: 720 }, { strict: true })
// throws: [FEEL strict] NO_VARIABLE_FOUND: Variable 'bonus' not found
```

**Returns:** [`EvaluationResult`](#evaluationresult)

**Example:**

```ts
import { evaluate } from '@veridtools/feel-runner'

evaluate('2 + 2').value                         // 4
evaluate('x * 2', { x: 21 }).value             // 42
evaluate('date("2024-01-15").month').value      // 1
evaluate('sum([1,2,3])').value                  // 6
evaluate('[1,2,3,4,5][item > 3]').value        // [4, 5]
```

---

## unaryTest() {#unarytest}

Evaluates a FEEL unary test — used in DMN decision table input cells.

```ts
function unaryTest(
  expression: string,
  context: Record<string, FeelValue> & { '?': FeelValue }
): EvaluationResult
```

The context **must** include a `"?"` key representing the value being tested.

**Example:**

```ts
import { unaryTest } from '@veridtools/feel-runner'

unaryTest('[18..65]', { '?': 30 }).value          // true
unaryTest('"A","B","C"', { '?': 'D' }).value      // false
unaryTest('not([1..10])', { '?': 15 }).value      // true
unaryTest('> threshold', { '?': 10, threshold: 5 }).value  // true
```

---

## EvaluationResult {#evaluationresult}

```ts
interface EvaluationResult {
  value: FeelValue
  warnings: EvaluationWarning[]
}
```

| Field | Type | Description |
|---|---|---|
| `value` | `FeelValue` | Result of the evaluation, or `null` on error |
| `warnings` | `EvaluationWarning[]` | Non-fatal issues encountered |

### EvaluationWarning

```ts
interface EvaluationWarning {
  code:
    | 'NO_VARIABLE_FOUND'
    | 'FUNCTION_NOT_FOUND'
    | 'INVALID_TYPE'
    | 'DIVISION_BY_ZERO'
    | 'INVALID_RANGE'
    | 'ARGUMENT_ERROR'
    | 'EXPLICIT_ERROR'    // from error()
    | 'ASSERTION_FAILED'  // from assert()
    | 'PARSE_ERROR'       // ErrorNode reached at runtime (via safeParse + evalExpression)
  message: string
}
```

Warnings are non-fatal — the expression still evaluates, returning `null` for the problematic parts.

---

## FeelValue {#feelvalue}

The union type of all values that FEEL can produce:

```ts
type FeelValue =
  | Decimal
  | string
  | boolean
  | null
  | FeelDate
  | FeelTime
  | FeelDateTime
  | YearMonthDuration
  | DayTimeDuration
  | FeelRange
  | FeelContext
  | FeelFunction
  | FeelValue[]
```

### Temporal value shapes

```ts
interface FeelDate {
  kind: 'date'
  year: number
  month: number    // 1-12
  day: number      // 1-31
}

interface FeelTime {
  kind: 'time'
  hour: number     // 0-23
  minute: number   // 0-59
  second: number   // 0-59
  nanosecond?: number
  offset?: number  // UTC offset in seconds
  timezone?: string
}

interface FeelDateTime {
  kind: 'date-time'
  year: number; month: number; day: number
  hour: number; minute: number; second: number
  nanosecond?: number
  offset?: number
  timezone?: string
}

interface YearMonthDuration {
  kind: 'year-month'
  years: number
  months: number
}

interface DayTimeDuration {
  kind: 'day-time'
  days: number
  hours: number
  minutes: number
  seconds: number
  nanoseconds?: number
}
```

### Range value

```ts
interface FeelRange {
  kind: 'range'
  start: FeelValue | null
  end: FeelValue | null
  startIncluded: boolean
  endIncluded: boolean
}
```

### Context value

```ts
type FeelContext = Record<string, FeelValue>
```

---

## evaluateAsync() {#evaluateasync}

Async version of `evaluate()` — same signature and result, returns a `Promise`. Use this when you need to integrate FEEL evaluation into an async pipeline.

```ts
async function evaluateAsync(
  expression: string,
  context?: Record<string, FeelValue>,
  options?: EvaluateOptions
): Promise<EvaluationResult>
```

**Example:**

```ts
import { evaluateAsync } from '@veridtools/feel-runner'

const result = await evaluateAsync('price * qty', { price: 10, qty: 5 })
result.value  // 50

// Works in async decision pipelines
const [r1, r2] = await Promise.all([
  evaluateAsync('score >= 700', { score }),
  evaluateAsync('income > 50000', { income }),
])
```

---

## compile() {#compile}

Pre-compiles a FEEL expression for repeated evaluation. Parses once, evaluates many times — avoids re-parsing on every `evaluate()` call.

```ts
function compile(
  expression: string,
  dialect?: FeelDialect   // 'expression' (default) | 'unary-tests'
): CompiledExpression
```

**Returns:** `CompiledExpression`

```ts
interface CompiledExpression {
  readonly ast: AstNode
  readonly dialect: FeelDialect
  evaluate(context?: FeelContext): EvaluationResult
}
```

**Example:**

```ts
import { compile } from '@veridtools/feel-runner'

const expr = compile('price * qty * (1 - discount)')

// evaluate many times with different contexts, no re-parsing
for (const order of orders) {
  const result = expr.evaluate(order)
  console.log(result.value)
}
```

The default cache reuses the parsed AST for identical `(dialect, expression)` pairs across calls — no need to hold onto the `CompiledExpression` object yourself.

```ts
compile('x + 1').ast === compile('x + 1').ast  // true — same AST reference
```

Throws on syntax errors (uses `parse()` internally — not error-recovering).

---

## safeParse() {#safeparse}

Parses a FEEL expression without throwing. Returns a partial AST with `ErrorNode` sentinels where parsing failed, plus an array of all parse errors with character positions.

```ts
function safeParse(
  expression: string,
  dialect?: FeelDialect,       // 'expression' (default) | 'unary-tests'
  knownNames?: Set<string>     // multi-word identifiers (e.g. "First Name")
): ParseResult
```

**Returns:**

```ts
interface ParseResult {
  ast: AstNode                  // always present; ErrorNode where parsing failed
  errors: ParseSyntaxError[]    // accumulated parse errors (empty on success)
}
```

**Example:**

```ts
import { safeParse } from '@veridtools/feel-runner'

// Valid expression
const { ast, errors } = safeParse('1 + 1')
errors.length   // 0
ast.type        // 'BinaryOp'

// Invalid expression — errors with positions, AST still returned
const { ast: ast2, errors: errs } = safeParse('1 + * 2')
errs[0].message // 'Unexpected token: * (*)'
errs[0].start   // 4
errs[0].end     // 5
ast2.type       // 'BinaryOp' (parser recovered)

// Completely invalid — ErrorNode at root
safeParse('*').ast.type  // 'ErrorNode'
```

::: warning Lexer errors still throw
`safeParse` wraps parser-level errors but **not** lexer errors. Unterminated strings, invalid Unicode escapes, and similar lexer failures still throw a plain `Error`. Use `try/catch` around `safeParse` if you need to handle all error cases gracefully.
:::

---

## ParseSyntaxError {#parsesyntaxerror}

A structured error class thrown by `parse()` and collected by `safeParse()`.

```ts
class ParseSyntaxError extends Error {
  readonly start: number   // character offset where the error starts
  readonly end: number     // character offset where the error ends
  name: 'ParseSyntaxError'
}
```

**Example:**

```ts
import { ParseSyntaxError } from '@veridtools/feel-runner'

try {
  parse('1 + * 2')
} catch (e) {
  if (e instanceof ParseSyntaxError) {
    console.log(e.message)  // 'Unexpected token: * (*)'
    console.log(e.start)    // 4
    console.log(e.end)      // 5
  }
}
```

---

## validate() {#validate}

Statically validates a FEEL expression without evaluating it. Returns syntax errors and (optionally) unknown variable/function warnings based on a schema.

```ts
function validate(
  expression: string,
  schema?: Record<string, string>
): ValidationResult
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `expression` | `string` | FEEL expression to validate |
| `schema` | `Record<string, string>` | Optional map of variable name → type. If provided, unknown identifiers generate warnings |

**Returns:** `ValidationResult`

```ts
interface ValidationResult {
  valid: boolean              // false only on syntax errors
  errors: ValidationError[]  // parse errors
  warnings: ValidationWarning[]  // unknown variables/functions
}

interface ValidationWarning {
  code: 'UNKNOWN_VARIABLE' | 'UNKNOWN_FUNCTION'
  name: string
  message: string
}

interface ValidationError {
  message: string
  start?: number  // character offset where the error starts (parser errors only)
  end?: number    // character offset where the error ends
}
```

Parser errors include `start`/`end` character offsets — use them to highlight the error position in an editor. Lexer errors (e.g. unterminated string) are caught but don't carry position info.

**Examples:**

```ts
import { validate } from '@veridtools/feel-runner'

// Syntax check only (no schema)
validate('1 + 1')
// { valid: true, errors: [], warnings: [] }

validate('1 + * 2')
// { valid: false, errors: [{ message: '...' }], warnings: [] }

validate('"unclosed')
// { valid: false, errors: [...], warnings: [] }

// With schema — flags unknown identifiers
validate('score + bonus', { score: 'number' })
// { valid: true, warnings: [{ code: 'UNKNOWN_VARIABLE', name: 'bonus', message: '...' }] }

validate('score + bonus', { score: 'number', bonus: 'number' })
// { valid: true, errors: [], warnings: [] }

// Unknown function is flagged
validate('myCustomFn(x)', { x: 'number' })
// { valid: true, warnings: [{ code: 'UNKNOWN_FUNCTION', name: 'myCustomFn', ... }] }

// For-loop bindings, filter item, function params — never flagged as unknown
validate('for x in [1,2,3] return x * 2', {})
// { valid: true, warnings: [] }

validate('[1,2,3][item > 2]', {})
// { valid: true, warnings: [] }

// let bindings are fully tracked
validate('let total = price * qty in total * 1.1', { price: 'number', qty: 'number' })
// { valid: true, warnings: [] }
```

::: tip IDE integration
`validate()` is designed for use in editors and form builders. Wire it to a `change` handler to give real-time feedback as users type FEEL expressions, showing warnings about undefined variables from your data model.
:::

---

## explain() {#explain}

Evaluates an expression and returns a natural-language trace explaining how the result was reached. Useful for debugging decision logic.

```ts
function explain(
  expression: string,
  context?: Record<string, FeelValue>
): ExplainResult
```

**Returns:**

```ts
interface ExplainResult {
  result: FeelValue    // same as evaluate().value
  explanation: string  // human-readable trace
}
```

**Examples:**

```ts
import { explain } from '@veridtools/feel-runner'

explain('if score >= 700 then "approved" else "rejected"', { score: 580 })
// {
//   result: "rejected",
//   explanation: `
//     Result: "rejected"
//     condition: score (580) >= 700 → false
//     → else branch: "rejected"
//   `
// }

explain('if a > 0 and b > 0 then "both" else "not both"', { a: 5, b: -1 })
// result: "not both"
// explanation shows AND logic with each operand's value

explain('let rate = 0.1 in 1000 * rate')
// result: 100
// explanation shows: let rate = 0.1, then the body result
```

The explanation is particularly useful for:
- Debugging why a DMN decision returned an unexpected result
- Building user-facing explanations of business rule outcomes
- Audit trails in regulated processes
