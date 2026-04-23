import { asDecimal, D, isDecimal, isNum } from '../decimal.js';
import { formatDuration } from '../temporal/duration.js';
import { formatDate, formatDateTime, formatTime } from '../temporal/format.js';
import type { FeelValue } from '../types.js';
import {
  isDayTimeDuration,
  isFeelContext,
  isFeelDate,
  isFeelDateTime,
  isFeelRange,
  isFeelTime,
  isYearMonthDuration,
} from '../types.js';

export const conversionBuiltins: Record<string, (args: FeelValue[]) => FeelValue> = {
  string(args) {
    const [v = null, mask = null] = args;
    if (v === null) return null;
    if (mask !== undefined && mask !== null) {
      if (typeof mask !== 'string') return null;
      if (!isNum(v)) return null;
      return formatWithMask(asDecimal(v)!.toNumber(), mask);
    }
    return feelString(v);
  },

  number(args) {
    if (args.length > 3) return null;
    const [v, groupSep, decSep] = args;
    const hasGroupSep = groupSep !== undefined && groupSep !== null;
    const hasDecSep = decSep !== undefined && decSep !== null;
    if ((hasGroupSep || hasDecSep) && typeof v !== 'string') return null;
    if (isDecimal(v)) return v;
    if (typeof v === 'number') return D(v);
    if (typeof v !== 'string') return null;

    const VALID_GROUP = [' ', ',', '.'];
    const VALID_DEC = ['.', ','];
    if (hasGroupSep && (typeof groupSep !== 'string' || !VALID_GROUP.includes(groupSep as string)))
      return null;
    if (hasDecSep && (typeof decSep !== 'string' || !VALID_DEC.includes(decSep as string)))
      return null;
    if (hasGroupSep && hasDecSep && groupSep === decSep) return null;

    let str = v;
    if (hasGroupSep) str = str.split(groupSep as string).join('');
    if (hasDecSep && decSep !== '.') str = str.replace(decSep as string, '.');
    if (!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(str)) return null;
    try {
      return D(str);
    } catch {
      return null;
    }
  },

  'format number'(args) {
    const [n, picture, locale] = args;
    if (!isNum(n) || typeof picture !== 'string') return null;
    const result = formatWithMask(asDecimal(n)!.toNumber(), picture);
    if (result === null) return null;
    if (typeof locale !== 'string') return result;
    return applyLocale(result, locale);
  },

  'string join'(args) {
    if (args.length > 4) return null;
    const [rawList = null, delimiter, prefix, suffix] = args;
    const list = typeof rawList === 'string' ? [rawList] : rawList;
    if (!Array.isArray(list)) return null;
    for (const s of list as FeelValue[]) {
      if (s !== null && typeof s !== 'string') return null;
    }
    const sep =
      delimiter === undefined || delimiter === null
        ? ''
        : typeof delimiter === 'string'
          ? delimiter
          : null;
    if (sep === null) return null;
    const hasPre = prefix !== undefined;
    const hasSuf = suffix !== undefined;
    if (hasPre !== hasSuf) return null;
    const pre = hasPre ? (typeof prefix === 'string' ? prefix : null) : '';
    const suf = hasSuf ? (typeof suffix === 'string' ? suffix : null) : '';
    if (pre === null || suf === null) return null;
    const parts = (list as FeelValue[]).filter((s) => s !== null) as string[];
    return pre + parts.join(sep) + suf;
  },
};

// Locales where decimal=comma, grouping=period
const COMMA_DECIMAL_LOCALES = new Set([
  'pt',
  'pt-br',
  'de',
  'de-at',
  'de-ch',
  'de-de',
  'fr',
  'fr-fr',
  'fr-be',
  'fr-ch',
  'es',
  'it',
  'nl',
  'pl',
  'ru',
  'tr',
]);

function applyLocale(formatted: string, locale: string): string {
  const lang = locale.toLowerCase();
  if (!COMMA_DECIMAL_LOCALES.has(lang)) return formatted;
  // Swap: . → ‹placeholder›, , → ., ‹placeholder› → ,
  return formatted.split('.').join('\uE000').split(',').join('.').split('\uE000').join(',');
}

