// Availability -> Slot generation (Gap 4 — IMPLEMENTED).
//
// The data model splits scheduling into a RULE and its EXPANSION:
//
//   Availability  "Dr. Al-Qahtani works Mon/Wed 09:00-17:00 at Olaya"  (rule)
//   Slot          "Dr. Al-Qahtani, Olaya, Mon 2026-07-20 09:00-09:30"  (rows)
//
// This function performs the expansion. The requirements it satisfies:
//
//   1. EXPAND THE RULES. For each date in [from, to), it finds the doctor's
//      Availability rows whose dayOfWeek matches and cuts the window
//      [startTime, endTime) into consecutive slots of `slotMinutes`,
//      dropping a trailing remainder that doesn't fit.
//
//   2. RESPECT TIME OFF. A candidate overlapping a TimeOff row is skipped.
//      The overlap predicate is the classic (slotStart < offEnd &&
//      slotEnd > offStart): touching endpoints do NOT overlap.
//
//   3. IDEMPOTENT. Candidates that overlap ANY existing slot in the range
//      (same grid or not, OPEN or BOOKED) are skipped, so re-running never
//      duplicates and never touches a BOOKED slot. createMany additionally
//      passes skipDuplicates so the @@unique([doctorId, startAt]) constraint
//      backstops a concurrent generation run.
//
//   4. TIMEZONES. Availability.startTime is clinic-local wall time and
//      Slot.startAt is UTC. This project's clinics (Riyadh/Jeddah) are UTC+3
//      with no DST, and by project convention wall time is treated as UTC
//      throughout (the frontend labels times "UTC"). A clinic in a
//      DST-observing region would break this shortcut: "09:00 local" is not
//      a fixed UTC offset year-round (transition days have 23/25 hours), so
//      real multi-timezone support needs per-clinic IANA zones and a
//      calendar-aware conversion.
//
//   5. SERVICE DURATIONS (stretch — not done). Slots are a fixed grid; a
//      45-minute service booked at 09:00 does not consume the 09:30 slot.
//      Generating per-service slots or booking multiple contiguous slots
//      are the two standard designs.
import { SlotStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { BadRequestError, NotFoundError } from '../middleware/errors';

export interface GenerateSlotsInput {
  doctorId: string;
  /** Inclusive first day, exclusive last day — both YYYY-MM-DD. */
  from: string;
  to: string;
  /** Grid size in minutes. The clinic default is 30. */
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
