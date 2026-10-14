export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CHF: 'CHF ',
  CAD: 'CA$',
  AUD: 'A$',
  INR: '₹',
  SGD: 'S$',
};

export function formatCents(cents: number, currency: string = 'USD'): string {
  const isJpy = currency === 'JPY';
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;

  if (isJpy) {
    const isNeg = cents < 0;
    const abs = Math.abs(cents);
    return `${isNeg ? '-' : ''}${symbol}${abs.toLocaleString('en-US')}`;
  }

  const isNeg = cents < 0;
  const abs = Math.abs(cents);
  const dollars = (abs / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${isNeg ? '-' : ''}${symbol}${dollars}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}
