import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    openingBalance: {
      type: Number,
      default: 0,
      set: (val) => Math.round(Number(val) * 100) / 100,
    },
    openingBalanceDate: {
      type: Date,
      default: Date.now,
    },
    openingBalanceNotes: {
      type: String,
      default: '',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    companyName: {
      type: String,
      default: 'TechMines',
    },
  },
  {
    timestamps: true,
  }
);

export const Settings = mongoose.model('Settings', settingsSchema);
