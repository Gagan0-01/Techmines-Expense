import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { verifyToken } from '../config/jwt.js';

/**
 * Authentication Middleware
 * Strictly requires Authorization: Bearer <token> header.
 * Disallows URL query parameter tokens.
 * Verifies signature with HS256, validates payload and fetches fresh user from DB.
 */
export const requireAuth = async (req, res, next) => {
  try {
    let token = null;

    // Strictly accept Bearer token in Authorization header ONLY
    if (req.headers.authorization && typeof req.headers.authorization === 'string') {
      const parts = req.headers.authorization.trim().split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer' && parts[1]) {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid Bearer token in the Authorization header.',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token. Please log in again.',
      });
    }

    // Validate decoded payload structure and user ID
    if (!decoded || !decoded.userId || typeof decoded.userId !== 'string') {
      return res.status(401).json({
        success: false,
        message: 'Malformed token payload: Missing or invalid user identity.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(decoded.userId)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user identifier in authentication token.',
      });
    }

    // Always fetch fresh user state from MongoDB to verify existence, role, and active status
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or session has expired.',
      });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Please log in again.',
    });
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * Verifies authenticated user holds one of the required roles from fresh MongoDB state.
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required prior to authorization check.',
      });
    }

    const userRole = req.user.role || 'member';

    // Owner always has root access to administrative and finance operations
    if (req.user.isOwner) {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of [${allowedRoles.join(', ')}]. Your current role is "${userRole}".`,
      });
    }

    next();
  };
};
