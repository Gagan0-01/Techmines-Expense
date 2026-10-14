import { describe, it, expect } from 'vitest';
import { toCents, centsToDecimalString, formatCurrency } from '../utils/currency';

describe('Currency and Integer Math Utils', () => {
  it('correctly converts decimal dollars to integer cents without floating point drift', () => {
    expect(toCents('125.50', 'USD')).toBe(12550);
    expect(toCents('0.01', 'USD')).toBe(1);
    expect(toCents('10.99', 'USD')).toBe(1099);
    expect(toCents('1,000,000.55', 'USD')).toBe(100000055);
    expect(toCents('-50.25', 'USD')).toBe(-5025);
  });

  it('handles zero-decimal currencies like JPY correctly', () => {
    expect(toCents('150000', 'JPY')).toBe(150000);
    expect(centsToDecimalString(150000, 'JPY')).toBe('150000');
  });

  it('formats cents back to decimal string', () => {
    expect(centsToDecimalString(12550, 'USD')).toBe('125.50');
    expect(centsToDecimalString(5, 'USD')).toBe('0.05');
    expect(centsToDecimalString(-5025, 'USD')).toBe('-50.25');
  });

  it('formats currency strings with appropriate symbols', () => {
    expect(formatCurrency(12550, 'USD')).toContain('125.50');
    expect(formatCurrency(100000, 'EUR')).toContain('1,000.00');
  });

  it('preserves precision for financial summation', () => {
    // Classic 0.1 + 0.2 floating point flaw: 0.1 + 0.2 === 0.30000000000000004
    // With integer cents: 10 + 20 === 30
    const a = toCents('0.10', 'USD');
    const b = toCents('0.20', 'USD');
    expect(a + b).toBe(30);
    expect(centsToDecimalString(a + b, 'USD')).toBe('0.30');
  });
});
