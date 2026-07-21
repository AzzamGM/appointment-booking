import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocalize } from '../lib/i18n';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settings';
import { statusStyle } from '../lib/labels';
import { formatDate, formatTime } from '../lib/format';
import { img, serviceIcon, statusIcon } from '../lib/images';
import Pic from '../components/Pic';
import Loading from '../components/Loading';
import AppointmentActions, { VisitRating } from '../components/AppointmentActions';
import { btnPrimary, card, mutedText, pageTitle } from '../lib/ui';
import type { Appointment } from '../types';

function AppointmentSkeleton() {
  return (
    <div className={`${card} space-y-3 p-4`}>
      <div className="flex items-center gap-3">
        <div className="h-6 w-24 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-5 w-20 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
      </div>
      <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
    </div>
  );
}

export default function MyAppointmentsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const L = useLocalize();
  const navigate = useNavigate();
  const { notifications } = useSettings();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const appointments = useQuery({
    queryKey: ['my-appointments'],
    enabled: !!user,
    queryFn: () => api<{ appointments: Appointment[] }>('/patients/me/appointments'),
  });

  if (!user) {
    return (
      <p className="text-sm text-stone-600 dark:text-stone-300">
        Please{' '}
        <Link
          to="/login"
          className="font-medium text-teal-700 underline underline-offset-2 hover:no-underline dark:text-teal-400"
        >
          log in
        </Link>{' '}
        to see your appointments.
      </p>
    );
  }

  return (
    <div>
      <h1 className={`mb-4 ${pageTitle}`}>{t('appointments.title')}</h1>

      {appointments.isLoading && (
        <div className="space-y-3">
          <Loading text={t('appointments.loading')} inline />
          <AppointmentSkeleton />
          <AppointmentSkeleton />
        </div>
      )}

      {appointments.data?.appointments.length === 0 && (
        <div className={`${card} flex flex-col items-center gap-4 p-10 text-center`}>
          <Pic src={img.doctorAppointment} className="h-20 w-20 opacity-90" />
          <p className={mutedText}>{t('appointments.none')}</p>
          <Link to="/" className={`flex items-center gap-2 ${btnPrimary}`}>
            <Pic src={img.addCalendar} className="h-5 w-5" />
            {t('appointments.bookOne')}
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {appointments.data?.appointments.map((a, i) => {
          const canRate = a.status === 'COMPLETED';

          return (
          <div
            key={a.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/appointments/${a.id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(`/appointments/${a.id}`);
              }
            }}
            className={`${card} rise relative cursor-pointer p-4 hover:border-teal-300/70 dark:hover:border-teal-700/50 ${
              menuOpenId === a.id ? 'z-20' : ''
            }`}
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="min-w-0 truncate text-lg font-bold leading-none">
                  {a.doctor.name}
                </span>
                <span
                  className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${statusStyle[a.status]}`}
                >
                  <Pic src={statusIcon[a.status]} className="h-4.5 w-4.5" />
                  {t(`statusShort.${a.status}`)}
                </span>
              </div>
              <AppointmentActions
                appointment={a}
                onViewSummary={() => navigate(`/appointments/${a.id}`)}
                onOpenChange={(open) => setMenuOpenId(open ? a.id : null)}
              />
            </div>

            <div className="mt-3 flex flex-col gap-1.5 border-t border-stone-100 pt-3 text-sm dark:border-stone-800 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Pic src={serviceIcon(a.service.name)} className="h-6 w-6" />
                {L(a.service.name, a.service.nameAr)}
              </span>
              <span className="text-stone-500 dark:text-stone-400">
                {t(`specialty.${a.doctor.specialty}`)}
              </span>
              <span className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
                <Pic src={img.clock} className="h-4.5 w-4.5" />
                {formatDate(a.startAt)} - {formatTime(a.startAt)} to {formatTime(a.endAt)}
              </span>
              <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400">
                <Pic src={img.locationPin} className="h-4.5 w-4.5" />
                {L(a.clinic.name, a.clinic.nameAr)}, {L(a.clinic.city, a.clinic.cityAr)}
              </span>
            </div>

            {notifications && a.status === 'CONFIRMED' && new Date(a.startAt) > new Date() && (
              <p className="mt-2.5 flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
                <Pic src={img.mobileNotification} className="h-5 w-5" />
                {t('appointments.reminderNote')}
              </p>
            )}

            {a.prescriptions.length > 0 && (
              <div className="mt-3 space-y-1.5 rounded-xl bg-teal-50/60 p-3 dark:bg-teal-500/5">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                  <Pic src={img.pills} className="h-5 w-5" />
                  {t('appointments.prescribed')}
                </p>
                {a.prescriptions.map((p) => (
                  <p key={p.id} className="flex items-start gap-2 text-sm">
                    <Pic src={img.medicine} className="mt-0.5 h-5 w-5" />
                    <span>
                      <span className="font-medium">{p.medication}</span> — {p.dosage},{' '}
                      {p.frequency}
                      {p.instructions ? `. ${p.instructions}` : ''}
                      <span className="ml-1 text-xs text-stone-400 dark:text-stone-500">
                        ({p.prescribedBy})
                      </span>
                    </span>
                  </p>
                ))}
              </div>
            )}

            {canRate && (
              <div
                className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800"
                onClick={(e) => e.stopPropagation()}
              >
                <VisitRating appointmentId={a.id} />
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
