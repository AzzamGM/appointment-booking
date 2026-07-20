// Front-desk view: upcoming appointments across the chain with lifecycle
// actions (confirm / check in / complete / cancel), prescription entry for
// checked-in visits, and a clinic-wide activity log.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { specialtyLabel, statusStyle } from '../lib/labels';
import { formatDate, formatTime } from '../lib/format';
import { img, statusIcon } from '../lib/images';
import Pic from '../components/Pic';
import Loading from '../components/Loading';
import { btnDanger, btnGhost, card, input, label, mutedText, pageTitle } from '../lib/ui';
import type { Appointment, AuditEntry } from '../types';

type Action = 'confirm' | 'check-in' | 'complete' | 'cancel';

const ACTION_DONE: Record<Action, string> = {
  confirm: 'Appointment confirmed.',
  'check-in': 'Patient checked in.',
  complete: 'Visit marked completed.',
  cancel: 'Appointment cancelled.',
};

/** Icon for an audit event by its dotted action prefix. */
function auditIcon(action: string): string {
  if (action.startsWith('auth.')) return img.idCard;
  if (action === 'appointment.create') return img.new;
  if (action === 'appointment.status') return img.confirmed;
  if (action.startsWith('prescription.')) return img.medicine;
  return img.information;
}

interface PrescriptionDraft {
  medication: string;
  dosage: string;
  frequency: string;
  instructions: string;
}

const EMPTY_DRAFT: PrescriptionDraft = { medication: '', dosage: '', frequency: '', instructions: '' };

