import { describe, expect, it } from 'vitest';
import { evaluate } from '../index.js';

describe('temporal', () => {
  it('date literal', () => {
    const result = evaluate('date("2024-01-15")');
    expect(result.value).toMatchObject({ year: 2024, month: 1, day: 15 });
  });

  it('time literal', () => {
    const result = evaluate('time("10:30:00")');
    expect(result.value).toMatchObject({ hour: 10, minute: 30, second: 0 });
  });

  it('date and time literal', () => {
    const result = evaluate('date and time("2024-01-15T10:30:00")');
    expect(result.value).toMatchObject({ year: 2024, month: 1, day: 15, hour: 10 });
  });

  it('duration literal', () => {
    const result = evaluate('duration("P1Y2M")');
    expect(result.value).toMatchObject({ years: 1, months: 2 });
  });

  it('days and time duration', () => {
    const result = evaluate('duration("P1DT2H3M4S")');
    expect(result.value).toMatchObject({ days: 1, hours: 2, minutes: 3, seconds: 4 });
  });

  it('date comparison', () => {
    expect(evaluate('date("2024-01-15") > date("2024-01-01")').value).toBe(true);
    expect(evaluate('date("2024-01-01") = date("2024-01-01")').value).toBe(true);
  });

  it('date arithmetic: add duration', () => {
    const result = evaluate('date("2024-01-01") + duration("P1Y")');
    expect(result.value).toMatchObject({ year: 2025, month: 1, day: 1 });
  });

  it('date functions', () => {
    expect(evaluate('day of week(date("2024-01-15"))').value).toBe('Monday');
    expect(evaluate('month of year(date("2024-03-15"))').value).toBe('March');
  });

  it('years and months duration', () => {
    const result = evaluate('years and months duration(date("2020-01-01"), date("2024-06-01"))');
    expect(result.value).toMatchObject({ years: 4, months: 5 });
  });
});
