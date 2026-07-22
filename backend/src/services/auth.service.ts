import bcrypt from 'bcryptjs';
import type { Gender, User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { signToken } from '../middleware/auth';
import { ConflictError, UnauthorizedError } from '../middleware/errors';
import { recordAudit } from './audit.service';

export const BCRYPT_ROUNDS = 12;

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    fullNameAr: user.fullNameAr,
    role: user.role,
    phone: user.phone,
    gender: user.gender,
  };
}

export async function signup(input: {
  email: string;
  password: string;
  fullName: string;
  fullNameAr?: string;
  phone?: string;
  gender?: Gender;
}) {
  const email = input.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: input.fullName.trim(),
      fullNameAr: input.fullNameAr?.trim() || undefined,
      role: 'PATIENT',
      phone: input.phone?.trim() || undefined,
      gender: input.gender,
    },
  });

  void recordAudit(user.id, 'auth.signup', user.email);

  return {
    token: signToken({ sub: user.id, role: user.role, ver: user.tokenVersion }),
    user: toPublicUser(user),
  };
}

// Comparing against a throwaway hash when the email is unknown keeps the
// response time the same as a wrong password, so timing can't reveal which
// emails are registered. Built on first use to keep startup fast.
let decoyHash: string | null = null;
async function getDecoyHash(): Promise<string> {
  if (!decoyHash) decoyHash = await bcrypt.hash('no-such-account', BCRYPT_ROUNDS);
  return decoyHash;
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase().trim() } });

  const passwordMatches = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? (await getDecoyHash()),
  );

  if (!user || !passwordMatches) {
    throw new UnauthorizedError('Invalid email or password');
  }

  void recordAudit(user.id, 'auth.login', user.email);

  return {
    token: signToken({ sub: user.id, role: user.role, ver: user.tokenVersion }),
    user: toPublicUser(user),
  };
}
