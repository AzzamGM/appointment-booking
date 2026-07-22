import bcrypt from 'bcryptjs';
import { AppointmentStatus, SlotStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../middleware/errors';
import { BCRYPT_ROUNDS, toPublicUser } from './auth.service';
import { recordAudit } from './audit.service';

const ACTIVE_STATUSES = [
  AppointmentStatus.REQUESTED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
];

export interface UpdateProfileInput {
  fullName?: string;
  fullNameAr?: string | null;
  phone?: string | null;
  currentPassword?: string;
  newPassword?: string;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new UnauthorizedError('Your account no longer exists. Please log in again.');
  }

  const data: {
    fullName?: string;
    fullNameAr?: string | null;
    phone?: string | null;
    passwordHash?: string;
    tokenVersion?: number;
  } = {};

  if (input.fullName !== undefined) data.fullName = input.fullName.trim();
  if (input.fullNameAr !== undefined) data.fullNameAr = input.fullNameAr?.trim() || null;
  if (input.phone !== undefined) data.phone = input.phone?.trim() || null;

  if (input.newPassword) {
    if (!input.currentPassword) {
      throw new BadRequestError('Enter your current password to set a new one');
    }
    const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestError('Your current password is incorrect');
    }
    data.passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
    // Invalidates every token issued before this change, so a session opened
    // with the old password (or a stolen token) stops working immediately.
    data.tokenVersion = user.tokenVersion + 1;
  }

  const updated = await prisma.user.update({ where: { id: userId }, data });

  void recordAudit(userId, 'user.update', Object.keys(data).join(', ') || 'no changes');

  return toPublicUser(updated);
}

export async function deleteAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { doctorProfile: true, prescriptions: { take: 1 } },
  });
  if (!user) {
    throw new UnauthorizedError('Your account no longer exists. Please log in again.');
  }
  if (user.prescriptions.length > 0) {
    throw new BadRequestError(
      'This account has authored prescriptions and cannot be deleted from here.',
    );
  }

  await prisma.$transaction(async (tx) => {
    const active = await tx.appointment.findMany({
      where: { patientId: userId, status: { in: ACTIVE_STATUSES } },
      select: { slotId: true },
    });
    const slotIds = active.map((a) => a.slotId);
    if (slotIds.length > 0) {
      await tx.slot.updateMany({
        where: { id: { in: slotIds }, status: SlotStatus.BOOKED },
        data: { status: SlotStatus.OPEN },
      });
    }

    await tx.appointment.deleteMany({ where: { patientId: userId } });
    await tx.appointment.updateMany({ where: { bookedById: userId }, data: { bookedById: null } });
    await tx.auditLog.updateMany({ where: { userId }, data: { userId: null } });
    if (user.doctorProfile) {
      await tx.doctor.update({ where: { id: user.doctorProfile.id }, data: { userId: null } });
    }

    await tx.user.delete({ where: { id: userId } });
  });

  void recordAudit(null, 'user.delete', user.email);
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('Account not found');
  }
  return toPublicUser(user);
}
