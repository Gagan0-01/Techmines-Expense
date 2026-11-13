/**
 * Financial Calculation & Sanity Verification Service for Universal Receipt OCR
 * Validates extracted numerical amounts, detects invoice/phone confusion,
 * verifies arithmetic consistency (items sum, tax, discount, grand total),
 * and flags uncertain or conflicting data without mutating extracted numbers.
 */

export const validateReceiptFinancials = (structuredData = {}) => {
  const warnings = [];
  let isMathValid = true;
  let calculatedTotal = null;
  let discrepancy = 0;

  const financials = structuredData.financials || {};
  const items = Array.isArray(structuredData.items) ? structuredData.items : [];
  const invoice = structuredData.invoice || {};
  const merchant = structuredData.merchant || {};

  const grandTotal = typeof financials.grandTotal === 'number' ? financials.grandTotal : null;
  const subtotal = typeof financials.subtotal === 'number' ? financials.subtotal : null;
  const discount = typeof financials.discount === 'number' ? financials.discount : 0;
  const tax = typeof financials.tax === 'number' ? financials.tax : 0;

  // 1. Sanity check: Ensure grandTotal is not missing or zero
  if (grandTotal === null || grandTotal === undefined) {
    warnings.push('Grand total could not be determined with confidence.');
    isMathValid = false;
  } else if (grandTotal <= 0) {
    warnings.push('Grand total is zero or negative. Please review the receipt.');
    isMathValid = false;
  }

  // 2. Anti-Confusion Guard: Distinguish Phone Numbers and GSTIN from Grand Total
  if (grandTotal !== null) {
    // 10-digit Indian phone number range check
    if (grandTotal >= 6000000000 && grandTotal <= 9999999999) {
      warnings.push(
        `Warning: Grand total (${grandTotal}) resembles a 10-digit mobile phone number rather than a financial amount.`
      );
      isMathValid = false;
    }

    // Check if grandTotal matches merchant phone number exactly
    const phoneDigits = (merchant.phone || '').replace(/\D/g, '');
    if (phoneDigits && grandTotal.toString() === phoneDigits) {
      warnings.push('Critical: Extracted grand total matches the merchant phone number.');
      isMathValid = false;
    }

    // Check if grandTotal matches receipt number if numeric
    const receiptDigits = (invoice.receiptNumber || '').replace(/\D/g, '');
    if (receiptDigits && receiptDigits.length >= 6 && grandTotal.toString() === receiptDigits) {
      warnings.push('Warning: Grand total matches the receipt/invoice number.');
    }
  }

  // 3. Line Item Summation Verification
  let lineItemsSum = 0;
  let hasValidItems = false;

  items.forEach((item, index) => {
    const itemAmount = typeof item.amount === 'number' ? item.amount : null;
    const itemQty = typeof item.quantity === 'number' ? item.quantity : 1;
    const itemPrice = typeof item.unitPrice === 'number' ? item.unitPrice : null;

    if (itemAmount !== null && itemAmount > 0) {
      lineItemsSum += itemAmount;
      hasValidItems = true;

      // Verify line-item internal math: qty * unitPrice == itemAmount
      if (itemPrice !== null && itemQty > 0) {
        const expectedLineAmount = Math.round(itemQty * itemPrice * 100) / 100;
        const lineDiff = Math.abs(expectedLineAmount - itemAmount);
        if (lineDiff > 1.0) {
          warnings.push(
            `Line item #${index + 1} ("${item.description || 'Item'}") calculation mismatch: ${itemQty} × ${itemPrice} = ${expectedLineAmount}, but amount is ${itemAmount}.`
          );
        }
      }
    }
  });

  lineItemsSum = Math.round(lineItemsSum * 100) / 100;

  // 4. Subtotal vs Line Items check
  if (hasValidItems && subtotal !== null) {
    const subtotalDiff = Math.abs(lineItemsSum - subtotal);
    if (subtotalDiff > 1.5) {
      warnings.push(
        `Subtotal mismatch: Sum of item amounts (${lineItemsSum}) differs from extracted subtotal (${subtotal}) by ${Math.round(subtotalDiff * 100) / 100}.`
      );
      isMathValid = false;
    }
  }

  // 5. Grand Total Formula Verification: subtotal - discount + tax == grandTotal
  const baseForTotal = subtotal !== null ? subtotal : (hasValidItems ? lineItemsSum : null);

  if (baseForTotal !== null && grandTotal !== null) {
    calculatedTotal = Math.round((baseForTotal - discount + tax) * 100) / 100;
    discrepancy = Math.round(Math.abs(calculatedTotal - grandTotal) * 100) / 100;

    // Allow small rounding tolerance (up to 1.50 for paise/rounding/cess differences)
    if (discrepancy > 1.5) {
      warnings.push(
        `Grand total discrepancy: ${baseForTotal} (Subtotal) - ${discount} (Discount) + ${tax} (Tax) = ${calculatedTotal}, which differs from receipt grand total (${grandTotal}) by ${discrepancy}.`
      );
      isMathValid = false;
    }
  }

  // 6. Calculate Confidence Score (0-100)
  let confidenceScore = 95;

  if (warnings.length > 0) {
    confidenceScore -= warnings.length * 15;
  }
  if (!merchant.name) {
    confidenceScore -= 10;
    warnings.push('Merchant or institution name could not be identified.');
  }
  if (!invoice.date) {
    confidenceScore -= 10;
    warnings.push('Transaction date was not found on receipt.');
  }
  if (!grandTotal) {
    confidenceScore -= 30;
  }

  confidenceScore = Math.max(10, Math.min(100, confidenceScore));

  return {
    isMathValid,
    calculatedTotal: calculatedTotal !== null ? calculatedTotal : grandTotal,
    discrepancy,
    warnings,
    confidenceScore,
  };
};
