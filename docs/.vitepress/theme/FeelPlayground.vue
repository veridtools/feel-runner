<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { evaluate, unaryTest } from '../../../src/index.ts';

// ── Quick examples ────────────────────────────────────────────────────────────

const EXAMPLES = [
  // ── Language features ──────────────────────────────────────────────────────
  { label: 'Arithmetic', expr: '(1 + 2) * 3 - 4 / 2', ctx: '', mode: 'eval' as const },
  { label: 'Decimal128', expr: '0.1 + 0.2 = 0.3', ctx: '', mode: 'eval' as const },
  { label: 'String', expr: 'upper case("hello world")', ctx: '', mode: 'eval' as const },
  { label: 'List filter', expr: '[1,2,3,4,5][item > 3]', ctx: '', mode: 'eval' as const },
  {
    label: 'If-else',
    expr: 'if score >= 700 then "approved" else "declined"',
    ctx: '{"score":750}',
    mode: 'eval' as const,
  },
  { label: 'For loop', expr: 'for x in 1..5 return x * x', ctx: '', mode: 'eval' as const },
  { label: 'Some', expr: 'some x in [1,2,3] satisfies x > 2', ctx: '', mode: 'eval' as const },
  {
    label: 'Every',
    expr: 'every x in [2, 4, 6] satisfies x mod 2 = 0',
    ctx: '',
    mode: 'eval' as const,
  },
  {
    label: 'Let',
    expr: 'let base = 100 in\nlet tax  = base * 0.1 in\nbase + tax',
    ctx: '',
    mode: 'eval' as const,
  },
  {
    label: 'Function',
    expr: '(function(a, b) a * b)(6, 7)',
    ctx: '',
    mode: 'eval' as const,
  },
  {
    label: 'Pipeline',
    expr: '"  Hello World  " |> trim |> lower case |> upper case',
    ctx: '',
    mode: 'eval' as const,
  },
  // ── Temporal ──────────────────────────────────────────────────────────────
  { label: 'Date', expr: 'date("2024-06-15").month', ctx: '', mode: 'eval' as const },
  { label: 'Duration', expr: 'duration("P1Y2M").years', ctx: '', mode: 'eval' as const },
  {
    label: 'Date math',
    expr: 'date("2024-01-31") + duration("P1M")',
    ctx: '',
    mode: 'eval' as const,
  },
  {
    label: 'Format date',
    expr: 'format date(date("2024-01-18"), "dd/MM/yyyy")',
    ctx: '',
    mode: 'eval' as const,
  },
  {
    label: 'Format number',
    expr: 'format number(1234567.89, "#,##0.00", "pt-BR")',
    ctx: '',
    mode: 'eval' as const,
  },
  // ── Unary tests ───────────────────────────────────────────────────────────
  { label: 'Unary: range', expr: '[100..999]', ctx: '{"?":500}', mode: 'unary' as const },
  { label: 'Unary: list', expr: '"A","B","C"', ctx: '{"?":"B"}', mode: 'unary' as const },
  { label: 'Unary: not', expr: 'not([1..10])', ctx: '{"?":15}', mode: 'unary' as const },
  // ── Builtins ──────────────────────────────────────────────────────────────
  { label: 'Builtins', expr: 'sum([1,2,3]) + count([4,5])', ctx: '', mode: 'eval' as const },
  {
    label: 'Context',
    expr: '{name: "Alice", age: 30}',
    ctx: '',
    mode: 'eval' as const,
  },
  // ── Warnings & errors ─────────────────────────────────────────────────────
  {
    label: '⚠ Undefined var',
    expr: 'price * 2',
    ctx: '',
    mode: 'eval' as const,
  },
  {
    label: '⚠ Div by zero',
    expr: '10 / 0',
    ctx: '',
    mode: 'eval' as const,
  },
  {
    label: '⚠ error()',
    expr: 'if score < 0 then error("score must be non-negative") else score',
    ctx: '{"score":-5}',
    mode: 'eval' as const,
  },
  {
    label: '⚠ Type mismatch',
    expr: '"hello" + 42',
    ctx: '',
    mode: 'eval' as const,
  },
  {
    label: '⚠ Arg error',
    expr: 'abs(1, 2)',
    ctx: '',
    mode: 'eval' as const,
  },
  {
    label: '⚠ assert()',
    expr: 'assert(score >= 0, "score must be non-negative")',
    ctx: '{"score":-1}',
    mode: 'eval' as const,
  },
] as const;

// ── State ─────────────────────────────────────────────────────────────────────

