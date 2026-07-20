// Build and download an .ics calendar file for an appointment, so "save to
// calendar" works with any calendar app — no backend needed.
import type { Appointment } from '../types';

function icsStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function downloadAppointmentIcs(a: Appointment): void {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MediBook//Appointments//EN',
    'BEGIN:VEVENT',
    `UID:${a.id}@medibook`,
    `DTSTAMP:${icsStamp(a.createdAt)}`,
    `DTSTART:${icsStamp(a.startAt)}`,
    `DTEND:${icsStamp(a.endAt)}`,
    `SUMMARY:${escapeText(`${a.service.name} — ${a.doctor.name}`)}`,
    `LOCATION:${escapeText(`${a.clinic.name}, ${a.clinic.city}`)}`,
    `DESCRIPTION:${escapeText(`Booking reference ${a.reference}. ${a.notes ?? ''}`.trim())}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `medibook-${a.reference}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}
