import type { FeelDate, FeelDateTime, FeelTime } from '../types.js';
import { monthFromName, monthNames } from './locale.js';

// ─── Format tokenizer ─────────────────────────────────────────────────────────

type Token = { kind: 'field'; field: string } | { kind: 'literal'; value: string };

const FIELD_TOKENS = [
  'yyyy',
  'yy',
  'MMMM',
  'MMM',
  'MM',
  'M',
  'dd',
  'd',
  'HH',
  'H',
  'hh',
  'h',
  'mm',
  'ss',
  'a',
];

function tokenize(fmt: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < fmt.length) {
    if (fmt[i] === "'") {
      let j = i + 1;
      let lit = '';
      while (j < fmt.length && fmt[j] !== "'") lit += fmt[j++];
      tokens.push({ kind: 'literal', value: lit });
      i = j + 1;
      continue;
    }
    let matched = false;
    for (const f of FIELD_TOKENS) {
      if (fmt.startsWith(f, i)) {
        tokens.push({ kind: 'field', field: f });
        i += f.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push({ kind: 'literal', value: fmt[i]! });
      i++;
    }
  }
  return tokens;
}

// ─── Parse with format ────────────────────────────────────────────────────────

type ParsedFields = {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
  ampm?: 'AM' | 'PM';
};

function fieldRegex(field: string): string {
  switch (field) {
    case 'yyyy':
      return '(\\d{4})';
    case 'yy':
      return '(\\d{2})';
    case 'MMMM':
    case 'MMM':
      return '([A-Za-z\\u00C0-\\u024F]+)';
    case 'MM':
      return '(\\d{2})';
    case 'M':
      return '(\\d{1,2})';
    case 'dd':
      return '(\\d{2})';
    case 'd':
      return '(\\d{1,2})';
    case 'HH':
      return '(\\d{2})';
    case 'H':
      return '(\\d{1,2})';
    case 'hh':
      return '(\\d{2})';
    case 'h':
      return '(\\d{1,2})';
    case 'mm':
      return '(\\d{2})';
    case 'ss':
      return '(\\d{2})';
    case 'a':
      return '(AM|PM|am|pm)';
    default:
      return '';
  }
}

function extractFields(str: string, tokens: Token[], locale: string): ParsedFields | null {
  let pattern = '^';
  const fieldOrder: string[] = [];
  for (const tok of tokens) {
    if (tok.kind === 'literal') {
      pattern += tok.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    } else {
      pattern += fieldRegex(tok.field);
      fieldOrder.push(tok.field);
    }
  }
  pattern += '$';

  const m = new RegExp(pattern, 'i').exec(str);
  if (!m) return null;

  const fields: ParsedFields = {};
  for (let i = 0; i < fieldOrder.length; i++) {
    const field = fieldOrder[i]!;
    const val = m[i + 1]!;
    switch (field) {
      case 'yyyy':
        fields.year = parseInt(val, 10);
        break;
      case 'yy': {
        const n = parseInt(val, 10);
        fields.year = n < 50 ? 2000 + n : 1900 + n;
        break;
      }
      case 'MMMM':
      case 'MMM': {
        const mn = monthFromName(val, locale);
        if (mn === null) return null;
        fields.month = mn;
        break;
      }
      case 'MM':
      case 'M':
        fields.month = parseInt(val, 10);
        break;
      case 'dd':
      case 'd':
        fields.day = parseInt(val, 10);
        break;
      case 'HH':
      case 'H':
        fields.hour = parseInt(val, 10);
        break;
      case 'hh':
      case 'h':
        fields.hour = parseInt(val, 10);
        break;
      case 'mm':
        fields.minute = parseInt(val, 10);
        break;
      case 'ss':
        fields.second = parseInt(val, 10);
        break;
      case 'a':
        fields.ampm = val.toUpperCase() as 'AM' | 'PM';
        break;
    }
  }

  // Resolve 12h → 24h
  if (fields.ampm !== undefined && fields.hour !== undefined) {
    if (fields.ampm === 'AM') {
      if (fields.hour === 12) fields.hour = 0;
    } else {
      if (fields.hour !== 12) fields.hour += 12;
    }
    delete fields.ampm;
  }

  return fields;
}

