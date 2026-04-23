/**
 * Generates compact, hardcoded test files from:
 *  - tests/conformance/data/  (OMG TCK XML/DMN)
 *  - @veridtools/dmn-fixtures  (DMN+JSON fixture pairs)
 *
 * Key optimization: the CHAIN of decisions is shared across test cases per group,
 * so only inputs + assertions are repeated per test case.
 *
 * Run with: tsx scripts/gen-tck.ts
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG, loadFixture } from '@veridtools/dmn-fixtures';
import { XMLParser } from 'fast-xml-parser';
import { isDecimal } from '../src/decimal.js';
import { formatDuration, parseDuration } from '../src/temporal/duration.js';
import { formatDate, formatDateTime, formatTime } from '../src/temporal/format.js';
import { parseDate, parseDateTime, parseTime } from '../src/temporal/index.js';
import type { FeelValue } from '../src/types.js';
import {
  isDayTimeDuration,
  isFeelContext,
  isFeelDate,
  isFeelDateTime,
  isFeelRange,
  isFeelTime,
  isYearMonthDuration,
} from '../src/types.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const CONFORMANCE_ROOT = join(ROOT, 'tests/conformance/data');
const TCK_OUT = join(ROOT, 'tests/tck');
const FIX_OUT = join(ROOT, 'tests/fixtures');

const SKIP_GROUPS = new Set([
  '0021-singleton-list',
  '0082-feel-coercion',
  '0085-decision-services',
  '0089-nested-inputdata-imports',
  '0091-local-hrefs',
]);

// ── XML parsers ───────────────────────────────────────────────────────────────
const dmnParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  removeNSPrefix: true,
  isArray: (tag) =>
    [
      'decision',
      'inputData',
      'informationRequirement',
      'requiredDecision',
      'businessKnowledgeModel',
      'itemDefinition',
    ].includes(tag),
});

const testParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: false,
  removeNSPrefix: true,
  isArray: (tag) => ['testCase', 'inputNode', 'resultNode', 'component', 'item'].includes(tag),
});

const fixtureXmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  removeNSPrefix: true,
  isArray: (tag) => tag === 'inputData',
});

function toArr<T>(v: T | T[] | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

// ── Normalize (used at generation time to pre-compute expected values) ─────────
function norm(v: FeelValue): unknown {
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return v;
  if (isDecimal(v)) return Object.is(v.toNumber(), -0) ? 0 : v.toNumber();
  if (typeof v === 'number') return Object.is(v, -0) ? 0 : v;
  if (isFeelDate(v)) return formatDate(v);
  if (isFeelDateTime(v)) return formatDateTime(v);
  if (isFeelTime(v)) return formatTime(v);
  if (isYearMonthDuration(v) || isDayTimeDuration(v)) return formatDuration(v);
  if (isFeelRange(v)) {
    const s = v.startIncluded ? '[' : '(';
    const e = v.endIncluded ? ']' : ')';
    return `${s}${norm(v.start as FeelValue)}..${norm(v.end as FeelValue)}${e}`;
  }
  if (Array.isArray(v)) return (v as FeelValue[]).map(norm);
  if (isFeelContext(v))
    return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, norm(val)]));
  return v;
}

// ── XML value parsing ─────────────────────────────────────────────────────────
function xmlValueToFeel(value: Record<string, unknown>): FeelValue {
  if (value['@_nil'] === 'true' || value['@_xsi:nil'] === 'true') return null;
  const type = String(value['@_type'] ?? value['@_xsi:type'] ?? '');
  const text = String(value['#text'] ?? value.text ?? '');
  switch (type) {
    case 'xsd:string':
      return text;
    case 'xsd:boolean':
      return text === 'true';
    case 'xsd:decimal':
    case 'xsd:integer':
    case 'xsd:double':
    case 'xsd:float':
      return parseFloat(text);
    case 'xsd:date':
      return parseDate(text);
    case 'xsd:time':
      return parseTime(text);
    case 'xsd:dateTime':
      return parseDateTime(text);
    case 'xsd:duration':
    case 'xsd:yearMonthDuration':
    case 'xsd:dayTimeDuration':
      return parseDuration(text);
    default: {
      if (text === 'true') return true;
      if (text === 'false') return false;
      if (text === 'null') return null;
      const n = Number(text);
      if (!Number.isNaN(n) && text !== '') return n;
      return text || null;
    }
  }
}

function compsToCtx(node: Record<string, unknown>): FeelValue {
  const result: Record<string, FeelValue> = {};
  for (const comp of toArr(node.component as Record<string, unknown>[])) {
    const name = String(comp['@_name'] ?? '');
    result[name] = xmlNodeToFeel(comp);
  }
  return result;
}

function xmlNodeToFeel(node: Record<string, unknown>): FeelValue {
  if (node['@_xsi:nil'] === 'true') return null;
  if ('list' in node) {
    const list = node.list as Record<string, unknown> | null;
    if (!list) return [];
    return toArr(list.item).map((i) => xmlNodeToFeel(i as Record<string, unknown>));
  }
  if ('component' in node) return compsToCtx(node);
  const value = node.value as Record<string, unknown> | undefined;
  if (value) return xmlValueToFeel(value);
  if ((node.component as unknown[] | undefined)?.length) return compsToCtx(node);
  return null;
}

function parseExpected(node: Record<string, unknown>): FeelValue {
  if ('value' in node) return xmlValueToFeel(node.value as Record<string, unknown>);
  if ('list' in node) {
    const list = node.list as Record<string, unknown> | null;
    if (!list) return [];
    return toArr(list.item).map((i) => xmlNodeToFeel(i as Record<string, unknown>));
  }
  if ('component' in node) return compsToCtx(node);
  return null;
}

function parseInput(node: Record<string, unknown>): FeelValue {
  if ('value' in node) return xmlValueToFeel(node.value as Record<string, unknown>);
  if ('component' in node) return compsToCtx(node);
  if ('list' in node) {
    const list = node.list as Record<string, unknown> | null;
    if (!list) return [];
    return toArr(list.item).map((i) => parseInput(i as Record<string, unknown>));
  }
  return null;
}

// ── Code generation helpers ───────────────────────────────────────────────────

/** Does this FeelValue contain temporal types (needs parseDate/etc. in generated code)? */
function hasTemporal(v: FeelValue): boolean {
  if (isFeelDate(v) || isFeelDateTime(v) || isFeelTime(v)) return true;
  if (isYearMonthDuration(v) || isDayTimeDuration(v)) return true;
  if (Array.isArray(v)) return (v as FeelValue[]).some(hasTemporal);
  if (isFeelContext(v)) return Object.values(v as Record<string, FeelValue>).some(hasTemporal);
  return false;
}

