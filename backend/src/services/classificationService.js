/**
 * Financial Classification & Categorization Service for Universal Receipt OCR
 * Determines proposed transaction type ('expense' vs 'incoming') and suggests
 * the best matching category based on contextual analysis of the document.
 */

const EXPENSE_KEYWORD_MAP = [
  { category: 'Electricity', keywords: ['electricity', 'power', 'discom', 'energy bill', 'tata power', 'bescom', 'kwh', 'meter reading', 'electric'] },
  { category: 'Internet', keywords: ['broadband', 'wifi', 'internet', 'fiber', 'airtel broadband', 'jio fiber', 'act fibernet'] },
  { category: 'Food', keywords: ['restaurant', 'cafe', 'dining', 'food', 'bakery', 'kitchen', 'swiggy', 'zomato', 'pizza', 'burger', 'biryani', 'meal', 'lunch', 'dinner', 'coffee', 'snacks'] },
  { category: 'Office Supplies', keywords: ['stationery', 'paper', 'printer', 'notebook', 'cartridge', 'croma', 'electronics', 'stapler', 'pen', 'mouse', 'keyboard', 'hardware'] },
  { category: 'Travel', keywords: ['uber', 'ola', 'flight', 'airline', 'irctc', 'railway', 'taxi', 'cab', 'petrol', 'diesel', 'fuel', 'toll', 'hotel', 'stay'] },
  { category: 'Software and Subscriptions', keywords: ['software', 'subscription', 'aws', 'google cloud', 'azure', 'github', 'vercel', 'hostinger', 'domain', 'saas', 'cloud hosting'] },
  { category: 'Maintenance', keywords: ['repair', 'plumbing', 'cleaning', 'sanitation', 'air conditioner', 'hvac', 'servicing', 'maintenance'] },
  { category: 'Marketing', keywords: ['marketing', 'advertising', 'facebook ads', 'google ads', 'meta ads', 'banner', 'branding', 'flyer'] },
  { category: 'Office Rent', keywords: ['rent', 'lease', 'commercial rent', 'office space', 'landlord'] },
];

const INCOMING_KEYWORD_MAP = [
  { category: 'Client Payment', keywords: ['client payment', 'received from', 'received with thanks from', 'customer payment', 'invoice settlement', 'bill payment from client'] },
  { category: 'Project Advance', keywords: ['project advance', 'advance payment', 'token payment', 'initial deposit'] },
  { category: 'Consulting Fee', keywords: ['consulting fee', 'advisory fee', 'professional fee received', 'training fee'] },
  { category: 'Refund', keywords: ['refund', 'reimbursement credit', 'cashback', 'reversal'] },
];

export const classifyReceiptTransaction = (structuredData = {}, rawText = '', availableCategories = []) => {
  const text = (rawText || '').toLowerCase();
  const s = structuredData || {};
  const merchantName = (s.merchantName?.value || s.merchant?.name || '').toLowerCase();
  const payerName = (s.payerName?.value || '').toLowerCase();
  const docType = (s.documentType || '').toLowerCase();

  const combinedSearchText = `${text} ${merchantName} ${payerName} ${docType}`;

  // 1. Contextual Type Classification: Incoming vs Expense
  // Strong indicators of incoming money
  const incomingMatches = [
    'received with thanks from',
    'received from',
    'payment received from',
    'customer payment',
    'deposit receipt',
    'student fee collection',
    'tuition fee collection',
    'client receipt',
    'receipt for payment received',
    'credit voucher',
    'amount credited',
  ].filter((phrase) => combinedSearchText.includes(phrase));

  // Strong indicators of expense
  const expenseMatches = [
    'tax invoice',
    'retail invoice',
    'bill of supply',
    'cash memo',
    'retail cash memo',
    'sold by',
    'vendor',
    'gstin',
    'cgst',
    'sgst',
    'igst',
    'billed to',
    'buyer',
    'customer copy',
    'card slip',
    'terminal id',
  ].filter((phrase) => combinedSearchText.includes(phrase));

  let proposedType = 'expense';
  let typeConfidence = 85;
  let classificationReason = 'Classified as Expense based on commercial vendor receipt/invoice.';

  if (incomingMatches.length > 0 && incomingMatches.length >= expenseMatches.length) {
    proposedType = 'incoming';
    typeConfidence = 90;
    classificationReason = `Classified as Incoming payment based on receipts phrase "${incomingMatches[0]}".`;
  } else if (docType === 'handwritten_note' && combinedSearchText.includes('received')) {
    proposedType = 'incoming';
    typeConfidence = 75;
    classificationReason = 'Classified as Incoming payment based on handwritten receipt text.';
  }

  // 2. Category Suggestion
  let suggestedCategory = proposedType === 'incoming' ? 'Client Payment' : 'Office Supplies';
  let categoryConfidence = 70;

  const targetMap = proposedType === 'incoming' ? INCOMING_KEYWORD_MAP : EXPENSE_KEYWORD_MAP;

  for (const group of targetMap) {
    const match = group.keywords.find((k) => combinedSearchText.includes(k));
    if (match) {
      suggestedCategory = group.category;
      categoryConfidence = 90;
      break;
    }
  }

  // Check if suggested category exists in user categories; if not, find best fuzzy match
  if (Array.isArray(availableCategories) && availableCategories.length > 0) {
    const directMatch = availableCategories.find(
      (c) => c.name.toLowerCase() === suggestedCategory.toLowerCase()
    );
    if (directMatch) {
      suggestedCategory = directMatch.name;
    } else {
      const partialMatch = availableCategories.find((c) =>
        (c.type === proposedType || c.type === 'both') &&
        (c.name.toLowerCase().includes(suggestedCategory.toLowerCase()) ||
         suggestedCategory.toLowerCase().includes(c.name.toLowerCase()))
      );
      if (partialMatch) {
        suggestedCategory = partialMatch.name;
      }
    }
  }

  return {
    proposedType,
    suggestedCategory,
    confidence: Math.round((typeConfidence + categoryConfidence) / 2),
    reason: classificationReason,
  };
};
