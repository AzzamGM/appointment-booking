import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { useAuth } from './auth';
import { useSettings } from './settings';
import type { Appointment } from '../types';

export type NotificationKind = 'current' | 'upcoming' | 'pending';

export interface BookingNotification {
  id: string;
  kind: NotificationKind;
  appointment: Appointment;
  unread: boolean;
}

const readStorageKey = (userId: string) => `medibook:notif-read:${userId}`;
const notificationKey = (a: Appointment) => `${a.id}:${a.status}`;

function loadReadKeys(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(readStorageKey(userId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function useBookingNotifications() {
  const { user } = useAuth();
  const { notifications: notificationsEnabled } = useSettings();
  const isStaff = user?.role === 'STAFF';
  const enabled = !!user && user.role !== 'DOCTOR' && notificationsEnabled;

  const [readKeys, setReadKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setReadKeys(user ? loadReadKeys(user.id) : new Set());
  }, [user?.id]);

  const query = useQuery({
    queryKey: isStaff ? ['staff-appointments'] : ['my-appointments'],
    enabled,
    refetchInterval: 30_000,
    queryFn: () =>
      api<{ appointments: Appointment[] }>(isStaff ? '/appointments' : '/patients/me/appointments'),
  });

  const rawItems = useMemo(() => {
    const list = query.data?.appointments ?? [];
    const now = Date.now();
    const out: Array<{ kind: NotificationKind; appointment: Appointment }> = [];

    for (const a of list) {
      if (a.status === 'CHECKED_IN') {
        out.push({ kind: 'current', appointment: a });
      } else if (isStaff && a.status === 'REQUESTED') {
        out.push({ kind: 'pending', appointment: a });
      } else if (!isStaff && a.status === 'CONFIRMED' && new Date(a.startAt).getTime() > now) {
        out.push({ kind: 'upcoming', appointment: a });
      }
    }

    return out.sort((x, y) => {
      if (x.kind === 'current' && y.kind !== 'current') return -1;
      if (y.kind === 'current' && x.kind !== 'current') return 1;
      return new Date(x.appointment.startAt).getTime() - new Date(y.appointment.startAt).getTime();
    });
  }, [query.data, isStaff]);

  const items = useMemo<BookingNotification[]>(
    () =>
      rawItems.map((it) => ({
        id: it.appointment.id,
        kind: it.kind,
        appointment: it.appointment,
        unread: !readKeys.has(notificationKey(it.appointment)),
      })),
    [rawItems, readKeys],
  );

  const unreadCount = useMemo(() => items.filter((i) => i.unread).length, [items]);

  const markAllRead = useCallback(() => {
    if (!user || rawItems.length === 0) return;
    setReadKeys((prev) => {
      const next = new Set(prev);
      for (const it of rawItems) next.add(notificationKey(it.appointment));
      localStorage.setItem(readStorageKey(user.id), JSON.stringify([...next]));
      return next;
    });
  }, [user, rawItems]);

  return {
    enabled,
    isStaff,
    items,
    count: unreadCount,
    isLoading: query.isLoading,
    destination: isStaff ? '/staff' : '/appointments',
    markAllRead,
  };
}

export type BookingNotificationsState = ReturnType<typeof useBookingNotifications>;
