import dotenv from 'dotenv';
dotenv.config();

/**
 * ISO-4217 Supported Currencies Allowlist
 */
export const SUPPORTED_CURRENCIES = Object.freeze([
  'INR', // Primary
  'USD',
  'EUR',
  'GBP',
  'AED',
  'SGD',
  'CAD',
  'AUD',
  'JPY',
]);

export const DEFAULT_CURRENCY = 'INR';

/**
 * Validates and retrieves MAX_OPENING_BALANCE configuration.
 * Fails fast on startup if environment variable is invalid.
 */
export const getValidatedMaxOpeningBalance = () => {
  const envVal = process.env.MAX_OPENING_BALANCE;
  const DEFAULT_MAX = 50000000; // Default: ₹50,000,000 (5 Crore)

  if (envVal === undefined || envVal === '') {
    return DEFAULT_MAX;
  }

  const parsed = Number(envVal);
  if (isNaN(parsed) || !Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `[Financial Config Error] Invalid MAX_OPENING_BALANCE in environment: "${envVal}". Must be a positive finite number.`
    );
  }

  return parsed;
};

// Validate during module initialization
export const MAX_OPENING_BALANCE = getValidatedMaxOpeningBalance();

/**
 * Safe monetary arithmetic using integer paise (1 Rupee = 100 Paise)
 * Prevents IEEE-754 floating-point drift.
 */
export const toPaise = (amount) => {
  if (typeof amount !== 'number' && typeof amount !== 'string') {
    throw new Error('Amount must be a number or numeric string');
  }
  const num = Number(amount);
  if (isNaN(num) || !Number.isFinite(num)) {
    throw new Error('Amount must be a valid finite number');
  }
  if (num < 0) {
    throw new Error('Amount cannot be negative');
  }
  return Math.round(num * 100);
};

export const fromPaise = (paise) => {
  if (typeof paise !== 'number' || isNaN(paise) || !Number.isFinite(paise)) {
    throw new Error('Paise must be a valid finite number');
  }
  return paise / 100;
};

export const isCurrencySupported = (currency) => {
  if (!currency || typeof currency !== 'string') return false;
  return SUPPORTED_CURRENCIES.includes(currency.trim().toUpperCase());
};

