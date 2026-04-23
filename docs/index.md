---
layout: home

hero:
  name: "@veridtools/feel-runner"
  text: FEEL expression engine for DMN 1.5
  tagline: Zero dependencies. Decimal128 precision. 5000+ tests. Full OMG conformance.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Playground
      link: /playground
    - theme: alt
      text: API Reference
      link: /api/reference

features:
  - icon: ⚡
    title: Zero dependencies
    details: Only decimal.js — no runtime overhead, no transitive CVEs. Ships as ESM + CJS.

  - icon: 🎯
    title: Full DMN 1.5 FEEL
    details: Arithmetic, strings, temporal types, durations, ranges, contexts, lists, quantified expressions, for-loops, and all 80+ standard builtins.

  - icon: 🔢
    title: Decimal128 precision
    details: 0.1 + 0.2 = 0.3, exactly. Financial-grade arithmetic using IEEE 754 Decimal128 throughout.

  - icon: 🧪
    title: Exhaustively tested
    details: 5000+ tests covering every builtin, every edge case, temporal arithmetic, null propagation, and type coercion.

  - icon: 🕐
    title: Temporal-complete
    details: date, time, date and time, duration — with timezone support, leap year validation, and ISO 8601 formatting.

  - icon: 🔌
    title: Drop-in ready
    details: A single evaluate() function. Pass a FEEL expression and an optional context object. Get a typed value back.
---
