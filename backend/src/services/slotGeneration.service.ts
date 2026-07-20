import { SlotStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { BadRequestError, NotFoundError } from '../middleware/errors';

export interface GenerateSlotsInput {
  doctorId: string;
  from: string;
  to: string;
  slotMinutes: number;
}

export interface GenerateSlotsResult {
  created: number;
  skippedExisting: number;
  skippedTimeOff: number;
}

interface Range {
  startAt: Date;
  endAt: Date;
}

const overlaps = (a: Range, b: Range) => a.startAt < b.endAt && a.endAt > b.startAt;

export async function generateSlots(input: GenerateSlotsInput): Promise<GenerateSlotsResult> {
  const { doctorId, from, to, slotMinutes } = input;

  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) throw new NotFoundError('Doctor not found');

  const rangeStart = new Date(`${from}T00:00:00.000Z`);
  const rangeEnd = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
    throw new BadRequestError('from/to must be valid YYYY-MM-DD dates');
  }
  if (rangeEnd <= rangeStart) {
    throw new BadRequestError('from must be before to');
  }

  const [rules, timeOff, existing] = await Promise.all([
    prisma.availability.findMany({ where: { doctorId } }),
    prisma.timeOff.findMany({
      where: { doctorId, startAt: { lt: rangeEnd }, endAt: { gt: rangeStart } },
    }),
    prisma.slot.findMany({
      where: { doctorId, startAt: { gte: rangeStart, lt: rangeEnd } },
      select: { startAt: true, endAt: true },
    }),
  ]);

  const toCreate: Array<{ doctorId: string; clinicId: string; startAt: Date; endAt: Date }> = [];
  let skippedExisting = 0;
  let skippedTimeOff = 0;

  const DAY_MS = 24 * 60 * 60 * 1000;
  for (let day = new Date(rangeStart); day < rangeEnd; day = new Date(day.getTime() + DAY_MS)) {
    for (const rule of rules) {
      if (rule.dayOfWeek !== day.getUTCDay()) continue;

      const [startH, startM] = rule.startTime.split(':').map(Number);
      const [endH, endM] = rule.endTime.split(':').map(Number);
      const windowMinutes = endH * 60 + endM - (startH * 60 + startM);

      for (let offset = 0; offset + slotMinutes <= windowMinutes; offset += slotMinutes) {
        const startAt = new Date(day);
        startAt.setUTCHours(startH, startM + offset, 0, 0);
        const candidate = {
          startAt,
          endAt: new Date(startAt.getTime() + slotMinutes * 60_000),
        };

        if (timeOff.some((off) => overlaps(candidate, off))) {
          skippedTimeOff++;
        } else if (existing.some((slot) => overlaps(candidate, slot))) {
          skippedExisting++;
        } else {
          toCreate.push({ doctorId, clinicId: rule.clinicId, ...candidate });
        }
      }
    }
  }

  const result = await prisma.slot.createMany({
    data: toCreate.map((s) => ({ ...s, status: SlotStatus.OPEN })),
    skipDuplicates: true,
  });

  return { created: result.count, skippedExisting, skippedTimeOff };
}
