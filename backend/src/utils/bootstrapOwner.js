import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { connectDB } from '../config/db.js';

dotenv.config();

/**
 * Secure, one-time owner bootstrap utility.
 * Guarantees that:
 * 1. Only executed when NO existing owner is registered.
 * 2. Does NOT run repeatedly or override existing ownership.
 * 3. Designates a single verified application owner with 'admin' role.
 */
export const bootstrapOwner = async (targetEmail) => {
  const email = (targetEmail || process.env.OWNER_EMAIL || '').trim().toLowerCase();

  if (!email) {
    console.error('❌ Bootstrap Error: No target owner email provided via argument or OWNER_EMAIL env var.');
    return { success: false, reason: 'missing_email' };
  }

  await connectDB();

  // Check if an owner already exists (One-time bootstrap enforcement)
  const existingOwner = await User.findOne({ isOwner: true });
  if (existingOwner) {
    console.warn(`⚠️ Bootstrap Guard: Owner already established (${existingOwner.email}). Bootstrap operation denied.`);
    return { success: false, reason: 'owner_already_exists', currentOwner: existingOwner.email };
  }

  // Find target user
  const user = await User.findOne({ email });
  if (!user) {
    console.error(`❌ Bootstrap Error: User account for "${email}" does not exist. Please register first.`);
    return { success: false, reason: 'user_not_found' };
  }

  user.role = 'admin';
  user.isOwner = true;
  await user.save();

  console.log(`✅ Owner Bootstrap Successful: "${user.email}" has been designated as the verified Application Owner.`);
  return { success: true, email: user.email };
};

// Direct command-line invocation support
if (process.argv[1] && process.argv[1].endsWith('bootstrapOwner.js')) {
  const argEmail = process.argv[2];
  bootstrapOwner(argEmail)
    .then((res) => {
      process.exit(res.success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal bootstrap error:', err);
      process.exit(1);
    });
}

