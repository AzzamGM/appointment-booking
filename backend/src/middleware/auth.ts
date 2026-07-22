import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../lib/env';
import { prisma } from '../lib/prisma';
import { ForbiddenError, UnauthorizedError } from './errors';

export interface AuthTokenPayload {
  sub: string;
  role: Role;
  ver: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN_SECONDS });
}

async function verify(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing Authorization: Bearer <token> header');
  }
  const token = header.slice('Bearer '.length);

  let decoded: jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }

  // JWTs are stateless, so a password change (or a deleted account) can only be
  // enforced by checking the token against the account it claims to represent.
  const user = await prisma.user.findUnique({
    where: { id: String(decoded.sub) },
    select: { id: true, role: true, tokenVersion: true },
  });

  if (!user || user.tokenVersion !== decoded.ver) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  // Role comes from the database, not the token, so a role change takes effect
  // immediately instead of lingering until the token expires.
  req.user = { sub: user.id, role: user.role, ver: user.tokenVersion };
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  verify(req)
    .then(() => next())
    .catch(next);
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(`You do not have permission to perform this actions.`);
    }
    next();
  };
}
