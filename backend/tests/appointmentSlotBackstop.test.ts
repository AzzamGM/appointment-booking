import { describe, expect, it } from 'vitest';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { createDoctorScenario, createUserWithToken, defaultSlotTimes } from './helpers';
import { generateBookingReference } from '../src/utils/bookingReference';

async function insertRawAppointment(opts: {
  patientId: string;
  slotId: string;
  serviceId: string;
  status: AppointmentStatus;
}) {
  return prisma.appointment.create({
    data: {
      reference: generateBookingReference(),
      status: opts.status,
      patientId: opts.patientId,
      slotId: opts.slotId,
      serviceId: opts.serviceId,
      bookedById: opts.patientId,
    },
  });
}

describe('partial unique index on Appointment(slotId)', () => {
  it('refuses a second LIVE appointment on the same slot, even bypassing the service layer', async () => {
    const { service, slots } = await createDoctorScenario({ slotTimes: [defaultSlotTimes()[0]] });
    const slot = slots[0];
    const a = await createUserWithToken('PATIENT');
    const b = await createUserWithToken('PATIENT');

    await insertRawAppointment({
      patientId: a.user.id,
      slotId: slot.id,
      serviceId: service.id,
      status: AppointmentStatus.CONFIRMED,
    });

    let caught: unknown;
    try {
      await insertRawAppointment({
        patientId: b.user.id,
        slotId: slot.id,
        serviceId: service.id,
        status: AppointmentStatus.CONFIRMED,
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect((caught as Prisma.PrismaClientKnownRequestError).code).toBe('P2002');

    expect(await prisma.appointment.count({ where: { slotId: slot.id } })).toBe(1);
  });

  it('still allows rebooking a slot whose previous appointment was CANCELLED', async () => {
    const { service, slots } = await createDoctorScenario({ slotTimes: [defaultSlotTimes()[0]] });
    const slot = slots[0];
    const a = await createUserWithToken('PATIENT');
    const b = await createUserWithToken('PATIENT');

    await insertRawAppointment({
      patientId: a.user.id,
      slotId: slot.id,
      serviceId: service.id,
      status: AppointmentStatus.CANCELLED,
    });

    await expect(
      insertRawAppointment({
        patientId: b.user.id,
        slotId: slot.id,
        serviceId: service.id,
        status: AppointmentStatus.CONFIRMED,
      }),
    ).resolves.toBeTruthy();

    expect(await prisma.appointment.count({ where: { slotId: slot.id } })).toBe(2);
  });

  it('allows many terminal appointments to accumulate on one slot', async () => {
    const { service, slots } = await createDoctorScenario({ slotTimes: [defaultSlotTimes()[0]] });
    const slot = slots[0];
    const patient = await createUserWithToken('PATIENT');

    for (const status of [
      AppointmentStatus.CANCELLED,
      AppointmentStatus.NO_SHOW,
      AppointmentStatus.CANCELLED,
    ]) {
      await insertRawAppointment({
        patientId: patient.user.id,
        slotId: slot.id,
        serviceId: service.id,
        status,
      });
    }

    expect(await prisma.appointment.count({ where: { slotId: slot.id } })).toBe(3);
  });
});
