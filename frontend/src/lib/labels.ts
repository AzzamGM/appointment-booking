import type { AppointmentStatus, Specialty } from '../types';

export const SPECIALTIES: Specialty[] = [
  'GENERAL_PRACTICE',
  'PEDIATRICS',
  'DERMATOLOGY',
  'CARDIOLOGY',
  'ORTHOPEDICS',
];

export function specialtyLabel(s: Specialty): string {
  const labels: Record<Specialty, string> = {
    GENERAL_PRACTICE: 'General Practice',
    PEDIATRICS: 'Pediatrics',
    DERMATOLOGY: 'Dermatology',
    CARDIOLOGY: 'Cardiology',
    ORTHOPEDICS: 'Orthopedics',
  };
  return labels[s];
}

export const statusLabel: Record<AppointmentStatus, string> = {
  REQUESTED: 'Request submitted',
  CONFIRMED: 'Appointment confirmed',
  CHECKED_IN: 'Checked in',
  COMPLETED: 'Appointment completed',
  CANCELLED: 'Appointment cancelled',
  NO_SHOW: 'Marked as no-show',
};

export const statusStyle: Record<AppointmentStatus, string> = {
  REQUESTED: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  CHECKED_IN: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  COMPLETED: 'bg-stone-200 text-stone-700 dark:bg-stone-700/50 dark:text-stone-300',
  CANCELLED: 'bg-stone-200 text-stone-500 dark:bg-stone-700/50 dark:text-stone-400',
  NO_SHOW: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
};
