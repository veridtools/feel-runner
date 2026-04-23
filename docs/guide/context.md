# Context & Variables

## Passing variables

Variables are passed as a plain JavaScript object to `evaluate()` or `unaryTest()`:

```ts
evaluate('price * quantity', { price: 10, quantity: 5 }).value  // 50
```

Numbers are automatically converted to Decimal128 for precision. Dates, times, durations, and contexts should be passed in their FEEL object form (or as strings that get parsed):

```ts
evaluate('x.year', { x: { kind: 'date', year: 2024, month: 1, day: 15 } })
```

## Context literals

Contexts are FEEL's equivalent of objects/records:

```feel
{ name: "Alice", age: 30 }
{ a: 1, b: a + 1 }          // later entries can reference earlier ones
```

## Context operations

```feel
{a: 1}.a                     // 1
{a: {b: 42}}.a.b             // 42
get value({a: 1}, "a")       // 1
get entries({a: 1, b: 2})    // [{key:"a",value:1},{key:"b",value:2}]
context put({a: 1}, "b", 2)  // {a:1, b:2}
context merge([{a:1},{b:2}]) // {a:1, b:2}
```

## Computed keys

Context keys can be computed expressions in brackets:

```feel
{ ["x" + "y"]: 99 }.xy         // 99
{ [upper case("key")]: 7 }.KEY  // 7
```

## Path on lists

Accessing a property on a list of contexts returns a list of values:

```feel
[{a:1},{a:2},{a:3}].a           // [1, 2, 3]
[{a:1},{b:2}].a                  // [1, null]
```

## Null handling

Missing keys return `null`, not an error:

```feel
{a: 1}.z    // null
```

Deeply nested null-safe access:

```feel
{a: {b: null}}.a.b    // null (no error)
```

## Functions in contexts

Functions can be stored in contexts and called by name:

```feel
{
  greet: function(name) "Hello " + name,
  result: greet("Alice")
}.result
// "Hello Alice"
```

Self-recursive functions work because each entry is in scope for all subsequent entries:

```feel
{
  fact: function(n) if n <= 1 then 1 else n * fact(n - 1),
  result: fact(10)
}.result
// 3628800
```
