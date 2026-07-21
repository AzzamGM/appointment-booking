import { Router } from 'express';
import { z } from 'zod';
import { Specialty } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import {
  asyncHandler,
  BadRequestError,
  NotFoundError,
} from '../middleware/errors';
import { dayDetail, monthSummary } from '../services/availability.service';
import { listDoctorAppointments } from '../services/appointment.service';
import { generateSlots } from '../services/slotGeneration.service';
import { createTimeOff } from '../services/timeOff.service';

export const doctorsRouter = Router();

doctorsRouter.get(
  '/me/appointments',
  authenticate,
  requireRole('DOCTOR'),
  asyncHandler(async (req, res) => {
    res.json({ appointments: await listDoctorAppointments(req.user!.sub) });
  }),
);

const listDoctorsSchema = z.object({
  specialty: z.nativeEnum(Specialty).optional(),
  clinic: z.string().optional(),
  q: z.string().optional(),
});

doctorsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const params = listDoctorsSchema.parse(req.query);

    const doctors = await prisma.doctor.findMany({
      where: {
        ...(params.specialty ? { specialty: params.specialty } : {}),
        ...(params.clinic
          ? { clinics: { some: { clinic: { code: params.clinic.toUpperCase() } } } }
          : {}),
        ...(params.q?.trim()
          ? { name: { contains: params.q.trim(), mode: 'insensitive' } }
          : {}),
      },
      include: { clinics: { include: { clinic: true } } },
      orderBy: { name: 'asc' },
    });

    res.json({
      doctors: doctors.map((d) => ({
        id: d.id,
        name: d.name,
        nameAr: d.nameAr,
        specialty: d.specialty,
        bio: d.bio,
        bioAr: d.bioAr,
        clinics: d.clinics.map((dc) => ({
          code: dc.clinic.code,
          name: dc.clinic.name,
          nameAr: dc.clinic.nameAr,
          city: dc.clinic.city,
          cityAr: dc.clinic.cityAr,
        })),
      })),
    });
  }),
);

const availabilityQuerySchema = z
  .object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM').optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').optional(),
  })
  .refine((v) => (v.month ? !v.date : !!v.date), {
    message: 'Provide exactly one of ?month=YYYY-MM or ?date=YYYY-MM-DD',
    path: ['month'],
  });

doctorsRouter.get(
  '/:id/availability',
  asyncHandler(async (req, res) => {
    const params = availabilityQuerySchema.parse(req.query);
    if (params.month) {
      res.json(await monthSummary(req.params.id, params.month));
    } else {
      res.json(await dayDetail(req.params.id, params.date!));
    }
  }),
);

doctorsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
      include: {
        clinics: { include: { clinic: true } },
        availabilities: { include: { clinic: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
      },
    });
    if (!doctor) throw new NotFoundError('Doctor not found');
    res.json({
      id: doctor.id,
      name: doctor.name,
      nameAr: doctor.nameAr,
      specialty: doctor.specialty,
      bio: doctor.bio,
      bioAr: doctor.bioAr,
      clinics: doctor.clinics.map((dc) => ({
        code: dc.clinic.code,
        name: dc.clinic.name,
        nameAr: dc.clinic.nameAr,
        city: dc.clinic.city,
        cityAr: dc.clinic.cityAr,
      })),
      weeklySchedule: doctor.availabilities.map((a) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        clinic: a.clinic.code,
      })),
    });
  }),
);

const createAvailabilitySchema = z
  .object({
    clinicCode: z.string().min(2).max(5),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'expected HH:mm'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'expected HH:mm'),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: 'startTime must be before endTime',
    path: ['startTime'],
  });

doctorsRouter.post(
  '/:id/availability',
  authenticate,
  requireRole('STAFF'),
  asyncHandler(async (req, res) => {
    const input = createAvailabilitySchema.parse(req.body);

    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
      include: { clinics: true },
    });
    if (!doctor) throw new NotFoundError('Doctor not found');

    const clinic = await prisma.clinic.findUnique({ where: { code: input.clinicCode.toUpperCase() } });
    if (!clinic) throw new BadRequestError(`Unknown clinic ${input.clinicCode}`);
    if (!doctor.clinics.some((dc) => dc.clinicId === clinic.id)) {
      throw new BadRequestError(`${doctor.name} does not practice at ${clinic.code}`);
    }

    const availability = await prisma.availability.create({
      data: {
        doctorId: doctor.id,
        clinicId: clinic.id,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
      },
    });
    res.status(201).json(availability);
  }),
);

const generateSlotsSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotMinutes: z.number().int().min(10).max(120).default(30),
});

doctorsRouter.post(
  '/:id/slots/generate',
  authenticate,
  requireRole('STAFF'),
  asyncHandler(async (req, res) => {
    const input = generateSlotsSchema.parse(req.body);
    const result = await generateSlots({ doctorId: req.params.id, ...input });
    res.status(201).json(result);
  }),
);

const timeOffSchema = z
  .object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    reason: z.string().max(200).optional(),
  })
  .refine((v) => v.startAt < v.endAt, { message: 'startAt must be before endAt', path: ['startAt'] });

doctorsRouter.post(
  '/:id/time-off',
  authenticate,
  requireRole('STAFF'),
  asyncHandler(async (req, res) => {
    const input = timeOffSchema.parse(req.body);
    const result = await createTimeOff({
      doctorId: req.params.id,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      reason: input.reason,
    });
    res.status(201).json(result);
  }),
);
