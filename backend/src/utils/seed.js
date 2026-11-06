import { Category } from '../models/Category.js';
import { Settings } from '../models/Settings.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';

export const defaultCategories = [
  // Expense categories
  { name: 'Office Rent', type: 'expense', isDefault: true },
  { name: 'Salary', type: 'expense', isDefault: true },
  { name: 'Electricity', type: 'expense', isDefault: true },
  { name: 'Internet', type: 'expense', isDefault: true },
  { name: 'Office Supplies', type: 'expense', isDefault: true },
  { name: 'Travel', type: 'expense', isDefault: true },
  { name: 'Food', type: 'expense', isDefault: true },
  { name: 'Software and Subscriptions', type: 'expense', isDefault: true },
  { name: 'Maintenance', type: 'expense', isDefault: true },
  { name: 'Marketing', type: 'expense', isDefault: true },
  // Incoming categories
  { name: 'Client Payment', type: 'incoming', isDefault: true },
  { name: 'Project Advance', type: 'incoming', isDefault: true },
  { name: 'Consulting Fee', type: 'incoming', isDefault: true },
  { name: 'Investment', type: 'incoming', isDefault: true },
  { name: 'Refund', type: 'incoming', isDefault: true },
  // Both
  { name: 'Other', type: 'both', isDefault: true },
];

/**
 * Non-destructive default initialization.
 * Guards:
 * - In production: strictly skips demo users, sample transactions, and index modifications.
 * - In all environments: never overwrites or deletes existing data.
 */
export const seedDefaults = async () => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    // 1. Seed global default categories (userId: null) ONLY if zero categories exist
    const defaultCount = await Category.countDocuments({ userId: null });
    if (defaultCount === 0) {
      await Category.insertMany(defaultCategories.map((c) => ({ ...c, userId: null })));
      console.log(`[Seed] Initialized ${defaultCategories.length} default global categories.`);
    }

    // 2. Production Safety Guard: Never seed demo users or mock transactions in production
    if (isProduction) {
      return;
    }

    // 3. In non-production (development only): Seed demo user only if it does not already exist
    const demoEmail = 'demo@techmines.com';
    let demoUser = await User.findOne({ email: demoEmail });
    if (!demoUser) {
      const anyOwner = await User.findOne({ isOwner: true });
      demoUser = await User.create({
        name: 'TechMines Admin',
        email: demoEmail,
        password: 'Password123!',
        role: anyOwner ? 'member' : 'admin',
        isOwner: !anyOwner,
      });

      // Settings for demo user
      await Settings.create({
        userId: demoUser._id,
        openingBalance: 50000,
        currency: 'INR',
        companyName: 'TechMines',
      });

      // Sample transactions for demo user
      await Transaction.create([
        {
          userId: demoUser._id,
          title: 'Client Project Advance - Web App',
          amount: 65000,
          type: 'incoming',
          category: 'Client Payment',
          paymentMethod: 'Bank Transfer',
          date: new Date(),
          referenceNumber: 'NEFT-883921',
          notes: 'First milestone advance payment',
        },
        {
          userId: demoUser._id,
          title: 'Office High-Speed Fiber Internet',
          amount: 4500,
          type: 'expense',
          category: 'Internet',
          paymentMethod: 'UPI',
          date: new Date(),
          referenceNumber: 'UPI-77401',
          notes: 'Quarterly internet connection',
        },
        {
          userId: demoUser._id,
          title: 'Ergonomic Office Desks & Chairs',
          amount: 18000,
          type: 'expense',
          category: 'Office Supplies',
          paymentMethod: 'Bank Transfer',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000),
          notes: 'Workstation setup for design team',
        },
      ]);
      console.log('[Seed] Dev demo user initialized: demo@techmines.com / Password123!');
    }
  } catch (err) {
    console.error('[Seed] Non-fatal initialization note:', err.message);
  }
};
