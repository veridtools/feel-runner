# Temporal Types

FEEL has rich support for dates, times, durations, and calendar operations — all fully compliant with DMN 1.5 and ISO 8601.

## Date

```feel
date("2024-01-15")           // from string (ISO 8601)
date(2024, 1, 15)            // from year, month, day
date(date and time("2024-01-15T10:30:00"))  // extract from datetime
```

### Parsing with custom format

When the input string isn't in ISO format, pass a format pattern as a second argument:

```feel
date("18.01.2024",  "dd.MM.yyyy")     // 2024-01-18
date("26/08/2024",  "dd/MM/yyyy")     // 2024-08-26
date("01-18-2024",  "MM-dd-yyyy")     // 2024-01-18  (US format)
date("5/3/2024",    "d/M/yyyy")       // 2024-03-05  (no zero-padding)
date("18.01.24",    "dd.MM.yy")       // 2024-01-18  (2-digit year: 00–49 → 2000+, 50–99 → 1900+)
date("18 January 2024", "d MMMM yyyy")  // 2024-01-18  (full month name)
date("18 Jan 2024",     "d MMM yyyy")   // 2024-01-18  (abbreviated)
```

Month names are auto-detected across supported locales (EN, PT, ES, DE, FR, IT, NL):

```feel
date("18 de Janeiro de 2024", "dd 'de' MMMM 'de' yyyy")  // 2024-01-18 (pt-BR)
date("18 Januar 2024",        "dd MMMM yyyy")             // 2024-01-18 (de)
```

**Format tokens:**

| Token | Meaning | Example |
|---|---|---|
| `yyyy` | 4-digit year | `2024` |
| `yy` | 2-digit year | `24` → 2024 |
| `MMMM` | Full month name | `January` |
| `MMM` | Abbreviated month | `Jan` |
| `MM` | 2-digit month | `01` |
| `M` | Month without padding | `1` |
| `dd` | 2-digit day | `05` |
| `d` | Day without padding | `5` |
| `HH` | 24h hour | `14` |
| `hh` / `h` | 12h hour | `02` / `2` |
| `mm` | Minutes | `30` |
| `ss` | Seconds | `00` |
| `a` | AM/PM | `PM` |
| `'text'` | Literal text | `'de'` → `de` |

Invalid dates (e.g. Feb 30, April 31) return `null`.



**Properties:**

```feel
date("2024-01-15").year      // 2024
date("2024-01-15").month     // 1
date("2024-01-15").day       // 15
date("2024-01-15").weekday   // 1 (Monday=1)
```

Invalid dates (e.g. Feb 29 in non-leap year, April 31) return `null`.

## Time

```feel
time("10:30:00")              // simple time (ISO 8601)
time("10:30:00+02:00")        // with UTC offset
time("10:30:00@Europe/Paris") // with timezone name
time(10, 30, 0)               // from hour, minute, second
```

### Parsing with custom format

```feel
time("14h30",   "HH'h'mm")    // 14:30
time("09:30:45","HH:mm:ss")   // 09:30:45
time("9:30 AM", "h:mm a")     // 09:30 (12h AM)
time("2:30 PM", "h:mm a")     // 14:30 (12h PM)
time("12:00 AM","hh:mm a")    // 00:00 (midnight)
time("12:00 PM","hh:mm a")    // 12:00 (noon)
```

**Properties:**

```feel
time("10:30:15").hour         // 10
time("10:30:15").minute       // 30
time("10:30:15").second       // 15
time("10:30:00@UTC").time zone      // "UTC"
time("10:30:00+02:00").time offset  // duration("PT2H")
```

## Date and Time

```feel
date and time("2024-01-15T10:30:00")                     // ISO 8601
date and time("2024-01-15T10:30:00+02:00")               // with offset
date and time("2024-01-15T10:30:00@Europe/Paris")         // with timezone
date and time(date("2024-01-15"), time("10:30:00"))       // from parts
```

### Parsing with custom format

```feel
date and time("26/08/2024 14:30", "dd/MM/yyyy HH:mm")
// 2024-08-26T14:30:00
```

**Properties:**

```feel
dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second
dt.date    // extracts date part as date value
dt.time    // extracts time part as time value
dt.offset  // UTC offset as day-time duration, or null
dt.time zone  // timezone name string, or null
```

