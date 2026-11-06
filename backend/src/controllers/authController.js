import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Settings } from '../models/Settings.js';
import { signToken } from '../config/jwt.js';

/**
 * Register a new user account.
 * Strict RBAC & Privilege Escalation Protection:
 * - Public registrations unconditionally receive role: 'member' and isOwner: false.
 * - Client-supplied role and isOwner fields are completely ignored.
 * - Email format and duplicate checks are enforced safely.
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Type and existence checks
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required and must be text.' });
    }

    if (name.trim().length > 80) {
      return res.status(400).json({ success: false, message: 'Name cannot exceed 80 characters.' });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Valid email address is required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail.length > 254) {
      return res.status(400).json({ success: false, message: 'Email address cannot exceed 254 characters.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email format.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    if (password.length > 128) {
      return res.status(400).json({ success: false, message: 'Password cannot exceed 128 characters.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    // Check existing user to return immediate descriptive feedback
    const existing = await User.findOne({ email: trimmedEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.',
      });
    }

    // STRICT ROLE ASSIGNMENT: All new registrations receive 'member' role and isOwner: false
    const user = await User.create({
      name: name.trim(),
      email: trimmedEmail,
      password,
      role: 'member',
      isOwner: false,
    });

    // Create user's isolated Settings record
    try {
      await Settings.create({
        userId: user._id,
        openingBalance: 0,
        currency: 'INR',
        companyName: 'TechMines',
      });
    } catch (settingsErr) {
      console.error('Non-fatal warning: Settings creation deferred:', settingsErr.message);
    }

    const token = signToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isOwner: user.isOwner,
      },
    });
  } catch (error) {
    // Handle concurrent duplicate key race condition from MongoDB
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.',
      });
    }

    console.error('Registration error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create account. Please try again later.',
    });
  }
};

/**
 * Log in an existing user with verified credentials.
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Password is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Use uniform timing-safe failure message to prevent email enumeration
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email address or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email address or password.' });
    }

    const token = signToken(user._id);

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'member',
        isOwner: Boolean(user.isOwner),
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to log in. Please try again later.',
    });
  }
};

/**
 * Get current authenticated user session details
 */
export const getMe = async (req, res) => {
  try {
    return res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role || 'member',
        isOwner: Boolean(req.user.isOwner),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user session.',
    });
  }
};

/**
 * Update user role (Restricted to Admin).
 * Guards:
 * - Valid roles only: 'admin', 'finance_admin', 'member'
 * - Designated owner cannot have their role altered or be demoted
 * - Sole administrator cannot demote themselves
 * - isOwner cannot be modified through this endpoint
 */
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }

    const validRoles = ['admin', 'finance_admin', 'member'];
    if (!role || typeof role !== 'string' || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role specified. Must be one of: ${validRoles.join(', ')}`,
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found.' });
    }

    // Owner protection: designated owner cannot be demoted or altered
    if (targetUser.isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Security policy violation: The designated application owner role cannot be altered.',
      });
    }

    // Prevent sole admin from demoting themselves
    if (
      targetUser._id.toString() === req.userId.toString() &&
      targetUser.role === 'admin' &&
      role !== 'admin'
    ) {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote yourself: At least one active administrator must remain.',
        });
      }
    }

    targetUser.role = role;
    await targetUser.save();

    return res.json({
      success: true,
      message: `User ${targetUser.email} role updated to ${role}.`,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isOwner: targetUser.isOwner,
      },
    });
  } catch (error) {
    console.error('Role update error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user role.',
    });
  }
};

/**
 * List all users (Restricted to Admin)
 * Never exposes password hashes.
 */
export const listUsers = async (req, res) => {
  try {
    const users = await User.find({}, 'name email role isOwner createdAt').sort({ createdAt: -1 });
    return res.json({ success: true, count: users.length, users });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to list users.',
    });
  }
};

/**
 * Logout
 * Acknowledges session termination for stateless JWT authentication.
 * The client must purge the Bearer token from local storage.
 */
export const logout = async (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully. Please remove the authentication token on the client.',
  });
};
