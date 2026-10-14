import { describe, it, expect } from 'vitest';
import { formatCents, formatDate, formatDateTime, CURRENCY_SYMBOLS } from '../utils/formatters';

describe('formatters utility', () => {
  it('correctly maps currency symbols', () => {
    expect(CURRENCY_SYMBOLS.USD).toBe('$');
    expect(CURRENCY_SYMBOLS.EUR).toBe('€');
    expect(CURRENCY_SYMBOLS.GBP).toBe('£');
    expect(CURRENCY_SYMBOLS.JPY).toBe('¥');
  });

  it('formats cents to standard decimal currency string', () => {
    expect(formatCents(10050, 'USD')).toBe('$100.50');
    expect(formatCents(0, 'USD')).toBe('$0.00');
    expect(formatCents(5, 'USD')).toBe('$0.05');
  });

  it('handles negative balances correctly', () => {
    expect(formatCents(-25000, 'USD')).toBe('-$250.00');
  });

  it('formats zero-decimal currencies like JPY', () => {
    expect(formatCents(50000, 'JPY')).toBe('¥50,000');
    expect(formatCents(-12000, 'JPY')).toBe('-¥12,000');
  });

  it('formats date and datetime strings', () => {
    const iso = '2026-10-14T10:00:00.000Z';
    expect(formatDate(iso)).toBeTruthy();
    expect(formatDateTime(iso)).toBeTruthy();
    expect(formatDate('')).toBe('—');
    expect(formatDateTime('')).toBe('—');
  });
});
