// Central error types + the Express error-handling middleware.
//
// Pattern: anywhere in a route/service, `throw` a typed error (or let zod
// throw). The errorHandler at the bottom of the middleware chain turns it
// into a consistent JSON shape:  { "error": { "message": ..., "details"?: ... } }
import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends ApiError {
  constructor(message = 'Bad request', details?: unknown) {
    super(400, message, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(401, message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'You do not have permission to do that') {
    super(403, message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Not found') {
    super(404, message);
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Conflict') {
    super(409, message);
  }
}

/** Used by the intentional learning gaps — maps to HTTP 501 Not Implemented. */
export class NotImplementedError extends ApiError {
  constructor(message: string) {
    super(501, message);
  }
}

/**
 * Express 4 does not catch rejected promises from async handlers — an async
 * route that throws would hang the request. This wrapper forwards any
 * rejection to next(), which routes it into errorHandler below.
 * (Express 5 does this automatically; we do it explicitly to see the plumbing.)
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

/** 404 for any route no router claimed. Mounted after all real routes. */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { message: `No route for ${req.method} ${req.path}` } });
}

/**
 * The single error-handling middleware. Express identifies it by its
 * 4-argument signature — the `next` parameter must stay even though unused.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Validation errors from zod become 400s with the field-level issues.
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: { message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }

  // Unique-constraint violations (P2002) become 409s. This is the database
  // acting as the last line of defense (e.g. a duplicate Availability row);
  // application code should usually have caught it earlier with a nicer
  // message, but a constraint trip is a client error, not a server bug.
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json({ error: { message: 'A record with these values already exists' } });
    return;
  }

  // Anything else is a bug. Log it server-side, return a generic 500 —
  // never leak internals (stack traces, SQL) to clients.
  console.error('Unhandled error:', err);
  res.status(500).json({ error: { message: 'Internal server error' } });
}
