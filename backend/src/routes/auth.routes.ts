// POST /api/auth/signup (patients only), POST /api/auth/login (all roles).
// Fully implemented — see auth.service.ts for why signup can't pick a role.
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errors';
import * as authService from '../services/auth.service';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post(
  '/signup',
  asyncHandler(async (req, res) => {
    // .parse throws ZodError on bad input; errorHandler turns that into a 400.
    const input = signupSchema.parse(req.body);
    const result = await authService.signup(input);
    res.status(201).json(result);
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.json(result);
  }),
);
