# Built-in Functions

All 80+ standard DMN 1.5 built-in functions are supported, plus a set of practical extensions.

## Conversion

| Function | Description |
|---|---|
| `string(value)` | Convert any value to string |
| `string(number, picture)` | Format number with XPath 2.0 picture mask |
| `number(string, groupSep?, decSep?)` | Parse string to number |
| `string join(list, delimiter?, prefix?, suffix?)` | Join string list |

```feel
string(42)                     // "42"
string(1234.5, "##,##0.00")    // "1,234.50"
string(7, "000")               // "007"
string(0.1234, "0.00%")        // "12.34%"
number("1,234.56", ",", ".")   // 1234.56
string join(["a","b","c"], "-")  // "a-b-c"
```

## String

| Function | Description |
|---|---|
| `string length(string)` | Unicode code-point length |
| `substring(string, start, length?)` | 1-based, supports negative start |
| `substring before(string, match)` | Text before first match |
| `substring after(string, match)` | Text after first match |
| `upper case(string)` | Uppercase |
| `lower case(string)` | Lowercase |
| `trim(string)` | Strip whitespace |
| `contains(string, match)` | Substring check |
| `starts with(string, match)` | Prefix check |
| `ends with(string, match)` | Suffix check |
| `matches(input, pattern, flags?)` | XPath 2.0 regex match |
| `replace(input, pattern, replacement, flags?)` | Regex replace |
| `split(string, delimiter)` | Split by regex |
| `extract(input, pattern)` | Find all regex matches |
| `pad left(string, length, char?)` | Left-pad string |
| `pad right(string, length, char?)` | Right-pad string |
| `encode for URI(string)` | URI encode |
| `decode for URI(string)` | URI decode |
| `is blank(string)` | `true` if null, empty, or whitespace-only |
| `to base64(string)` | Base64-encode a string |
| `from base64(string)` | Base64-decode a string |
| `string format(template, args...)` | Interpolate `{}` placeholders in order |
| `to json(value)` | Serialize any FEEL value to a JSON string |
| `from json(string)` | Parse a JSON string into a FEEL value |

## Numeric

| Function | Description |
|---|---|
| `decimal(n, scale)` | Round to scale (HALF_EVEN/banker's rounding) |
| `floor(n, scale?)` | Round toward −∞ |
| `ceiling(n, scale?)` | Round toward +∞ |
| `round up(n, scale)` | Round away from zero |
| `round down(n, scale)` | Round toward zero |
| `round half up(n, scale)` | Round 0.5 away from zero |
| `round half down(n, scale)` | Round 0.5 toward zero |
| `abs(n)` | Absolute value (works on durations too) |
| `modulo(dividend, divisor)` | Modulo (result has sign of divisor) |
| `sqrt(number)` | Square root |
| `log(number)` | Natural logarithm |
| `exp(number)` | e^n |
| `odd(number)` | Is odd integer? |
| `even(number)` | Is even integer? |
| `random number()` | Random in [0, 1) |

## List

| Function | Description |
|---|---|
| `list contains(list, element)` | Membership test |
| `count(list)` | Number of elements |
| `min(list)` | Minimum value |
| `max(list)` | Maximum value |
| `sum(list)` | Sum of numbers |
| `mean(list)` | Arithmetic mean |
| `median(list)` | Middle value |
| `stddev(list)` | Sample standard deviation |
| `mode(list)` | Most frequent value(s) |
| `product(list)` | Product of numbers |
| `all(list)` | All truthy? |
| `any(list)` | Any truthy? |
| `append(list, item...)` | Add items |
| `concatenate(list...)` | Merge lists |
| `insert before(list, pos, item)` | Insert at position |
| `remove(list, pos)` | Remove at position |
| `reverse(list)` | Reverse order |
| `index of(list, match)` | All positions of match |
| `sublist(list, start, length?)` | Slice |
| `flatten(list)` | Deep flatten |
| `distinct values(list)` | Remove duplicates |
| `duplicate values(list)` | Values that appear more than once |
| `union(list...)` | Merge with deduplication |
| `sort(list, comparator?)` | Sort |
| `list replace(list, pos/fn, value)` | Replace by position or predicate |
| `is empty(list)` | `true` if null or empty list |
| `partition(list, size)` | Split into fixed-size sublists |

## Context

| Function | Description |
|---|---|
| `get value(context, key)` | Get value by key string |
| `get entries(context)` | List of `{key, value}` entries |
| `context(entries)` | Build context from entry list |
| `context put(context, key, value)` | Add/overwrite key |
| `context merge(list)` | Merge context list |

## Null / Error handling

| Function | Description |
|---|---|
| `get or else(value, default)` | Return `value` if non-null, otherwise `default` |
| `error(message)` | Return null and emit an `EXPLICIT_ERROR` warning |
| `assert(condition, message)` | Return `true` or null + `ASSERTION_FAILED` warning |

```feel
get or else(null, "fallback")          // "fallback"
get or else(42, 0)                     // 42

if score < 0 then error("score negative") else score * 1.5

assert(x > 0, "x must be positive")   // null + warning when x <= 0
```

## Misc

| Function | Description |
|---|---|
| `uuid()` | Generate a UUID v4 string |

## Boolean

| Function | Description |
|---|---|
| `is(value1, value2)` | Structural equality (same type and value) |

## Range

`before`, `after`, `meets`, `met by`, `overlaps`, `overlaps before`, `overlaps after`, `includes`, `during`, `starts`, `started by`, `finishes`, `finished by`, `coincides`

## Number formatting

`format number(n, picture, locale?)` formats a number using an XPath 2.0-style picture mask.

```feel
format number(1234.56,    "#,##0.00")          // "1,234.56"
format number(42,         "000")               // "042"
format number(0.1234,     "0.00%")             // "12.34%"
format number(1234.56,    "$#,##0.00")         // "$1,234.56"
format number(1000000,    "#,##0")             // "1,000,000"
format number(42.7,       "0")                 // "43"  (rounded)
format number(1.5,        "0.##")              // "1.5"  (# = optional digit)
```

With a locale, the decimal/grouping separators are swapped for comma-decimal conventions (pt-BR, de, fr, es, it…):

```feel
format number(1234567.89, "#,##0.00", "pt-BR") // "1.234.567,89"
format number(1234.56,    "#,##0.00", "de")    // "1.234,56"
format number(1234.56,    "#,##0.00", "en-US") // "1,234.56"
```

Negative numbers prepend `-` automatically (or use a semicolon to provide an explicit negative subpicture):

```feel
format number(-1234.56, "#,##0.00")            // "-1,234.56"
format number(-1234.56, "#,##0.00;(#,##0.00)") // "(1,234.56)"
```

## Temporal

See [Temporal](/guide/temporal) for full reference including `format date`, `format time`, and `format date and time`.
