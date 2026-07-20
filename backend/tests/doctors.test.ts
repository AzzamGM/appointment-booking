import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { Specialty } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { createDoctorScenario } from './helpers';

const app = createApp();

const ids = (res: { body: { doctors: Array<{ id: string }> } }) =>
  res.body.doctors.map((d) => d.id);

describe('GET /api/doctors', () => {
  it('filters by specialty', async () => {
    const cardio = await createDoctorScenario({ specialty: Specialty.CARDIOLOGY });
    await createDoctorScenario({ specialty: Specialty.PEDIATRICS });

    const res = await request(app).get('/api/doctors').query({ specialty: 'CARDIOLOGY' });

    expect(res.status).toBe(200);
    expect(ids(res)).toEqual([cardio.doctor.id]);
  });

  it('filters by clinic code (case-insensitive on input)', async () => {
    const a = await createDoctorScenario();
    await createDoctorScenario();

    const res = await request(app)
      .get('/api/doctors')
      .query({ clinic: a.clinic.code.toLowerCase() });

    expect(ids(res)).toEqual([a.doctor.id]);
  });

  it('intersects specialty and clinic filters', async () => {
    const match = await createDoctorScenario({ specialty: Specialty.CARDIOLOGY });
    await createDoctorScenario({ specialty: Specialty.CARDIOLOGY });
    const otherSpecialty = await createDoctorScenario({ specialty: Specialty.PEDIATRICS });
    await prisma.doctorClinic.create({
      data: { doctorId: otherSpecialty.doctor.id, clinicId: match.clinic.id },
    });

    const res = await request(app)
      .get('/api/doctors')
      .query({ specialty: 'CARDIOLOGY', clinic: match.clinic.code });

    expect(ids(res)).toEqual([match.doctor.id]);
  });

  it('filters by name in the database, case-insensitively', async () => {
    const { doctor } = await createDoctorScenario();
    await prisma.doctor.update({ where: { id: doctor.id }, data: { name: 'Dr. Zafira Unique' } });
    await createDoctorScenario();

    const res = await request(app).get('/api/doctors').query({ q: 'zAFIRA' });

    expect(ids(res)).toEqual([doctor.id]);
  });
});

describe('GET /api/doctors/:id', () => {
  it('returns 404 (not 500) for an unknown doctor id', async () => {
    const res = await request(app).get('/api/doctors/nope-no-such-doctor');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/not found/i);
  });

  it('includes the weekly schedule sorted by day then start time', async () => {
    const { doctor, clinic } = await createDoctorScenario();
    await prisma.availability.createMany({
      data: [
        { doctorId: doctor.id, clinicId: clinic.id, dayOfWeek: 3, startTime: '08:00', endTime: '12:00' },
        { doctorId: doctor.id, clinicId: clinic.id, dayOfWeek: 1, startTime: '14:00', endTime: '16:00' },
      ],
    });

    const res = await request(app).get(`/api/doctors/${doctor.id}`);

    expect(res.status).toBe(200);
    expect(
      res.body.weeklySchedule.map((w: { dayOfWeek: number; startTime: string }) => [
        w.dayOfWeek,
        w.startTime,
      ]),
    ).toEqual([
      [1, '09:00'],
      [1, '14:00'],
      [3, '08:00'],
    ]);
  });
});
