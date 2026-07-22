import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { env } from '../lib/env';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errors';
import * as visitService from '../services/visit.service';

const visitSchema = z.object({
  sessionId: z.string().min(8).max(64),
  path: z.string().min(1).max(200),
  referrer: z.string().max(300).optional(),
  language: z.string().max(10).optional(),
});

function optionalUserId(header?: string): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(header.slice('Bearer '.length), env.JWT_SECRET) as jwt.JwtPayload;
    return String(decoded.sub);
  } catch {
    return null;
  }
}

export const analyticsRouter = Router();

analyticsRouter.post(
  '/visits',
  asyncHandler(async (req, res) => {
    const input = visitSchema.parse(req.body);
    void visitService.recordVisit(input, {
      headers: req.headers as Record<string, unknown>,
      socketIp: req.ip,
      userId: optionalUserId(req.headers.authorization),
    });
    res.status(202).end();
  }),
);

analyticsRouter.get(
  '/visits',
  authenticate,
  requireRole('STAFF'),
  asyncHandler(async (req, res) => {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    res.json(await visitService.getVisitStats(days));
  }),
);
