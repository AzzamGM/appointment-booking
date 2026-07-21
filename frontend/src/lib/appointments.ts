import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Appointment, AppointmentStatus } from '../types';

const LIST_KEYS = [['doctor-schedule'], ['my-appointments'], ['staff-appointments']];

const CLOSED_STATUSES: AppointmentStatus[] = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];

export type TimeFilter = 'upcoming' | 'past' | 'all';
export type StatusFilter = AppointmentStatus | 'ALL';

export function isPast(a: Appointment, now = Date.now()): boolean {
  return CLOSED_STATUSES.includes(a.status) || new Date(a.endAt).getTime() < now;
}

export function splitByTime(list: Appointment[]) {
  const now = Date.now();
  const upcoming: Appointment[] = [];
  const past: Appointment[] = [];

  for (const a of list) (isPast(a, now) ? past : upcoming).push(a);
  upcoming.sort((a, b) => a.startAt.localeCompare(b.startAt));
  past.sort((a, b) => b.startAt.localeCompare(a.startAt));

  return { upcoming, past };
}

function haystack(a: Appointment): string {
  return [
    a.reference,
    a.patient.fullName,
    a.doctor.name,
    a.doctor.nameAr,
    a.service.name,
    a.service.nameAr,
    a.clinic.name,
    a.clinic.nameAr,
    a.clinic.city,
    a.clinic.cityAr,
    a.clinic.code,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function useAppointmentFilters(list: Appointment[], defaultTime: TimeFilter = 'upcoming') {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [time, setTime] = useState<TimeFilter>(defaultTime);

  const results = useMemo(() => {
    const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const { upcoming, past } = splitByTime(list);
    const scoped = time === 'upcoming' ? upcoming : time === 'past' ? past : [...upcoming, ...past];

    return scoped.filter((a) => {
      if (status !== 'ALL' && a.status !== status) return false;
      if (terms.length === 0) return true;
      const text = haystack(a);
      return terms.every((term) => text.includes(term));
    });
  }, [list, search, status, time]);

  const statuses = useMemo(
    () => [...new Set(list.map((a) => a.status))] as AppointmentStatus[],
    [list],
  );

  return {
    search,
    setSearch,
    status,
    setStatus,
    time,
    setTime,
    results,
    statuses,
    active: search.trim().length > 0 || status !== 'ALL' || time !== defaultTime,
    reset: () => {
      setSearch('');
      setStatus('ALL');
      setTime(defaultTime);
    },
  };
}

export type AppointmentFiltersState = ReturnType<typeof useAppointmentFilters>;

export function groupByDay(appointments: Appointment[]): Array<[string, Appointment[]]> {
  const days = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const key = a.startAt.slice(0, 10);
    days.set(key, [...(days.get(key) ?? []), a]);
  }
  return [...days.entries()];
}

export function useAppointmentCache() {
  const queryClient = useQueryClient();

  const patch = (id: string, update: (appointment: Appointment) => Appointment) => {
    queryClient.setQueryData<Appointment>(['appointment', id], (prev) =>
      prev ? update(prev) : prev,
    );
    for (const key of LIST_KEYS) {
      queryClient.setQueryData<{ appointments: Appointment[] }>(key, (prev) =>
        prev
          ? { ...prev, appointments: prev.appointments.map((a) => (a.id === id ? update(a) : a)) }
          : prev,
      );
    }
  };

  const write = (updated: Appointment) => patch(updated.id, (prev) => ({ ...prev, ...updated }));

  const refresh = (id?: string) => {
    for (const key of [...LIST_KEYS, ['audit'], ...(id ? [['appointment', id]] : [])]) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  };

  return { patch, write, refresh };
}
