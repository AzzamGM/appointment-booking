import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { AppointmentStatus, SlotStatus } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { createDoctorScenario, createUserWithToken } from './helpers';

const app = createApp();

describe('POST /api/doctors/:id/availability', () => {
  const body = { clinicCode: 'XXX', dayOfWeek: 2, startTime: '09:00', endTime: '12:00' };

  it('rejects a PATIENT token with 403 and no token with 401', async () => {
    const { doctor } = await createDoctorScenario();
    const patient = await createUserWithToken('PATIENT');

    const asPatient = await request(app)
      .post(`/api/doctors/${doctor.id}/availability`)
      .set('Authorization', `Bearer ${patient.token}`)
      .send(body);
    expect(asPatient.status).toBe(403);

    const anonymous = await request(app).post(`/api/doctors/${doctor.id}/availability`).send(body);
    expect(anonymous.status).toBe(401);
  });

  it("rejects a clinic the doctor doesn't practice at with 400", async () => {
    const { doctor } = await createDoctorScenario();
    const otherClinic = (await createDoctorScenario()).clinic;
    const staff = await createUserWithToken('STAFF');

    const res = await request(app)
      .post(`/api/doctors/${doctor.id}/availability`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ ...body, clinicCode: otherClinic.code });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/does not practice/i);
  });

  it('rejects startTime >= endTime with 400 field details', async () => {
    const { doctor, clinic } = await createDoctorScenario();
    const staff = await createUserWithToken('STAFF');

    const res = await request(app)
      .post(`/api/doctors/${doctor.id}/availability`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ ...body, clinicCode: clinic.code, startTime: '12:00', endTime: '09:00' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toContain('startTime');
  });

  it('rejects a duplicate availability row with 409 (the DB unique constraint, surfaced by the error middleware)', async () => {
    const { doctor, clinic } = await createDoctorScenario();
    const staff = await createUserWithToken('STAFF');
    const payload = { ...body, clinicCode: clinic.code };

    const first = await request(app)
      .post(`/api/doctors/${doctor.id}/availability`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send(payload);
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/doctors/${doctor.id}/availability`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send(payload);
    expect(second.status).toBe(409);
  });
});

describe('GET /api/appointments — staff overview', () => {
  it('lists only future appointments, soonest first', async () => {
    const scenario = await createDoctorScenario({
      slotTimes: [
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      ],
    });
    const patient = await createUserWithToken('PATIENT');
    const staff = await createUserWithToken('STAFF');

    for (const [i, slot] of scenario.slots.entries()) {
      await prisma.appointment.create({
        data: {
          reference: `OVW${i}${i}${i}`,
          status: AppointmentStatus.CONFIRMED,
          patientId: patient.user.id,
          slotId: slot.id,
          serviceId: scenario.service.id,
          bookedById: patient.user.id,
        },
      });
      await prisma.slot.update({ where: { id: slot.id }, data: { status: SlotStatus.BOOKED } });
    }

    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${staff.token}`);

    expect(res.status).toBe(200);
    expect(res.body.appointments.map((a: { reference: string }) => a.reference)).toEqual([
      'OVW222',
      'OVW111',
    ]);
  });
});
