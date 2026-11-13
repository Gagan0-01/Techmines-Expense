import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Document must belong to an authenticated user'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    originalFileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
    },
    storedFileName: {
      type: String,
      required: [true, 'Stored file name is required'],
      trim: true,
      unique: true,
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      enum: {
        values: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        message: 'Unsupported file type. Must be JPG, PNG, WebP, or PDF',
      },
    },
    fileSize: {
      type: Number,
      required: [true, 'File size in bytes is required'],
    },
    storagePath: {
      type: String,
      required: [true, 'Storage path is required'],
    },
    documentType: {
      type: String,
      enum: ['receipt', 'invoice', 'bill', 'business_document', 'handwritten_note', 'other'],
      default: 'receipt',
      index: true,
    },
    extractedText: {
      type: String,
      default: '',
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    processingError: {
      type: String,
      default: null,
    },
    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    structuredData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    financialValidation: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ocrEngine: {
      type: String,
      default: 'gemini-flash',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient user-scoped queries and searching
documentSchema.index({ userId: 1, createdAt: -1 });
documentSchema.index({ userId: 1, documentType: 1 });
documentSchema.index({ userId: 1, processingStatus: 1 });

export const Document = mongoose.model('Document', documentSchema);

