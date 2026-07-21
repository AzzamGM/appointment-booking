import { AppointmentStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { BadRequestError, ForbiddenError, NotFoundError } from '../middleware/errors';
import type { Requester } from './appointment.service';
import { recordAudit } from './audit.service';

export interface PrescriptionInput {
  medication: string;
  dosage: string;
  frequency: string;
  instructions?: string;
}

const LOCKED_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
];

type PrescriptionWithAuthor = Prisma.PrescriptionGetPayload<{ include: { prescribedBy: true } }>;

function toPrescriptionDto(p: PrescriptionWithAuthor) {
  return {
    id: p.id,
    medication: p.medication,
    dosage: p.dosage,
    frequency: p.frequency,
    instructions: p.instructions,
    prescribedBy: p.prescribedBy.fullName,
    createdAt: p.createdAt.toISOString(),
  };
}

function toData(input: PrescriptionInput) {
  return {
    medication: input.medication.trim(),
    dosage: input.dosage.trim(),
    frequency: input.frequency.trim(),
    instructions: input.instructions?.trim() || null,
  };
}

async function assertCanManage(requester: Requester, appointmentId: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { slot: true },
  });
  if (!appt) throw new NotFoundError('Appointment not found');

  if (requester.role !== 'DOCTOR') {
    throw new ForbiddenError('Only the doctor seeing the patient can manage prescriptions');
  }
  const doctor = await prisma.doctor.findUnique({ where: { userId: requester.id } });
  if (!doctor || appt.slot.doctorId !== doctor.id) {
    throw new ForbiddenError('This appointment is not on your schedule');
  }
  if (LOCKED_STATUSES.includes(appt.status)) {
    throw new BadRequestError(
      appt.status === AppointmentStatus.COMPLETED
        ? 'This visit is completed, its prescriptions can no longer be changed'
        : 'Prescriptions cannot be changed on a closed appointment',
    );
  }

  return appt;
}

async function findInAppointment(appointmentId: string, prescriptionId: string) {
  const existing = await prisma.prescription.findUnique({ where: { id: prescriptionId } });
  if (!existing || existing.appointmentId !== appointmentId) {
    throw new NotFoundError('Prescription not found');
  }
  return existing;
}

export async function createPrescription(
  requester: Requester,
  appointmentId: string,
  input: PrescriptionInput,
) {
  const appt = await assertCanManage(requester, appointmentId);

  const prescription = await prisma.prescription.create({
    data: { ...toData(input), appointmentId, prescribedById: requester.id },
    include: { prescribedBy: true },
  });

  void recordAudit(
    requester.id,
    'prescription.create',
    `${prescription.medication} ${prescription.dosage} for appointment ${appt.reference}`,
  );

  return toPrescriptionDto(prescription);
}

export async function updatePrescription(
  requester: Requester,
  appointmentId: string,
  prescriptionId: string,
  input: PrescriptionInput,
) {
  const appt = await assertCanManage(requester, appointmentId);
  await findInAppointment(appointmentId, prescriptionId);

  const prescription = await prisma.prescription.update({
    where: { id: prescriptionId },
    data: toData(input),
    include: { prescribedBy: true },
  });

  void recordAudit(
    requester.id,
    'prescription.update',
    `${prescription.medication} ${prescription.dosage} on appointment ${appt.reference}`,
  );

  return toPrescriptionDto(prescription);
}

export async function deletePrescription(
  requester: Requester,
  appointmentId: string,
  prescriptionId: string,
) {
  const appt = await assertCanManage(requester, appointmentId);
  const existing = await findInAppointment(appointmentId, prescriptionId);

  await prisma.prescription.delete({ where: { id: prescriptionId } });

  void recordAudit(
    requester.id,
    'prescription.delete',
    `${existing.medication} ${existing.dosage} removed from appointment ${appt.reference}`,
  );
}
