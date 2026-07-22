import { z } from 'zod';

// bcrypt only reads the first 72 bytes of a password and silently discards the
// rest, so anything longer is rejected outright rather than quietly truncated.
export const MAX_PASSWORD_BYTES = 72;

export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= MAX_PASSWORD_BYTES, {
    message: `Password must be at most ${MAX_PASSWORD_BYTES} bytes`,
  });
