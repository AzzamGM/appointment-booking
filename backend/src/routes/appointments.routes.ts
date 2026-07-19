// Appointment endpoints. All require authentication; role rules per route.
import { Router } from 'express';
import { z } from 'zod';
import { AppointmentStatus, type Role } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errors';
import * as appointmentService from '../services/appointment.service';

const createAppointmentSchema = z.object({
  slotId: z.string().min(1),
  serviceId: z.string().min(1),
  notes: z.string().max(500).optional(),
  patientId: z.string().optional(), // honored for STAFF only (front-desk booking)
});

function requester(req: { user?: { sub: string; role: Role } }): appointmentService.Requester {
  return { id: req.user!.sub, role: req.user!.role };
}

export const appointmentsRouter = Router();
appointmentsRouter.use(authenticate);

// GET /api/appointments — staff overview of upcoming appointments
appointmentsRouter.get(
  '/',
  requireRole('STAFF'),
  asyncHandler(async (_req, res) => {
    res.json({ appointments: await appointmentService.listUpcomingAppointments() });
  }),
);

// POST /api/appointments — ⚠️ intentionally race-prone (Gap 5), see
// appointment.service.ts. Patients book for themselves; staff may pass
// patientId to book on a patient's behalf.
appointmentsRouter.post(
  '/',
  requireRole('PATIENT', 'STAFF'),
  asyncHandler(async (req, res) => {
    const input = createAppointmentSchema.parse(req.body);
    const appointment = await appointmentService.createAppointment(requester(req), input);
    res.status(201).json(appointment);
  }),
);

// GET /api/appointments/:id — patient owner, the slot's doctor, or staff
appointmentsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await appointmentService.getAppointmentById(req.params.id, requester(req)));
  }),
);

// The three lifecycle endpoints below all funnel through the Gap 1 state
// machine and therefore return 501 until it exists.

// PATCH /api/appointments/:id/cancel — patient (own) or staff
appointmentsRouter.patch(
  '/:id/cancel',
  requireRole('PATIENT', 'STAFF'),
  asyncHandler(async (req, res) => {
    res.json(
      await appointmentService.changeStatus(req.params.id, AppointmentStatus.CANCELLED, requester(req)),
    );
  }),
);

// PATCH /api/appointments/:id/check-in — staff only (front desk action)
appointmentsRouter.patch(
  '/:id/check-in',
  requireRole('STAFF'),
  asyncHandler(async (req, res) => {
    res.json(
      await appointmentService.changeStatus(req.params.id, AppointmentStatus.CHECKED_IN, requester(req)),
    );
  }),
);

// PATCH /api/appointments/:id/status — staff, generic transition
// (confirm a REQUESTED visit, mark COMPLETED or NO_SHOW, ...)
const statusSchema = z.object({ status: z.nativeEnum(AppointmentStatus) });

appointmentsRouter.patch(
  '/:id/status',
  requireRole('STAFF'),
  asyncHandler(async (req, res) => {
    const { status } = statusSchema.parse(req.body);
    res.json(await appointmentService.changeStatus(req.params.id, status, requester(req)));
  }),
);

// Mounted at /api/patients — provides GET /api/patients/me/appointments
export const patientsRouter = Router();
patientsRouter.use(authenticate);

patientsRouter.get(
  '/me/appointments',
  asyncHandler(async (req, res) => {
    res.json({ appointments: await appointmentService.listPatientAppointments(req.user!.sub) });
  }),
);
