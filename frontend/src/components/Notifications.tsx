import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDate, formatTime } from '../lib/format';
import { img, statusIcon } from '../lib/images';
import type { BookingNotification, BookingNotificationsState } from '../lib/notifications';
import type { Role } from '../types';
import Pic from './Pic';
import Drawer from './Drawer';
import { mutedText } from '../lib/ui';

function useNotificationText() {
  const { t } = useTranslation();

  return (n: BookingNotification, role: Role): { title: string; subtitle: string } => {
    const a = n.appointment;
    const names = {
      patient: a.patient.fullName,
      doctor: a.doctor.name,
      service: a.service.name,
    };
    const when = `${formatDate(a.startAt)} at ${formatTime(a.startAt)}`;

    if (n.kind === 'current') {
      const stage = a.status === 'IN_PROGRESS' ? 'withDoctor' : 'waiting';
      const who = role === 'STAFF' ? 'Staff' : role === 'DOCTOR' ? 'Doctor' : 'Patient';
      return { title: t(`notif.${stage}${who}`, names), subtitle: a.service.name };
    }
    if (n.kind === 'pending') {
      return { title: t('notif.pending', names), subtitle: `${a.doctor.name} - ${when}` };
    }
    return {
      title: t(role === 'DOCTOR' ? 'notif.upcomingDoctor' : 'notif.upcomingPatient', names),
      subtitle: when,
    };
  };
}

function NotificationList({
  state,
  onPick,
  onGoTo,
}: {
  state: BookingNotificationsState;
  onPick: (n: BookingNotification) => void;
  onGoTo: () => void;
}) {
  const { t } = useTranslation();
  const text = useNotificationText();
  const { role, items, isLoading } = state;

  const viewAllKey =
    role === 'STAFF' ? 'notif.viewFrontDesk' : role === 'DOCTOR' ? 'notif.viewSchedule' : 'notif.viewMine';

  return (
    <>
      <div className="max-h-80 overflow-y-auto p-1.5 sm:max-h-80">
        {isLoading && <p className={`${mutedText} px-2.5 py-3 text-center`}>{t('notif.loading')}</p>}

        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-2.5 py-6 text-center">
            <Pic src={img.notificationBell} className="no-tilt h-8 w-8 opacity-50" />
            <p className={mutedText}>{t('notif.empty')}</p>
          </div>
        )}

        {items.map((n) => {
          const { title, subtitle } = text(n, role);
          return (
            <button
              key={n.id}
              onClick={() => onPick(n)}
              className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-start transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <Pic
                src={statusIcon[n.appointment.status]}
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
          onClick={onGoTo}
          className="block w-full border-t border-stone-100 px-3.5 py-2.5 text-center text-sm font-medium text-teal-700 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:text-teal-400 dark:hover:bg-stone-800"
        >
          {t(viewAllKey)}
        </button>
      )}
    </>
  );
}

export default function Notifications({
  state,
  drawer = false,
}: {
  state: BookingNotificationsState;
  drawer?: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { enabled, role, count, destination, markAllRead } = state;

  useEffect(() => {
    if (!open || drawer) return;
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
  }, [open, drawer]);

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

  const trigger = (
    <button
      onClick={toggle}
      aria-haspopup={drawer ? 'dialog' : 'menu'}
      aria-expanded={open}
      title={role === 'PATIENT' ? t('notif.patientTitle') : t('notif.staffTitle')}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
    >
      <Pic src={img.notificationBell} alt="Notifications" className="h-6 w-6" />
      {count > 0 && (
        <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </button>
  );

  if (drawer) {
    return (
      <>
        {trigger}
        <Drawer open={open} title={t('notif.title')} onClose={() => setOpen(false)}>
          <NotificationList state={state} onPick={goToAppointment} onGoTo={goTo} />
        </Drawer>
      </>
    );
  }

  return (
    <div ref={ref} className="relative">
      {trigger}

      {open && (
        <div
          role="menu"
          className="drop absolute end-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900"
        >
          <p className="border-b border-stone-100 px-3.5 py-2.5 text-sm font-semibold dark:border-stone-800">
            {t('notif.title')}
          </p>
          <NotificationList state={state} onPick={goToAppointment} onGoTo={goTo} />
        </div>
      )}
    </div>
  );
}
