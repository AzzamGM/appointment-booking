import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { specialtyLabel, statusStyle } from '../lib/labels';
import { formatDate, formatMoney, formatTime } from '../lib/format';
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
          <AppointmentSkeleton />
          <AppointmentSkeleton />
        </div>
      )}

      {appointments.data?.appointments.length === 0 && (
        <div className={`${card} flex flex-col items-center gap-4 p-10 text-center`}>
          <svg
            className="text-slate-300 dark:text-slate-700"
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
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
                  className={`rounded-md px-2 py-0.5 text-xs font-semibold ${statusStyle[a.status]}`}
                >
                  {a.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={mutedText}>{formatMoney(a.service.price)}</span>
                {(a.status === 'REQUESTED' || a.status === 'CONFIRMED') && (
                  <button
                    onClick={() => cancel.mutate(a.id)}
                    disabled={cancel.isPending}
                    className={btnDanger}
                  >
                    {cancel.isPending && cancel.variables === a.id ? 'Cancelling...' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
              <span className="font-medium">{a.service.name}</span>
              <span className="text-slate-500 dark:text-slate-400">
                {a.doctor.name} · {specialtyLabel(a.doctor.specialty)}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {formatDate(a.startAt)} · {formatTime(a.startAt)} to {formatTime(a.endAt)} UTC
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {a.clinic.name}, {a.clinic.city}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
