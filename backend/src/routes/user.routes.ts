import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errors';
import * as userService from '../services/user.service';

const updateProfileSchema = z
  .object({
    fullName: z.string().min(1).max(100).optional(),
    fullNameAr: z.string().min(1).max(100).optional(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s-]{9,20}$/, 'Enter a valid phone number')
      .optional()
      .or(z.literal('')),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No changes provided' });

export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json(await userService.getProfile(req.user!.sub));
  }),
);

usersRouter.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const input = updateProfileSchema.parse(req.body);
    res.json(await userService.updateProfile(req.user!.sub, input));
  }),
);

usersRouter.delete(
  '/me',
  requireRole('PATIENT'),
  asyncHandler(async (req, res) => {
    await userService.deleteAccount(req.user!.sub);
    res.status(204).end();
  }),
);
