import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { SlotStatus } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { createDoctorScenario, toDateParam, toMonthParam } from './helpers';

const app = createApp();

const T = (iso: string) => new Date(iso);

describe('GET /api/doctors/:id/availability?month=', () => {
  it('summarizes which dates in the month have open slots, with counts', async () => {
    const { doctor } = await createDoctorScenario({
      slotTimes: [
        T('2030-06-03T09:00:00.000Z'),
        T('2030-06-03T09:30:00.000Z'),
        T('2030-06-17T14:00:00.000Z'),
      ],
    });

    const res = await request(app)
      .get(`/api/doctors/${doctor.id}/availability`)
      .query({ month: '2030-06' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      month: '2030-06',
      days: [
        { date: '2030-06-03', openCount: 2 },
        { date: '2030-06-17', openCount: 1 },
      ],
    });
  });

  it('does not count BOOKED slots — a fully booked day disappears from the calendar', async () => {
    const { doctor, slots } = await createDoctorScenario({
      slotTimes: [T('2030-06-03T09:00:00.000Z'), T('2030-06-10T09:00:00.000Z')],
    });
    await prisma.slot.update({ where: { id: slots[0].id }, data: { status: SlotStatus.BOOKED } });

    const res = await request(app)
      .get(`/api/doctors/${doctor.id}/availability`)
      .query({ month: '2030-06' });

    expect(res.body.days).toEqual([{ date: '2030-06-10', openCount: 1 }]);
  });

  it('returns an empty summary for a month with no slots', async () => {
    const { doctor } = await createDoctorScenario({ slotTimes: [T('2030-06-03T09:00:00.000Z')] });

    const res = await request(app)
      .get(`/api/doctors/${doctor.id}/availability`)
      .query({ month: '2030-07' });

    expect(res.status).toBe(200);
    expect(res.body.days).toEqual([]);
  });
});

describe('GET /api/doctors/:id/availability?date=', () => {
  it('lists the open slots of that day, sorted by time, with clinic info', async () => {
    const { doctor, clinic } = await createDoctorScenario({
      slotTimes: [T('2030-06-03T14:00:00.000Z'), T('2030-06-03T09:00:00.000Z')],
    });

    const res = await request(app)
      .get(`/api/doctors/${doctor.id}/availability`)
      .query({ date: '2030-06-03' });

    expect(res.status).toBe(200);
    expect(res.body.date).toBe('2030-06-03');
    expect(res.body.slots).toHaveLength(2);
    expect(res.body.slots.map((s: { startAt: string }) => s.startAt)).toEqual([
      '2030-06-03T09:00:00.000Z',
      '2030-06-03T14:00:00.000Z',
    ]);
    expect(res.body.slots[0].clinic).toEqual({
      code: clinic.code,
      name: clinic.name,
      nameAr: clinic.nameAr,
      city: clinic.city,
      cityAr: clinic.cityAr,
    });
  });

  it('excludes booked slots from the day view', async () => {
    const { doctor, slots } = await createDoctorScenario({
      slotTimes: [T('2030-06-03T09:00:00.000Z'), T('2030-06-03T09:30:00.000Z')],
    });
    await prisma.slot.update({ where: { id: slots[0].id }, data: { status: SlotStatus.BOOKED } });

    const res = await request(app)
      .get(`/api/doctors/${doctor.id}/availability`)
      .query({ date: '2030-06-03' });

    expect(res.body.slots).toHaveLength(1);
    expect(res.body.slots[0].id).toBe(slots[1].id);
  });

  it('works with helper-relative dates too (self-consistency check)', async () => {
    const { doctor, slots } = await createDoctorScenario();
    const date = toDateParam(slots[0].startAt);

    const res = await request(app)
      .get(`/api/doctors/${doctor.id}/availability`)
      .query({ date });

    expect(res.body.slots.length).toBeGreaterThan(0);

    const monthRes = await request(app)
      .get(`/api/doctors/${doctor.id}/availability`)
      .query({ month: toMonthParam(slots[0].startAt) });
    const day = monthRes.body.days.find((d: { date: string }) => d.date === date);
    expect(day.openCount).toBe(res.body.slots.length);
  });
});

describe('GET /api/doctors/:id/availability — validation & errors', () => {
  it('rejects a request with neither month nor date', async () => {
    const { doctor } = await createDoctorScenario();

    const res = await request(app).get(`/api/doctors/${doctor.id}/availability`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
  });

  it('rejects a request with BOTH month and date', async () => {
    const { doctor } = await createDoctorScenario();

    const res = await request(app)
      .get(`/api/doctors/${doctor.id}/availability`)
      .query({ month: '2030-06', date: '2030-06-03' });

    expect(res.status).toBe(400);
  });

  it('rejects malformed values with field details', async () => {
    const { doctor } = await createDoctorScenario();

    const res = await request(app)
      .get(`/api/doctors/${doctor.id}/availability`)
      .query({ month: 'June 2030' });

    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toContain('month');
  });

  it('returns 404 (not 500, not an empty list) for an unknown doctor', async () => {
    const res = await request(app)
      .get('/api/doctors/nope-no-such-doctor/availability')
      .query({ month: '2030-06' });

    expect(res.status).toBe(404);
  });
});
