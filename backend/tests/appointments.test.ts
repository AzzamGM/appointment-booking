import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { AppointmentStatus, SlotStatus, Specialty } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { createDoctorScenario, createUserWithToken, defaultSlotTimes } from './helpers';

const app = createApp();

const book = (token: string, body: object) =>
  request(app).post('/api/appointments').set('Authorization', `Bearer ${token}`).send(body);

describe('POST /api/appointments — booking', () => {
  it('books an instant-book service as CONFIRMED and flips the slot to BOOKED', async () => {
    const { service, slots } = await createDoctorScenario();
    const { token } = await createUserWithToken('PATIENT');

    const res = await book(token, { slotId: slots[0].id, serviceId: service.id });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('CONFIRMED');
    expect(res.body.reference).toMatch(/^[A-Z0-9]{6}$/);
    const slot = await prisma.slot.findUniqueOrThrow({ where: { id: slots[0].id } });
    expect(slot.status).toBe(SlotStatus.BOOKED);
  });

  it('books a requiresApproval service as REQUESTED', async () => {
    const { service, slots } = await createDoctorScenario({ serviceRequiresApproval: true });
    const { token } = await createUserWithToken('PATIENT');

    const res = await book(token, { slotId: slots[0].id, serviceId: service.id });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('REQUESTED');
  });

  it("rejects a service the doctor's specialty cannot perform with 400", async () => {
    const gp = await createDoctorScenario({ specialty: Specialty.GENERAL_PRACTICE });
    const cardio = await createDoctorScenario({ specialty: Specialty.CARDIOLOGY });
    const { token } = await createUserWithToken('PATIENT');

    const res = await book(token, { slotId: gp.slots[0].id, serviceId: cardio.service.id });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/cannot be performed/i);
  });

  it('rejects a past slot with 400', async () => {
    const { service, slots } = await createDoctorScenario({
      slotTimes: [new Date(Date.now() - 60 * 60 * 1000)],
    });
    const { token } = await createUserWithToken('PATIENT');

    const res = await book(token, { slotId: slots[0].id, serviceId: service.id });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/past/i);
  });

  it('rejects a BLOCKED slot with 400', async () => {
    const { service, slots } = await createDoctorScenario();
    await prisma.slot.update({
      where: { id: slots[0].id },
      data: { status: SlotStatus.BLOCKED },
    });
    const { token } = await createUserWithToken('PATIENT');

    const res = await book(token, { slotId: slots[0].id, serviceId: service.id });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/no longer available/i);
  });

  it('rejects a DOCTOR token with 403 and no token with 401', async () => {
    const { service, slots } = await createDoctorScenario();
    const { token } = await createUserWithToken('DOCTOR');

    const asDoctor = await book(token, { slotId: slots[0].id, serviceId: service.id });
    expect(asDoctor.status).toBe(403);

    const anonymous = await request(app)
      .post('/api/appointments')
      .send({ slotId: slots[0].id, serviceId: service.id });
    expect(anonymous.status).toBe(401);
  });

  it('lets STAFF book on behalf of a patient via patientId', async () => {
    const { service, slots } = await createDoctorScenario();
    const staff = await createUserWithToken('STAFF');
    const patient = await createUserWithToken('PATIENT');

    const res = await book(staff.token, {
      slotId: slots[0].id,
      serviceId: service.id,
      patientId: patient.user.id,
    });

    expect(res.status).toBe(201);
    expect(res.body.patient.id).toBe(patient.user.id);
  });

  it("rejects a PATIENT passing someone else's patientId with 403", async () => {
    const { service, slots } = await createDoctorScenario();
    const patientA = await createUserWithToken('PATIENT');
    const patientB = await createUserWithToken('PATIENT');

    const res = await book(patientA.token, {
      slotId: slots[0].id,
      serviceId: service.id,
      patientId: patientB.user.id,
    });

    expect(res.status).toBe(403);
  });

  it('rejects a patientId pointing at a STAFF account with 400', async () => {
    const { service, slots } = await createDoctorScenario();
    const staff = await createUserWithToken('STAFF');
    const otherStaff = await createUserWithToken('STAFF');

    const res = await book(staff.token, {
      slotId: slots[0].id,
      serviceId: service.id,
      patientId: otherStaff.user.id,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/patient/i);
  });
});

