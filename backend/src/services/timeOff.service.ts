import { AppointmentStatus, SlotStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { transitionAppointment } from '../domain/appointmentStateMachine';
import { BadRequestError, ConflictError, NotFoundError } from '../middleware/errors';

export interface CreateTimeOffInput {
  doctorId: string;
  startAt: Date;
  endAt: Date;
  reason?: string;
}

export async function createTimeOff(input: CreateTimeOffInput) {
  const { doctorId, startAt, endAt, reason } = input;

  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) throw new NotFoundError('Doctor not found');
  if (startAt <= new Date()) {
    throw new BadRequestError('Time off must start in the future');
  }

  const overlapping = await prisma.timeOff.findFirst({
    where: { doctorId, startAt: { lt: endAt }, endAt: { gt: startAt } },
  });
  if (overlapping) {
    throw new ConflictError(
      'This range overlaps an existing time-off block for this doctor',
    );
  }

  const { timeOff, blockedSlots, cancelled } = await prisma.$transaction(async (tx) => {
    const timeOff = await tx.timeOff.create({
      data: { doctorId, startAt, endAt, reason },
    });

    const affected = await tx.appointment.findMany({
      where: {
        status: { in: [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED] },
        slot: { doctorId, startAt: { lt: endAt }, endAt: { gt: startAt } },
      },
      include: { patient: true, slot: true, service: true },
    });
    for (const appt of affected) {
      await tx.appointment.update({
        where: { id: appt.id },
        data: { status: transitionAppointment(appt.status, AppointmentStatus.CANCELLED) },
      });
    }

    const blocked = await tx.slot.updateMany({
      where: {
        doctorId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        status: { in: [SlotStatus.OPEN, SlotStatus.BOOKED] },
      },
      data: { status: SlotStatus.BLOCKED },
    });

    return { timeOff, blockedSlots: blocked.count, cancelled: affected };
  });

  for (const appt of cancelled) {
    console.log(
      `[mock email] To ${appt.patient?.email ?? appt.guestEmail}: your ${appt.service.name} appointment ` +
        `${appt.reference} on ${appt.slot.startAt.toISOString()} was cancelled because ` +
        `${doctor.name} is unavailable${reason ? ` (${reason})` : ''}. ` +
        'Please rebook at your convenience.',
    );
  }

  return {
    timeOff: {
      id: timeOff.id,
      doctorId: timeOff.doctorId,
      startAt: timeOff.startAt.toISOString(),
      endAt: timeOff.endAt.toISOString(),
      reason: timeOff.reason,
    },
    blockedSlots,
    cancelledAppointments: cancelled.map((a) => a.reference),
  };
}
