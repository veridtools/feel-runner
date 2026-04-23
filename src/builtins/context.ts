import type { FeelContext, FeelValue } from '../types.js';
import { isFeelContext } from '../types.js';

function setNestedKey(ctx: FeelContext, keys: string[], value: FeelValue): FeelContext | null {
  if (keys.length === 0) return null;
  const [head, ...tail] = keys;
  if (!head) return null;
  if (tail.length === 0) {
    return { ...ctx, [head]: value };
  }
  const existing = ctx[head] ?? null;
  // Intermediate value must be a context (or absent) to traverse deeper
  if (existing !== null && !isFeelContext(existing)) return null;
  const nested = isFeelContext(existing) ? (existing as FeelContext) : {};
  const result = setNestedKey(nested, tail, value);
  if (result === null) return null;
  return { ...ctx, [head]: result };
}

export const contextBuiltins: Record<string, (args: FeelValue[]) => FeelValue> = {
  'get value'(args) {
    if (args.length > 2) return null;
    const [ctx = null, key = null] = args;
    if (!isFeelContext(ctx)) return null;
    if (typeof key !== 'string') return null;
    return ctx[key] ?? null;
  },

  'get entries'(args) {
    if (args.length > 1) return null;
    const [ctx = null] = args;
    if (!isFeelContext(ctx)) return null;
    return Object.entries(ctx).map(([key, value]) => ({ key, value }) as unknown as FeelValue);
  },

  context(args) {
    if (args.length !== 1) return null;
    const rawList: FeelValue = args[0] ?? null;
    // Coerce single entry to list
    const list = Array.isArray(rawList) ? rawList : isFeelContext(rawList) ? [rawList] : null;
    if (list === null) return null;
    const result: FeelContext = {};
    const seenKeys = new Set<string>();
    for (const entry of list as FeelValue[]) {
      if (!isFeelContext(entry)) return null;
      const key = (entry as FeelContext).key;
      if (typeof key !== 'string') return null;
      if (seenKeys.has(key)) return null; // duplicate key = error
      seenKeys.add(key);
      if (!('value' in (entry as FeelContext))) return null;
      const val = (entry as FeelContext).value;
      result[key] = val !== undefined ? val : null;
    }
    return result;
  },

  'context put'(args) {
    if (args.length < 3) return null;
    const [ctx = null, keyOrKeys = null, value = null] = args;
    // args[3] may hold the 'keys' named param (list form) when params are ['context','key','value','keys']
    const keysArg: FeelValue = args[3] ?? null;
    if (!isFeelContext(ctx)) return null;
    // Named 'keys' form: list of strings for nested path
    if (keysArg !== undefined && keysArg !== null) {
      if (!Array.isArray(keysArg)) return null;
      const keys = keysArg as FeelValue[];
      if (keys.length === 0) return null;
      if (keys.some((k) => typeof k !== 'string')) return null;
      return setNestedKey(ctx, keys as string[], value ?? null);
    }
    if (Array.isArray(keyOrKeys)) {
      if (args.length !== 3) return null;
      const keys = keyOrKeys as FeelValue[];
      if (keys.length === 0) return null;
      if (keys.some((k) => typeof k !== 'string')) return null;
      return setNestedKey(ctx, keys as string[], value ?? null);
    }
    if (typeof keyOrKeys !== 'string') return null;
    return { ...ctx, [keyOrKeys]: value ?? null };
  },

  'context merge'(args) {
    if (args.length === 0) return null;
    // Accept either a single list arg or multiple context args
    const list =
      args.length === 1 && Array.isArray(args[0])
        ? (args[0] as FeelValue[])
        : (args as FeelValue[]);
    const result: FeelContext = {};
    for (const item of list) {
      if (!isFeelContext(item)) return null;
      Object.assign(result, item);
    }
    return result;
  },
};
