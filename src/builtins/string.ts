import { asDecimal, D, isNum } from '../decimal.js';
import type { FeelValue } from '../types.js';

// FEEL 'x' flag: remove all whitespace outside character classes (even after \)
function collapseRegexWhitespace(pattern: string): string {
  let result = '';
  let i = 0;
  let inClass = false;
  while (i < pattern.length) {
    const c = pattern[i]!;
    if (!inClass && (c === ' ' || c === '\t' || c === '\n' || c === '\r')) {
      i++;
      continue;
    }
    if (c === '[' && !inClass) inClass = true;
    if (c === ']' && inClass) inClass = false;
    result += c;
    i++;
  }
  return result;
}

// XQuery/FEEL Unicode block names (Is-prefix) → JS Unicode ranges
const IS_BLOCK_MAP: Record<string, string> = {
  IsBasicLatin: '\u0000-\u007F',
  IsLatin1Supplement: '\u0080-\u00FF',
  IsLatinExtendedA: '\u0100-\u017F',
  IsLatinExtendedB: '\u0180-\u024F',
  IsGreek: '\u0370-\u03FF',
  IsCyrillic: '\u0400-\u04FF',
  IsArabic: '\u0600-\u06FF',
  IsHebrew: '\u0590-\u05FF',
  IsHiragana: '\u3040-\u309F',
  IsKatakana: '\u30A0-\u30FF',
  IsCJKUnifiedIdeographs: '\u4E00-\u9FFF',
};

function translateFeelRegex(pattern: string, hasXFlag: boolean): string | null {
  let result = '';
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i]!;
    if (c === '\\' && i + 1 < pattern.length) {
      const next = pattern[i + 1]!;
      if (next === 'p' || next === 'P') {
        const brace = pattern.indexOf('{', i + 2);
        const close = pattern.indexOf('}', brace);
        if (brace === i + 2 && close > brace) {
          const propName = pattern.slice(brace + 1, close);
          if (!hasXFlag && /\s/.test(propName)) return null;
          const cleanName = propName.replace(/\s/g, '');
          const range = IS_BLOCK_MAP[cleanName];
          if (range) {
            result += next === 'P' ? `[^${range}]` : `[${range}]`;
            i = close + 1;
            continue;
          }
          result += pattern.slice(i, close + 1);
          i = close + 1;
          continue;
        }
      }
      result += c + next;
      i += 2;
    } else {
      result += c;
      i++;
    }
  }
  return result;
}

function countCapturingGroups(pattern: string): number {
  let count = 0;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '\\') {
      i++;
      continue;
    }
    if (pattern[i] === '(' && pattern[i + 1] !== '?') count++;
    if (
      pattern[i] === '(' &&
      pattern[i + 1] === '?' &&
      pattern[i + 2] === '<' &&
      pattern[i + 3] !== '=' &&
      pattern[i + 3] !== '!'
    )
      count++;
  }
  return count;
}

function hasInvalidBackRef(pattern: string, groupCount: number): boolean {
  const re = /\\(\d+)/g;
  let m = re.exec(pattern);
  while (m !== null) {
    const n = parseInt(m[1]!, 10);
    if (n === 0 || n > groupCount) return true;
    m = re.exec(pattern);
  }
  return false;
}

function translateClassSubtraction(cls: string): string | null {
  const subIdx = cls.indexOf('-[');
  if (subIdx === -1) return null;
  const baseStr = cls.slice(0, subIdx);
  const exclStr = cls.slice(subIdx + 2, cls.length - 1);
  const baseChars = expandCharClass(baseStr);
  const exclChars = expandCharClass(exclStr);
  if (baseChars === null || exclChars === null) return null;
  const result = baseChars.filter((c) => !exclChars.includes(c));
  if (result.length === 0) return '';
  return charsToRanges(result);
}

function expandCharClass(cls: string): string[] | null {
  const chars: string[] = [];
  let i = 0;
  while (i < cls.length) {
    if (i + 2 < cls.length && cls[i + 1] === '-' && cls[i + 2] !== ']') {
      const start = cls.charCodeAt(i);
      const end = cls.charCodeAt(i + 2);
      if (end < start) return null;
      for (let c = start; c <= end; c++) chars.push(String.fromCharCode(c));
      i += 3;
    } else {
      chars.push(cls[i]!);
      i++;
    }
  }
  return chars;
}

