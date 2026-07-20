// Append-only audit trail. Recording is best-effort: a failed audit write
// logs to the console but never fails the user-facing action it describes.
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

const auditWithUser = Prisma.validator<Prisma.AuditLogDefaultArgs>()({
  include: { user: true },
});
type AuditWithUser = Prisma.AuditLogGetPayload<typeof auditWithUser>;

function toAuditDto(entry: AuditWithUser) {
  return {
    id: entry.id,
    action: entry.action,
    detail: entry.detail,
    createdAt: entry.createdAt.toISOString(),
    user: entry.user
      ? { id: entry.user.id, fullName: entry.user.fullName, role: entry.user.role }
      : null,
  };
}

export async function recordAudit(
  userId: string | null,
  action: string,
  detail?: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({ data: { userId, action, detail } });
  } catch (err) {
    console.error(`audit write failed for ${action}:`, err);
  }
}

/** Staff view: recent activity across every user. */
export async function listRecentAudit(limit = 50) {
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 200),
    ...auditWithUser,
  });
  return entries.map(toAuditDto);
}

/** A user's own activity trail. */
export async function listUserAudit(userId: string, limit = 50) {
  const entries = await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 200),
    ...auditWithUser,
  });
  return entries.map(toAuditDto);
}
