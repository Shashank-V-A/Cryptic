import { describe, expect, it } from 'vitest';
import { formatInr, moneySign } from './format.js';

describe('formatInr', () => {
  it('returns em dash for nullish and empty values', () => {
    expect(formatInr(null)).toBe('—');
    expect(formatInr(undefined)).toBe('—');
    expect(formatInr('')).toBe('—');
  });

  it('formats INR without treating missing as zero', () => {
    expect(formatInr('1234.5')).toMatch(/₹1,234\.50/);
    expect(formatInr(0)).toMatch(/₹0\.00/);
    expect(formatInr('-99.1')).toMatch(/-₹99\.10/);
  });

  it('supports custom fallback for unavailable amounts', () => {
    expect(formatInr(null, { fallback: 'Price unavailable' })).toBe('Price unavailable');
  });
});

describe('moneySign', () => {
  it('classifies sign from decimal strings without float coercion of magnitude', () => {
    expect(moneySign('0')).toBe(0);
    expect(moneySign('0.00')).toBe(0);
    expect(moneySign('-12.5')).toBe(-1);
    expect(moneySign('9007199254740993.12')).toBe(1);
  });
});
