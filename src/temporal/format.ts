import type { FeelDate, FeelDateTime, FeelTime } from '../types.js';

function pad2(n: number): string {
  return String(Math.abs(n)).padStart(2, '0');
}

function pad4(n: number): string {
  const abs = Math.abs(n);
  const s = String(abs).padStart(4, '0');
  return n < 0 ? `-${s}` : s;
}

function formatNano(ns: number): string {
  if (ns === 0) return '';
  const s = String(ns).padStart(9, '0').replace(/0+$/, '');
  return `.${s}`;
}

function formatOffset(offset: number | null, timezone: string | null): string {
  if (timezone !== null) return `@${timezone}`;
  if (offset === null) return '';
  if (offset === 0) return 'Z';
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  if (s > 0) {
    return `${sign}${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  }
  return `${sign}${pad2(h)}:${pad2(m)}`;
}

export function formatDate(d: FeelDate): string {
  return `${pad4(d.year)}-${pad2(d.month)}-${pad2(d.day)}`;
}

export function formatTime(t: FeelTime): string {
  return (
    `${pad2(t.hour)}:${pad2(t.minute)}:${pad2(t.second)}` +
    formatNano(t.nanosecond) +
    formatOffset(t.offset, t.timezone)
  );
}

export function formatDateTime(dt: FeelDateTime): string {
  return (
    `${pad4(dt.year)}-${pad2(dt.month)}-${pad2(dt.day)}T` +
    `${pad2(dt.hour)}:${pad2(dt.minute)}:${pad2(dt.second)}` +
    formatNano(dt.nanosecond) +
    formatOffset(dt.offset, dt.timezone)
  );
}
