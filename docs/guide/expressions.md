# Expressions

## Arithmetic

All arithmetic uses IEEE 754 Decimal128 — no floating-point surprises.

```feel
1 + 2 * 3         // 7
10 / 4            // 2.5
0.1 + 0.2         // 0.3 (exact!)
2 ** 10           // 1024
-(3 + 2)          // -5
```

Division by zero returns `null`.

## Strings

```feel
"hello" + " world"          // "hello world"
upper case("hello")         // "HELLO"
substring("hello", 2, 3)    // "ell"
string length("café")       // 4 (Unicode code points)
```

## Comparisons

```feel
3 > 2             // true
1 = 1.0           // true (integer = decimal)
"a" < "b"         // true (lexicographic)
null = null       // true
null > 1          // null (undefined ordering)
```

## Boolean

```feel
true and false    // false
true or false     // true
not(true)         // false
```

## If-then-else

```feel
if score >= 700 then "approved" else "declined"
```

## Between

```feel
5 between 1 and 10    // true
"b" between "a" and "c"  // true
```

## In expression

```feel
3 in [1, 2, 3]        // true
"A" in ["A", "B"]     // true
5 in [1..10]          // true
5 in (1..5)           // false (exclusive)
```

## Path expressions

```feel
{name: "Alice", age: 30}.name    // "Alice"
[{a:1},{a:2},{a:3}].a            // [1, 2, 3]
```

## Filter expressions

```feel
[1, 2, 3, 4, 5][item > 3]               // [4, 5]
[{a:1},{a:2},{a:3}][a > 1]              // [{a:2},{a:3}]
["a","bb","ccc"][string length(item)>1]  // ["bb","ccc"]
```

## For expressions

```feel
for x in [1,2,3] return x * 2          // [2, 4, 6]
for x in 1..5 return x * x             // [1, 4, 9, 16, 25]
for x in [1,2], y in [10,20] return x+y // [11, 21, 12, 22]
```

## Quantified expressions

```feel
some x in [1,2,3] satisfies x > 2           // true
every x in [2,4,6] satisfies even(x)        // true
some x in [1,2], y in [3,4] satisfies x+y=5 // true
```

## Function definitions

```feel
(function(x) x * 2)(5)    // 10
(function(a, b) a + b)(3, 4)  // 7
```

Functions defined in contexts can call themselves recursively:

```feel
{
  fact: function(n) if n <= 1 then 1 else n * fact(n - 1),
  result: fact(5)
}.result
// 120
```

## Let expressions

Bind a local variable for use within a scoped body expression. `let` bindings are not visible outside their body.

```feel
let x = 5 in x + 1                          // 6
let rate = 0.1 in 1000 * rate               // 100
let monthly = annual / 12 in monthly * 3    // (requires annual in context)
```

Bindings can be chained — each binding sees the previous ones:

```feel
let base = 100 in
let tax  = base * 0.1 in
base + tax
// 110
```

Functions can be bound too:

```feel
let double = function(n) n * 2 in
for x in [1, 2, 3] return double(x)
// [2, 4, 6]
```

::: tip Use case
`let` makes complex expressions readable by naming intermediate results — like local variables in a programming language.
:::

## Pipeline operator (`|>`)

Chains operations left-to-right. The left value becomes the first argument of the right function.

```feel
"hello" |> upper case           // "HELLO"
[1, 2, 3] |> count              // 3
[1, 2, 3] |> sum                // 6
[1, 2, 3] |> reverse            // [3, 2, 1]
```

Use `?` as an explicit slot when you need to pass the value to a non-first argument:

```feel
"hello world" |> substring(?, 1, 5)   // "hello"
"hello" |> contains(?, "ell")         // true
```

Pipelines chain naturally:

```feel
"  Hello World  " |> trim |> lower case |> upper case
// "HELLO WORLD"

"hello" |> upper case |> substring(?, 1, 3)
// "HEL"
```

Arithmetic executes before `|>`:

```feel
1 + 2 |> string     // "3"  (same as string(1 + 2))
```

::: tip Use case
`|>` is ideal for data transformation pipelines — applying a sequence of string or list operations without deeply nested function calls.
:::

## Instance of

```feel
1 instance of number         // true
"hello" instance of string   // true
[1,2] instance of list<number>  // true
null instance of Null        // true
1 instance of Any            // true
```
