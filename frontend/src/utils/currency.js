/**
 * Indian Rupee (₹) Currency Formatter
 * Strict enforcement of en-IN numbering and Indian Rupee symbol
 */

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const formatINR = (amount, showSymbol = true) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return showSymbol ? '₹0' : '0';
  }

  const num = Number(amount);
  const formatted = inrFormatter.format(num);

  if (!showSymbol) {
    return formatted.replace('₹', '').trim();
  }

  return formatted;
};
