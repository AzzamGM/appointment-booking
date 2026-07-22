import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errors';
import { loginLimiter, signupLimiter } from '../middleware/rateLimit';
import { password } from '../lib/password';
import * as authService from '../services/auth.service';

const signupSchema = z.object({
  email: z.string().email().max(254),
  password,
  fullName: z.string().min(1).max(100),
  fullNameAr: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(30).optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
});

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
});

export const authRouter = Router();

authRouter.post(
  '/signup',
  signupLimiter,
  asyncHandler(async (req, res) => {
    const input = signupSchema.parse(req.body);
    const result = await authService.signup(input);
    res.status(201).json(result);
  }),
);

authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.json(result);
  }),
);
