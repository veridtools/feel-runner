---
title: Playground
editLink: false
lastUpdated: false
---

# Playground

Type any FEEL expression and evaluate it in real-time. Use the quick examples to explore the language.

<FeelPlayground />

---

## Reading the output

| Field | Description |
|---|---|
| value | The evaluated FEEL value, serialized to JSON |
| warnings | List of non-fatal issues (e.g. undefined variable, unknown function) |

## Context JSON

Variables are passed as a JSON object. In **unaryTest** mode, the input value must be under the `"?"` key:

```json
{ "?": 42 }
```

For regular expressions, any key becomes a variable:

```json
{ "price": 10, "qty": 5 }
```

## Keyboard shortcut

Press **Ctrl+Enter** (or **⌘+Enter** on Mac) inside any input field to run the expression.
