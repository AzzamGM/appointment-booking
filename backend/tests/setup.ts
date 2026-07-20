import { beforeEach, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma';

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Appointment", "Slot", "TimeOff", "Availability", ' +
      '"DoctorClinic", "Service", "Doctor", "Clinic", "User" CASCADE',
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