function PrescribeForm({ appointment, onDone }: { appointment: Appointment; onDone: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<PrescriptionDraft>(EMPTY_DRAFT);

  const prescribe = useMutation({
    mutationFn: () =>
      api(`/appointments/${appointment.id}/prescriptions`, {
        method: 'POST',
        body: {
          medication: draft.medication,
          dosage: draft.dosage,
          frequency: draft.frequency,
          ...(draft.instructions.trim() ? { instructions: draft.instructions } : {}),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      toast.success(`Prescription added for ${appointment.patient.fullName}.`);
      onDone();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Prescribing failed.');
    },
  });

  const canSave = draft.medication.trim() && draft.dosage.trim() && draft.frequency.trim();

  return (
    <div className="rise mt-3 w-full space-y-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className={label}>Medication</span>
          <input
            className={input}
            value={draft.medication}
            onChange={(e) => setDraft({ ...draft, medication: e.target.value })}
            placeholder="Amoxicillin"
          />
        </label>
        <label className="block">
          <span className={label}>Dosage</span>
          <input
            className={input}
            value={draft.dosage}
            onChange={(e) => setDraft({ ...draft, dosage: e.target.value })}
            placeholder="500 mg"
          />
        </label>
        <label className="block">
          <span className={label}>Frequency</span>
          <input
            className={input}
            value={draft.frequency}
            onChange={(e) => setDraft({ ...draft, frequency: e.target.value })}
            placeholder="Twice daily for 7 days"
          />
        </label>
      </div>
      <label className="block">
        <span className={label}>Instructions (optional)</span>
        <input
          className={input}
          value={draft.instructions}
          onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
          placeholder="Take with food"
        />
      </label>
      <div className="flex gap-2">
        <button
          className={`flex items-center gap-1.5 ${btnGhost}`}
          disabled={!canSave || prescribe.isPending}
          onClick={() => prescribe.mutate()}
        >
          <Pic
            src={prescribe.isPending ? img.hourglass : img.save}
            className={`h-5 w-5 ${prescribe.isPending ? 'hourglass' : ''}`}
          />
          {prescribe.isPending ? 'Saving...' : 'Save prescription'}
        </button>
        <button className={btnGhost} onClick={onDone}>
          Close
        </button>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [prescribingId, setPrescribingId] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);

  const appointments = useQuery({
    queryKey: ['staff-appointments'],
    enabled: user?.role === 'STAFF',
    queryFn: () => api<{ appointments: Appointment[] }>('/appointments'),
  });

  const audit = useQuery({
    queryKey: ['audit'],
    enabled: user?.role === 'STAFF' && showLog,
    refetchInterval: 30_000,
    queryFn: () => api<{ entries: AuditEntry[] }>('/audit?limit=50'),
  });

  const act = useMutation({
    mutationFn: (input: { id: string; action: Action }) => {
      if (input.action === 'confirm' || input.action === 'complete') {
        return api<Appointment>(`/appointments/${input.id}/status`, {
          method: 'PATCH',
          body: { status: input.action === 'confirm' ? 'CONFIRMED' : 'COMPLETED' },
        });
      }
      if (input.action === 'check-in') {
        return api<Appointment>(`/appointments/${input.id}/check-in`, { method: 'PATCH' });
      }
      return api<Appointment>(`/appointments/${input.id}/cancel`, { method: 'PATCH' });
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
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
  const actionBusy = (id: string, action: Action) =>
    rowBusy(id) && act.variables?.action === action;
  const pending = (appointments.data?.appointments ?? []).filter(
    (a) => a.status === 'REQUESTED',
  ).length;

  const actionButton = (
    a: Appointment,
    action: Action,
    icon: string,
    idleLabel: string,
    busyLabel: string,
    danger = false,
  ) => (
    <button
      className={`flex items-center gap-1.5 ${danger ? btnDanger : btnGhost}`}
      disabled={rowBusy(a.id)}
      onClick={() => act.mutate({ id: a.id, action })}
    >
      <Pic
        src={actionBusy(a.id, action) ? img.hourglass : icon}
        className={`h-5 w-5 ${actionBusy(a.id, action) ? 'hourglass' : ''}`}
      />
      {actionBusy(a.id, action) ? busyLabel : idleLabel}
    </button>
  );

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className={`flex items-center gap-2.5 ${pageTitle}`}>
          <Pic src={img.customerServiceAgent} className="h-10 w-10" />
          Front desk
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/" className={`flex items-center gap-1.5 ${btnGhost}`}>
            <Pic src={img.new} className="h-5 w-5" />
            New booking
          </Link>
          <button
            className={`flex items-center gap-1.5 ${btnGhost}`}
            onClick={() => setShowLog((v) => !v)}
          >
            <Pic src={img.information} className="h-5 w-5" />
            {showLog ? 'Hide activity log' : 'Activity log'}
          </button>
          <button
            className={`flex items-center gap-1.5 ${btnGhost}`}
            onClick={() =>
              toast.info(
                'Schedule management (recurring hours, slot generation, time off) is the backend Gap 4/6 exercise — wire it up and build this screen!',
              )
            }
          >
            <Pic src={img.settings} className="h-5 w-5" />
            Clinic settings
          </button>
        </div>
      </div>
      <p className={`mb-4 ${mutedText}`}>Upcoming appointments across all clinics.</p>

      {showLog && (
        <div className={`${card} rise mb-4 p-4`}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Pic src={img.information} className="h-5 w-5" />
            Recent activity
          </h2>
          {audit.isLoading && <Loading text="Loading activity..." />}
          {audit.data?.entries.length === 0 && (
            <p className={mutedText}>No activity recorded yet.</p>
          )}
          <ul className="max-h-80 space-y-1.5 overflow-y-auto">
            {audit.data?.entries.map((e) => (
              <li key={e.id} className="flex items-start gap-2.5 text-sm">
                <Pic src={auditIcon(e.action)} className="mt-0.5 h-5 w-5" />
                <span className="min-w-0">
                  <span className="font-medium">{e.user?.fullName ?? 'System'}</span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">{e.action}</span>
                  {e.detail && (
                    <span className="text-slate-500 dark:text-slate-400"> — {e.detail}</span>
                  )}
                  <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                    {formatDate(e.createdAt)} {formatTime(e.createdAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pending > 0 && (
        <div className="rise mb-4 flex items-center gap-3 rounded-xl border border-amber-200/70 bg-amber-50/70 px-4 py-2.5 dark:border-amber-800/40 dark:bg-amber-500/5">
          <Pic src={img.notification} className="h-7 w-7" />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            {pending} booking request{pending === 1 ? '' : 's'} waiting for review.
          </p>
        </div>
      )}

      {appointments.isLoading && (
        <div className="space-y-2">
          <Loading text="Loading the schedule..." />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${card} p-3`}>
              <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      )}

      {appointments.data?.appointments.length === 0 && (
        <div className={`${card} flex flex-col items-center gap-3 p-8 text-center`}>
          <Pic src={img.calendar} className="h-12 w-12 opacity-80" />
          <p className={mutedText}>Nothing on the schedule.</p>
        </div>
      )}

      <div className="space-y-2">
        {appointments.data?.appointments.map((a, i) => (
          <div
            key={a.id}
            className={`${card} rise p-3 hover:border-slate-300 dark:hover:border-slate-700`}
            style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span
                  className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${statusStyle[a.status]}`}
                >
                  <Pic src={statusIcon[a.status]} className="h-4.5 w-4.5" />
                  {a.status.replace('_', ' ')}
                </span>
                <span className="font-mono text-slate-400 dark:text-slate-500">{a.reference}</span>
                <span className="font-medium">{a.patient.fullName}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {a.service.name} · {a.doctor.name} ({specialtyLabel(a.doctor.specialty)})
                </span>
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Pic src={img.clock} className="h-4.5 w-4.5" />
                  {formatDate(a.startAt)} {formatTime(a.startAt)} UTC · {a.clinic.code}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {a.status === 'REQUESTED' &&
                  actionButton(a, 'confirm', img.approved, 'Confirm', 'Confirming...')}
                {a.status === 'CONFIRMED' &&
                  actionButton(a, 'check-in', img.idCard, 'Check in', 'Checking in...')}
                {a.status === 'CHECKED_IN' &&
                  actionButton(a, 'complete', img.healthy, 'Complete', 'Completing...')}
                {(a.status === 'CHECKED_IN' || a.status === 'COMPLETED') && (
                  <button
                    className={`flex items-center gap-1.5 ${btnGhost}`}
                    onClick={() => setPrescribingId((v) => (v === a.id ? null : a.id))}
                  >
                    <Pic src={img.medicine} className="h-5 w-5" />
                    Prescribe
                  </button>
                )}
                {(a.status === 'REQUESTED' || a.status === 'CONFIRMED') &&
                  actionButton(
                    a,
                    'cancel',
                    a.status === 'REQUESTED' ? img.unapproved : img.delete,
                    a.status === 'REQUESTED' ? 'Decline' : 'Cancel',
                    'Cancelling...',
                    true,
                  )}
              </div>
            </div>

            {a.prescriptions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                {a.prescriptions.map((p) => (
                  <span key={p.id} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Pic src={img.medicine} className="h-4 w-4" />
                    {p.medication} {p.dosage}, {p.frequency}
                  </span>
                ))}
              </div>
            )}

            {prescribingId === a.id && (
              <PrescribeForm appointment={a} onDone={() => setPrescribingId(null)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
