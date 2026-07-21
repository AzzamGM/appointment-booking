# MediBook — Medical Clinic Appointment System

A full-stack clinic appointment platform: patients find doctors and book from a
live calendar, staff manage schedules and the front desk, doctors work their own
day list.

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
npm run db:migrate -w backend

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
| patient@medibook.test | PATIENT | booking flow, "My appointments", account |
| staff@medibook.test   | STAFF   | "Front desk" view, on-behalf booking, schedule management |
| doctor@medibook.test  | DOCTOR  | own appointment list, status updates, prescriptions |

## The booking flow

Find a doctor (filter by specialty/clinic) → **month calendar** with available
dates marked (from `?month=` availability) → **click a date** to see its open
times (from `?date=` availability) → pick a time + visit type → confirm.
Instant-book services land as CONFIRMED; approval-required ones (e.g. Annual
Physical) land as REQUESTED for the front desk to review. Guests can book
without an account via the guest endpoint.

## Tests

```bash
npm run test -w backend        # pushes schema to medibook_test, then vitest
npm run test:watch -w backend
```

The suite covers auth, doctors, availability, slot generation, time-off
cascades, the appointment state machine, concurrent-booking safety, and guest
booking.

## API surface

| Method & path | Auth |
|---|---|
| `POST /api/auth/signup` | — (always creates a PATIENT) |
| `POST /api/auth/login` | — |
| `GET /api/doctors?specialty&clinic&q` | — |
| `GET /api/doctors/:id` | — profile + weekly schedule |
| `GET /api/doctors/:id/availability?month=YYYY-MM` | — calendar summary |
| `GET /api/doctors/:id/availability?date=YYYY-MM-DD` | — day detail |
| `GET /api/doctors/me/appointments` | doctor |
| `POST /api/doctors/:id/availability` | staff — set recurring weekly window |
| `POST /api/doctors/:id/slots/generate` | staff — expand rules into slots |
| `POST /api/doctors/:id/time-off` | staff — block time and cascade affected appointments |
| `POST /api/appointments` | patient/staff |
| `POST /api/appointments/guest` | — booking without an account |
| `GET /api/appointments` | staff — upcoming across clinics |
| `GET /api/appointments/:id` | owner/doctor/staff |
| `PATCH /api/appointments/:id/cancel` | patient/staff |
| `PATCH /api/appointments/:id/check-in` | staff |
| `PATCH /api/appointments/:id/status` | staff/doctor |
| `POST /api/appointments/:id/prescriptions` | doctor |
| `GET /api/patients` | staff |
| `GET /api/patients/me/appointments` | any |
| `GET /api/patients/me/activity` | any |
| `GET /api/users/me`, `PATCH /api/users/me` | any |
| `DELETE /api/users/me` | patient |
| `GET /api/audit` | staff |
| `GET /api/clinics`, `GET /api/services` | — reference data |

## Repo layout

```
backend/
  prisma/schema.prisma      data model (Availability rule vs. Slot expansion)
  prisma/seed.ts            sample data
  scripts/applyRawIndexes.ts  indexes applied outside Prisma migrations
  src/middleware/           JWT auth, 3-role authz, error handling
  src/domain/               appointment state machine
  src/services/             availability, appointments, slot generation,
                            time-off, prescriptions, audit, users, insurance
  src/routes/               Express routers
  tests/                    API + domain test suite
frontend/
  src/pages/                Doctors, calendar booking, My appointments,
                            Account, Doctor schedule, Front desk
docker-compose.yml          local Postgres (dev + test databases)
```

## Useful commands

```bash
npm run db:studio -w backend    # Prisma Studio — browse the database
docker compose down -v          # nuke the database and start fresh
npm run typecheck -w backend
```
