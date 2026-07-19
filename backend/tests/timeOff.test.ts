// TODO_TESTS section 5, Gap 6: time off cascading into the live schedule.
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { AppointmentStatus, SlotStatus } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { createDoctorScenario, createUserWithToken, defaultSlotTimes } from './helpers';

const app = createApp();

/** A range comfortably containing the scenario's default slots (a week out). */
function rangeAroundDefaultSlots() {
  const [first] = defaultSlotTimes();
  const startAt = new Date(first.getTime() - 60 * 60 * 1000);
  const endAt = new Date(first.getTime() + 24 * 60 * 60 * 1000);
  return { startAt: startAt.toISOString(), endAt: endAt.toISOString() };
}

describe('POST /api/doctors/:id/time-off', () => {
  it('rejects a PATIENT token with 403 and no token with 401', async () => {
    const { doctor } = await createDoctorScenario();
    const patient = await createUserWithToken('PATIENT');
    const body = { ...rangeAroundDefaultSlots(), reason: 'vacation' };

    const asPatient = await request(app)
      .post(`/api/doctors/${doctor.id}/time-off`)
      .set('Authorization', `Bearer ${patient.token}`)
      .send(body);
    expect(asPatient.status).toBe(403);

    const anonymous = await request(app).post(`/api/doctors/${doctor.id}/time-off`).send(body);
    expect(anonymous.status).toBe(401);
  });

  it('rejects a range that starts in the past with 400', async () => {
    const { doctor } = await createDoctorScenario();
    const staff = await createUserWithToken('STAFF');

    const res = await request(app)
      .post(`/api/doctors/${doctor.id}/time-off`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({
        startAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        endAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(400);
  });

  it('BLOCKs open slots and cancels overlapping appointments, keeping their slots off the market', async () => {
    const scenario = await createDoctorScenario(); // two OPEN slots
    const patient = await createUserWithToken('PATIENT');
    const staff = await createUserWithToken('STAFF');

    // One of the two slots carries a real CONFIRMED appointment.
    const appt = await prisma.appointment.create({
      data: {
        reference: 'VICTIM',
        status: AppointmentStatus.CONFIRMED,
        patientId: patient.user.id,
        slotId: scenario.slots[0].id,
        serviceId: scenario.service.id,
        bookedById: patient.user.id,
      },
    });
    await prisma.slot.update({
      where: { id: scenario.slots[0].id },
      data: { status: SlotStatus.BOOKED },
    });

    const res = await request(app)
      .post(`/api/doctors/${scenario.doctor.id}/time-off`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ ...rangeAroundDefaultSlots(), reason: 'conference' });

    expect(res.status).toBe(201);
    expect(res.body.blockedSlots).toBe(2); // the OPEN one and the BOOKED one
    expect(res.body.cancelledAppointments).toEqual(['VICTIM']);

    const apptAfter = await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } });
    expect(apptAfter.status).toBe(AppointmentStatus.CANCELLED);

    // Both slots BLOCKED — including the cancelled appointment's slot, which
    // must NOT go back to OPEN (the doctor is away).
    const slots = await prisma.slot.findMany({ where: { doctorId: scenario.doctor.id } });
    expect(slots.map((s) => s.status)).toEqual([SlotStatus.BLOCKED, SlotStatus.BLOCKED]);

    // And the availability calendar shows nothing bookable that day.
    const date = defaultSlotTimes()[0].toISOString().slice(0, 10);
    const day = await request(app)
      .get(`/api/doctors/${scenario.doctor.id}/availability`)
      .query({ date });
    expect(day.body.slots).toEqual([]);
  });

  it('is idempotent: the same vacation submitted twice cancels (and notifies) only once', async () => {
    const scenario = await createDoctorScenario();
    const staff = await createUserWithToken('STAFF');
    const body = { ...rangeAroundDefaultSlots(), reason: 'double-click' };

    const first = await request(app)
      .post(`/api/doctors/${scenario.doctor.id}/time-off`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send(body);
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/doctors/${scenario.doctor.id}/time-off`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send(body);

    // The overlap check refuses the duplicate outright, so no appointment
    // can be cancelled (or emailed about) twice.
    expect(second.status).toBe(409);
    const timeOffRows = await prisma.timeOff.count({ where: { doctorId: scenario.doctor.id } });
    expect(timeOffRows).toBe(1);
  });

  it('returns 404 for an unknown doctor', async () => {
    const staff = await createUserWithToken('STAFF');

    const res = await request(app)
      .post('/api/doctors/nope-no-such-doctor/time-off')
      .set('Authorization', `Bearer ${staff.token}`)
      .send(rangeAroundDefaultSlots());

    expect(res.status).toBe(404);
  });
});
