// ⚠️ THIS TEST IS EXPECTED TO FAIL — that is the point.
//
// It demonstrates the Gap 5 race condition in POST /appointments
// (src/services/appointment.service.ts). Five patients try to grab the SAME
// 10:00 slot concurrently. Correct behavior: exactly one 201, four rejected,
// one appointment row in the database.
//
// The naive check-then-act implementation lets ALL FIVE requests pass the
// "slot is OPEN" check during the ~150ms mock insurance-eligibility window,
// so you'll see five 201s and five appointments for one physical time slot —
// five patients in the waiting room at 10:00.
//
// Your job (Gap 5): fix createAppointment with row locking, an optimistic
// conditional update, or a partial-unique-index backstop — the full menu is
// in the comment block in appointment.service.ts. When this file passes
// unmodified, you're done.
//
// (Why 5 requests and not 2? The race is probabilistic; more contenders make
// the failure deterministic enough to trust in CI.)
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { SlotStatus } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { createDoctorScenario, createUserWithToken, defaultSlotTimes } from './helpers';

const app = createApp();
const CONCURRENT_REQUESTS = 5;

describe('POST /api/appointments — same-slot concurrency (Gap 5)', () => {
  it('books the slot exactly once under concurrent requests', async () => {
    const { service, slots } = await createDoctorScenario({
      slotTimes: [defaultSlotTimes()[0]], // exactly one open slot
    });
    const slot = slots[0];

    // Five distinct patients racing for the same 10:00 opening.
    const patients = await Promise.all(
      Array.from({ length: CONCURRENT_REQUESTS }, () => createUserWithToken('PATIENT')),
    );

    // Fire all requests truly concurrently.
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

    // One slot, one winner. (Naive implementation: all 5 "win".)
    expect(succeeded).toHaveLength(1);
    expect(rejected).toHaveLength(CONCURRENT_REQUESTS - 1);

    // The database must hold exactly ONE appointment for this slot...
    const count = await prisma.appointment.count({ where: { slotId: slot.id } });
    expect(count).toBe(1);

    // ...and the slot must be marked booked.
    const after = await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } });
    expect(after.status).toBe(SlotStatus.BOOKED);
  });

  it('single sequential rebooking of a booked slot is refused (sanity — no race needed)', async () => {
    // This one PASSES even against the naive code: with no concurrency the
    // stale-read window doesn't matter. It pins down that the sequential
    // path already works, so Gap 5 is purely a concurrency fix.
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
