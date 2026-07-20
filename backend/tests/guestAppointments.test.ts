import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { SlotStatus } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { createDoctorScenario } from './helpers';

const app = createApp();

const GUEST = {
  fullName: 'Sara Al-Harbi',
  email: 'sara.alharbi@example.com',
  phone: '0551234567',
};

const bookAsGuest = (body: object) => request(app).post('/api/appointments/guest').send(body);

describe('POST /api/appointments/guest — booking without an account', () => {
  it('books with no token and flips the slot to BOOKED', async () => {
    const { service, slots } = await createDoctorScenario();

    const res = await bookAsGuest({ slotId: slots[0].id, serviceId: service.id, ...GUEST });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('CONFIRMED');
    expect(res.body.patient).toMatchObject({
      id: null,
      isGuest: true,
      fullName: GUEST.fullName,
      email: GUEST.email,
    });

    const slot = await prisma.slot.findUniqueOrThrow({ where: { id: slots[0].id } });
    expect(slot.status).toBe(SlotStatus.BOOKED);

    const appt = await prisma.appointment.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(appt.patientId).toBeNull();
    expect(appt.bookedById).toBeNull();
    expect(appt.guestPhone).toBe(GUEST.phone);
  });

  it('rejects a malformed email or phone with 400', async () => {
    const { service, slots } = await createDoctorScenario();

    const badEmail = await bookAsGuest({
      slotId: slots[0].id,
      serviceId: service.id,
      ...GUEST,
      email: 'not-an-email',
    });
    expect(badEmail.status).toBe(400);

    const badPhone = await bookAsGuest({
      slotId: slots[0].id,
      serviceId: service.id,
      ...GUEST,
      phone: '123',
    });
    expect(badPhone.status).toBe(400);

    const slot = await prisma.slot.findUniqueOrThrow({ where: { id: slots[0].id } });
    expect(slot.status).toBe(SlotStatus.OPEN);
  });

  it('refuses a slot a guest already took', async () => {
    const { service, slots } = await createDoctorScenario();
    const body = { slotId: slots[0].id, serviceId: service.id, ...GUEST };

    expect((await bookAsGuest(body)).status).toBe(201);
    const second = await bookAsGuest(body);

    expect(second.status).toBe(400);
  });

  it('ignores a patientId supplied by a guest', async () => {
    const { service, slots } = await createDoctorScenario();

    const res = await bookAsGuest({
      slotId: slots[0].id,
      serviceId: service.id,
      ...GUEST,
      patientId: 'someone-elses-id',
    });

    expect(res.status).toBe(201);
    const appt = await prisma.appointment.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(appt.patientId).toBeNull();
  });
});
