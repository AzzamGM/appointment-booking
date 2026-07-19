// Front-desk view: upcoming appointments across the chain, with lifecycle
// actions. All three actions currently hit 501 endpoints. They come alive
// once the Gap 1 state machine is implemented in the backend.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { specialtyLabel, statusStyle } from '../lib/labels';
import { formatDate, formatTime } from '../lib/format';
import { btnDanger, btnGhost, card, mutedText, pageTitle } from '../lib/ui';
import type { Appointment } from '../types';

const ACTION_DONE: Record<'confirm' | 'check-in' | 'cancel', string> = {
  confirm: 'Appointment confirmed.',
  'check-in': 'Patient checked in.',
  cancel: 'Appointment cancelled.',
};

export default function StaffPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const appointments = useQuery({
    queryKey: ['staff-appointments'],
    enabled: user?.role === 'STAFF',
    queryFn: () => api<{ appointments: Appointment[] }>('/appointments'),
  });

  const act = useMutation({
    mutationFn: (input: { id: string; action: 'confirm' | 'check-in' | 'cancel' }) => {
      if (input.action === 'confirm') {
        return api<Appointment>(`/appointments/${input.id}/status`, {
          method: 'PATCH',
          body: { status: 'CONFIRMED' },
        });
      }
      if (input.action === 'check-in') {
        return api<Appointment>(`/appointments/${input.id}/check-in`, { method: 'PATCH' });
      }
      return api<Appointment>(`/appointments/${input.id}/cancel`, { method: 'PATCH' });
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
      toast.success(ACTION_DONE[vars.action]);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Action failed.');
    },
  });

  if (user?.role !== 'STAFF') {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        This page is for front-desk staff. Log in as staff@medibook.test to try it.
      </p>
    );
  }

  const rowBusy = (id: string) => act.isPending && act.variables?.id === id;

  return (
    <div>
      <h1 className={`mb-1 ${pageTitle}`}>Front desk</h1>
      <p className={`mb-4 ${mutedText}`}>Upcoming appointments across all clinics.</p>

      {appointments.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${card} p-3`}>
              <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      )}

      {appointments.data?.appointments.length === 0 && (
        <div className={`${card} p-8 text-center`}>
          <p className={mutedText}>Nothing on the schedule.</p>
        </div>
      )}

      <div className="space-y-2">
        {appointments.data?.appointments.map((a, i) => (
          <div
            key={a.id}
            className={`${card} rise flex flex-wrap items-center justify-between gap-3 p-3 hover:border-slate-300 dark:hover:border-slate-700`}
            style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${statusStyle[a.status]}`}
              >
                {a.status.replace('_', ' ')}
              </span>
              <span className="font-mono text-slate-400 dark:text-slate-500">{a.reference}</span>
              <span className="font-medium">{a.patient.fullName}</span>
              <span className="text-slate-500 dark:text-slate-400">
                {a.service.name} · {a.doctor.name} ({specialtyLabel(a.doctor.specialty)})
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {formatDate(a.startAt)} {formatTime(a.startAt)} UTC · {a.clinic.code}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {a.status === 'REQUESTED' && (
                <button
                  className={btnGhost}
                  disabled={rowBusy(a.id)}
                  onClick={() => act.mutate({ id: a.id, action: 'confirm' })}
                >
                  {rowBusy(a.id) && act.variables?.action === 'confirm'
                    ? 'Confirming...'
                    : 'Confirm'}
                </button>
              )}
              {a.status === 'CONFIRMED' && (
                <button
                  className={btnGhost}
                  disabled={rowBusy(a.id)}
                  onClick={() => act.mutate({ id: a.id, action: 'check-in' })}
                >
                  {rowBusy(a.id) && act.variables?.action === 'check-in'
                    ? 'Checking in...'
                    : 'Check in'}
                </button>
              )}
              {(a.status === 'REQUESTED' || a.status === 'CONFIRMED') && (
                <button
                  className={btnDanger}
                  disabled={rowBusy(a.id)}
                  onClick={() => act.mutate({ id: a.id, action: 'cancel' })}
                >
                  {rowBusy(a.id) && act.variables?.action === 'cancel'
                    ? 'Cancelling...'
                    : 'Cancel'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