/** Convert FeelValue to TypeScript code literal for use in generated test code. */
function toCode(v: FeelValue): string {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'number') return JSON.stringify(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (isDecimal(v)) return JSON.stringify(v.toNumber());
  if (isFeelDate(v)) return `d(${JSON.stringify(formatDate(v))})`;
  if (isFeelDateTime(v)) return `dt(${JSON.stringify(formatDateTime(v))})`;
  if (isFeelTime(v)) return `t(${JSON.stringify(formatTime(v))})`;
  if (isYearMonthDuration(v) || isDayTimeDuration(v))
    return `dur(${JSON.stringify(formatDuration(v))})`;
  if (Array.isArray(v)) return `[${(v as FeelValue[]).map(toCode).join(', ')}]`;
  if (isFeelContext(v)) {
    const entries = Object.entries(v as Record<string, FeelValue>)
      .map(([k, val]) => `${JSON.stringify(k)}: ${toCode(val)}`)
      .join(', ');
    return `{ ${entries} }`;
  }
  return 'null';
}

// ── DMN extraction ────────────────────────────────────────────────────────────
interface Decision {
  name: string;
  id: string;
  expression: string | null;
  requiredDecisionIds: string[];
}

function extractDecisions(xml: string): Decision[] {
  const doc = dmnParser.parse(xml);
  const defs = doc.definitions as Record<string, unknown>;
  if (!defs) return [];

  const bkmNames = new Set(
    toArr(defs.businessKnowledgeModel as Record<string, unknown>[])
      .map((b) => String(b['@_name'] ?? ''))
      .filter(Boolean),
  );
  const itemDefNames = new Set(
    toArr(defs.itemDefinition as Record<string, unknown>[])
      .map((i) => String(i['@_name'] ?? ''))
      .filter(Boolean),
  );

  function usesDmn(expr: string): boolean {
    for (const bkm of bkmNames) if (expr.includes(`${bkm}(`)) return true;
    for (const t of itemDefNames) {
      if (expr.includes(`instance of ${t}`) || expr.includes(`instance of list<${t}>`)) return true;
    }
    return false;
  }

  return toArr(defs.decision as Record<string, unknown>[]).map((d) => {
    const name = String(d['@_name'] ?? '');
    const id = String(d['@_id'] ?? name);
    const le = d.literalExpression as Record<string, unknown> | undefined;
    let expression: string | null = null;
    if (le) {
      const textVal = le.text;
      const raw =
        typeof textVal === 'object' && textVal !== null
          ? String((textVal as Record<string, unknown>)['#text'] ?? '').trim()
          : String(textVal ?? '').trim();
      expression = raw && !usesDmn(raw) ? raw : null;
    }
    const reqs = toArr(d.informationRequirement as Record<string, unknown>[]);
    const requiredDecisionIds = reqs
      .flatMap((r) => toArr(r.requiredDecision as Record<string, unknown>[]))
      .map((rd) => String(rd['@_href'] ?? '').replace(/^#/, ''))
      .filter(Boolean);
    return { name, id, expression, requiredDecisionIds };
  });
}

function topoSort(decisions: Decision[]): Decision[] {
  const byId = new Map(decisions.map((d) => [d.id, d]));
  const byName = new Map(decisions.map((d) => [d.name, d]));
  const visited = new Set<string>();
  const result: Decision[] = [];
  function visit(d: Decision): void {
    if (visited.has(d.id)) return;
    visited.add(d.id);
    for (const id of d.requiredDecisionIds) {
      const dep = byId.get(id) ?? byName.get(id);
      if (dep) visit(dep);
    }
    result.push(d);
  }
  for (const d of decisions) visit(d);
  return result;
}

function buildEvaluatable(decisions: Decision[]): Set<string> {
  const byId = new Map(decisions.map((d) => [d.id, d]));
  const byName = new Map(decisions.map((d) => [d.name, d]));
  const ev = new Set<string>();
  function ok(d: Decision): boolean {
    if (d.expression === null) return false;
    for (const id of d.requiredDecisionIds) {
      const dep = byId.get(id) ?? byName.get(id);
      if (!dep || !ok(dep)) return false;
    }
    return true;
  }
  for (const d of decisions) if (ok(d)) ev.add(d.name);
  return ev;
}

interface TestCase {
  id: string;
  description: string;
  inputs: Record<string, FeelValue>;
  results: Record<string, { expected: FeelValue; errorExpected: boolean }>;
}

function parseTestCases(xml: string): TestCase[] {
  const doc = testParser.parse(xml);
  const root = doc.testCases as Record<string, unknown>;
  if (!root) return [];
  return toArr(root.testCase as Record<string, unknown>[]).map((tc) => {
    const inputs: Record<string, FeelValue> = {};
    const results: Record<string, { expected: FeelValue; errorExpected: boolean }> = {};
    for (const inp of toArr(tc.inputNode as Record<string, unknown>[])) {
      const name = String(inp['@_name'] ?? '');
      if (name) inputs[name] = parseInput(inp);
    }
    for (const res of toArr(tc.resultNode as Record<string, unknown>[])) {
      const name = String(res['@_name'] ?? '');
      if (name) {
        const exp = res.expected as Record<string, unknown> | undefined;
        results[name] = {
          expected: exp ? parseExpected(exp) : null,
          errorExpected: res['@_errorResult'] === 'true',
        };
      }
    }
    return {
      id: String(tc['@_id'] ?? ''),
      description: String(tc.description ?? ''),
      inputs,
      results,
    };
  });
}

// ── Conformance file generator ────────────────────────────────────────────────
function genConformanceFile(
  group: string,
  chain: Decision[], // topoSorted, only those with expression != null
  evaluatable: Set<string>,
  testCases: TestCase[],
): string | null {
  // Filter to cases that have at least one evaluatable result
  const validCases = testCases.filter((tc) =>
    Object.keys(tc.results).some((n) => evaluatable.has(n)),
  );
  if (validCases.length === 0) return null;

  // Determine if any test case input has temporal types
  const needsTemporal = validCases.some((tc) => Object.values(tc.inputs).some(hasTemporal));

  const lines: string[] = [];
  lines.push('// Auto-generated by scripts/gen-tck.ts — do not edit manually');
  lines.push("import { describe, expect, it } from 'vitest';");
  lines.push(`import { evaluate } from '../../../src/index.js';`);
  if (needsTemporal) {
    lines.push(
      `import { parseDate, parseDateTime, parseTime } from '../../../src/temporal/index.js';`,
    );
    lines.push(`import { parseDuration } from '../../../src/temporal/duration.js';`);
  }
  lines.push(`import type { FeelValue } from '../../../src/types.js';`);
  lines.push(`import { aeq, n, type Ctx } from '../utils.js';`);
  lines.push('');
  if (needsTemporal) {
    lines.push('const d = parseDate, t = parseTime, dt = parseDateTime, dur = parseDuration;');
    lines.push('');
  }

  // Shared CHAIN — decisions in topological order
  const chainDecisions = chain.filter((d) => d.expression !== null);
  if (chainDecisions.length > 0) {
    lines.push('// Decisions evaluated in dependency order for every test case');
    lines.push('const CHAIN: [string, string][] = [');
    for (const dec of chainDecisions) {
      lines.push(`  [${JSON.stringify(dec.name)}, ${JSON.stringify(dec.expression!)}],`);
    }
    lines.push('];');
    lines.push('');
  }

  lines.push(`describe('FEEL TCK / ${group}', () => {`);

  if (chainDecisions.length > 0) {
    lines.push('  function run(inputs: Ctx): Ctx {');
    lines.push('    const ctx: Ctx = { ...inputs };');
    lines.push('    for (const [name, expr] of CHAIN) ctx[name] = evaluate(expr, ctx).value;');
    lines.push('    return ctx;');
    lines.push('  }');
    lines.push('');
  }

  for (const tc of validCases) {
    const label = tc.description ? `${tc.id}: ${tc.description}` : tc.id;
    lines.push(`  it(${JSON.stringify(label)}, () => {`);

    const inputEntries = Object.entries(tc.inputs);
    if (chainDecisions.length > 0) {
      if (inputEntries.length === 0) {
        lines.push('    const ctx = run({});');
      } else {
        const inlineInputs = inputEntries
          .map(([k, v]) => `${JSON.stringify(k)}: ${toCode(v)}`)
          .join(', ');
        lines.push(`    const ctx = run({ ${inlineInputs} });`);
      }
    } else {
      // No decisions — evaluate expressions inline
    }

    for (const [decisionName, { expected, errorExpected }] of Object.entries(tc.results)) {
      if (!evaluatable.has(decisionName)) continue;
      if (errorExpected) {
        lines.push(`    expect(n(ctx[${JSON.stringify(decisionName)}])).toBeNull();`);
      } else {
        const normalized = norm(expected);
        lines.push(
          `    expect(aeq(n(ctx[${JSON.stringify(decisionName)}]), ${JSON.stringify(normalized)}), ${JSON.stringify(decisionName)}).toBe(true);`,
        );
      }
    }

    lines.push('  });');
  }

  lines.push('});');
  return `${lines.join('\n')}\n`;
}

// ── Process conformance groups ────────────────────────────────────────────────
function processConformance(): void {
  const levels = [
    { name: 'compliance-level-2', prefix: 'l2' },
    { name: 'compliance-level-3', prefix: 'l3' },
  ];

  let total = 0,
    skipped = 0;

  for (const { name: level, prefix } of levels) {
    const levelDir = join(CONFORMANCE_ROOT, level);
    if (!existsSync(levelDir)) continue;

    const outDir = join(TCK_OUT, prefix);
    mkdirSync(outDir, { recursive: true });

    const groups = readdirSync(levelDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !SKIP_GROUPS.has(e.name))
      .map((e) => e.name)
      .sort();

    for (const group of groups) {
      const groupDir = join(levelDir, group);
      const files = readdirSync(groupDir);
      const dmnFile = files.find((f) => f.endsWith('.dmn'));
      const testFile = files.find((f) => f.endsWith('-test-01.xml'));
      if (!dmnFile || !testFile) continue;

      try {
        const dmnXml = readFileSync(join(groupDir, dmnFile), 'utf-8');
        const testXml = readFileSync(join(groupDir, testFile), 'utf-8');
        const allDecisions = extractDecisions(dmnXml);
        if (allDecisions.length === 0) {
          skipped++;
          continue;
        }

        const chain = topoSort(allDecisions);
        const evaluatable = buildEvaluatable(allDecisions);
        const testCases = parseTestCases(testXml);

        // Quick check: is anything evaluatable?
        const firstCase = testCases[0];
        if (!firstCase || !Object.keys(firstCase.results).some((n) => evaluatable.has(n))) {
          skipped++;
          continue;
        }

        const content = genConformanceFile(group, chain, evaluatable, testCases);
        if (!content) {
          skipped++;
          continue;
        }

        writeFileSync(join(outDir, `${group}.test.ts`), content, 'utf-8');
        total++;
        process.stdout.write(`  ✓ ${prefix}/${group}\n`);
      } catch (e) {
        process.stderr.write(`  ✗ ${prefix}/${group}: ${e}\n`);
        skipped++;
      }
    }
  }

  console.log(`\nConformance: ${total} files generated, ${skipped} skipped`);
}

// ── DMN Fixtures ──────────────────────────────────────────────────────────────
function extractFixtureExpr(
  dmnXml: string,
): { expression: string; inputTypes: Record<string, string>; decisionName: string } | null {
  try {
    const doc = fixtureXmlParser.parse(dmnXml) as Record<string, unknown>;
    const defs = doc.definitions as Record<string, unknown> | undefined;
    if (!defs) return null;

    const inputTypes: Record<string, string> = {};
    for (const id of (defs.inputData as Record<string, unknown>[]) ?? []) {
      const varDef = id.variable as Record<string, unknown> | undefined;
      const name = String(id['@_name'] ?? '');
      const typeRef = String(varDef?.['@_typeRef'] ?? '').toLowerCase();
      if (name) inputTypes[name] = typeRef;
    }

    const raw = defs.decision;
    const decision = Array.isArray(raw) ? raw[0] : raw;
    if (!decision || typeof decision !== 'object') return null;
    const d = decision as Record<string, unknown>;
    const le = d.literalExpression as Record<string, unknown> | undefined;
    if (!le) return null;
    const textNode = le.text;
    const text =
      typeof textNode === 'object' && textNode !== null
        ? String((textNode as Record<string, unknown>)['#text'] ?? '')
        : String(textNode ?? '');
    const expression = text.trim();
    const decisionName = String(d['@_name'] ?? '');
    return expression ? { expression, inputTypes, decisionName } : null;
  } catch {
    return null;
  }
}

function coerceCtxValue(v: unknown, typeRef: string): FeelValue {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean' || typeof v === 'number') return v;
  if (Array.isArray(v)) return (v as unknown[]).map((i) => coerceCtxValue(i, ''));
  if (typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, coerceCtxValue(val, '')]),
    );
  }
  if (typeof v === 'string') {
    switch (typeRef) {
      case 'date':
        return parseDate(v) ?? v;
      case 'time':
        return parseTime(v) ?? v;
      case 'date and time':
        return parseDateTime(v) ?? v;
      case 'duration':
      case 'years and months duration':
      case 'days and time duration':
        return parseDuration(v) ?? v;
    }
  }
  return v as FeelValue;
}