function charsToRanges(chars: string[]): string {
  if (chars.length === 0) return '';
  const codes = chars.map((c) => c.charCodeAt(0)).sort((a, b) => a - b);
  let result = '';
  let start = codes[0]!;
  let end = codes[0]!;
  for (let i = 1; i < codes.length; i++) {
    if (codes[i]! === end + 1) {
      end = codes[i]!;
    } else {
      result += rangeStr(start, end);
      start = codes[i]!;
      end = codes[i]!;
    }
  }
  result += rangeStr(start, end);
  return result;
}

function rangeStr(start: number, end: number): string {
  const s = escapeForClass(String.fromCharCode(start));
  const e = escapeForClass(String.fromCharCode(end));
  if (start === end) return s;
  if (start + 1 === end) return s + e;
  return `${s}-${e}`;
}

function escapeForClass(c: string): string {
  if ('^]\\-'.includes(c)) return `\\${c}`;
  return c;
}

function translateClassSubtractionInPattern(pattern: string): string | null {
  let result = '';
  let i = 0;
  while (i < pattern.length) {
    if (pattern[i] === '\\') {
      result += pattern[i]! + (pattern[i + 1] ?? '');
      i += 2;
      continue;
    }
    if (pattern[i] === '[') {
      let j = i + 1;
      let depth = 1;
      while (j < pattern.length && depth > 0) {
        if (pattern[j] === '\\') {
          j += 2;
          continue;
        }
        if (pattern[j] === '[') depth++;
        else if (pattern[j] === ']') depth--;
        j++;
      }
      const cls = pattern.slice(i + 1, j - 1);
      if (cls.includes('-[')) {
        const translated = translateClassSubtraction(cls);
        if (translated === null) return null;
        result += `[${translated}]`;
      } else {
        result += `[${cls}]`;
      }
      i = j;
      continue;
    }
    result += pattern[i]!;
    i++;
  }
  return result;
}

