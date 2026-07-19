// TODO_TESTS section 5, Gap 4: the Availability -> Slot expansion.
import { describe, expect, it } from 'vitest';
import { SlotStatus } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { generateSlots } from '../src/services/slotGeneration.service';

// 2030-06-03 is a Monday (dayOfWeek 1); fixed dates keep assertions exact.
const MONDAY = '2030-06-03';
const T = (iso: string) => new Date(iso);

async function doctorWithWindow(startTime: string, endTime: string) {
  const clinic = await prisma.clinic.create({
    data: {
      code: `G${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      name: 'Gen Test Clinic',
      address: '1 Gen St',
      city: 'Testville',
      phone: '+966 00 555 0000',
    },
  });
  const doctor = await prisma.doctor.create({
    data: {
      name: 'Dr. Gen Test',
      specialty: 'GENERAL_PRACTICE',
      clinics: { create: [{ clinicId: clinic.id }] },
    },
  });
  await prisma.availability.create({
    data: { doctorId: doctor.id, clinicId: clinic.id, dayOfWeek: 1, startTime, endTime },
  });
  return { clinic, doctor };
}

describe('generateSlots', () => {
  it('Mon 09:00-11:00 at 30 minutes yields exactly 4 slots', async () => {
    const { doctor } = await doctorWithWindow('09:00', '11:00');

    const result = await generateSlots({
      doctorId: doctor.id,
      from: MONDAY,
      to: '2030-06-04',
      slotMinutes: 30,
    });

    expect(result).toEqual({ created: 4, skippedExisting: 0, skippedTimeOff: 0 });
    const slots = await prisma.slot.findMany({
      where: { doctorId: doctor.id },
      orderBy: { startAt: 'asc' },
    });
    expect(slots.map((s) => s.startAt.toISOString())).toEqual([
      '2030-06-03T09:00:00.000Z',
      '2030-06-03T09:30:00.000Z',
      '2030-06-03T10:00:00.000Z',
      '2030-06-03T10:30:00.000Z',
    ]);
    expect(slots.every((s) => s.status === SlotStatus.OPEN)).toBe(true);
  });

  it('drops a trailing remainder that does not fit the grid', async () => {
    const { doctor } = await doctorWithWindow('09:00', '10:45');

    const result = await generateSlots({
      doctorId: doctor.id,
      from: MONDAY,
      to: '2030-06-04',
      slotMinutes: 30,
    });

    // 09:00-10:45 fits three 30-minute slots; the 10:30-11:00 one would
    // spill past 10:45 and must not be created.
    expect(result.created).toBe(3);
  });

  it('a TimeOff 09:30-10:30 knocks out the middle two slots', async () => {
    const { doctor } = await doctorWithWindow('09:00', '11:00');
    await prisma.timeOff.create({
      data: {
        doctorId: doctor.id,
        startAt: T('2030-06-03T09:30:00.000Z'),
        endAt: T('2030-06-03T10:30:00.000Z'),
        reason: 'test',
      },
    });

    const result = await generateSlots({
      doctorId: doctor.id,
      from: MONDAY,
      to: '2030-06-04',
      slotMinutes: 30,
    });

    expect(result.created).toBe(2);
    expect(result.skippedTimeOff).toBe(2);
    const slots = await prisma.slot.findMany({
      where: { doctorId: doctor.id },
      orderBy: { startAt: 'asc' },
    });
    // Touching endpoints do not overlap: 09:00-09:30 and 10:30-11:00 survive.
    expect(slots.map((s) => s.startAt.toISOString())).toEqual([
      '2030-06-03T09:00:00.000Z',
      '2030-06-03T10:30:00.000Z',
    ]);
  });

  it('is idempotent: a second run creates nothing and never touches a BOOKED slot', async () => {
    const { doctor } = await doctorWithWindow('09:00', '11:00');
    const args = { doctorId: doctor.id, from: MONDAY, to: '2030-06-04', slotMinutes: 30 };

    await generateSlots(args);
    const booked = await prisma.slot.findFirstOrThrow({
      where: { doctorId: doctor.id },
      orderBy: { startAt: 'asc' },
    });
    await prisma.slot.update({ where: { id: booked.id }, data: { status: SlotStatus.BOOKED } });

    const second = await generateSlots(args);

    expect(second.created).toBe(0);
    expect(second.skippedExisting).toBe(4);
    const after = await prisma.slot.findMany({ where: { doctorId: doctor.id } });
    expect(after).toHaveLength(4);
    const stillBooked = await prisma.slot.findUniqueOrThrow({ where: { id: booked.id } });
    expect(stillBooked.status).toBe(SlotStatus.BOOKED);
  });

  it('returns 404-style NotFoundError for an unknown doctor', async () => {
    await expect(
      generateSlots({ doctorId: 'nope', from: MONDAY, to: '2030-06-04', slotMinutes: 30 }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
