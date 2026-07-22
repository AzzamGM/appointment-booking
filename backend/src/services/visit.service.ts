import { createHash } from 'node:crypto';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';
import { clientIp, headerCountry, locate } from './geo.service';

export interface RecordVisitInput {
  sessionId: string;
  path: string;
  referrer?: string;
  language?: string;
}

export interface VisitContext {
  headers: Record<string, unknown>;
  socketIp?: string;
  userId?: string | null;
}

function hashIp(ip: string): string {
  return createHash('sha256').update(`${env.JWT_SECRET}:${ip}`).digest('hex').slice(0, 32);
}

export async function recordVisit(input: RecordVisitInput, context: VisitContext): Promise<void> {
  try {
    const ip = clientIp(context.headers, context.socketIp);
    const fromHeader = headerCountry(context.headers);
    const geo = fromHeader ? { country: fromHeader, city: null } : await locate(ip);
    const userAgent = context.headers['user-agent'];

    await prisma.visit.create({
      data: {
        sessionId: input.sessionId,
        path: input.path.slice(0, 200),
        referrer: input.referrer?.slice(0, 300) || null,
        language: input.language?.slice(0, 10) || null,
        userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 300) : null,
        country: geo.country,
        city: geo.city,
        ipHash: ip ? hashIp(ip) : null,
        userId: context.userId ?? null,
      },
    });

    const where = [geo.city, geo.country].filter(Boolean).join(', ') || 'unknown';
    const who = context.userId ? `user ${context.userId}` : 'guest';
    console.log(`[visit] ${input.path} - ${where} - ${who} - session ${input.sessionId}`);
  } catch (err) {
    console.error('visit write failed:', err);
  }
}

function startOfDaysAgo(days: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

export async function getVisitStats(days = 30) {
  const since = startOfDaysAgo(days);
  const where = { createdAt: { gte: since } };

  const [totalViews, sessions, signedIn, byCountry, byPath, recent] = await Promise.all([
    prisma.visit.count({ where }),
    prisma.visit.findMany({ where, select: { sessionId: true }, distinct: ['sessionId'] }),
    prisma.visit.findMany({
      where: { ...where, userId: { not: null } },
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.visit.groupBy({
      by: ['country'],
      where,
      _count: { _all: true },
      orderBy: { _count: { country: 'desc' } },
      take: 20,
    }),
    prisma.visit.groupBy({
      by: ['path'],
      where,
      _count: { _all: true },
      orderBy: { _count: { path: 'desc' } },
      take: 20,
    }),
    prisma.visit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        path: true,
        country: true,
        city: true,
        createdAt: true,
        user: { select: { fullName: true, role: true } },
      },
    }),
  ]);

  const daily = await prisma.$queryRaw<Array<{ day: Date; views: bigint; visitors: bigint }>>`
    SELECT date_trunc('day', "createdAt") AS day,
           count(*) AS views,
           count(DISTINCT "sessionId") AS visitors
    FROM "Visit"
    WHERE "createdAt" >= ${since}
    GROUP BY day
    ORDER BY day ASC
  `;

  return {
    days,
    totalViews,
    uniqueVisitors: sessions.length,
    signedInVisitors: signedIn.length,
    countries: byCountry.map((row) => ({
      country: row.country ?? 'Unknown',
      views: row._count._all,
    })),
    pages: byPath.map((row) => ({ path: row.path, views: row._count._all })),
    daily: daily.map((row) => ({
      date: row.day.toISOString().slice(0, 10),
      views: Number(row.views),
      visitors: Number(row.visitors),
    })),
    recent: recent.map((v) => ({
      id: v.id,
      path: v.path,
      country: v.country,
      city: v.city,
      createdAt: v.createdAt.toISOString(),
      user: v.user ? { fullName: v.user.fullName, role: v.user.role } : null,
    })),
  };
}
