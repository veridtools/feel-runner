import { evaluate, unaryTest } from '../src/index.js';

const version = process.env.npm_package_version ?? '0.0.0';

const BANNER = `
███████╗███████╗███████╗██╗         ██████╗ ██╗   ██╗███╗   ██╗███╗   ██╗███████╗██████╗
██╔════╝██╔════╝██╔════╝██║         ██╔══██╗██║   ██║████╗  ██║████╗  ██║██╔════╝██╔══██╗
█████╗  █████╗  █████╗  ██║         ██████╔╝██║   ██║██╔██╗ ██║██╔██╗ ██║█████╗  ██████╔╝
██╔══╝  ██╔══╝  ██╔══╝  ██║         ██╔══██╗██║   ██║██║╚██╗██║██║╚██╗██║██╔══╝  ██╔══██╗
██║     ███████╗███████╗███████╗    ██║  ██║╚██████╔╝██║ ╚████║██║ ╚████║███████╗██║  ██║
╚═╝     ╚══════╝╚══════╝╚══════╝    ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝
`.trimStart();

const HELP = `${BANNER}
@veridtools/feel-runner v${version} — FEEL expression evaluator and DMN decision runner

Usage:
  feel-runner <expression> [options]

Options:
  -u, --unary         Evaluate as unary test (requires --input or "?" in context)
  -i, --input <v>     Input value for unary test (shorthand for --ctx '{"?": v}')
  -c, --ctx <json>    Context variables as JSON object
  -n, --no-color      Disable ANSI colors
  -h, --help          Show this help

Examples:
  feel-runner "1 + 2 * 3"
  feel-runner "sum([1,2,3,4,5])"
  feel-runner "price * qty" --ctx '{"price":10,"qty":5}'
  feel-runner 'date("2024-01-15").month'
  feel-runner "[18..65]" --unary --input 30
  feel-runner '"A","B","C"' --unary --ctx '{"?":"B"}'
`;

const KNOWN_FLAGS = new Set([
  '--unary',
  '-u',
  '--input',
  '-i',
  '--ctx',
  '-c',
  '--no-color',
  '-n',
  '--help',
  '-h',
]);

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  process.stdout.write(HELP);
  process.exit(0);
}

const unknown = args.filter(
  (a, i) =>
    a.startsWith('-') &&
    !KNOWN_FLAGS.has(a) &&
    args[i - 1] !== '--ctx' &&
    args[i - 1] !== '-c' &&
    args[i - 1] !== '--input' &&
    args[i - 1] !== '-i',
);
if (unknown.length > 0) {
  console.error(`Unknown option: ${unknown.join(', ')}`);
  console.error('Run `feel-runner --help` to see available options.');
  process.exit(1);
}

// ── Parse args ────────────────────────────────────────────────────────────────

const isUnary = args.includes('--unary') || args.includes('-u');
const ctxIdx = args.indexOf('--ctx') !== -1 ? args.indexOf('--ctx') : args.indexOf('-c');
const inputIdx = args.indexOf('--input') !== -1 ? args.indexOf('--input') : args.indexOf('-i');
const noColorFlag = args.includes('--no-color') || args.includes('-n');

let ctxObj: Record<string, unknown> = {};
if (ctxIdx >= 0 && args[ctxIdx + 1]) {
  try {
    ctxObj = JSON.parse(args[ctxIdx + 1]!);
  } catch {
    stderr('Error: --ctx value is not valid JSON');
    process.exit(1);
  }
}

if (inputIdx >= 0 && args[inputIdx + 1]) {
  const raw = args[inputIdx + 1]!;
  try {
    ctxObj['?'] = JSON.parse(raw);
  } catch {
    ctxObj['?'] = raw;
  }
}

const flagsWithValues = new Set(['--ctx', '-c', '--input', '-i']);
const expression = args
  .filter((a, i) => {
    if (a.startsWith('-')) return false;
    const prev = args[i - 1];
    if (prev !== undefined && flagsWithValues.has(prev)) return false;
    return true;
  })
  .join(' ')
  .trim();

