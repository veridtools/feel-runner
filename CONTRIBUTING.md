# Contributing to @veridtools/feel-runner

## Setup

```bash
git clone https://github.com/veridtools/feel-runner.git
cd feel-runner
pnpm install
```

## Dev commands

| Command | Description |
|---------|-------------|
| `pnpm build` | Compile TypeScript → `dist/` (library + CLI) |
| `pnpm dev` | Watch mode build |
| `pnpm test` | Run all tests with Vitest |
| `pnpm test:watch` | Tests in watch mode |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm docs:dev` | Start Vitepress dev server |
| `pnpm docs:build` | Build docs site |

## Making changes

1. Branch from `main`: `git checkout -b feat/my-change`
2. Make changes — test files live in `tests/` mirroring `src/` structure
3. Run `pnpm test` and `pnpm typecheck` to verify
4. Create a changeset: `pnpm changeset`
5. Open a PR against `main`

> For docs-only or chore PRs, add `[skip changeset]` to the PR title.

## Architecture

```
src/
  types.ts                   → all public TypeScript types (FeelValue, EvaluationResult, etc.)
  index.ts                   → public API: evaluate, unaryTest, parse, compile, validate, explain
  decimal.ts                 → Decimal.js wrapper for arbitrary-precision numbers
  validate.ts                → static expression validation without evaluation
  explain.ts                 → expression explanation / introspection
  lexer/
    index.ts                 → tokenizer: FEEL source → token stream
  parser/
    ast.ts                   → AST node types
    constants.ts             → keywords, operators, precedences
    index.ts                 → parser: token stream → AST
  evaluator/
    index.ts                 → evalExpression: AST + context → EvaluationResult
    equality.ts              → FEEL equality semantics
    instance-of.ts           → instance of / type checks
    types.ts                 → evaluator-internal types
  builtins/
    registry.ts              → built-in function registry
    arithmetic.ts            → math functions (abs, floor, ceiling, etc.)
    boolean.ts               → boolean functions (and, or, not)
    context.ts               → context functions (get value, put, merge, etc.)
    conversion.ts            → type conversion functions
    list.ts                  → list functions (count, append, flatten, etc.)
    numeric.ts               → numeric functions (decimal, round, etc.)
    range.ts                 → range functions (before, after, within, etc.)
    string.ts                → string functions (substring, contains, matches, etc.)
    temporal.ts              → date/time built-ins
    misc.ts                  → miscellaneous (sort, nn-all, nn-any, etc.)
  cache/
    index.ts                 → compiled expression cache (parse once, evaluate many)
  temporal/
    index.ts                 → date, time, date and time parsers
    duration.ts              → duration parser (years-months and days-time)
    arithmetic.ts            → temporal arithmetic
    calendar.ts              → calendar helpers
    custom-format.ts         → custom date/time format support
    format.ts                → temporal formatting
    parse.ts                 → low-level temporal parsing
bin/
  feel-runner.ts             → CLI entry point
tests/
  feel/                      → unit tests mirroring src/ structure
  conformance/               → OMG TCK conformance test cases
docs/                        → Vitepress documentation
```

## Adding a new built-in function

1. Implement in the relevant file under `src/builtins/` (or add a new file)
2. Register in `src/builtins/registry.ts`
3. Add tests in `tests/feel/builtins/`

## Adding a new FEEL type

1. Add the interface in `src/types.ts` with a `kind` discriminant
2. Handle it in `src/evaluator/index.ts`
3. Add equality semantics in `src/evaluator/equality.ts` if needed
4. Add instance-of check in `src/evaluator/instance-of.ts`
5. Add tests in `tests/feel/`

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add support for FEEL 1.5 string join function
fix: correct month arithmetic for date and time addition
docs: update conformance coverage badge
chore: bump decimal.js
```

## Release flow

Releases are automated via [Changesets](https://github.com/changesets/changesets):

1. Each PR that changes source or behavior must include a changeset (`pnpm changeset`)
2. When PRs merge to `main`, a **Version Packages** PR is opened automatically
3. Merging that PR triggers an npm publish via GitHub Actions
