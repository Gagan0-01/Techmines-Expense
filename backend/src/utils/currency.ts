/**
 * Financial Currency & Minor-Unit (Cents) Math Utility
 * Strictly uses integer math to avoid binary floating-point representation errors.
 */

export const CURRENCY_CONFIG: Record<string, { symbol: string; decimals: number; name: string }> = {
  USD: { symbol: '$', decimals: 2, name: 'US Dollar' },
  EUR: { symbol: '€', decimals: 2, name: 'Euro' },
  GBP: { symbol: '£', decimals: 2, name: 'British Pound' },
  JPY: { symbol: '¥', decimals: 0, name: 'Japanese Yen' },
  CHF: { symbol: 'CHF', decimals: 2, name: 'Swiss Franc' },
  CAD: { symbol: 'CA$', decimals: 2, name: 'Canadian Dollar' },
  AUD: { symbol: 'A$', decimals: 2, name: 'Australian Dollar' },
  INR: { symbol: '₹', decimals: 2, name: 'Indian Rupee' },
  SGD: { symbol: 'S$', decimals: 2, name: 'Singapore Dollar' },
};

/**
 * Converts a decimal dollar string or number to integer cents.
 * e.g., "125.50" -> 12550, 10.99 -> 1099, "-5.00" -> -500
 */
export function toCents(amount: number | string, currency: string = 'USD'): number {
  if (typeof amount === 'number') {
    amount = amount.toString();
  }
  const clean = amount.trim().replace(/,/g, '');
  if (!clean || isNaN(Number(clean))) {
    return 0;
  }
  const config = CURRENCY_CONFIG[currency] || { decimals: 2 };
  if (config.decimals === 0) {
    return Math.round(Number(clean));
  }
  const isNegative = clean.startsWith('-');
  const unsigned = isNegative ? clean.substring(1) : clean;
  const parts = unsigned.split('.');
  const whole = parts[0] || '0';
  let fraction = parts[1] || '';
  if (fraction.length > config.decimals) {
    fraction = fraction.substring(0, config.decimals);
  } else {
    fraction = fraction.padEnd(config.decimals, '0');
  }
  const cents = parseInt(whole, 10) * Math.pow(10, config.decimals) + parseInt(fraction, 10);
  return isNegative ? -cents : cents;
}

/**
 * Converts integer cents to human-friendly formatted string.
 * e.g. 12550 -> "125.50"
 */
export function centsToDecimalString(cents: number, currency: string = 'USD'): string {
  const config = CURRENCY_CONFIG[currency] || { decimals: 2 };
  if (config.decimals === 0) {
    return cents.toString();
  }
  const isNegative = cents < 0;
  const abs = Math.abs(cents);
  const factor = Math.pow(10, config.decimals);
  const whole = Math.floor(abs / factor);
  const remainder = abs % factor;
  const fraction = remainder.toString().padStart(config.decimals, '0');
  return `${isNegative ? '-' : ''}${whole}.${fraction}`;
}

/**
 * Format cents with currency symbol and commas:
 * e.g. 12550, 'USD' -> "$125.50"
 */
export function formatCurrency(cents: number, currency: string = 'USD'): string {
  const config = CURRENCY_CONFIG[currency] || { symbol: '$', decimals: 2 };
  const dec = parseFloat(centsToDecimalString(cents, currency));
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(dec);
}
