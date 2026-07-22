import rateLimit, { type Options } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { env } from '../lib/env';

function limiter(options: Partial<Options>) {
  return rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.IS_TEST,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: { message: 'Too many requests. Please wait a moment and try again.' },
      });
    },
    ...options,
  });
}

export const loginLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
});

export const signupLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
});

export const sensitiveLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
});

export const apiLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 600,
});
