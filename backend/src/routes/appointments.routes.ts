import { Router } from 'express';
import { z } from 'zod';
import { AppointmentStatus, type Role } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errors';
import { prisma } from '../lib/prisma';
import * as appointmentService from '../services/appointment.service';
import * as prescriptionService from '../services/prescription.service';
import * as auditService from '../services/audit.service';

const createAppointmentSchema = z.object({
  slotId: z.string().min(1),
  serviceId: z.string().min(1),
  notes: z.string().max(500).optional(),
  patientId: z.string().optional(),
});

function requester(req: { user?: { sub: string; role: Role } }): appointmentService.Requester {
  return { id: req.user!.sub, role: req.user!.role };
}

const guestAppointmentSchema = createAppointmentSchema
  .omit({ patientId: true })
  .extend({
    fullName: z.string().min(1).max(100),
    email: z.string().email().optional(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s-]{9,20}$/, 'Enter a valid phone number'),
  });

export const guestAppointmentsRouter = Router();

guestAppointmentsRouter.post(
  '/guest',
  asyncHandler(async (req, res) => {
    const { fullName, email, phone, ...input } = guestAppointmentSchema.parse(req.body);
    const appointment = await appointmentService.createGuestAppointment({
      ...input,
      guest: { fullName, email, phone },
    });
    res.status(201).json(appointment);
  }),
);

export const appointmentsRouter = Router();
appointmentsRouter.use(authenticate);

appointmentsRouter.get(
  '/',
  requireRole('STAFF'),
  asyncHandler(async (_req, res) => {
    res.json({ appointments: await appointmentService.listUpcomingAppointments() });
  }),
);

appointmentsRouter.post(
  '/',
  requireRole('PATIENT', 'STAFF'),
  asyncHandler(async (req, res) => {
    const input = createAppointmentSchema.parse(req.body);
    const appointment = await appointmentService.createAppointment(requester(req), input);
    res.status(201).json(appointment);
  }),
);

appointmentsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await appointmentService.getAppointmentById(req.params.id, requester(req)));
  }),
);

appointmentsRouter.patch(
  '/:id/cancel',
  requireRole('PATIENT', 'STAFF'),
  asyncHandler(async (req, res) => {
    res.json(
      await appointmentService.changeStatus(req.params.id, AppointmentStatus.CANCELLED, requester(req)),
    );
  }),
);

appointmentsRouter.patch(
  '/:id/check-in',
  requireRole('STAFF'),
  asyncHandler(async (req, res) => {
    res.json(
      await appointmentService.changeStatus(req.params.id, AppointmentStatus.CHECKED_IN, requester(req)),
    );
  }),
);

const statusSchema = z.object({ status: z.nativeEnum(AppointmentStatus) });

appointmentsRouter.patch(
  '/:id/status',
  requireRole('STAFF', 'DOCTOR'),
  asyncHandler(async (req, res) => {
    const { status } = statusSchema.parse(req.body);
    res.json(await appointmentService.changeStatus(req.params.id, status, requester(req)));
  }),
);

const prescriptionSchema = z.object({
  medication: z.string().min(1).max(120),
  dosage: z.string().min(1).max(60),
  frequency: z.string().min(1).max(120),
  instructions: z.string().max(500).optional(),
});

appointmentsRouter.post(
  '/:id/prescriptions',
  requireRole('DOCTOR'),
  asyncHandler(async (req, res) => {
    const input = prescriptionSchema.parse(req.body);
    const prescription = await prescriptionService.createPrescription(
      requester(req),
      req.params.id,
      input,
    );
    res.status(201).json(prescription);
  }),
);

appointmentsRouter.patch(
  '/:id/prescriptions/:prescriptionId',
  requireRole('DOCTOR'),
  asyncHandler(async (req, res) => {
    const input = prescriptionSchema.parse(req.body);
    const prescription = await prescriptionService.updatePrescription(
      requester(req),
      req.params.id,
      req.params.prescriptionId,
      input,
    );
    res.json(prescription);
  }),
);

appointmentsRouter.delete(
  '/:id/prescriptions/:prescriptionId',
  requireRole('DOCTOR'),
  asyncHandler(async (req, res) => {
    await prescriptionService.deletePrescription(
      requester(req),
      req.params.id,
      req.params.prescriptionId,
    );
    res.status(204).end();
  }),
);

export const patientsRouter = Router();
patientsRouter.use(authenticate);

patientsRouter.get(
  '/',
  requireRole('STAFF'),
  asyncHandler(async (_req, res) => {
    const patients = await prisma.user.findMany({
      where: { role: 'PATIENT' },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, email: true },
    });
    res.json({ patients });
  }),
);

patientsRouter.get(
  '/me/appointments',
  asyncHandler(async (req, res) => {
    res.json({ appointments: await appointmentService.listPatientAppointments(req.user!.sub) });
  }),
);

patientsRouter.get(
  '/me/activity',
  asyncHandler(async (req, res) => {
    res.json({ entries: await auditService.listUserAudit(req.user!.sub) });
  }),
);

export const auditRouter = Router();
auditRouter.use(authenticate);

auditRouter.get(
  '/',
  requireRole('STAFF'),
  asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit) || 50;
    res.json({ entries: await auditService.listRecentAudit(limit) });
  }),
);
