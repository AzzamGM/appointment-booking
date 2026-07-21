import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocalize } from '../lib/i18n';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settings';
import { useToast } from '../lib/toast';
import { statusStyle } from '../lib/labels';
import { formatDate, formatTime } from '../lib/format';
import { img, serviceIcon, statusIcon } from '../lib/images';
import Pic from '../components/Pic';
import Loading from '../components/Loading';
import { btnDanger, btnPrimary, card, mutedText, pageTitle } from '../lib/ui';
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

type Rating = 'up' | 'down';
const ratingKey = (id: string) => `medibook:rating:${id}`;

function VisitRating({ appointmentId }: { appointmentId: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [rating, setRating] = useState<Rating | null>(
    () => localStorage.getItem(ratingKey(appointmentId)) as Rating | null,
  );

  const rate = (r: Rating) => {
    localStorage.setItem(ratingKey(appointmentId), r);
    setRating(r);
    toast.success(t(r === 'up' ? 'appointments.thanksFeedback' : 'appointments.sorryFeedback'));
  };

  if (rating) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
        <Pic src={rating === 'up' ? img.thumbsUp : img.thumbDown} className="h-6 w-6" />
        {t('appointments.youRated')}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-xs text-stone-400 dark:text-stone-500">How was your visit?</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          rate('up');
        }}
        title={t('appointments.goodVisit')}
        className="rounded-lg p-1.5 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
      >
        <Pic src={img.thumbsUp} alt="Thumbs up" className="h-6 w-6" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          rate('down');
        }}
        title={t('appointments.notGreat')}
        className="rounded-lg p-1.5 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
      >
        <Pic src={img.thumbDown} alt="Thumbs down" className="h-6 w-6" />
      </button>
    </span>
  );
}

export default function MyAppointmentsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const L = useLocalize();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { notifications } = useSettings();

  const appointments = useQuery({
    queryKey: ['my-appointments'],
    enabled: !!user,
    queryFn: () => api<{ appointments: Appointment[] }>('/patients/me/appointments'),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api<Appointment>(`/appointments/${id}/cancel`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      toast.success(t('appointments.cancelled'));
    },
    onError: (err) => {
      toast.error(errorMessage(err, t('errors.cancelFailed')));
    },
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
          const canCancel = a.status === 'REQUESTED' || a.status === 'CONFIRMED';
          const canRate = a.status === 'COMPLETED';
          const actions =
            canCancel || canRate ? (
              <div className="flex flex-wrap items-center gap-3">
                {canRate && <VisitRating appointmentId={a.id} />}
                {canCancel && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      cancel.mutate(a.id);
                    }}
                    disabled={cancel.isPending}
                    className={`flex items-center gap-1.5 ${btnDanger}`}
                  >
                    {cancel.isPending && cancel.variables === a.id ? (
                      <>
                        <Pic src={img.hourglass} className="hourglass h-5 w-5" />
                        {t('appointments.cancelling')}
                      </>
                    ) : (
                      <>
                        <Pic src={img.delete} className="h-5 w-5" />
                        Cancel
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : null;

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
            className={`${card} group rise relative cursor-pointer overflow-hidden p-4 hover:border-teal-300/70 dark:hover:border-teal-700/50`}
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/50 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 dark:bg-stone-900/60">
              <span className="text-xl font-bold text-stone-800 dark:text-stone-100">
                {t('appointments.viewSummary')}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold leading-none">{a.doctor.name}</span>
                <span
                  className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${statusStyle[a.status]}`}
                >
                  <Pic src={statusIcon[a.status]} className="h-4.5 w-4.5" />
                  {t(`statusShort.${a.status}`)}
                </span>
              </div>
              {actions && (
                <div className="hidden sm:block" onClick={(e) => e.stopPropagation()}>
                  {actions}
                </div>
              )}
              <span className="flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-300 sm:hidden">
                {t('appointments.viewDetails')}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
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

            {actions && (
              <div
                className="mt-3 border-t border-stone-100 pt-3 sm:hidden dark:border-stone-800"
                onClick={(e) => e.stopPropagation()}
              >
                {actions}
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
