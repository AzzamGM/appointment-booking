import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { AppointmentStatus, SlotStatus } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { transitionAppointment } from '../src/domain/appointmentStateMachine';
import { ConflictError } from '../src/middleware/errors';
import { createDoctorScenario, createUserWithToken } from './helpers';

const app = createApp();

const ALL = Object.values(AppointmentStatus);

const LEGAL: Record<AppointmentStatus, AppointmentStatus[]> = {
  REQUESTED: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
  CONFIRMED: [AppointmentStatus.CHECKED_IN, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
  CHECKED_IN: [AppointmentStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

describe('transitionAppointment — all 36 state pairs', () => {
  for (const from of ALL) {
    for (const to of ALL) {
      const legal = LEGAL[from].includes(to);
      it(`${from} -> ${to} ${legal ? 'succeeds' : 'throws ConflictError'}`, () => {
        if (legal) {
          expect(transitionAppointment(from, to)).toBe(to);
        } else {
          expect(() => transitionAppointment(from, to)).toThrowError(ConflictError);
        }
      });
    }
  }
});

describe('lifecycle endpoints', () => {
  async function bookedAppointment(requiresApproval = false) {
    const scenario = await createDoctorScenario({ serviceRequiresApproval: requiresApproval });
    const patient = await createUserWithToken('PATIENT');
    const staff = await createUserWithToken('STAFF');
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ slotId: scenario.slots[0].id, serviceId: scenario.service.id });
    expect(res.status).toBe(201);
    return { scenario, patient, staff, appointment: res.body };
  }

  it('cancel re-OPENs the slot', async () => {
    const { scenario, patient, appointment } = await bookedAppointment();

    const res = await request(app)
      .patch(`/api/appointments/${appointment.id}/cancel`)
      .set('Authorization', `Bearer ${patient.token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');
    const slot = await prisma.slot.findUniqueOrThrow({ where: { id: scenario.slots[0].id } });
    expect(slot.status).toBe(SlotStatus.OPEN);
  });

  it('check-in of a REQUESTED appointment returns 409', async () => {
    const { staff, appointment } = await bookedAppointment(true);

    const res = await request(app)
      .patch(`/api/appointments/${appointment.id}/check-in`)
      .set('Authorization', `Bearer ${staff.token}`);

    expect(res.status).toBe(409);
    const inDb = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
    expect(inDb.status).toBe(AppointmentStatus.REQUESTED);
  });

  it('no-show leaves the slot BOOKED (the time was consumed)', async () => {
    const { scenario, staff, appointment } = await bookedAppointment();

    const res = await request(app)
      .patch(`/api/appointments/${appointment.id}/status`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ status: 'NO_SHOW' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('NO_SHOW');
    const slot = await prisma.slot.findUniqueOrThrow({ where: { id: scenario.slots[0].id } });
    expect(slot.status).toBe(SlotStatus.BOOKED);
  });

  it('staff confirms a REQUESTED appointment via the generic status endpoint', async () => {
    const { staff, appointment } = await bookedAppointment(true);

    const res = await request(app)
      .patch(`/api/appointments/${appointment.id}/status`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ status: 'CONFIRMED' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CONFIRMED');
  });
});