if (!expression) {
  stderr('Error: no expression provided. Use --help for usage.');
  process.exit(1);
}

// ── Colours ───────────────────────────────────────────────────────────────────

const color = !noColorFlag && !process.env.NO_COLOR && process.stdout.isTTY === true;
const c = {
  reset: color ? '\x1b[0m' : '',
  bold: color ? '\x1b[1m' : '',
  dim: color ? '\x1b[2m' : '',
  green: color ? '\x1b[32m' : '',
  yellow: color ? '\x1b[33m' : '',
  red: color ? '\x1b[31m' : '',
  cyan: color ? '\x1b[36m' : '',
  blue: color ? '\x1b[34m' : '',
};

function col(text: string, clr: string) {
  return `${clr}${text}${c.reset}`;
}
function stderr(msg: string) {
  process.stderr.write(`${msg}\n`);
}

// ── Run ───────────────────────────────────────────────────────────────────────

console.log();
console.log(col('Expression:', c.dim), col(expression, c.cyan));
if (Object.keys(ctxObj).length > 0) {
  console.log(col('Context:   ', c.dim), col(JSON.stringify(ctxObj), c.dim));
}
console.log();

let result: ReturnType<typeof evaluate>;

try {
  if (isUnary) {
    if (!('?' in ctxObj)) {
      stderr(
        col(
          'Error: unary test requires an input value. Use --input <value> or include "?" in --ctx.',
          c.red,
        ),
      );
      process.exit(1);
    }
    result = unaryTest(expression, ctxObj as Record<string, never>);
  } else {
    result = evaluate(expression, ctxObj as Record<string, never>);
  }
} catch (e) {
  stderr(col(`Runtime error: ${String(e)}`, c.red));
  process.exit(1);
}

// ── Output ────────────────────────────────────────────────────────────────────

const { value, warnings } = result;

const valueStr = formatValue(value);
const valueColor = value === null ? c.red : typeof value === 'boolean' ? c.blue : c.green;

console.log(col('Value:', c.bold), col(valueStr, valueColor));

if (warnings.length > 0) {
  console.log();
  console.log(col(`Warnings (${warnings.length}):`, c.yellow));
  for (const w of warnings) {
    console.log(col('  ⚠', c.yellow), col(`[${w.code}]`, c.dim), w.message);
  }
}

console.log();

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatValue(v: unknown): string {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object' && v !== null && 'toFixed' in v) {
    return (v as { toFixed(): string }).toFixed();
  }
  if (Array.isArray(v)) {
    return `[${v.map(formatValue).join(', ')}]`;
  }
  if (typeof v === 'object' && 'kind' in v) {
    const obj = v as Record<string, unknown>;
    switch (obj.kind) {
      case 'date':
        return `date("${obj.year}-${pad(obj.month)}-${pad(obj.day)}")`;
      case 'time':
        return `time("${pad(obj.hour)}:${pad(obj.minute)}:${pad(obj.second)}")`;
      case 'date-time':
        return `date and time("${obj.year}-${pad(obj.month)}-${pad(obj.day)}T${pad(obj.hour)}:${pad(obj.minute)}:${pad(obj.second)}")`;
      case 'year-month':
        return `duration("P${obj.years}Y${obj.months}M")`;
      case 'day-time':
        return `duration("P${obj.days}DT${obj.hours}H${obj.minutes}M${obj.seconds}S")`;
      case 'range': {
        const r = obj as {
          start: unknown;
          end: unknown;
          startIncluded: boolean;
          endIncluded: boolean;
        };
        return `${r.startIncluded ? '[' : '('}${formatValue(r.start)}..${formatValue(r.end)}${r.endIncluded ? ']' : ')'}`;
      }
      case 'function':
        return '<function>';
    }
  }
  if (typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>).map(
      ([k, val]) => `${k}: ${formatValue(val)}`,
    );
    return `{${entries.join(', ')}}`;
  }
  return String(v);
}

function pad(n: unknown): string {
  return String(n).padStart(2, '0');
}
