// Shapes returned by the backend API (kept in sync by hand; generating these
// from the backend, e.g. with zod or OpenAPI, is a nice later exercise).

export type Role = 'PATIENT' | 'DOCTOR' | 'STAFF';

export type Specialty =
  | 'GENERAL_PRACTICE'
  | 'PEDIATRICS'
  | 'DERMATOLOGY'
  | 'CARDIOLOGY'
  | 'ORTHOPEDICS';

export type AppointmentStatus =
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

export interface ClinicRef {
  code: string;
  name: string;
  city: string;
}

export interface Clinic extends ClinicRef {
  id: string;
  address: string;
  phone: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: Specialty;
  bio: string | null;
  clinics: ClinicRef[];
}

export interface DoctorDetail extends Doctor {
  weeklySchedule: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    clinic: string;
  }>;
}

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  requiresApproval: boolean;
  specialties: Specialty[];
}

/** ?month=YYYY-MM response, drives the calendar's available-date marking. */
export interface MonthAvailability {
  month: string;
  days: Array<{ date: string; openCount: number }>;
}

/** ?date=YYYY-MM-DD response, the time slots shown after a date click. */
export interface DayAvailability {
  date: string;
  slots: Array<{
    id: string;
    startAt: string;
    endAt: string;
    clinic: ClinicRef;
  }>;
}

export interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  instructions: string | null;
  prescribedBy: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  reference: string;
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  doctor: { id: string; name: string; specialty: Specialty };
  clinic: ClinicRef;
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    price: number;
    requiresApproval: boolean;
  };
  patient: { id: string; fullName: string };
  notes: string | null;
  prescriptions: Prescription[];
  createdAt: string;
}

/** GET /api/patients (staff) — pick a patient for front-desk booking. */
export interface PatientRef {
  id: string;
  fullName: string;
  email: string;
}

/** GET /api/audit (staff) / GET /api/patients/me/activity */
export interface AuditEntry {
  id: string;
  action: string;
  detail: string | null;
  createdAt: string;
  user: { id: string; fullName: string; role: Role } | null;
}
