// Appointment creation & retrieval.
//
// createAppointment used to contain a textbook check-then-act race condition
// (Gap 5 in LEARNING_GUIDE.md). It is FIXED now — see the comment block above
// it for what the bug was and how the fix works. The proof is
// tests/appointment.race.test.ts, which passes unmodified.
import { AppointmentStatus, Prisma, SlotStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { transitionAppointment } from '../domain/appointmentStateMachine';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../middleware/errors';
import { verifyEligibilityMock } from './insurance.service';
import { generateBookingReference } from '../utils/bookingReference';

export interface CreateAppointmentInput {
  slotId: string;
  serviceId: string;
  notes?: string;
  /** STAFF only: book on behalf of this patient (front-desk flow). */
  patientId?: string;
}

export interface Requester {
  id: string;
  role: 'PATIENT' | 'DOCTOR' | 'STAFF';
}

const appointmentWithDetails = Prisma.validator<Prisma.AppointmentDefaultArgs>()({
  include: {
    slot: { include: { doctor: true, clinic: true } },
    service: true,
    patient: true,
  },
});
type AppointmentWithDetails = Prisma.AppointmentGetPayload<typeof appointmentWithDetails>;

export function toAppointmentDto(appt: AppointmentWithDetails) {
  return {
    id: appt.id,
    reference: appt.reference,
    status: appt.status,
    startAt: appt.slot.startAt.toISOString(),
    endAt: appt.slot.endAt.toISOString(),
    doctor: { id: appt.slot.doctorId, name: appt.slot.doctor.name, specialty: appt.slot.doctor.specialty },
    clinic: { code: appt.slot.clinic.code, name: appt.slot.clinic.name, city: appt.slot.clinic.city },
    service: {
      id: appt.serviceId,
      name: appt.service.name,
      durationMinutes: appt.service.durationMinutes,
      price: Number(appt.service.price),
      requiresApproval: appt.service.requiresApproval,
    },
    patient: { id: appt.patientId, fullName: appt.patient.fullName },
    notes: appt.notes,
    createdAt: appt.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// THE RACE CONDITION (Gap 5) — FIXED, using approach A (conditional write).
// ---------------------------------------------------------------------------
//
// The bug this code used to have, kept here as the lesson:
//
//   1. READ    the slot and CHECK status === OPEN
//   2. WAIT    ~150ms while the mock insurance eligibility check runs
//   3. WRITE   the appointment and flip the slot to BOOKED (unconditionally)
//
// Nothing linked step 1 to step 3, so two patients grabbing the same 10:00
// slot both passed the stale check during the eligibility window and BOTH
// got appointments ("check-then-act"). The $transaction never helped: it
// only made the writes atomic, not the decision fresh.
//
// The fix makes the status flip ITSELF the check, inside the transaction:
//
//   updateMany({ where: { id: slotId, status: OPEN }, data: { status: BOOKED } })
//
// A single UPDATE re-evaluates its WHERE against current, locked row data,
// so the check and the act become one. If count === 0 someone beat us to
// it; throwing inside the $transaction callback rolls everything back and
// the loser gets a 409. The eligibility wait stays OUTSIDE the critical
// section — holding row locks across slow I/O turns a race bug into a
// throughput bug.
//
// Alternatives that also work (not used here, worth knowing):
//   B. Pessimistic row lock: SELECT ... FOR UPDATE inside the transaction;
//      the second request blocks, re-reads, and sees BOOKED.
//   C. Database backstop: a partial unique index on Appointment(slotId)
//      WHERE status NOT IN ('CANCELLED','NO_SHOW') makes double-booking
//      impossible regardless of app code (raw SQL migration; Prisma can't
//      express partial indexes). Best combined with A or B.
//
// Proof: tests/appointment.race.test.ts passes unmodified.
// ---------------------------------------------------------------------------
export async function createAppointment(requester: Requester, input: CreateAppointmentInput) {
  // Resolve who the appointment is FOR. Patients book for themselves;
  // front-desk staff may book on behalf of any patient.
  let patientId = requester.id;
  if (input.patientId && input.patientId !== requester.id) {
    if (requester.role !== 'STAFF') {
      throw new ForbiddenError('Only staff may book on behalf of another patient');
    }
    const patient = await prisma.user.findUnique({ where: { id: input.patientId } });
    if (!patient || patient.role !== 'PATIENT') {
      throw new BadRequestError('patientId does not refer to a patient account');
    }
    patientId = patient.id;
  }

  // ---- Step 1: READ for validation and good error messages only. This
  // data may be stale by write time; correctness does NOT depend on it (the
  // conditional update in step 3 is the real gate).
  const slot = await prisma.slot.findUnique({
    where: { id: input.slotId },
    include: { doctor: true },
  });
  if (!slot) throw new NotFoundError('Slot not found');
  if (slot.status !== SlotStatus.OPEN) {
    throw new BadRequestError('This slot is no longer available');
  }
  if (slot.startAt <= new Date()) {
    throw new BadRequestError('This slot is in the past');
  }

  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service) throw new NotFoundError('Service not found');
  if (!service.specialties.includes(slot.doctor.specialty)) {
    throw new BadRequestError(
      `${service.name} cannot be performed by a ${slot.doctor.specialty} doctor`,
    );
  }

  // ---- Step 2: mock insurance eligibility check (~150ms), deliberately
  // OUTSIDE the transaction so no locks are held across slow I/O.
  await verifyEligibilityMock(patientId);

  // ---- Step 3: WRITE. The conditional updateMany is the fix (Gap 5,
  // approach A): its WHERE re-checks OPEN against current row data under
  // the row lock, so of N concurrent bookers exactly one flips the slot.
  // Everyone else sees count === 0 and aborts; the throw rolls back the
  // whole transaction.
  const appointment = await prisma.$transaction(async (tx) => {
    const claimed = await tx.slot.updateMany({
      where: { id: slot.id, status: SlotStatus.OPEN, startAt: { gt: new Date() } },
      data: { status: SlotStatus.BOOKED },
    });
    if (claimed.count === 0) {
      throw new ConflictError('This slot was just booked by someone else');
    }

    return tx.appointment.create({
      data: {
        reference: generateBookingReference(),
        // requiresApproval visits enter as REQUESTED (front desk reviews
        // them); instant-book visits jump straight to CONFIRMED. The later
        // REQUESTED -> CONFIRMED approval goes through the Gap 1 state
        // machine via PATCH /appointments/:id/status.
        status: service.requiresApproval
          ? AppointmentStatus.REQUESTED
          : AppointmentStatus.CONFIRMED,
        patientId,
        slotId: slot.id,
        serviceId: service.id,
        bookedById: requester.id,
        notes: input.notes,
      },
    });
  });

  return getAppointmentById(appointment.id, requester);
}

/**
 * Object-level authorization, per role:
 *   STAFF   -> any appointment
 *   PATIENT -> only their own
 *   DOCTOR  -> only appointments on their own schedule
 * Owning a valid token is not the same as owning this record — forgetting
 * this check is IDOR, the most common real-world API vulnerability.
 */
async function assertCanAccess(appt: AppointmentWithDetails, requester: Requester) {
  if (requester.role === 'STAFF') return;
  if (requester.role === 'PATIENT') {
    if (appt.patientId !== requester.id) {
      throw new ForbiddenError('This appointment belongs to another patient');
    }
    return;
  }
  // DOCTOR: match the requesting user to their doctor profile.
  const doctor = await prisma.doctor.findUnique({ where: { userId: requester.id } });
  if (!doctor || appt.slot.doctorId !== doctor.id) {
    throw new ForbiddenError('This appointment is not on your schedule');
  }
}

export async function getAppointmentById(appointmentId: string, requester: Requester) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    ...appointmentWithDetails,
  });
  if (!appt) throw new NotFoundError('Appointment not found');
  await assertCanAccess(appt, requester);
  return toAppointmentDto(appt);
}