## Duration

```feel
duration("P1Y2M")      // 1 year, 2 months (year-month)
duration("P1DT2H30M")  // 1 day, 2 hours, 30 minutes (day-time)
duration("PT30S")      // 30 seconds
duration("-P1D")       // negative duration
```

**Properties:**

```feel
duration("P1Y2M").years     // 1
duration("P1Y2M").months    // 2
duration("P1DT2H").days     // 1
duration("P1DT2H").hours    // 2
```

## Arithmetic

```feel
date("2024-01-15") + duration("P1M")    // 2024-02-15
date("2024-01-15") - date("2024-01-01") // PT336H (day-time duration)
date("2024-01-31") + duration("P1M")    // 2024-02-29 (clamped to Feb 28/29)

duration("P1Y") + duration("P6M")       // P1Y6M
duration("P3D") * 2                      // P6D
duration("P6D") / 2                      // P3D
duration("P3D") / duration("P1D")        // 3 (number)
```

::: warning Incompatible duration types
`duration("P1Y") + duration("P1D")` returns `null` — year-month and day-time durations cannot be mixed.
:::

## Calendar functions

```feel
day of week(date("2024-01-15"))    // "Monday"
month of year(date("2024-03-01"))  // "March"
day of year(date("2024-02-29"))    // 60
week of year(date("2024-01-01"))   // 1
```

## Years and months duration

```feel
years and months duration(date("2020-01-01"), date("2024-06-01"))
// P4Y5M
```

## Now and today

```feel
today()   // current date
now()     // current date and time
```

## Cross-timezone comparison

Date and time values with different timezones are compared by converting to UTC:

```feel
date and time("2024-01-01T10:00:00+02:00") = date and time("2024-01-01T08:00:00Z")
// true
```

## Formatting temporal values

Convert dates, times, and datetimes back to strings using a custom pattern.

### format date

```feel
format date(date("2024-01-18"), "dd/MM/yyyy")              // "18/01/2024"
format date(date("2024-01-05"), "d/M/yyyy")                // "5/1/2024"
format date(date("2024-01-18"), "MMMM d, yyyy")            // "January 18, 2024"
format date(date("2024-01-18"), "MMM dd, yyyy")            // "Jan 18, 2024"
```

With locale for localized month names:

```feel
format date(date("2024-01-18"), "dd 'de' MMMM 'de' yyyy", "pt-BR")
// "18 de Janeiro de 2024"

format date(date("2024-01-18"), "dd. MMMM yyyy", "de")
// "18. Januar 2024"
```

Also accepts `date and time` values (extracts the date part):

```feel
format date(date and time("2024-03-15T10:30:00"), "dd/MM/yyyy")
// "15/03/2024"
```

### format time

```feel
format time(time("14:30:00"), "HH:mm")      // "14:30"
format time(time("14:30:00"), "h:mm a")     // "2:30 PM"
format time(time("09:05:00"), "h:mm a")     // "9:05 AM"
format time(time("00:00:00"), "hh:mm a")    // "12:00 AM"  (midnight)
format time(time("12:00:00"), "hh:mm a")    // "12:00 PM"  (noon)
format time(time("09:05:03"), "HH:mm:ss")   // "09:05:03"
```

### format date and time

```feel
format date and time(date and time("2024-08-26T14:30:00"), "dd/MM/yyyy HH:mm")
// "26/08/2024 14:30"

format date and time(date and time("2024-01-18T14:30:00"), "MMMM d, yyyy 'at' h:mm a")
// "January 18, 2024 at 2:30 PM"
```

## Last day of month

```feel
last day of month(date("2024-02-01"))  // 29  (2024 is a leap year)
last day of month(date("2023-02-01"))  // 28
last day of month(date("2024-01-15"))  // 31
```

Works with `date and time` values too.

## Unix timestamps

Convert between `date and time` and Unix epoch seconds (seconds since 1970-01-01T00:00:00Z):

```feel
from unix timestamp(0)                                       // date and time("1970-01-01T00:00:00Z")
from unix timestamp(1686327521)                              // date and time("2023-06-09T16:18:41Z")
to unix timestamp(date and time("2023-06-09T16:18:41Z"))    // 1686327521
to unix timestamp(date("1970-01-01"))                        // 0
```

