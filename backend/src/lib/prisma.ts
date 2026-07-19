// Single shared PrismaClient for the whole process.
//
// Prisma manages its own connection pool; creating a new client per request
// would exhaust Postgres connections. One instance, imported everywhere, is
// the standard pattern.
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
