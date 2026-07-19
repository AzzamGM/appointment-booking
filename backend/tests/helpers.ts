// Test data factories. Each test creates exactly the world it needs.
import { Role, SlotStatus, Specialty } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { signToken } from '../src/middleware/auth';

/**
 * Create a user directly in the DB and mint a token for them.
 * (Bypasses bcrypt on purpose — hashing is slow and signup already has its
 * own tests. The stored hash is junk; these users never log in via HTTP.)
 */
export async function createUserWithToken(role: Role = 'PATIENT') {
  const user = await prisma.user.create({
    data: {
      email: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
      passwordHash: 'not-a-real-hash',
      fullName: 'Test User',
      role,
    },
  });
  return { user, token: signToken({ sub: user.id, role: user.role }) };
}

export interface ScenarioOptions {
  specialty?: Specialty;
  /** UTC instants for the OPEN slots to create (30 minutes each). */
  slotTimes?: Date[];
  serviceRequiresApproval?: boolean;
}

function inDays(days: number, hourUtc: number, minute = 0): Date {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  d.setUTCHours(hourUtc, minute, 0, 0);
  return d;
}

/** Default: two open slots a week from now, 10:00 and 10:30 UTC. */
export function defaultSlotTimes(): Date[] {
  return [inDays(7, 10, 0), inDays(7, 10, 30)];
}

/**
 * Create a complete bookable world: a clinic, a doctor with a weekly
 * availability rule, a matching service, and OPEN Slot rows at the given
 * times. Returns everything a test needs to search, view, or book.
 */
export async function createDoctorScenario(opts: ScenarioOptions = {}) {
  const {
    specialty = Specialty.GENERAL_PRACTICE,
    slotTimes = defaultSlotTimes(),
    serviceRequiresApproval = false,
  } = opts;

  const clinic = await prisma.clinic.create({
    data: {
      code: `T${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      name: 'MediBook Testville',
      address: '1 Test St',
      city: 'Testville',
      phone: '+1 000 555 0000',
    },
  });

  const doctor = await prisma.doctor.create({
    data: {
      name: 'Dr. Test Doctor',
      specialty,
      clinics: { create: [{ clinicId: clinic.id }] },
    },
  });

  await prisma.availability.create({
    data: { doctorId: doctor.id, clinicId: clinic.id, dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
  });

  const service = await prisma.service.create({
    data: {
      name: `Test Service ${Math.random().toString(36).slice(2, 8)}`,
      durationMinutes: 30,
      price: 90,
      requiresApproval: serviceRequiresApproval,
      specialties: [specialty],
    },
  });

  const slots = [];
  for (const startAt of slotTimes) {
    slots.push(
      await prisma.slot.create({
        data: {
          doctorId: doctor.id,
          clinicId: clinic.id,
          startAt,
          endAt: new Date(startAt.getTime() + 30 * 60_000),
          status: SlotStatus.OPEN,
        },
      }),
    );
  }

  return { clinic, doctor, service, slots };
}

/** YYYY-MM-DD (UTC) for a Date — matches the availability API's date param. */
export function toDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** YYYY-MM (UTC) for a Date — matches the availability API's month param. */
export function toMonthParam(date: Date): string {
  return date.toISOString().slice(0, 7);
}