const activeExample = ref<string>(EXAMPLES[0].label);
const expression = ref(EXAMPLES[0].expr);
const contextStr = ref(EXAMPLES[0].ctx);
const mode = ref<'eval' | 'unary'>(EXAMPLES[0].mode);
const result = ref<string | null>(null);
const error = ref<string | null>(null);
const ran = ref(false);

function run() {
  error.value = null;
  result.value = null;
  ran.value = true;

  let ctx: Record<string, unknown> = {};
  if (contextStr.value.trim()) {
    try {
      ctx = JSON.parse(contextStr.value);
    } catch {
      error.value = 'Invalid JSON in context';
      return;
    }
  }

  try {
    const r =
      mode.value === 'unary'
        ? unaryTest(expression.value, ctx as Record<string, never>)
        : evaluate(expression.value, ctx as Record<string, never>);
    if (r.warnings.length > 0) {
      result.value = JSON.stringify({ value: r.value, warnings: r.warnings }, null, 2);
    } else {
      result.value = JSON.stringify(r.value, null, 2);
    }
  } catch (e) {
    error.value = String(e);
  }
}

// biome-ignore lint/correctness/noUnusedVariables: called from Vue template
function loadExample(ex: (typeof EXAMPLES)[number]) {
  activeExample.value = ex.label;
  expression.value = ex.expr;
  contextStr.value = ex.ctx;
  mode.value = ex.mode;
  run();
}

onMounted(() => run());
</script>

<template>
  <div class="feel-playground">

    <div class="examples">
      <span class="examples-label">Quick examples:</span>
      <button
        v-for="ex in EXAMPLES"
        :key="ex.label"
        class="example-btn"
        :class="{ active: activeExample === ex.label }"
        @click="loadExample(ex)"
      >{{ ex.label }}</button>
    </div>

    <div class="input-group">
      <label class="input-label">FEEL Expression</label>
      <textarea
        v-model="expression"
        class="expr-input"
        rows="3"
        placeholder="e.g. sum([1,2,3]) * 2"
        @keydown.ctrl.enter="run"
        @keydown.meta.enter="run"
        spellcheck="false"
      />
    </div>

    <div class="input-group">
      <label class="input-label">
        Context (JSON)
        <span class="label-hint">
          {{ mode === 'unary' ? '— must include "?" key' : '— optional variables' }}
        </span>
      </label>
      <textarea
        v-model="contextStr"
        class="ctx-input"
        rows="2"
        placeholder='e.g. {"price": 10, "qty": 5}'
        spellcheck="false"
      />
    </div>

    <button class="run-btn" @click="run">
      ▶ Run <span class="kbd">Ctrl+Enter</span>
    </button>

    <div v-if="ran" class="output">
      <div v-if="error" class="output-error">{{ error }}</div>
      <pre v-else class="output-value">{{ result }}</pre>
    </div>

  </div>
</template>

<style scoped>
.feel-playground {
  padding: 1.5rem 0;
}

.examples {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 1.2rem;
  align-items: center;
}

.examples-label {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  margin-right: 4px;
  white-space: nowrap;
}

.example-btn {
  padding: 3px 10px;
  font-size: 0.78rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: background 0.15s;
}

.example-btn:hover {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
}

.example-btn.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.input-group {
  margin-bottom: 0.8rem;
}

.input-label {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin-bottom: 4px;
}

.label-hint {
  font-weight: 400;
  color: var(--vp-c-text-3);
}

.expr-input,
.ctx-input {
  width: 100%;
  padding: 10px 12px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.9rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  color: var(--vp-c-text-1);
  resize: vertical;
  box-sizing: border-box;
}

.expr-input:focus,
.ctx-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.run-btn {
  padding: 8px 22px;
  background: var(--vp-c-brand-1);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 1rem;
}

.run-btn:hover {
  background: var(--vp-c-brand-2);
}

.dark .run-btn {
  background: color-mix(in srgb, var(--vp-c-brand-1) 55%, black 45%);
}

.dark .run-btn:hover {
  background: color-mix(in srgb, var(--vp-c-brand-1) 65%, black 35%);
}

.kbd {
  font-size: 0.75rem;
  opacity: 0.7;
  font-weight: 400;
}

.output {
  margin-top: 0.5rem;
}

.output-error {
  background: #fee2e2;
  color: #b91c1c;
  padding: 12px 16px;
  border-radius: 8px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.85rem;
}

.output-value {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  padding: 12px 16px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.88rem;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
</style>
