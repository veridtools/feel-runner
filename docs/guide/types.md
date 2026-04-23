# Types

FEEL is a dynamically typed language. The following types are supported.

## Primitive types

| Type | Examples | Notes |
|---|---|---|
| `number` | `1`, `3.14`, `-42`, `1e6` | Decimal128 precision |
| `string` | `"hello"`, `""` | Unicode, code-point length |
| `boolean` | `true`, `false` | |
| `null` | `null` | Represents absence of value |

## Temporal types

| Type | Example | Properties |
|---|---|---|
| `date` | `date("2024-01-15")` | `.year`, `.month`, `.day`, `.weekday` |
| `time` | `time("10:30:00")` | `.hour`, `.minute`, `.second`, `.time zone`, `.time offset` |
| `date and time` | `date and time("2024-01-15T10:30:00")` | all of the above + `.date`, `.time`, `.offset` |
| `years and months duration` | `duration("P1Y2M")` | `.years`, `.months` |
| `days and time duration` | `duration("P1DT2H30M")` | `.days`, `.hours`, `.minutes`, `.seconds` |

## Collection types

| Type | Example |
|---|---|
| `list` | `[1, 2, 3]`, `[]` |
| `context` | `{name: "Alice", age: 30}` |
| `range` | `[1..5]`, `(0..100)` |

## Function type

```feel
function(x) x + 1
function(a: number, b: number) a + b
```

## Type checking

Use `instance of` to check types at runtime:

```feel
1 instance of number                    // true
date("2024-01-01") instance of date     // true
[1,2,3] instance of list<number>        // true
{a:1} instance of context<a: number>   // true
null instance of Null                   // true
42 instance of Any                      // true
```

## Null propagation

Most operations return `null` when given `null` inputs:

```feel
null + 1        // null
null > 5        // null
not(null)       // false (special case)
```

Equality is the exception:

```feel
null = null     // true
null = 1        // false
```