function daysInMonthLocal(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function parseDateWithFormat(str: string, fmt: string, locale = 'en'): FeelDate | null {
  const tokens = tokenize(fmt);
  const fields = extractFields(str, tokens, locale);
  if (!fields) return null;
  const { year, month, day } = fields;
  if (year === undefined || month === undefined || day === undefined) return null;
  if (month < 1 || month > 12 || day < 1) return null;
  if (day > daysInMonthLocal(year, month)) return null;
  return { kind: 'date', year, month, day };
}

export function parseTimeWithFormat(str: string, fmt: string, locale = 'en'): FeelTime | null {
  const tokens = tokenize(fmt);
  const fields = extractFields(str, tokens, locale);
  if (!fields) return null;
  const hour = fields.hour ?? 0;
  const minute = fields.minute ?? 0;
  const second = fields.second ?? 0;
  if (hour > 23 || minute > 59 || second > 59) return null;
  return { kind: 'time', hour, minute, second, nanosecond: 0, offset: 0, timezone: null };
}

export function parseDateTimeWithFormat(
  str: string,
  fmt: string,
  locale = 'en',
): FeelDateTime | null {
  const tokens = tokenize(fmt);
  const fields = extractFields(str, tokens, locale);
  if (!fields) return null;
  const { year, month, day } = fields;
  if (year === undefined || month === undefined || day === undefined) return null;
  const hour = fields.hour ?? 0;
  const minute = fields.minute ?? 0;
  const second = fields.second ?? 0;
  if (month < 1 || month > 12 || day < 1) return null;
  if (day > daysInMonthLocal(year, month)) return null;
  if (hour > 23 || minute > 59 || second > 59) return null;
  return {
    kind: 'date-time',
    year,
    month,
    day,
    hour,
    minute,
    second,
    nanosecond: 0,
    offset: 0,
    timezone: null,
  };
}

// ─── Format with pattern ──────────────────────────────────────────────────────

function p2(n: number): string {
  return String(Math.abs(n)).padStart(2, '0');
}
function p4(n: number): string {
  const s = String(Math.abs(n)).padStart(4, '0');
  return n < 0 ? `-${s}` : s;
}

export function formatDateWithPattern(date: FeelDate, fmt: string, locale = 'en'): string {
  const tokens = tokenize(fmt);
  const names = monthNames(locale);
  let result = '';
  for (const tok of tokens) {
    if (tok.kind === 'literal') {
      result += tok.value;
      continue;
    }
    switch (tok.field) {
      case 'yyyy':
        result += p4(date.year);
        break;
      case 'yy':
        result += String(Math.abs(date.year) % 100).padStart(2, '0');
        break;
      case 'MMMM':
        result += names[date.month - 1] ?? '';
        break;
      case 'MMM':
        result += (names[date.month - 1] ?? '').substring(0, 3);
        break;
      case 'MM':
        result += p2(date.month);
        break;
      case 'M':
        result += String(date.month);
        break;
      case 'dd':
        result += p2(date.day);
        break;
      case 'd':
        result += String(date.day);
        break;
      default:
        result += tok.field;
        break;
    }
  }
  return result;
}

export function formatTimeWithPattern(time: FeelTime, fmt: string, _locale = 'en'): string {
  const tokens = tokenize(fmt);
  let result = '';
  for (const tok of tokens) {
    if (tok.kind === 'literal') {
      result += tok.value;
      continue;
    }
    const h12 = time.hour % 12 || 12;
    switch (tok.field) {
      case 'HH':
        result += p2(time.hour);
        break;
      case 'H':
        result += String(time.hour);
        break;
      case 'hh':
        result += p2(h12);
        break;
      case 'h':
        result += String(h12);
        break;
      case 'mm':
        result += p2(time.minute);
        break;
      case 'ss':
        result += p2(time.second);
        break;
      case 'a':
        result += time.hour < 12 ? 'AM' : 'PM';
        break;
      default:
        result += tok.field;
        break;
    }
  }
  return result;
}

export function formatDateTimeWithPattern(dt: FeelDateTime, fmt: string, locale = 'en'): string {
  const tokens = tokenize(fmt);
  const names = monthNames(locale);
  let result = '';
  for (const tok of tokens) {
    if (tok.kind === 'literal') {
      result += tok.value;
      continue;
    }
    const h12 = dt.hour % 12 || 12;
    switch (tok.field) {
      case 'yyyy':
        result += p4(dt.year);
        break;
      case 'yy':
        result += String(Math.abs(dt.year) % 100).padStart(2, '0');
        break;
      case 'MMMM':
        result += names[dt.month - 1] ?? '';
        break;
      case 'MMM':
        result += (names[dt.month - 1] ?? '').substring(0, 3);
        break;
      case 'MM':
        result += p2(dt.month);
        break;
      case 'M':
        result += String(dt.month);
        break;
      case 'dd':
        result += p2(dt.day);
        break;
      case 'd':
        result += String(dt.day);
        break;
      case 'HH':
        result += p2(dt.hour);
        break;
      case 'H':
        result += String(dt.hour);
        break;
      case 'hh':
        result += p2(h12);
        break;
      case 'h':
        result += String(h12);
        break;
      case 'mm':
        result += p2(dt.minute);
        break;
      case 'ss':
        result += p2(dt.second);
        break;
      case 'a':
        result += dt.hour < 12 ? 'AM' : 'PM';
        break;
      default:
        result += tok.field;
        break;
    }
  }
  return result;
}
