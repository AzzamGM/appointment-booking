// Doctor time off cascading into the live schedule (Gap 6 — IMPLEMENTED).
//
// This is an orchestration problem, not an INSERT. The policy chosen here:
//
//   - OPEN slots in the range become BLOCKED: nobody may book a slot the
//     doctor won't attend.
//   - Non-terminal appointments (REQUESTED / CONFIRMED) overlapping the
//     range are CANCELLED via the Gap 1 state machine, and their slots are
//     BLOCKED too, NOT re-opened: the doctor is away, so there is nothing
//     to rebook into. Patients are notified to reschedule. (The alternative,
//     flagging for manual rescheduling, keeps the booking alive but needs a
//     whole rescheduling workflow; cancel + notify is the honest minimum.)
//   - All of that happens in ONE transaction: either the time off exists and
//     the schedule reflects it, or neither.
//   - Notifications (mock emails) are sent AFTER the transaction commits.
//     Notifying about a rolled-back change would be a lie, and doing I/O
//     inside a transaction holds row locks for the I/O's duration.
//   - Idempotency: a time off overlapping an existing one for the same
//     doctor is rejected with 409, so a double-submitted vacation cannot
//     cancel (and email) twice. Merging adjacent ranges would also be
//     defensible; rejecting is simpler and surfaces the duplicate to staff.
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

    // Real patients with a problem: active appointments in the range.
    // Cancel them through the state machine so the transition rules hold.
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

    // Take every remaining slot in the range off the market. This includes
    // the just-cancelled appointments' slots: they stay BLOCKED, not OPEN,
    // because the doctor is away.
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

  // Mock notifications, strictly after commit.
  for (const appt of cancelled) {
    console.log(
      `[mock email] To ${appt.patient.email}: your ${appt.service.name} appointment ` +
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
