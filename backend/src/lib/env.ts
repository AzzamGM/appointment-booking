// Loads .env and exposes typed, validated config.
// Import this module (not process.env directly) everywhere else — that way a
// missing variable fails loudly at startup instead of as a weird runtime bug.
import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy backend/.env.example to backend/.env and adjust it.`,
    );
  }
  return value;
}

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET'),
  /** How long issued JWTs stay valid, in seconds (7 days). */
  JWT_EXPIRES_IN_SECONDS: 60 * 60 * 24 * 7,
};
