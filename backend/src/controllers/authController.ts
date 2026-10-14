import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User';
import { ENV } from '../config/env';
import { AuthRequest } from '../middleware/auth';
import { AuditLog } from '../models/AuditLog';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['TREASURER', 'FINANCE_MANAGER', 'AUDITOR', 'OPERATOR']).optional(),
  department: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const generateToken = (id: string): string => {
  return jwt.sign({ id }, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN as any,
  });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const data = registerSchema.parse(req.body);

  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) {
    res.status(409).json({ success: false, message: 'User with this email already exists.' });
    return;
  }

  const user = await User.create({
    name: data.name,
    email: data.email.toLowerCase(),
    password: data.password,
    role: data.role || 'FINANCE_MANAGER',
    department: data.department || 'Treasury & Corporate Finance',
  });

  const token = generateToken(user._id.toString());

  res.status(201).json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    },
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || user.status !== 'ACTIVE') {
    res.status(401).json({ success: false, message: 'Invalid email or password.' });
    return;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    res.status(401).json({ success: false, message: 'Invalid email or password.' });
    return;
  }

  const token = generateToken(user._id.toString());

  // Record audit log for login
  await AuditLog.create({
    action: 'USER_LOGIN',
    entityType: 'USER',
    entityId: user._id.toString(),
    performedBy: user._id,
    userName: user.name,
    details: { email: user.email, role: user.role },
  });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    },
  });
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: 'Logged out successfully.' });
};