function coerceExpected(v: unknown): FeelValue {
  if (v === null || typeof v === 'boolean' || typeof v === 'number') return v as FeelValue;
  if (Array.isArray(v)) return v.map(coerceExpected);
  if (typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, coerceExpected(val)]),
    );
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const d = parseDate(v);
      if (d) return d;
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
      const d = parseDateTime(v);
      if (d) return d;
    }
    if (/^(\d{2}:\d{2}|T\d{2}:\d{2})/.test(v)) {
      const d = parseTime(v);
      if (d) return d;
    }
    if (/^-?P/.test(v)) {
      const d = parseDuration(v);
      if (d) return d;
    }
  }
  return v as FeelValue;
}

function unwrapExpected(expected: unknown, decisionName: string): unknown {
  if (expected !== null && typeof expected === 'object' && !Array.isArray(expected)) {
    const keys = Object.keys(expected as object);
    if (keys.length === 1 && keys[0]?.toLowerCase() === decisionName.toLowerCase()) {
      return (expected as Record<string, unknown>)[keys[0]!];
    }
  }
  return expected;
}

function processFixtures(): void {
  const FEEL_CATS = new Set(['feel-types', 'feel-functions']);
  const entries = CATALOG.filter((e) => FEEL_CATS.has(e.category) && e.testCasesPath != null);

  // Group by category+group for one file per subcategory
  const groups = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = `${e.category}__${e.group}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  mkdirSync(FIX_OUT, { recursive: true });
  let totalFiles = 0,
    totalCases = 0;

  for (const [key, groupEntries] of groups.entries()) {
    const [category, group] = key.split('__') as [string, string];
    const suiteBlocks: string[] = [];
    let fileNeedsTemporal = false;

    for (const entry of groupEntries) {
      let dmnXml: string, cases: { context: Record<string, unknown>; expected: unknown }[];
      try {
        dmnXml = loadFixture(entry.path);
        const json = JSON.parse(loadFixture(entry.testCasesPath!)) as {
          cases: { context: Record<string, unknown>; expected: unknown }[];
        };
        cases = json.cases ?? [];
      } catch {
        continue;
      }

      const fixture = extractFixtureExpr(dmnXml);
      if (!fixture || cases.length === 0) continue;

      const fixtureName = basename(entry.path, '.dmn');
      const decisionName = fixture.decisionName || fixtureName;

      // Pre-process: coerce context values and normalize expected
      const processed = cases.map((tc) => {
        const ctx = Object.fromEntries(
          Object.entries(tc.context ?? {}).map(([k, v]) => [
            k,
            coerceCtxValue(v, fixture.inputTypes[k] ?? ''),
          ]),
        );
        const rawExp = unwrapExpected(tc.expected, decisionName);
        const normExp = norm(coerceExpected(rawExp));
        return { ctx, normExp };
      });

      if (
        processed.some(({ ctx }) => Object.values(ctx).some((v) => hasTemporal(v as FeelValue)))
      ) {
        fileNeedsTemporal = true;
      }

      const block: string[] = [];
      block.push(`  describe(${JSON.stringify(fixtureName)}, () => {`);
      block.push(`    const EXPR = ${JSON.stringify(fixture.expression)};`);
      block.push('');

      for (const [i, { ctx, normExp }] of processed.entries()) {
        const ctxEntries = Object.entries(ctx);
        block.push(`    it(${JSON.stringify(`case ${i + 1}`)}, () => {`);
        if (ctxEntries.length === 0) {
          block.push(`      expect(n(evaluate(EXPR).value)).toEqual(${JSON.stringify(normExp)});`);
        } else {
          const inlineCtx = ctxEntries
            .map(([k, v]) => `${JSON.stringify(k)}: ${toCode(v as FeelValue)}`)
            .join(', ');
          block.push(
            `      expect(n(evaluate(EXPR, { ${inlineCtx} }).value)).toEqual(${JSON.stringify(normExp)});`,
          );
        }
        block.push('    });');
        totalCases++;
      }

      block.push('  });');
      suiteBlocks.push(block.join('\n'));
    }

    if (suiteBlocks.length === 0) continue;

    const lines: string[] = [];
    lines.push('// Auto-generated by scripts/gen-tck.ts — do not edit manually');
    lines.push("import { describe, expect, it } from 'vitest';");
    lines.push(`import { evaluate } from '../../src/index.js';`);
    if (fileNeedsTemporal) {
      lines.push(
        `import { parseDate, parseDateTime, parseTime } from '../../src/temporal/index.js';`,
      );
      lines.push(`import { parseDuration } from '../../src/temporal/duration.js';`);
    }
    lines.push(`import type { FeelValue } from '../../src/types.js';`);
    lines.push(`import { n, type Ctx } from '../tck/utils.js';`);
    lines.push('');
    if (fileNeedsTemporal) {
      lines.push('const d = parseDate, t = parseTime, dt = parseDateTime, dur = parseDuration;');
      lines.push('');
    }
    lines.push(`describe(${JSON.stringify(`dmn-fixtures / ${category} / ${group}`)}, () => {`);
    for (const block of suiteBlocks) lines.push(block);
    lines.push('});');

    const slug = `${category.replace('feel-', '')}__${group}`.replace(/\//g, '-');
    writeFileSync(join(FIX_OUT, `${slug}.test.ts`), `${lines.join('\n')}\n`, 'utf-8');
    totalFiles++;
    process.stdout.write(`  ✓ fixtures/${slug}\n`);
  }

  console.log(`\nFixtures: ${totalFiles} files, ${totalCases} cases`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('Generating conformance test files...');
processConformance();

console.log('\nGenerating fixture test files...');
processFixtures();

console.log('\nDone!');
