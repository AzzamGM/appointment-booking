-- Makes double-booking impossible at the database level, independent of the
-- application-side guard in appointment.service.ts.
--
-- The index must be PARTIAL: cancelling re-OPENs a slot so it can be rebooked,
-- meaning a slot legitimately accumulates many CANCELLED/NO_SHOW appointments
-- over time. Only non-terminal statuses participate in the uniqueness rule.
--
-- Prisma's schema language cannot express a partial index, so this is
-- hand-written SQL and is invisible to `prisma db push` — which is how the test
-- database is built. scripts/applyRawIndexes.ts replays this file against the
-- test DB afterwards; IF NOT EXISTS keeps both paths idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_active_slot_key"
    ON "Appointment" ("slotId")
    WHERE "status" NOT IN ('CANCELLED', 'NO_SHOW');
