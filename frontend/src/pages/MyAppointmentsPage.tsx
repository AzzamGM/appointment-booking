import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { specialtyLabel, statusStyle } from '../lib/labels';
import { formatDate, formatMoney, formatTime } from '../lib/format';
import { img, serviceIcon, statusIcon } from '../lib/images';
import { downloadAppointmentIcs } from '../lib/ics';
import Pic from '../components/Pic';
import Loading from '../components/Loading';
import { btnDanger, btnGhost, btnPrimary, card, mutedText, pageTitle } from '../lib/ui';
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

/**
 * Thumbs up/down for a completed visit. Frontend-only feedback, remembered in
 * localStorage — a real ratings endpoint would be a nice backend exercise.
 */
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

  const appointments = useQuery({
    queryKey: ['my-appointments'],
    enabled: !!user,
    queryFn: () => api<{ appointments: Appointment[] }>('/patients/me/appointments'),
  });

  // Cancelling currently returns 501, since the appointment state machine is
  // Gap 1 in the backend LEARNING_GUIDE. Once you implement it, the error
  // toast below turns into the success one.
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
          <Loading text="Loading your appointments..." />
          <AppointmentSkeleton />
          <AppointmentSkeleton />
        </div>
      )}

      {appointments.data?.appointments.length === 0 && (
        <div className={`${card} flex flex-col items-center gap-4 p-10 text-center`}>
          <Pic src={img.calendar} className="h-16 w-16 opacity-80" />
          <p className={mutedText}>You have no appointments yet.</p>
          <Link to="/" className={btnPrimary}>
            Find a doctor
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {appointments.data?.appointments.map((a, i) => (
          <div
            key={a.id}
            className={`${card} rise p-4 hover:shadow-md`}
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-bold tracking-widest">{a.reference}</span>
                <span
                  className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${statusStyle[a.status]}`}
                >
                  <Pic src={statusIcon[a.status]} className="h-4.5 w-4.5" />
                  {a.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={mutedText}>{formatMoney(a.service.price)}</span>
                {a.status === 'COMPLETED' && <VisitRating appointmentId={a.id} />}
                {(a.status === 'REQUESTED' || a.status === 'CONFIRMED') && (
                  <>
                    <button
                      onClick={() => downloadAppointmentIcs(a)}
                      title="Download an .ics file for your calendar app"
                      className={`flex items-center gap-1.5 ${btnGhost}`}
                    >
                      <Pic src={img.save} className="h-5 w-5" />
                      Save to calendar
                    </button>
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
                  </>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
              <span className="flex items-center gap-1.5 font-medium">
                <Pic src={serviceIcon(a.service.name)} className="h-6 w-6" />
                {a.service.name}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {a.doctor.name} · {specialtyLabel(a.doctor.specialty)}
              </span>
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Pic src={img.clock} className="h-4.5 w-4.5" />
                {formatDate(a.startAt)} · {formatTime(a.startAt)} to {formatTime(a.endAt)} UTC
              </span>
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Pic src={img.locationPin} className="h-4.5 w-4.5" />
                {a.clinic.name}, {a.clinic.city}
              </span>
            </div>

            {a.prescriptions.length > 0 && (
              <div className="mt-3 space-y-1.5 rounded-xl bg-teal-50/60 p-3 dark:bg-teal-500/5">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
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
          </div>
        ))}
      </div>
    </div>
  );
}