function formatWithMask(n: number, mask: string): string | null {
  // Split positive/negative subpictures on ';'
  const parts = mask.split(';') as [string, string | undefined];
  const posMask = parts[0]!;
  const negMask = parts[1];
  const isNeg = n < 0;
  const absN = Math.abs(n);

  // Extract leading/trailing literal text (chars that are not 0 # . , %)
  function splitPictureLiterals(pic: string): { prefix: string; core: string; suffix: string } {
    const first = pic.search(/[0#.,]/);
    const last = pic.search(/[0#.,][^0#.,]*$/);
    if (first < 0) return { prefix: pic, core: '', suffix: '' };
    return {
      prefix: pic.slice(0, first),
      core: pic.slice(first, last + 1),
      suffix: pic.slice(last + 1),
    };
  }

  function applyPicture(pic: string, value: number): string | null {
    const isPercent = pic.includes('%');
    const picClean = pic.replace('%', '');
    const { prefix, core, suffix } = splitPictureLiterals(picClean);
    const v = isPercent ? value * 100 : value;

    const dotIdx = core.indexOf('.');
    const intPic = dotIdx >= 0 ? core.slice(0, dotIdx) : core;
    const fracPic = dotIdx >= 0 ? core.slice(dotIdx + 1) : '';

    const maxFrac = fracPic.length;
    const minFrac = (fracPic.match(/0/g) ?? []).length;
    const rounded = maxFrac > 0 ? Math.round(v * 10 ** maxFrac) / 10 ** maxFrac : Math.round(v);

    const numParts = rounded.toFixed(maxFrac).split('.');
    let intStr = numParts[0]!.replace('-', '');
    let fracStr = numParts[1] ?? '';
    // Trim trailing zeros beyond minFrac (# = optional digit)
    while (fracStr.length > minFrac && fracStr.endsWith('0')) {
      fracStr = fracStr.slice(0, -1);
    }

    // Apply grouping separator from intPic
    const commaIdx = intPic.lastIndexOf(',');
    if (commaIdx >= 0) {
      const afterComma = intPic.slice(commaIdx + 1).replace(/[^0#]/g, '').length;
      if (afterComma > 0) {
        const groups: string[] = [];
        let remaining = intStr;
        while (remaining.length > afterComma) {
          groups.unshift(remaining.slice(-afterComma));
          remaining = remaining.slice(0, -afterComma);
        }
        groups.unshift(remaining);
        intStr = groups.join(',');
      }
    }

    // Minimum integer digits from '0' count in intPic (excluding commas)
    const minInt = (intPic.replace(/,/g, '').match(/0/g) ?? []).length;
    while (intStr.replace(/,/g, '').length < minInt) intStr = `0${intStr}`;

    const numResult = fracStr.length > 0 ? `${intStr}.${fracStr}` : intStr;
    const withPercent = isPercent ? `${numResult}%` : numResult;
    return `${prefix}${withPercent}${suffix}`;
  }

  if (isNeg && negMask !== undefined) {
    return applyPicture(negMask, absN);
  }

  const formatted = applyPicture(posMask, absN);
  if (formatted === null) return null;
  return isNeg && negMask === undefined ? `-${formatted}` : formatted;
}

export function feelString(v: FeelValue): string | null {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (isDecimal(v)) return v.toSignificantDigits().toFixed();
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v);
  if (typeof v === 'string') return v;
  if (isFeelDate(v)) return formatDate(v);
  if (isFeelDateTime(v)) return formatDateTime(v);
  if (isFeelTime(v)) return formatTime(v);
  if (isYearMonthDuration(v) || isDayTimeDuration(v)) return formatDuration(v);
  if (Array.isArray(v)) return `[${(v as FeelValue[]).map(feelString).join(', ')}]`;
  if (isFeelRange(v)) {
    const start = v.start !== null ? feelString(v.start) : null;
    const end = v.end !== null ? feelString(v.end) : null;
    return `${v.startIncluded ? '[' : '('}${start ?? ''}..${end ?? ''}${v.endIncluded ? ']' : ')'}`;
  }
  if (isFeelContext(v)) {
    const entries = Object.entries(v).map(([k, val]) => `${k}: ${feelString(val)}`);
    return `{${entries.join(', ')}}`;
  }
  return null;
}
