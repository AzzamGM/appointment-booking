// Signup / login. Fully implemented — auth is plumbing here, not a gap.
import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { signToken } from '../middleware/auth';
import { ConflictError, UnauthorizedError } from '../middleware/errors';
import { recordAudit } from './audit.service';

// Cost factor 10 ≈ tens of milliseconds per hash — slow enough to make
// brute-forcing stolen hashes expensive, fast enough for interactive login.
const BCRYPT_ROUNDS = 10;

/** Never send passwordHash to a client, even hashed. */
export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
}

/**
 * Public signup ALWAYS creates a PATIENT.
 *
 * Why no role field in the request? Because an endpoint that lets callers
 * pick their own role is a privilege-escalation hole ("I'd like to be STAFF,
 * please"). Staff and doctor accounts are provisioned out-of-band — here by
 * the seed script; in a real clinic by an admin console with its own authz.
 */
export async function signup(input: { email: string; password: string; fullName: string }) {
  const email = input.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, passwordHash, fullName: input.fullName.trim(), role: 'PATIENT' },
  });

  void recordAudit(user.id, 'auth.signup', user.email);

  return { token: signToken({ sub: user.id, role: user.role }), user: toPublicUser(user) };
}

/** Login is shared by all three roles — the role rides inside the token. */
export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase().trim() } });

  // Same error for "no such user" and "wrong password" — otherwise the
  // endpoint doubles as an email-enumeration oracle.
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new UnauthorizedError('Invalid email or password');
  }

  void recordAudit(user.id, 'auth.login', user.email);

  return { token: signToken({ sub: user.id, role: user.role }), user: toPublicUser(user) };
}
