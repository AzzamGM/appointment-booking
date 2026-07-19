# Learning Guide

This codebase is **intentionally incomplete**. The frontend, auth, error
handling, and test infrastructure are finished; six backend gaps are left for
you, marked in code with `TODO(learn)` comments. This file lists them in
suggested order of difficulty — each gap teaches one core backend concept.

Search the codebase for `TODO(learn)` to find every marker:

```
grep -rn "TODO(learn)" backend/src backend/prisma
```

**Domain in one paragraph:** MediBook is a small clinic chain. A `Clinic` is
a branch; a `Doctor` (with a specialty) practices at one or more branches.
`Availability` is a doctor's recurring weekly rule ("Mon 09:00–17:00 at
Downtown"); `Slot` rows are that rule expanded into concrete bookable times.
A `Service` is a visit type (duration, price, which specialties perform it,
and whether the front desk must approve it). Patients — or front-desk staff
on their behalf — book a slot + service into an `Appointment`, which walks
the lifecycle REQUESTED → CONFIRMED → CHECKED_IN → COMPLETED (or CANCELLED /
NO_SHOW). The calendar UI reads slots; *generating* slots is Gap 4.

---

## Gap 1 — Appointment state machine  🟢 warm-up

**Concept: modeling a lifecycle as data + enforcing invariants.**

Six states exist (`REQUESTED`, `CONFIRMED`, `CHECKED_IN`, `COMPLETED`,
`CANCELLED`, `NO_SHOW`) but nothing defines which moves are legal. All three
lifecycle endpoints (cancel, check-in, generic status change) currently
return **501**.

- Where: [backend/src/domain/appointmentStateMachine.ts](backend/src/domain/appointmentStateMachine.ts) (full instructions in the file), wired into `changeStatus` in [backend/src/services/appointment.service.ts](backend/src/services/appointment.service.ts)
- Done when: Cancel / Confirm / Check-in work from both patient and staff UIs; illegal moves (checking in a REQUESTED visit, cancelling a COMPLETED one) return 409; cancelling re-OPENs the slot atomically; you have table-driven unit tests over all 36 state pairs
- Why it matters: every non-trivial backend entity (orders, claims, deploys, tickets) is a state machine. Teams that keep transitions implicit end up with checked-in appointments that were never confirmed.

## Gap 2 — Write the missing tests  🟢

**Concept: integration testing against a real database.**

The runner, test DB, truncation strategy, and factories are built. One full
example test exists (both shapes of the availability endpoint) — the rest of
the API is uncovered.

- Where: [backend/TODO_TESTS.md](backend/TODO_TESTS.md) (the checklist), [backend/tests/availability.test.ts](backend/tests/availability.test.ts) (the pattern to copy)
- Done when: the checklist's sections 1–4 are green
- Why it matters: the later gaps (4, 5, 6 especially) are only safe to attempt with a net underneath you. Write tests early so refactoring is cheap.

## Gap 3 — Search performance & indexes  🟡

**Concept: query planning, EXPLAIN ANALYZE, and where indexes go.**

Doctor search and both availability queries work, but the schema has zero
indexes beyond primary/unique keys (Postgres does **not** index foreign keys
automatically), the month summary aggregates hundreds of rows in JavaScript
instead of a SQL GROUP BY, and the doctor name filter runs in JS.

- Where: [backend/src/services/availability.service.ts](backend/src/services/availability.service.ts) (step-by-step plan in the header comment), [backend/src/routes/doctors.routes.ts](backend/src/routes/doctors.routes.ts), [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
- Done when: you have before/after `EXPLAIN (ANALYZE, BUFFERS)` output showing index scans replacing seq scans on a ~500k-slot dataset, and the month summary is a single SQL aggregate
- Why it matters: "add an index" is the highest-leverage database skill there is, but only if you can *read the plan* and prove the win rather than sprinkle indexes on faith.

## Gap 4 — Availability → Slot generation  🟡

**Concept: calendar/date-range algorithms, overlap predicates, idempotency.**

The data model splits scheduling into a rule (`Availability`) and its
expansion (`Slot` rows). The expansion algorithm — cut weekly windows into a
slot grid, skip `TimeOff`, never duplicate, never touch booked slots — is a
stub that returns **501**. (Seeded slots exist only because the seed script
uses a deliberately dumb stand-in that ignores time off — you can see the
bug in the seeded data: Dr. Marino has bookable slots during her conference.)

- Where: [backend/src/services/slotGeneration.service.ts](backend/src/services/slotGeneration.service.ts) — the file is a full requirements brief; wired to `POST /api/doctors/:id/slots/generate`
- Done when: staff can set new availability and generate real slots for a date range; a TimeOff block punches correct holes; running generation twice changes nothing (idempotent); the seed script's dumb loop is replaced by a call to your function
- Why it matters: this is the class of "business logic with edge cases" that ORMs don't do for you — off-by-one time math, interval overlap, DST — and where real scheduling products earn their keep.

## Gap 5 — Fix the booking race condition  🔴 the boss fight

**Concept: concurrency — check-then-act races, row locking, optimistic writes, DB constraints.**

`POST /appointments` reads the slot, waits ~150ms on a mock insurance
eligibility check, then writes. Two patients grabbing the same 10:00 slot
**both succeed** — two appointments, one physical time slot. A test proves
it — and fails, on purpose.

- Where: the annotated race walkthrough + three fix strategies in [backend/src/services/appointment.service.ts](backend/src/services/appointment.service.ts); the failing proof in [backend/tests/appointment.race.test.ts](backend/tests/appointment.race.test.ts)
- Done when: `appointment.race.test.ts` passes **unmodified**. Bonus: also add the partial-unique-index backstop (raw SQL migration) and observe how the two layers fail differently
- Why it matters: this exact bug — in bookings, inventory, wallet balances — is the most expensive class of backend bug in production systems. `$transaction` alone does not save you, and understanding *why* is the lesson.

## Gap 6 — Time-off cascading to appointments  🔴

**Concept: multi-entity orchestration, transactions vs. side effects, idempotency.**

When staff block out a doctor's vacation, OPEN slots in the range must become
BLOCKED and already-booked appointments need a policy (cancel + notify, or
flag for reschedule) — executed atomically, notified after commit, safe to
retry. The endpoint exists and returns **501**.

- Where: `POST /api/doctors/:id/time-off` in [backend/src/routes/doctors.routes.ts](backend/src/routes/doctors.routes.ts) — the TODO there is a full design brief (what goes inside the transaction, what must wait until after commit, and why)
- Done when: creating time off blocks its slots and handles conflicting appointments exactly once (idempotent on double-submit), with one mock notification per affected patient
- Why it matters: real backend work is rarely one table. This is the saga/workflow problem in miniature: which effects are atomic, which are eventually consistent, and what happens on retry. It also *composes* Gaps 1 and 4 — the state machine transitions the appointments, and your slot generator must respect the TimeOff you just created.

---

## Suggested path

```
Gap 1 (state machine)  →  Gap 2 (tests)  →  Gap 3 (indexes)
        →  Gap 4 (slot generation)  →  Gap 5 (race)  →  Gap 6 (time-off cascade)
```

Gaps 1+2 give you tools and a safety net. 3 is database craft; 4 is
algorithmic craft. 5 needs 2's testing fluency. 6 composes everything —
1's transitions, 4's calendar awareness, and 5's transaction instincts.
