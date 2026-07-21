import { AppointmentStatus, Prisma, SlotStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { transitionAppointment } from '../domain/appointmentStateMachine';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../middleware/errors';
import { verifyEligibilityMock } from './insurance.service';
import { recordAudit } from './audit.service';
import { generateBookingReference } from '../utils/bookingReference';

export interface CreateAppointmentInput {
  slotId: string;
  serviceId: string;
  notes?: string;
  patientId?: string;
}

export interface Requester {
  id: string;
  role: 'PATIENT' | 'DOCTOR' | 'STAFF';
}

export interface GuestContact {
  fullName: string;
  email: string;
  phone: string;
}

const appointmentWithDetails = Prisma.validator<Prisma.AppointmentDefaultArgs>()({
  include: {
    slot: { include: { doctor: true, clinic: true } },
    service: true,
    patient: true,
    prescriptions: { include: { prescribedBy: true }, orderBy: { createdAt: 'asc' } },
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
    doctor: {
      id: appt.slot.doctorId,
      name: appt.slot.doctor.name,
      nameAr: appt.slot.doctor.nameAr,
      specialty: appt.slot.doctor.specialty,
    },
    clinic: {
      code: appt.slot.clinic.code,
      name: appt.slot.clinic.name,
      nameAr: appt.slot.clinic.nameAr,
      city: appt.slot.clinic.city,
      cityAr: appt.slot.clinic.cityAr,
    },
    service: {
      id: appt.serviceId,
      name: appt.service.name,
      nameAr: appt.service.nameAr,
      durationMinutes: appt.service.durationMinutes,
      price: Number(appt.service.price),
      requiresApproval: appt.service.requiresApproval,
    },
    patient: appt.patient
      ? { id: appt.patient.id, fullName: appt.patient.fullName, isGuest: false }
      : {
          id: null,
          fullName: appt.guestName ?? 'Guest',
          email: appt.guestEmail,
          phone: appt.guestPhone,
          isGuest: true,
        },
    notes: appt.notes,
    prescriptions: appt.prescriptions.map((p) => ({
      id: p.id,
      medication: p.medication,
      dosage: p.dosage,
      frequency: p.frequency,
      instructions: p.instructions,
      prescribedBy: p.prescribedBy.fullName,
      createdAt: p.createdAt.toISOString(),
    })),
    createdAt: appt.createdAt.toISOString(),
  };
}

async function loadBookable(input: CreateAppointmentInput) {
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

  return { slot, service };
}

async function claimSlotAndCreate(
  slot: { id: string },
  service: { id: string; requiresApproval: boolean },
  data: Omit<
    Prisma.AppointmentUncheckedCreateInput,
    'reference' | 'status' | 'slotId' | 'serviceId'
  >,
) {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.slot.updateMany({
      where: { id: slot.id, status: SlotStatus.OPEN, startAt: { gt: new Date() } },
      data: { status: SlotStatus.BOOKED },
    });
    if (claimed.count === 0) {
      throw new ConflictError('This slot was just booked by someone else');
    }

    return tx.appointment.create({
      data: {
        ...data,
        reference: generateBookingReference(),
        status: service.requiresApproval
          ? AppointmentStatus.REQUESTED
          : AppointmentStatus.CONFIRMED,
        slotId: slot.id,
        serviceId: service.id,
      },
    });
  });
}

export async function createAppointment(requester: Requester, input: CreateAppointmentInput) {
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
  } else {
    const self = await prisma.user.findUnique({ where: { id: requester.id } });
    if (!self) {
      throw new UnauthorizedError(
        'Your session refers to an account that no longer exists. Please log in again.',
      );
    }
  }

  const { slot, service } = await loadBookable(input);

  await verifyEligibilityMock(patientId);

  const appointment = await claimSlotAndCreate(slot, service, {
    patientId,
    bookedById: requester.id,
    notes: input.notes,
  });

  void recordAudit(
    requester.id,
    'appointment.create',
    `${appointment.reference}${patientId !== requester.id ? ' (on behalf of patient)' : ''}`,
  );

  return getAppointmentById(appointment.id, requester);
}

export async function createGuestAppointment(
  input: CreateAppointmentInput & { guest: GuestContact },
) {
  const { slot, service } = await loadBookable(input);

  await verifyEligibilityMock(null);

  const appointment = await claimSlotAndCreate(slot, service, {
    guestName: input.guest.fullName,
    guestEmail: input.guest.email,
    guestPhone: input.guest.phone,
    notes: input.notes,
  });

  void recordAudit(null, 'appointment.create', `${appointment.reference} (guest booking)`);

  const created = await prisma.appointment.findUniqueOrThrow({
    where: { id: appointment.id },
    ...appointmentWithDetails,
  });
  return toAppointmentDto(created);
}

async function assertCanAccess(appt: AppointmentWithDetails, requester: Requester) {
  if (requester.role === 'STAFF') return;
  if (requester.role === 'PATIENT') {
    if (appt.patientId !== requester.id) {
      throw new ForbiddenError('This appointment belongs to another patient');
    }
    return;
  }
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

export async function listDoctorAppointments(userId: string) {
  const doctor = await prisma.doctor.findUnique({ where: { userId } });
  if (!doctor) {
    throw new NotFoundError('No doctor profile is linked to this account');
  }

  const appts = await prisma.appointment.findMany({
    where: {
      slot: { doctorId: doctor.id, startAt: { gte: new Date() } },
      status: { not: AppointmentStatus.CANCELLED },
    },
    orderBy: { slot: { startAt: 'asc' } },
    take: 100,
    ...appointmentWithDetails,
  });
  return appts.map(toAppointmentDto);
}

export async function listUpcomingAppointments() {
  const appts = await prisma.appointment.findMany({
    where: { slot: { startAt: { gte: new Date() } } },
    orderBy: { slot: { startAt: 'asc' } },
    take: 100,
    ...appointmentWithDetails,
  });
  return appts.map(toAppointmentDto);
}

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

  if (to === AppointmentStatus.COMPLETED && requester.role !== 'DOCTOR') {
    throw new ForbiddenError('Only the doctor who saw the patient can complete a visit');
  }
  if (to !== AppointmentStatus.COMPLETED && requester.role === 'DOCTOR') {
    throw new ForbiddenError('Doctors can only mark a visit as completed');
  }

  const newStatus = transitionAppointment(appt.status, to);

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id: appointmentId }, data: { status: newStatus } });
    if (newStatus === AppointmentStatus.CANCELLED) {
      await tx.slot.update({ where: { id: appt.slotId }, data: { status: SlotStatus.OPEN } });
    }
  });

  void recordAudit(
    requester.id,
    'appointment.status',
    `${appt.reference}: ${appt.status} -> ${newStatus}`,
  );

  return getAppointmentById(appointmentId, requester);
}