export async function listPatientAppointments(patientId: string) {
  const appts = await prisma.appointment.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    ...appointmentWithDetails,
  });
  return appts.map(toAppointmentDto);
}

/** Staff overview: upcoming appointments across the clinic chain. */
export async function listUpcomingAppointments() {
  const appts = await prisma.appointment.findMany({
    where: { slot: { startAt: { gte: new Date() } } },
    orderBy: { slot: { startAt: 'asc' } },
    take: 100,
    ...appointmentWithDetails,
  });
  return appts.map(toAppointmentDto);
}

/**
 * All three lifecycle changes funnel through the Gap 1 state machine
 * (implemented). Cancel also re-OPENs the slot; NO_SHOW and COMPLETED leave
 * it BOOKED because the time was consumed either way.
 */
export async function changeStatus(
  appointmentId: string,
  to: AppointmentStatus,
  requester: Requester,
) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    ...appointmentWithDetails,
  });
  if (!appt) throw new NotFoundError('Appointment not found');
  await assertCanAccess(appt, requester);

  // Throws ConflictError (409) for illegal transitions.
  const newStatus = transitionAppointment(appt.status, to);

  // A cancel is more than a status flip: the slot goes back to OPEN so
  // someone else can book it, atomically with the appointment update.
  // NO_SHOW and COMPLETED must NOT re-open the slot (the time was consumed),
  // which the condition below already handles for when those transitions
  // get implemented.
  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id: appointmentId }, data: { status: newStatus } });
    if (newStatus === AppointmentStatus.CANCELLED) {
      await tx.slot.update({ where: { id: appt.slotId }, data: { status: SlotStatus.OPEN } });
    }
  });

  return getAppointmentById(appointmentId, requester);
}
