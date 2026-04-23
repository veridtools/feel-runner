# Unary Tests

Unary tests are the expressions used in **DMN input cells**. They test whether the current input value (referred to as `?`) satisfies a condition.

## Usage

```ts
import { unaryTest } from '@veridtools/feel-runner'

// The context must include "?" — the input value being tested
unaryTest('[18..65]', { '?': 30 }).value   // true
unaryTest('"A","B","C"', { '?': 'B' }).value  // true
unaryTest('> 100', { '?': 50 }).value     // false
```

## Single value

```
5         → matches if ? = 5
"approved" → matches if ? = "approved"
```

## Range

```
[1..10]   → inclusive on both ends
(1..10)   → exclusive on both ends
[1..10)   → inclusive start, exclusive end
(1..10]   → exclusive start, inclusive end
```

## Open-ended range

```
> 100
>= 100
< 18
<= 65
```

## Disjunction (OR)

Multiple conditions separated by commas — any match returns `true`:

```
1, 2, 3               → any of these values
"A", "B", "C"         → any of these strings
< 18, > 65            → outside the range 18-65
1, [5..10], 20        → value 1, or 5 through 10, or 20
```

## Negation

```
not(5)          → ? ≠ 5
not([1..10])    → ? outside 1..10
not("A","B")    → ? is not "A" or "B"
```

## Any value

```
-    → always matches (wildcard)
```

## Context references

Unary tests can reference variables from the context:

```ts
unaryTest('> threshold', { '?': 10, threshold: 5 }).value  // true
```

## Null semantics

- `null` input against any non-null test: `null` (indeterminate)
- `null` input against `null` test: `true`
