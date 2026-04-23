import Decimal from 'decimal.js';

// Decimal128: 34 significant digits, half-even rounding (FEEL spec §10.3.2.3)
Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_EVEN, toExpNeg: -34, toExpPos: 34 });

export { Decimal };

export function D(v: string | number | Decimal): Decimal {
  return new Decimal(v);
}

export function isDecimal(v: unknown): v is Decimal {
  return v instanceof Decimal;
}

// Convert any numeric FeelValue to Decimal
export function asDecimal(v: unknown): Decimal | null {
  if (v instanceof Decimal) return v;
  if (typeof v === 'number') return new Decimal(v);
  return null;
}

// Safe integer from a numeric FeelValue (for indexes, scale params, temporal fields)
export function asInt(v: unknown): number | null {
  const d = asDecimal(v);
  if (!d) return null;
  return d.toNumber();
}

// Is v a FEEL numeric type (number or Decimal)
export function isNum(v: unknown): v is number | Decimal {
  return typeof v === 'number' || v instanceof Decimal;
}
