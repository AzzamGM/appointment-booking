import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { SlotStatus } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { createDoctorScenario, createUserWithToken, defaultSlotTimes } from './helpers';

const app = createApp();
const CONCURRENT_REQUESTS = 5;

describe('POST /api/appointments — same-slot concurrency', () => {
  it('books the slot exactly once under concurrent requests', async () => {
    const { service, slots } = await createDoctorScenario({
      slotTimes: [defaultSlotTimes()[0]],
    });
    const slot = slots[0];

    const patients = await Promise.all(
      Array.from({ length: CONCURRENT_REQUESTS }, () => createUserWithToken('PATIENT')),
    );

    const responses = await Promise.all(
      patients.map(({ token }) =>
        request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${token}`)
          .send({ slotId: slot.id, serviceId: service.id }),
      ),
    );

    const succeeded = responses.filter((r) => r.status === 201);
    const rejected = responses.filter((r) => r.status === 400 || r.status === 409);

    expect(succeeded).toHaveLength(1);
    expect(rejected).toHaveLength(CONCURRENT_REQUESTS - 1);

    const count = await prisma.appointment.count({ where: { slotId: slot.id } });
    expect(count).toBe(1);

    const after = await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } });
    expect(after.status).toBe(SlotStatus.BOOKED);
  });

  it('single sequential rebooking of a booked slot is refused (sanity — no race needed)', async () => {
    const { service, slots } = await createDoctorScenario({
      slotTimes: [defaultSlotTimes()[0]],
    });
    const slot = slots[0];

    const first = await createUserWithToken('PATIENT');
    const second = await createUserWithToken('PATIENT');

    const r1 = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${first.token}`)
      .send({ slotId: slot.id, serviceId: service.id });
    expect(r1.status).toBe(201);

    const r2 = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${second.token}`)
      .send({ slotId: slot.id, serviceId: service.id });
    expect(r2.status).toBe(400);

    const count = await prisma.appointment.count({ where: { slotId: slot.id } });
    expect(count).toBe(1);
  });
});
