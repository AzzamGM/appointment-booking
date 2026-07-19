// Availability queries backing the two-step calendar UI:
//
//   1. MONTH SUMMARY  ?month=YYYY-MM  -> which dates have any open slot
//      (the calendar greys out the rest)
//   2. DAY DETAIL     ?date=YYYY-MM-DD -> the concrete open times for one day
//      (shown after the user clicks a date)
//
// Both read materialized Slot rows. (Turning recurring Availability rules
// INTO Slot rows is Gap 4 — src/services/slotGeneration.service.ts.)
//
// OPTIMIZED (Gap 3 — done). What changed and why:
//
//  1. INDEXES. Both queries filter Slot by (doctorId, status, startAt
//     range); schema.prisma now has @@index([doctorId, status, startAt])
//     matching that shape (equality columns first, range column last).
//     Doctor.specialty and DoctorClinic.clinicId are indexed for the search
//     in doctors.routes.ts. Verify with EXPLAIN (ANALYZE, BUFFERS): the
//     Seq Scans become Index Scans.
//
//  2. MONTH SUMMARY AGGREGATES IN SQL. The old code pulled every open slot
//     row of the month over the wire just to count per day in JS. The
//     $queryRaw GROUP BY below returns ~30 tiny (date, count) rows instead
//     of hundreds of fat ones. (Prisma's groupBy can't group on a
//     date-truncated expression, hence raw SQL.)
import { Prisma, SlotStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../middleware/errors';

async function assertDoctorExists(doctorId: string) {
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) throw new NotFoundError('Doctor not found');
}

/** Month summary: for each date in the month, how many OPEN slots exist. */
export async function monthSummary(doctorId: string, month: string) {
  await assertDoctorExists(doctorId);

  const monthStart = new Date(`${month}-01T00:00:00.000Z`);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

  // Aggregate in the database: ~30 (date, count) rows instead of every slot
  // row of the month. startAt is a naive timestamp stored as UTC, so ::date
  // yields the UTC calendar date directly.
  const days = await prisma.$queryRaw<Array<{ date: string; openCount: number }>>(
    Prisma.sql`
      SELECT to_char("startAt"::date, 'YYYY-MM-DD') AS date,
             COUNT(*)::int AS "openCount"
      FROM "Slot"
      WHERE "doctorId" = ${doctorId}
        AND status = 'OPEN'::"SlotStatus"
        AND "startAt" >= ${monthStart}
        AND "startAt" < ${monthEnd}
      GROUP BY "startAt"::date
      ORDER BY "startAt"::date
    `,
  );

  return { month, days };
}

/** Day detail: the exact open slots for one date, oldest first. */
export async function dayDetail(doctorId: string, date: string) {
  await assertDoctorExists(doctorId);

  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const slots = await prisma.slot.findMany({
    where: {
      doctorId,
      status: SlotStatus.OPEN,
      startAt: { gte: dayStart, lt: dayEnd },
    },
    include: { clinic: true },
    orderBy: { startAt: 'asc' },
  });

  return {
    date,
    slots: slots.map((s) => ({
      id: s.id,
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      clinic: { code: s.clinic.code, name: s.clinic.name, city: s.clinic.city },
    })),
  };
}
