import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { BadRequestError, ForbiddenError, NotFoundError } from '../middleware/errors';
import type { Requester } from './appointment.service';
import { recordAudit } from './audit.service';

export interface CreatePrescriptionInput {
  medication: string;
  dosage: string;
  frequency: string;
  instructions?: string;
}

export async function createPrescription(
  requester: Requester,
  appointmentId: string,
  input: CreatePrescriptionInput,
) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { slot: true },
  });
  if (!appt) throw new NotFoundError('Appointment not found');

  if (requester.role !== 'DOCTOR') {
    throw new ForbiddenError('Only the doctor seeing the patient can prescribe medication');
  }
  const doctor = await prisma.doctor.findUnique({ where: { userId: requester.id } });
  if (!doctor || appt.slot.doctorId !== doctor.id) {
    throw new ForbiddenError('This appointment is not on your schedule');
  }

  if (
    appt.status !== AppointmentStatus.CHECKED_IN &&
    appt.status !== AppointmentStatus.COMPLETED
  ) {
    throw new BadRequestError('Prescriptions can only be added once the patient has checked in');
  }

  const prescription = await prisma.prescription.create({
    data: {
      appointmentId,
      medication: input.medication.trim(),
      dosage: input.dosage.trim(),
      frequency: input.frequency.trim(),
      instructions: input.instructions?.trim() || null,
      prescribedById: requester.id,
    },
    include: { prescribedBy: true },
  });

  void recordAudit(
    requester.id,
    'prescription.create',
    `${prescription.medication} ${prescription.dosage} for appointment ${appt.reference}`,
  );

  return {
    id: prescription.id,
    medication: prescription.medication,
    dosage: prescription.dosage,
    frequency: prescription.frequency,
    instructions: prescription.instructions,
    prescribedBy: prescription.prescribedBy.fullName,
    createdAt: prescription.createdAt.toISOString(),
  };
}
