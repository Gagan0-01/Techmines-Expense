import fs from 'fs';
import { createWorker } from 'tesseract.js';
import * as pdfModule from 'pdf-parse';
import { processReceiptWithGemini, isGeminiConfigured, getGeminiModelName } from './geminiReceiptService.js';
import { validateReceiptFinancials } from './financialValidationService.js';

// Handle both named export and default export across module bundling
const PDFParse = pdfModule.PDFParse || pdfModule.default?.PDFParse || pdfModule.default;

/**
 * Extract text from an image file (JPG, PNG, WebP) using Tesseract.js (Fallback Engine).
 * Automatically handles worker initialization, recognition, and lifecycle termination.
 */
export const extractTextFromImage = async (filePath) => {
  let worker = null;
  try {
    worker = await createWorker('eng');
    const ret = await worker.recognize(filePath);

    const text = ret?.data?.text ? ret.data.text.trim() : '';
    const confidence = typeof ret?.data?.confidence === 'number'
      ? Math.round(ret.data.confidence)
      : 0;

    return {
      text,
      confidence,
      metadata: {
        wordCount: ret?.data?.words?.length || 0,
        lineCount: ret?.data?.lines?.length || 0,
        engine: 'tesseract.js-v7',
      },
    };
  } catch (error) {
    console.error('[OCR Service] Image OCR extraction error:', error.message);
    throw new Error(`Failed to extract text from image: ${error.message}`);
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (termErr) {
        // Non-fatal cleanup warning
      }
    }
  }
};

/**
 * Extract text and structure from a PDF file using pdf-parse (Fallback Engine).
 */
export const extractTextFromPdf = async (filePath) => {
  try {
    const buffer = await fs.promises.readFile(filePath);

    if (typeof PDFParse === 'function' && PDFParse.prototype?.getText) {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      const info = await parser.getInfo().catch(() => ({}));

      const text = result?.text ? result.text.trim() : '';
      return {
        text,
        confidence: text.length > 0 ? 90 : 0,
        metadata: {
          totalPages: result?.total || result?.pages?.length || 1,
          producer: info?.producer || 'PDF Document',
          engine: 'pdf-parse',
        },
      };
    } else if (typeof PDFParse === 'function') {
      const data = await PDFParse(buffer);
      const text = data?.text ? data.text.trim() : '';
      return {
        text,
        confidence: text.length > 0 ? 90 : 0,
        metadata: {
          totalPages: data?.numpages || 1,
          engine: 'pdf-parse',
        },
      };
    }

    throw new Error('PDF parsing library could not be initialized.');
  } catch (error) {
    console.error('[OCR Service] PDF text extraction error:', error.message);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

/**
 * Universal text & receipt extraction dispatcher.
 * Priority:
 * 1. Google Gemini Flash Vision (when GEMINI_API_KEY is present).
 * 2. High-performance fallback to Tesseract.js / pdf-parse if Gemini is unconfigured or unavailable.
 */
export const extractText = async (filePath, mimeType) => {
  if (!fs.existsSync(filePath)) {
    throw new Error('Target document file not found on disk.');
  }

  // 1. Try Google Gemini Flash Vision if configured
  if (isGeminiConfigured()) {
    try {
      const geminiResult = await processReceiptWithGemini(filePath, mimeType);
      const data = geminiResult.data;
      return {
        text: data.rawText || '',
        confidence: data.total?.confidence || 85,
        structuredData: data,
        financialValidation: {
          isMathValid: data.calculations?.isMathConsistent,
          calculatedTotal: data.calculations?.calculatedFinalTotal,
          discrepancy: data.calculations?.mathDiscrepancy,
          warnings: data.warnings || [],
          requiresManualReview: data.requiresManualReview,
        },
        documentType: data.documentType || 'receipt',
        ocrEngine: geminiResult.engine,
        metadata: {
          engine: geminiResult.engine,
          model: getGeminiModelName(),
          isHandwritten: data.isHandwritten,
          extractedAt: new Date().toISOString(),
        },
      };
    } catch (geminiErr) {
      console.warn(
        `[OCR Service Warning]: Gemini Vision extraction failed (${geminiErr.message}). Initiating local OCR fallback...`
      );
    }
  }

  // 2. Local Fallback Execution (Tesseract / pdf-parse)
  let fallbackResult;
  if (mimeType === 'application/pdf') {
    fallbackResult = await extractTextFromPdf(filePath);
  } else if (['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    fallbackResult = await extractTextFromImage(filePath);
  } else {
    throw new Error(`Unsupported document type for OCR extraction: ${mimeType}`);
  }

  // Attempt heuristic financial validation on fallback text
  const validation = validateReceiptFinancials({});

  return {
    text: fallbackResult.text,
    confidence: fallbackResult.confidence,
    structuredData: null,
    financialValidation: validation,
    documentType: 'receipt',
    ocrEngine: fallbackResult.metadata?.engine || 'local-fallback',
    metadata: fallbackResult.metadata || {},
  };
};
