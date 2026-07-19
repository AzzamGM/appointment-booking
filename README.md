# MediBook — Medical Clinic Appointment System (Learning Project)

A full-stack clinic appointment platform (think Zocdoc / a clinic's patient
portal) whose backend is **deliberately incomplete**: six well-marked gaps
teach core backend engineering concepts (concurrency, calendar algorithms,
indexing, state machines, orchestration, testing).

**Start here → [LEARNING_GUIDE.md](LEARNING_GUIDE.md)** — every gap, in
suggested order, with what it teaches.

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | Vite + React + TypeScript, Tailwind, TanStack Query, React Router, react-day-picker |
| Backend  | Node + Express + TypeScript, Prisma, PostgreSQL, JWT, zod |
| Tests    | Vitest + supertest against a real Postgres test database |

## Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres)

## Setup

```bash
# 1. Install everything (npm workspaces — one install for both apps)
npm install

# 2. Start Postgres (creates dev db `medibook` + test db `medibook_test`)
docker compose up -d

# 3. Apply migrations + generate the Prisma client
npm run db:migrate -w backend        # runs prisma migrate dev

# 4. Seed sample data (2 clinics, 6 doctors, ~3 weeks of slots, sample bookings)
npm run db:seed -w backend

# 5. Run both apps
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:4000/api/health

Seeded logins (password `password123` for all):

| Email                 | Role    | Sees |
|-----------------------|---------|------|
| patient@medibook.test | PATIENT | booking flow, "My appointments" |
| staff@medibook.test   | STAFF   | "Front desk" view, on-behalf booking, schedule management |
| doctor@medibook.test  | DOCTOR  | (API-only for now) appointments on Dr. Al-Qahtani's schedule |

## The booking flow (what the frontend exercises)

Find a doctor (filter by specialty/clinic) → **month calendar** with
available dates marked (from `?month=` availability) → **click a date** to
see its open times (from `?date=` availability) → pick a time + visit type →
confirm. Instant-book services land as CONFIRMED; approval-required ones
(e.g. Annual Physical) land as REQUESTED for the front desk to review.

## Tests

```bash
npm run test -w backend        # pushes schema to medibook_test, then vitest
npm run test:watch -w backend
```

**Expected state out of the box:** the availability tests pass;
`tests/appointment.race.test.ts` **fails**. That failure is a feature — it
proves the intentional race condition in `POST /appointments` (Gap 5). Your
job is to make it pass. Coverage for the rest of the API is your Gap 2 — see
[backend/TODO_TESTS.md](backend/TODO_TESTS.md).

## API surface

| Method & path | Auth | Status |
|---|---|---|
| `POST /api/auth/signup` | — | ✅ (always creates a PATIENT — see auth.service.ts for why) |
| `POST /api/auth/login` | — | ✅ (all roles) |
| `GET /api/doctors?specialty&clinic&q` | — | ✅ (deliberately unindexed — Gap 3) |
| `GET /api/doctors/:id` | — | ✅ profile + weekly schedule |
| `GET /api/doctors/:id/availability?month=YYYY-MM` | — | ✅ calendar summary (Gap 3 target) |
| `GET /api/doctors/:id/availability?date=YYYY-MM-DD` | — | ✅ day detail |
| `POST /api/doctors/:id/availability` | staff | ✅ set recurring weekly window |
| `POST /api/doctors/:id/slots/generate` | staff | 🚧 501 — Gap 4 slot generation |
| `POST /api/doctors/:id/time-off` | staff | 🚧 501 — Gap 6 cascade |
| `POST /api/appointments` | patient/staff | ⚠️ works, intentionally race-prone — Gap 5 |
| `GET /api/appointments` | staff | ✅ upcoming across clinics |
| `GET /api/appointments/:id` | owner/doctor/staff | ✅ |
| `GET /api/patients/me/appointments` | any | ✅ |
| `PATCH /api/appointments/:id/cancel` | patient/staff | 🚧 501 — needs Gap 1 state machine |
| `PATCH /api/appointments/:id/check-in` | staff | 🚧 501 — needs Gap 1 |
| `PATCH /api/appointments/:id/status` | staff | 🚧 501 — needs Gap 1 |
| `GET /api/clinics`, `GET /api/services` | — | ✅ reference data |

## Repo layout

```
backend/
  prisma/schema.prisma      data model (Availability rule vs. Slot expansion)
  prisma/seed.ts            sample data (+ the dumb seed-only slot loop, Gap 4)
  src/middleware/           JWT auth, 3-role authz, error handling (complete)
  src/services/             availability (Gap 3), appointment (Gap 5),
                            slotGeneration stub (Gap 4), mock insurance check
  src/domain/               appointment state machine stub (Gap 1)
  src/routes/               Express routers; time-off stub (Gap 6)
  tests/                    infra + example test (Gap 2 = write the rest)
  TODO_TESTS.md
frontend/
  src/pages/                Doctors, calendar booking, My appointments, Front desk
docker-compose.yml          local Postgres (dev + test databases)
LEARNING_GUIDE.md           ← the map of all six gaps
```

## Useful commands

```bash
npm run db:studio -w backend    # Prisma Studio — browse the database
docker compose down -v          # nuke the database and start fresh
grep -rn "TODO(learn)" backend  # list every learning marker
```
