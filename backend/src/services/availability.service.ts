import { Prisma, SlotStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../middleware/errors';

async function assertDoctorExists(doctorId: string) {
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) throw new NotFoundError('Doctor not found');
}

export async function monthSummary(doctorId: string, month: string) {
  await assertDoctorExists(doctorId);

  const monthStart = new Date(`${month}-01T00:00:00.000Z`);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

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
      clinic: {
        code: s.clinic.code,
        name: s.clinic.name,
        nameAr: s.clinic.nameAr,
        city: s.clinic.city,
        cityAr: s.clinic.cityAr,
      },
    })),
  };
}
