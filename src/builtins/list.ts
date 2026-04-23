import { asDecimal, D, type Decimal, isNum } from '../decimal.js';
import { feelCompare, feelEqual } from '../evaluator/equality.js';
import type { FeelValue } from '../types.js';

function toList(v: FeelValue): FeelValue[] {
  return Array.isArray(v) ? (v as FeelValue[]) : [v];
}

function flatten(arr: FeelValue[], depth = Infinity): FeelValue[] {
  const result: FeelValue[] = [];
  for (const item of arr) {
    if (Array.isArray(item) && depth > 0) {
      result.push(...flatten(item as FeelValue[], depth - 1));
    } else {
      result.push(item);
    }
  }
  return result;
}

export const listBuiltins: Record<string, (args: FeelValue[]) => FeelValue> = {
  'list contains'([list = null, item = null]) {
    if (!Array.isArray(list)) return null;
    for (const el of list as FeelValue[]) {
      const eq = feelEqual(el, item);
      if (eq === true) return true;
    }
    return false;
  },

  count([list = null]) {
    if (list === null) return null;
    if (Array.isArray(list)) return (list as FeelValue[]).length;
    return 1;
  },

  min(args) {
    const items = args.length === 1 && Array.isArray(args[0]) ? (args[0] as FeelValue[]) : args;
    if (items.length === 0) return null;
    let min = items[0]!;
    for (let i = 1; i < items.length; i++) {
      const cmp = feelCompare(items[i]!, min);
      if (cmp === null) return null;
      if (cmp < 0) min = items[i]!;
    }
    return min;
  },

  max(args) {
    const items = args.length === 1 && Array.isArray(args[0]) ? (args[0] as FeelValue[]) : args;
    if (items.length === 0) return null;
    let max = items[0]!;
    for (let i = 1; i < items.length; i++) {
      const cmp = feelCompare(items[i]!, max);
      if (cmp === null) return null;
      if (cmp > 0) max = items[i]!;
    }
    return max;
  },

  sum(args) {
    const items = args.length === 1 && Array.isArray(args[0]) ? (args[0] as FeelValue[]) : args;
    if (items.length === 0) return null;
    let total = D(0);
    for (const item of items) {
      if (!isNum(item)) return null;
      total = total.plus(asDecimal(item)!);
    }
    return total;
  },

  mean(args) {
    const items = args.length === 1 && Array.isArray(args[0]) ? (args[0] as FeelValue[]) : args;
    if (items.length === 0) return null;
    let total = D(0);
    for (const item of items) {
      if (!isNum(item)) return null;
      total = total.plus(asDecimal(item)!);
    }
    return total.div(items.length);
  },

  median(args) {
    const raw = args.length === 1 && Array.isArray(args[0]) ? (args[0] as FeelValue[]) : args;
    if (raw.length === 0) return null;
    if (raw.some((x) => !isNum(x))) return null;
    const items = (raw as FeelValue[])
      .map((v) => asDecimal(v)!)
      .slice()
      .sort((a, b) => a.cmp(b));
    const mid = Math.floor(items.length / 2);
    if (items.length % 2 === 0) return items[mid - 1]!.plus(items[mid]!).div(2);
    return items[mid]!;
  },

  stddev(args) {
    const raw = args.length === 1 && Array.isArray(args[0]) ? (args[0] as FeelValue[]) : args;
    if (raw.length < 2) return null;
    if (raw.some((x) => !isNum(x))) return null;
    const items = (raw as FeelValue[]).map((v) => asDecimal(v)!);
    const mean = items.reduce((a, b) => a.plus(b), D(0)).div(items.length);
    const variance = items
      .reduce((sum, x) => sum.plus(x.minus(mean).pow(2)), D(0))
      .div(items.length - 1);
    return variance.sqrt();
  },

  mode(args) {
    if (args.length === 0) return null;
    const rawList = args.length === 1 ? args[0] : args;
    if (rawList === null) return null;
    const items = Array.isArray(rawList) ? (rawList as FeelValue[]) : [rawList];
    if (items.length === 0) return [];
    if (items.some((x) => x === null || !isNum(x))) return null;
    const decimals = items.map((v) => asDecimal(v)!);
    const freq = new Map<string, { d: Decimal; count: number }>();
    for (const d of decimals) {
      const key = d.toFixed();
      const entry = freq.get(key);
      freq.set(key, entry ? { d, count: entry.count + 1 } : { d, count: 1 });
    }
    const maxCount = Math.max(...[...freq.values()].map((e) => e.count));
    return [...freq.values()]
      .filter((e) => e.count === maxCount)
      .map((e) => e.d)
      .sort((a, b) => a.cmp(b));
  },

  append(args) {
    if (args.length < 2) return args[0] ?? null;
    const [list = null, ...rest] = args;
    return [...toList(list), ...rest];
  },

  concatenate(args) {
    return args.flatMap((a) => toList(a));
  },

  'insert before'([list = null, position = null, newItem = null]) {
    if (!Array.isArray(list) || !isNum(position)) return null;
    const arr = list as FeelValue[];
    const pos = asDecimal(position)!.toNumber();
    const idx = pos > 0 ? pos - 1 : arr.length + pos;
    return [...arr.slice(0, idx), newItem, ...arr.slice(idx)];
  },

  remove([list = null, position = null]) {
    if (!Array.isArray(list) || !isNum(position)) return null;
    const arr = list as FeelValue[];
    const pos = asDecimal(position)!.toNumber();
    const idx = pos > 0 ? pos - 1 : arr.length + pos;
    return arr.filter((_, i) => i !== idx);
  },

  reverse([list = null]) {
    if (!Array.isArray(list)) return null;
    return [...(list as FeelValue[])].reverse();
  },

  'index of'([list = null, match = null]) {
    if (!Array.isArray(list)) return null;
    const result: FeelValue[] = [];
    (list as FeelValue[]).forEach((item, i) => {
      if (feelEqual(item, match) === true) result.push(D(i + 1));
    });
    return result;
  },

  union(args) {
    const all = args.flatMap((a) => toList(a));
    const unique: FeelValue[] = [];
    for (const item of all) {
      const found = unique.some((u) => feelEqual(u, item) === true);
      if (!found) unique.push(item);
    }
    return unique;
  },

  'distinct values'([list = null]) {
    if (!Array.isArray(list)) return null;
    const unique: FeelValue[] = [];
    for (const item of list as FeelValue[]) {
      const found = unique.some((u) => feelEqual(u, item) === true);
      if (!found) unique.push(item);
    }
    return unique;
  },

  'duplicate values'([list = null]) {
    if (!Array.isArray(list)) return null;
    const seen: FeelValue[] = [];
    const dupes: FeelValue[] = [];
    for (const item of list as FeelValue[]) {
      const inSeen = seen.some((s) => feelEqual(s, item) === true);
      if (inSeen) {
        const inDupes = dupes.some((d) => feelEqual(d, item) === true);
        if (!inDupes) dupes.push(item);
      } else {
        seen.push(item);
      }
    }
    return dupes;
  },

  flatten([list = null]) {
    if (!Array.isArray(list)) return null;
    return flatten(list as FeelValue[]);
  },

  product(args) {
    const items = args.length === 1 && Array.isArray(args[0]) ? (args[0] as FeelValue[]) : args;
    if (items.length === 0) return null;
    let product = D(1);
    for (const item of items) {
      if (!isNum(item)) return null;
      product = product.times(asDecimal(item)!);
    }
    return product;
  },

  sublist([list = null, start = null, length = null]) {
    if (!Array.isArray(list) || !isNum(start)) return null;
    const arr = list as FeelValue[];
    const s0 = asDecimal(start)!.toNumber();
    const s = s0 > 0 ? s0 - 1 : arr.length + s0;
    if (length === undefined || length === null) return arr.slice(s);
    if (!isNum(length)) return null;
    const len = asDecimal(length)!.toNumber();
    return arr.slice(s, s + len);
  },

  all(args) {
    if (args.length === 0) return null;
    const items = args.length === 1 && Array.isArray(args[0]) ? (args[0] as FeelValue[]) : args;
    if (items.some((v) => v === false)) return false;
    if (items.some((v) => typeof v !== 'boolean')) return null;
    return true;
  },

  any(args) {
    if (args.length === 0) return null;
    const items = args.length === 1 && Array.isArray(args[0]) ? (args[0] as FeelValue[]) : args;
    if (items.some((v) => v === true)) return true;
    if (items.some((v) => typeof v !== 'boolean')) return null;
    return false;
  },

  'list replace'(args) {
    const [listArg = null, posOrFn = null, newItem = null] = args;
    const list = Array.isArray(listArg)
      ? (listArg as FeelValue[])
      : listArg !== null
        ? [listArg]
        : null;
    if (list === null) return null;
    type FeelFn = { kind: 'function'; params: string[]; body: (args: FeelValue[]) => FeelValue };
    if (
      posOrFn !== null &&
      typeof posOrFn === 'object' &&
      'kind' in posOrFn &&
      (posOrFn as FeelFn).kind === 'function'
    ) {
      const fn = posOrFn as FeelFn;
      if (fn.params.length !== 2) return null;
      const result: FeelValue[] = [];
      for (const item of list) {
        const r = fn.body([item, newItem]);
        if (typeof r !== 'boolean') return null;
        result.push(r === true ? newItem : item);
      }
      return result;
    }
    if (!isNum(posOrFn)) return null;
    const pos = Math.trunc(asDecimal(posOrFn)!.toNumber());
    if (!Number.isFinite(pos) || pos === 0) return null;
    const idx = pos > 0 ? pos - 1 : list.length + pos;
    if (idx < 0 || idx >= list.length) return null;
    const result = [...list];
    result[idx] = newItem;
    return result;
  },

  sort([list = null, comparatorFn = null]) {
    if (!Array.isArray(list)) return null;
    type FeelFn = { kind: 'function'; params: string[]; body: (args: FeelValue[]) => FeelValue };
    const arr = [...(list as FeelValue[])];
    arr.sort((a, b) => {
      if (
        comparatorFn !== null &&
        typeof comparatorFn === 'object' &&
        'kind' in comparatorFn &&
        (comparatorFn as FeelFn).kind === 'function'
      ) {
        const result = (comparatorFn as FeelFn).body([a, b]);
        return result === true ? -1 : 1;
      }
      const cmp = feelCompare(a, b);
      return cmp ?? 0;
    });
    return arr;
  },
};
