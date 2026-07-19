// Runs before every test file (see vitest.config.ts, which also points
// DATABASE_URL at medibook_test BEFORE any module loads).
//
// Strategy: truncate every table before each test so tests are independent
// and order-insensitive. TRUNCATE ... CASCADE is fast and resets everything
// in one statement. Each test then builds exactly the data it needs via
// tests/helpers.ts — no shared fixtures, no mystery state.
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
