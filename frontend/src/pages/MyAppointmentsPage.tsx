import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settings';
import { useToast } from '../lib/toast';
import { specialtyLabel, statusStyle } from '../lib/labels';
import { formatDate, formatMoney, formatTime } from '../lib/format';
import { img, serviceIcon, statusIcon } from '../lib/images';
import Pic from '../components/Pic';
import Loading from '../components/Loading';
import { btnDanger, btnPrimary, card, mutedText, pageTitle } from '../lib/ui';
import type { Appointment } from '../types';

function AppointmentSkeleton() {
  return (
    <div className={`${card} space-y-3 p-4`}>
      <div className="flex items-center gap-3">
        <div className="h-6 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-5 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

type Rating = 'up' | 'down';
const ratingKey = (id: string) => `medibook:rating:${id}`;

function VisitRating({ appointmentId }: { appointmentId: string }) {
  const toast = useToast();
  const [rating, setRating] = useState<Rating | null>(
    () => localStorage.getItem(ratingKey(appointmentId)) as Rating | null,
  );

  const rate = (r: Rating) => {
    localStorage.setItem(ratingKey(appointmentId), r);
    setRating(r);
    toast.success(r === 'up' ? 'Thanks for the feedback!' : "Sorry to hear that — we'll do better.");
  };

  if (rating) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
        <Pic src={rating === 'up' ? img.thumbsUp : img.thumbDown} className="h-6 w-6" />
        You rated this visit
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-xs text-slate-400 dark:text-slate-500">How was your visit?</span>
      <button
        onClick={() => rate('up')}
        title="Good visit"
        className="rounded-lg p-1.5 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
      >
        <Pic src={img.thumbsUp} alt="Thumbs up" className="h-6 w-6" />
      </button>
      <button
        onClick={() => rate('down')}
        title="Not great"
        className="rounded-lg p-1.5 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
      >
        <Pic src={img.thumbDown} alt="Thumbs down" className="h-6 w-6" />
      </button>
    </span>
  );
}

export default function MyAppointmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { notifications } = useSettings();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyReference = async (reference: string, id: string) => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopiedId(id);
      toast.success(`Reference ${reference} copied to your clipboard.`);
      window.setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000);
    } catch {
      toast.error('Your browser blocked clipboard access.');
    }
  };

  const appointments = useQuery({
    queryKey: ['my-appointments'],
    enabled: !!user,
    queryFn: () => api<{ appointments: Appointment[] }>('/patients/me/appointments'),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api<Appointment>(`/appointments/${id}/cancel`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      toast.success('Appointment cancelled.');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Cancelling failed.');
    },
  });

  if (!user) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-300">
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
      <h1 className={`mb-4 ${pageTitle}`}>My appointments</h1>

      {appointments.isLoading && (
        <div className="space-y-3">
          <Loading text="Loading your appointments..." inline />
          <AppointmentSkeleton />
          <AppointmentSkeleton />
        </div>
      )}

      {appointments.data?.appointments.length === 0 && (
        <div className={`${card} flex flex-col items-center gap-4 p-10 text-center`}>
          <Pic src={img.doctorAppointment} className="h-20 w-20 opacity-90" />
          <p className={mutedText}>You have no appointments yet.</p>
          <Link to="/" className={`flex items-center gap-2 ${btnPrimary}`}>
            <Pic src={img.addCalendar} className="h-5 w-5" />
            Book an appointment
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {appointments.data?.appointments.map((a, i) => {
          const copied = copiedId === a.id;
          const canCancel = a.status === 'REQUESTED' || a.status === 'CONFIRMED';
          const canRate = a.status === 'COMPLETED';
          const actions =
            canCancel || canRate ? (
              <div className="flex flex-wrap items-center gap-3">
                {canRate && <VisitRating appointmentId={a.id} />}
                {canCancel && (
                  <button
                    onClick={() => cancel.mutate(a.id)}
                    disabled={cancel.isPending}
                    className={`flex items-center gap-1.5 ${btnDanger}`}
                  >
                    {cancel.isPending && cancel.variables === a.id ? (
                      <>
                        <Pic src={img.hourglass} className="hourglass h-5 w-5" />
                        Cancelling...
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
            className={`${card} rise p-4 hover:shadow-md`}
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => copyReference(a.reference, a.id)}
                  title={copied ? 'Copied' : 'Copy reference'}
                  aria-label={`Copy reference ${a.reference}`}
                  className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span
                    className={`font-mono text-lg font-bold leading-none tracking-widest transition-colors ${
                      copied ? 'text-teal-600 dark:text-teal-400' : ''
                    }`}
                  >
                    {copied ? 'Copied' : a.reference}
                  </span>
                  <Pic src={copied ? img.approved : img.copy} className="no-tilt h-6 w-6" />
                </button>
                <span
                  className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${statusStyle[a.status]}`}
                >
                  <Pic src={statusIcon[a.status]} className="h-4.5 w-4.5" />
                  {a.status.replace('_', ' ')}
                </span>
              </div>
              {actions && <div className="hidden sm:block">{actions}</div>}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
              <span className="flex items-center gap-1.5 font-medium">
                <Pic src={serviceIcon(a.service.name)} className="h-6 w-6" />
                {a.service.name}
              </span>
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Pic src={img.cashNote} className="h-4.5 w-4.5" />
                {formatMoney(a.service.price)}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {a.doctor.name} - {specialtyLabel(a.doctor.specialty)}
              </span>
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Pic src={img.clock} className="h-4.5 w-4.5" />
                {formatDate(a.startAt)} - {formatTime(a.startAt)} to {formatTime(a.endAt)} UTC
              </span>
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Pic src={img.locationPin} className="h-4.5 w-4.5" />
                {a.clinic.name}, {a.clinic.city}
              </span>
            </div>

            {notifications && a.status === 'CONFIRMED' && new Date(a.startAt) > new Date() && (
              <p className="mt-2.5 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <Pic src={img.mobileNotification} className="h-5 w-5" />
                We'll send a reminder to your phone the day before this visit.
              </p>
            )}

            {a.prescriptions.length > 0 && (
              <div className="mt-3 space-y-1.5 rounded-xl bg-teal-50/60 p-3 dark:bg-teal-500/5">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                  <Pic src={img.pills} className="h-5 w-5" />
                  Prescribed medication
                </p>
                {a.prescriptions.map((p) => (
                  <p key={p.id} className="flex items-start gap-2 text-sm">
                    <Pic src={img.medicine} className="mt-0.5 h-5 w-5" />
                    <span>
                      <span className="font-medium">{p.medication}</span> — {p.dosage},{' '}
                      {p.frequency}
                      {p.instructions ? `. ${p.instructions}` : ''}
                      <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">
                        ({p.prescribedBy})
                      </span>
                    </span>
                  </p>
                ))}
              </div>
            )}

            {actions && (
              <div className="mt-3 border-t border-slate-100 pt-3 sm:hidden dark:border-slate-800">
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
