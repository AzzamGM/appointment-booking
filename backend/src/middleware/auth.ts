// JWT authentication + role-based authorization middleware.
// Fully implemented on purpose — this is plumbing, not a learning gap.
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../lib/env';
import { ForbiddenError, UnauthorizedError } from './errors';

/** What we embed in every token. `sub` (subject) is the user id — JWT convention. */
export interface AuthTokenPayload {
  sub: string;
  role: Role;
}

// Teach TypeScript that our middleware attaches `user` to Express's Request.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export function signToken(payload: AuthTokenPayload): string {
  // HS256 (symmetric) — fine for a single service that both signs and
  // verifies. Multi-service setups usually move to RS256 so services can
  // verify without holding the signing key.
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN_SECONDS });
}

/**
 * Requires a valid `Authorization: Bearer <token>` header.
 * On success, req.user is populated; on failure the request stops with a 401.
 *
 * Note: we trust the token's claims (id + role) without a DB lookup. That is
 * the trade JWTs make: no query per request, but a token stays valid until it
 * expires even if the user is deleted or demoted. (Fixing that requires a
 * revocation list or short-lived tokens + refresh — out of scope here.)
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing Authorization: Bearer <token> header');
  }
  const token = header.slice('Bearer '.length);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    req.user = { sub: String(decoded.sub), role: decoded.role as Role };
  } catch {
    // Covers expired, malformed, and wrongly-signed tokens alike. Don't tell
    // the client which — that detail only helps attackers.
    throw new UnauthorizedError('Invalid or expired token');
  }
  next();
}

/**
 * Requires one of the given roles. Always mount AFTER authenticate:
 *   router.post('/', authenticate, requireRole('STAFF'), handler)
 *   router.get('/',  authenticate, requireRole('STAFF', 'DOCTOR'), handler)
 *
 * Role checks answer "may this KIND of user call this endpoint?". They are
 * not enough on their own — object-level checks ("is this YOUR appointment?")
 * still live in the services. Both layers matter.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      // Programming error: requireRole used without authenticate.
      throw new UnauthorizedError();
    }
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(`You do not have permission to perform this actions.`);
    }
    next();
  };
}
