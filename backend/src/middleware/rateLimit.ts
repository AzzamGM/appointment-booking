import rateLimit, { type Options } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { env } from '../lib/env';

function limiter(options: Partial<Options>) {
  return rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Integration tests fire many requests at these routes in quick succession.
    skip: () => env.IS_TEST,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: { message: 'Too many requests. Please wait a moment and try again.' },
      });
    },
    ...options,
  });
}

// Brute-force / credential-stuffing protection. Only failed attempts count, so a
// user with the right password is never locked out by someone else guessing.
export const loginLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
});

export const signupLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
});

// Password changes sit behind a valid session but still verify a secret.
export const sensitiveLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
});

export const apiLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 600,
});
