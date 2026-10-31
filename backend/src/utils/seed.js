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

export const seedDefaults = async () => {
  try {
    // Drop old obsolete global unique name_1 index if present on Category
    try {
      await Category.collection.dropIndex('name_1');
    } catch (ignore) {}

    // Drop old obsolete global unique key_1 index if present on Settings
    try {
      await Settings.collection.dropIndex('key_1');
    } catch (ignore) {}

    // Seed global default categories (userId: null) if none exist
    const defaultCount = await Category.countDocuments({ userId: null });
    if (defaultCount === 0) {
      await Category.insertMany(defaultCategories.map((c) => ({ ...c, userId: null })));
      console.log(`[Seed] Seeded ${defaultCategories.length} default categories.`);
    }

    // Seed a convenient demo user for immediate evaluation
    const demoEmail = 'demo@techmines.com';
    let demoUser = await User.findOne({ email: demoEmail });
    if (!demoUser) {
      demoUser = await User.create({
        name: 'TechMines Admin',
        email: demoEmail,
        password: 'Password123!',
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
      console.log('[Seed] Seeded demo user: demo@techmines.com / Password123!');
    }
  } catch (err) {
    console.error('[Seed] Error in seedDefaults:', err.message);
  }
};