export const stringBuiltins: Record<string, (args: FeelValue[]) => FeelValue> = {
  'string length'([str]) {
    if (typeof str !== 'string') return null;
    return D([...str].length);
  },

  substring([str, start, length]) {
    if (typeof str !== 'string') return null;
    if (!isNum(start)) return null;
    const startN = asDecimal(start)!.toNumber();
    const chars = [...str];
    const len = chars.length;
    const s = startN > 0 ? startN - 1 : Math.max(0, len + startN);
    if (length === undefined || length === null) {
      return chars.slice(s).join('');
    }
    if (!isNum(length)) return null;
    const lengthN = asDecimal(length)!.toNumber();
    return chars.slice(s, s + lengthN).join('');
  },

  'upper case'([str]) {
    if (typeof str !== 'string') return null;
    return str.toUpperCase();
  },

  'lower case'([str]) {
    if (typeof str !== 'string') return null;
    return str.toLowerCase();
  },

  'substring before'([str, match]) {
    if (typeof str !== 'string' || typeof match !== 'string') return null;
    const idx = str.indexOf(match);
    return idx < 0 ? '' : str.slice(0, idx);
  },

  'substring after'([str, match]) {
    if (typeof str !== 'string' || typeof match !== 'string') return null;
    const idx = str.indexOf(match);
    return idx < 0 ? '' : str.slice(idx + match.length);
  },

  contains([str, match]) {
    if (typeof str !== 'string' || typeof match !== 'string') return null;
    return str.includes(match);
  },

  'starts with'([str, match]) {
    if (typeof str !== 'string' || typeof match !== 'string') return null;
    return str.startsWith(match);
  },

  'ends with'([str, match]) {
    if (typeof str !== 'string' || typeof match !== 'string') return null;
    return str.endsWith(match);
  },

  matches(args) {
    if (args.length > 3) return null;
    const [str, pattern, flags] = args;
    if (typeof str !== 'string' || typeof pattern !== 'string') return null;
    if (flags !== undefined && flags !== null && typeof flags !== 'string') return null;
    try {
      const f = typeof flags === 'string' ? flags : '';
      const hasX = f.includes('x');
      let pat = hasX ? collapseRegexWhitespace(pattern) : pattern;
      const subtracted = translateClassSubtractionInPattern(pat);
      if (subtracted === null) return null;
      pat = subtracted;
      const translated = translateFeelRegex(pat, hasX);
      if (translated === null) return null;
      pat = translated;
      const groups = countCapturingGroups(pat);
      if (hasInvalidBackRef(pat, groups)) return null;
      const jsFlags = `${f.replace('x', '')}u`;
      const re = new RegExp(pat, jsFlags);
      return re.test(str);
    } catch {
      return null;
    }
  },

  replace(args) {
    if (args.length > 4) return null;
    const [str, pattern, replacement, flags] = args;
    if (typeof str !== 'string' || typeof pattern !== 'string' || typeof replacement !== 'string')
      return null;
    try {
      const f = typeof flags === 'string' ? flags : '';
      const hasX = f.includes('x');
      let pat = hasX ? collapseRegexWhitespace(pattern) : pattern;
      const subtracted = translateClassSubtractionInPattern(pat);
      if (subtracted === null) return null;
      pat = subtracted;
      const translated = translateFeelRegex(pat, hasX);
      if (translated === null) return null;
      pat = translated;
      const groups = countCapturingGroups(pat);
      if (hasInvalidBackRef(pat, groups)) return null;
      const jsFlags = `${f.replace('x', '')}gu`;
      const re = new RegExp(pat, jsFlags);
      // XPath fn:replace raises ERRFORX0003 if pattern can match empty string
      if (new RegExp(pat, 'u').test('')) return null;
      const jsReplacement = replacement.replace(/\$(\d+)/g, (_, n: string) =>
        n === '0' ? '$&' : `$${n}`,
      );
      return str.replace(re, jsReplacement);
    } catch {
      return null;
    }
  },

  split([str, delimiter]) {
    if (typeof str !== 'string' || typeof delimiter !== 'string') return null;
    try {
      const re = new RegExp(delimiter);
      return str.split(re);
    } catch {
      return str.split(delimiter);
    }
  },

  trim([str]) {
    if (typeof str !== 'string') return null;
    return str.trim();
  },

  extract([input, pattern]) {
    if (typeof input !== 'string' || typeof pattern !== 'string') return null;
    try {
      const re = new RegExp(pattern, 'gu');
      const results: FeelValue[] = [];
      let m = re.exec(input);
      while (m !== null) {
        results.push(Array.from(m) as FeelValue[]);
        if (re.lastIndex === m.index) re.lastIndex++;
        m = re.exec(input);
      }
      return results;
    } catch {
      return null;
    }
  },

  'pad left'([str, length, char]) {
    if (typeof str !== 'string') return null;
    if (!isNum(length)) return null;
    const len = asDecimal(length)!.toNumber();
    if (!Number.isFinite(len)) return null;
    const padChar =
      char === undefined || char === null ? ' ' : typeof char === 'string' ? char : null;
    if (padChar === null) return null;
    const padUnit = padChar.length === 0 ? ' ' : [...padChar][0]!;
    const strChars = [...str];
    if (strChars.length >= len) return str;
    return padUnit.repeat(len - strChars.length) + str;
  },

  'pad right'([str, length, char]) {
    if (typeof str !== 'string') return null;
    if (!isNum(length)) return null;
    const len = asDecimal(length)!.toNumber();
    if (!Number.isFinite(len)) return null;
    const padChar =
      char === undefined || char === null ? ' ' : typeof char === 'string' ? char : null;
    if (padChar === null) return null;
    const padUnit = padChar.length === 0 ? ' ' : [...padChar][0]!;
    const strChars = [...str];
    if (strChars.length >= len) return str;
    return str + padUnit.repeat(len - strChars.length);
  },

  'encode for URI'([str]) {
    if (typeof str !== 'string') return null;
    try {
      return encodeURIComponent(str);
    } catch {
      return null;
    }
  },

  'decode for URI'([str]) {
    if (typeof str !== 'string') return null;
    try {
      return decodeURIComponent(str);
    } catch {
      return null;
    }
  },
};
