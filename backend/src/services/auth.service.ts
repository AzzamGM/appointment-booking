import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { signToken } from '../middleware/auth';
import { ConflictError, UnauthorizedError } from '../middleware/errors';
import { recordAudit } from './audit.service';

const BCRYPT_ROUNDS = 10;

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    phone: user.phone,
  };
}

export async function signup(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
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
      role: 'PATIENT',
      phone: input.phone?.trim() || undefined,
    },
  });

  void recordAudit(user.id, 'auth.signup', user.email);

  return { token: signToken({ sub: user.id, role: user.role }), user: toPublicUser(user) };
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase().trim() } });

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new UnauthorizedError('Invalid email or password');
  }

  void recordAudit(user.id, 'auth.login', user.email);

  return { token: signToken({ sub: user.id, role: user.role }), user: toPublicUser(user) };
}
