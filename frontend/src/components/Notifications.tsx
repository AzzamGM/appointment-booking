import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatTime } from '../lib/format';
import { img, statusIcon } from '../lib/images';
import type { BookingNotification, BookingNotificationsState } from '../lib/notifications';
import Pic from './Pic';
import { mutedText } from '../lib/ui';

function notificationText(n: BookingNotification, isStaff: boolean): { title: string; subtitle: string } {
  const a = n.appointment;
  if (n.kind === 'current') {
    return {
      title: isStaff
        ? `${a.patient.fullName} is with ${a.doctor.name} now`
        : `You're checked in with ${a.doctor.name}`,
      subtitle: a.service.name,
    };
  }
  if (n.kind === 'pending') {
    return {
      title: `${a.patient.fullName} requested ${a.service.name}`,
      subtitle: `${a.doctor.name} - ${formatDate(a.startAt)} at ${formatTime(a.startAt)} UTC`,
    };
  }
  return {
    title: `${a.service.name} confirmed with ${a.doctor.name}`,
    subtitle: `${formatDate(a.startAt)} at ${formatTime(a.startAt)} UTC`,
  };
}

export default function Notifications({ state }: { state: BookingNotificationsState }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { enabled, isStaff, items, count, isLoading, destination, markAllRead } = state;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!enabled) return null;

  const toggle = () => {
    setOpen((v) => {
      if (!v) markAllRead();
      return !v;
    });
  };

  const goTo = () => {
    setOpen(false);
    navigate(destination);
  };

  const goToAppointment = (n: BookingNotification) => {
    setOpen(false);
    navigate(`/appointments/${n.appointment.id}`);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        title={
          isStaff
            ? `${count} new update${count === 1 ? '' : 's'} on today's bookings`
            : `${count} new update${count === 1 ? '' : 's'} on your appointments`
        }
        className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
      >
        <Pic src={img.notificationBell} alt="Notifications" className="h-6 w-6" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="drop absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900"
        >
          <p className="border-b border-stone-100 px-3.5 py-2.5 text-sm font-semibold dark:border-stone-800">
            Notifications
          </p>

          <div className="scroll-thin max-h-80 overflow-y-auto p-1.5">
            {isLoading && <p className={`${mutedText} px-2.5 py-3 text-center`}>Loading...</p>}

            {!isLoading && items.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-2.5 py-6 text-center">
                <Pic src={img.notificationBell} className="no-tilt h-8 w-8 opacity-50" />
                <p className={mutedText}>No updates on upcoming or current bookings.</p>
              </div>
            )}

            {items.map((n) => {
              const { title, subtitle } = notificationText(n, isStaff);
              return (
                <button
                  key={n.id}
                  onClick={() => goToAppointment(n)}
                  className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  <Pic
                    src={n.kind === 'current' ? img.checkUp : statusIcon[n.appointment.status]}
                    className="mt-0.5 h-5 w-5 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{title}</span>
                    <span className="block truncate text-xs text-stone-500 dark:text-stone-400">
                      {subtitle}
                    </span>
                  </span>
                  {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                </button>
              );
            })}
          </div>

          {items.length > 0 && (
            <button
              onClick={goTo}
              className="block w-full border-t border-stone-100 px-3.5 py-2.5 text-center text-sm font-medium text-teal-700 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:text-teal-400 dark:hover:bg-stone-800"
            >
              {isStaff ? 'View front desk' : 'View my appointments'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
