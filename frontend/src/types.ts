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
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone: string | null;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

export interface ClinicRef {
  code: string;
  name: string;
  nameAr?: string | null;
  city: string;
  cityAr?: string | null;
}

export interface Clinic extends ClinicRef {
  id: string;
  address: string;
  addressAr?: string | null;
  phone: string;
}

export interface Doctor {
  id: string;
  name: string;
  nameAr?: string | null;
  specialty: Specialty;
  bio: string | null;
  bioAr?: string | null;
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
  nameAr?: string | null;
  durationMinutes: number;
  price: number;
  requiresApproval: boolean;
  specialties: Specialty[];
}

export interface MonthAvailability {
  month: string;
  days: Array<{ date: string; openCount: number }>;
}

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
  doctor: { id: string; name: string; nameAr?: string | null; specialty: Specialty };
  clinic: ClinicRef;
  service: {
    id: string;
    name: string;
    nameAr?: string | null;
    durationMinutes: number;
    price: number;
    requiresApproval: boolean;
  };
  patient: {
    id: string | null;
    fullName: string;
    isGuest: boolean;
    email?: string | null;
    phone?: string | null;
  };
  notes: string | null;
  prescriptions: Prescription[];
  createdAt: string;
}

export interface PatientRef {
  id: string;
  fullName: string;
  email: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  detail: string | null;
  createdAt: string;
  user: { id: string; fullName: string; role: Role } | null;
}
