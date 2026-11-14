import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { validateReceiptFinancials } from './financialValidationService.js';

/**
 * Check whether Gemini API Key is configured in environment
 */
export const isGeminiConfigured = () => {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && typeof key === 'string' && key.trim().length > 10);
};

/**
 * Get active Gemini Vision model name (defaults to current Gemini 2.5 Flash)
 */
export const getGeminiModelName = () => {
  return process.env.GEMINI_MODEL || 'gemini-3.8-flash';
};

const RECEIPT_ANALYSIS_PROMPT = `
You are a precision document intelligence and receipt recognition system.
Analyze this document image (it may be a shopping invoice, restaurant bill, educational fee receipt, utility bill, medical receipt, GST tax invoice, payment voucher, or handwritten receipt).

CRITICAL EXTRACTION RULES:
1. Strict Authenticity: Extract EXACT wording and numbers as printed/written on the document. Do NOT invent, assume, translate, or extrapolate missing information.
2. Unreadable / Missing Fields: If any field is missing, obscured, or illegible, set its value strictly to null.
3. Numerical Precision: Return numbers as plain numeric floats (e.g. 1499.50), not strings with currency symbols.
4. Total vs Phone/Tax ID Guard: NEVER confuse a 10-digit mobile phone number, 15-character GSTIN, or invoice/receipt number with the financial total. The grandTotal MUST be the final net payable amount.
5. Line Items: List individual items, services, or fee heads where visible. If line items are not broken down, return an empty array [].
6. Complete Raw Text: Provide a full, faithful transcription of all legible text in the "rawText" field, preserving line breaks.

OUTPUT STRICTLY IN THIS JSON STRUCTURE:
{
  "merchant": {
    "name": string or null,
    "address": string or null,
    "phone": string or null,
    "taxId": string or null
  },
  "invoice": {
    "receiptNumber": string or null,
    "date": string or null,
    "time": string or null
  },
  "customer": {
    "name": string or null,
    "phone": string or null
  },
  "items": [
    {
      "description": string,
      "quantity": number or null,
      "unitPrice": number or null,
      "amount": number or null
    }
  ],
  "financials": {
    "subtotal": number or null,
    "discount": number or null,
    "tax": number or null,
    "grandTotal": number or null,
    "currency": string or null
  },
  "payment": {
    "method": "Cash" | "UPI" | "Bank Transfer" | "Card" | "Other" | null,
    "referenceNumber": string or null
  },
  "documentClassification": "receipt" | "invoice" | "bill" | "business_document" | "handwritten_note" | "other",
  "notes": string or null,
  "rawText": string
}
`;

/**
 * Extract structured receipt data using Google Gemini Flash Vision
 * @param {string} filePath - Absolute path to local image or PDF file
 * @param {string} mimeType - File MIME type (image/jpeg, image/png, image/webp, application/pdf)
 */
export const extractReceiptWithGemini = async (filePath, mimeType) => {
  if (!isGeminiConfigured()) {
    throw new Error(
      'GEMINI_API_KEY environment variable is not configured. Please add GEMINI_API_KEY to your backend .env file.'
    );
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Document file not found at path: ${filePath}`);
  }

  const modelName = getGeminiModelName();
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY.trim() });

  const fileBuffer = await fs.promises.readFile(filePath);
  const base64Data = fileBuffer.toString('base64');

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: RECEIPT_ANALYSIS_PROMPT,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1, // Low temperature for maximum extraction fidelity
      },
    });

    const responseText = response?.text ? response.text.trim() : '';
    if (!responseText) {
      throw new Error('Gemini Vision returned an empty extraction response.');
    }

    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (jsonErr) {
      // Attempt cleaning markdown block formatting if present
      const cleaned = responseText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    // Perform comprehensive financial calculation verification
    const validation = validateReceiptFinancials(parsedData);

    return {
      structuredData: parsedData,
      rawText: parsedData.rawText || '',
      confidence: validation.confidenceScore,
      financialValidation: validation,
      documentType: parsedData.documentClassification || 'receipt',
      engine: modelName,
    };
  } catch (error) {
    console.error(`[Gemini Vision Error]: Failed extracting from ${filePath}:`, error.message);
    throw new Error(`Gemini Vision receipt extraction failed: ${error.message}`);
  }
};