describe('GET /api/appointments/:id — object-level authorization', () => {
  it("blocks patient A from patient B's appointment (403) but lets STAFF through", async () => {
    const { service, slots } = await createDoctorScenario();
    const patientA = await createUserWithToken('PATIENT');
    const patientB = await createUserWithToken('PATIENT');
    const staff = await createUserWithToken('STAFF');

    const created = await book(patientA.token, { slotId: slots[0].id, serviceId: service.id });
    const id = created.body.id;

    const asOwner = await request(app)
      .get(`/api/appointments/${id}`)
      .set('Authorization', `Bearer ${patientA.token}`);
    expect(asOwner.status).toBe(200);

    const asStranger = await request(app)
      .get(`/api/appointments/${id}`)
      .set('Authorization', `Bearer ${patientB.token}`);
    expect(asStranger.status).toBe(403);

    const asStaff = await request(app)
      .get(`/api/appointments/${id}`)
      .set('Authorization', `Bearer ${staff.token}`);
    expect(asStaff.status).toBe(200);
  });

  it("lets a DOCTOR see own-schedule appointments but not another doctor's", async () => {
    const mine = await createDoctorScenario();
    const other = await createDoctorScenario();
    const patient = await createUserWithToken('PATIENT');

    const doctorUser = await createUserWithToken('DOCTOR');
    await prisma.doctor.update({
      where: { id: mine.doctor.id },
      data: { userId: doctorUser.user.id },
    });

    const onMySchedule = await book(patient.token, {
      slotId: mine.slots[0].id,
      serviceId: mine.service.id,
    });
    const onOtherSchedule = await book(patient.token, {
      slotId: other.slots[0].id,
      serviceId: other.service.id,
    });

    const ownRes = await request(app)
      .get(`/api/appointments/${onMySchedule.body.id}`)
      .set('Authorization', `Bearer ${doctorUser.token}`);
    expect(ownRes.status).toBe(200);

    const otherRes = await request(app)
      .get(`/api/appointments/${onOtherSchedule.body.id}`)
      .set('Authorization', `Bearer ${doctorUser.token}`);
    expect(otherRes.status).toBe(403);
  });
});

describe('GET /api/patients/me/appointments', () => {
  it("returns only the caller's appointments, newest first", async () => {
    const { service, slots } = await createDoctorScenario({
      slotTimes: [defaultSlotTimes()[0], defaultSlotTimes()[1]],
    });
    const me = await createUserWithToken('PATIENT');
    const someoneElse = await createUserWithToken('PATIENT');

    const now = Date.now();
    const [older, newer] = await Promise.all([
      prisma.appointment.create({
        data: {
          reference: 'OLDER1',
          status: AppointmentStatus.CONFIRMED,
          patientId: me.user.id,
          slotId: slots[0].id,
          serviceId: service.id,
          bookedById: me.user.id,
          createdAt: new Date(now - 60_000),
        },
      }),
      prisma.appointment.create({
        data: {
          reference: 'NEWER1',
          status: AppointmentStatus.CONFIRMED,
          patientId: me.user.id,
          slotId: slots[1].id,
          serviceId: service.id,
          bookedById: me.user.id,
          createdAt: new Date(now),
        },
      }),
    ]);
    const foreignSlot = await createDoctorScenario();
    await prisma.appointment.create({
      data: {
        reference: 'THEIRS',
        status: AppointmentStatus.CONFIRMED,
        patientId: someoneElse.user.id,
        slotId: foreignSlot.slots[0].id,
        serviceId: foreignSlot.service.id,
        bookedById: someoneElse.user.id,
      },
    });

    const res = await request(app)
      .get('/api/patients/me/appointments')
      .set('Authorization', `Bearer ${me.token}`);

    expect(res.status).toBe(200);
    expect(res.body.appointments.map((a: { id: string }) => a.id)).toEqual([older.id, newer.id].reverse());
  });
});
