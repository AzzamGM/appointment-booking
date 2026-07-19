# TODO: Test Coverage (Gap 2)

The test **infrastructure** is done: Vitest + supertest, a dedicated
`medibook_test` database, truncation between tests ([tests/setup.ts](tests/setup.ts)),
and data factories ([tests/helpers.ts](tests/helpers.ts)).

Two test files exist:

- [tests/availability.test.ts](tests/availability.test.ts) — **your reference example.** Covers both shapes of the availability endpoint; copy its structure.
- [tests/appointment.race.test.ts](tests/appointment.race.test.ts) — intentionally failing until Gap 5 is fixed.

Everything below is yours to write. Suggested order — each group is a bit
harder than the last.

## 1. Auth (`POST /api/auth/signup`, `POST /api/auth/login`)

- [x] signup returns 201 with a token and the public user (no `passwordHash` in the body!)
- [x] signup ALWAYS creates a PATIENT — even if the request sneaks in `"role": "STAFF"`
- [x] signup with an existing email returns 409
- [x] signup with a short password / bad email returns 400 with field details
- [x] login works for all three seeded roles and the token carries the right role
- [x] login with wrong password returns 401 — and the *same* message as unknown email (why?)

## 2. Doctors (`GET /api/doctors`, `GET /api/doctors/:id`)

- [x] filter by specialty returns only matching doctors
- [x] filter by clinic code returns only doctors practicing there
- [x] both filters combined intersect correctly
- [x] unknown doctor id returns 404 (not 500!)
- [x] doctor detail includes the weekly schedule, sorted by day then time

## 3. Appointments — happy path & roles (`POST /api/appointments`, `GET /api/appointments/:id`, `GET /api/patients/me/appointments`)

- [x] booking an instant-book service creates a CONFIRMED appointment and flips the slot to BOOKED
- [x] booking a `requiresApproval` service creates a REQUESTED appointment
- [x] booking a service the doctor's specialty can't perform returns 400
- [x] booking a past or BLOCKED slot returns 400
- [x] a DOCTOR token cannot book (403); no token is 401
- [x] STAFF can book on behalf of a patient via `patientId`; a PATIENT passing someone else's `patientId` gets 403
- [x] `patientId` pointing at a STAFF user returns 400
- [x] patient A cannot fetch patient B's appointment (403) — but STAFF can
- [x] a DOCTOR can fetch appointments on their own schedule but not another doctor's
- [x] `GET /api/patients/me/appointments` returns only the caller's, newest first

## 4. Staff schedule management (`POST /api/doctors/:id/availability`, `GET /api/appointments`)

- [x] a PATIENT token gets 403, no token gets 401
- [x] creating availability at a clinic the doctor doesn't practice at returns 400
- [x] `startTime >= endTime` returns 400
- [x] duplicate availability row (same doctor/clinic/day/start) is rejected — which layer catches it?
- [x] staff overview lists only future appointments, soonest first

## 5. After you implement the gaps (write these alongside each gap)

- [x] **Gap 1**: unit tests for `transitionAppointment` — all 36 state pairs, table-driven (no DB needed)
- [x] **Gap 1**: cancel re-OPENs the slot; check-in of a REQUESTED appointment returns 409; no-show leaves the slot BOOKED
- [x] **Gap 4**: Mon 09:00–11:00 at 30min yields exactly 4 slots; a TimeOff 09:30–10:30 removes the middle two; running generation twice creates no duplicates and never touches BOOKED slots
- [x] **Gap 5**: `tests/appointment.race.test.ts` passes unmodified
- [x] **Gap 6**: time off BLOCKs open slots in range and cancels conflicting appointments exactly once (run it twice — idempotency)

## Tips

- Run a single file: `npx vitest run tests/auth.test.ts`
- Watch mode while developing: `npm run test:watch -w backend`
- If a test needs a logged-in user, use `createUserWithToken(role)` — don't go through HTTP signup unless auth is what you're testing.
