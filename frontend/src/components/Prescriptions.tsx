import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, errorMessage } from '../lib/api';
import { useAppointmentCache } from '../lib/appointments';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { img } from '../lib/images';
import Pic from './Pic';
import ConfirmDialog from './ConfirmDialog';
import { LOCKED_STATUSES } from '../lib/labels';
import { btnGhost, input, label } from '../lib/ui';
import type { Appointment, Prescription } from '../types';

interface Draft {
  medication: string;
  dosage: string;
  frequency: string;
  instructions: string;
}

const DEFAULT_DRAFT: Draft = {
  medication: 'Amoxicillin',
  dosage: '500 mg',
  frequency: 'Twice daily for 7 days',
  instructions: 'Take with food',
};

function toDraft(p: Prescription): Draft {
  return {
    medication: p.medication,
    dosage: p.dosage,
    frequency: p.frequency,
    instructions: p.instructions ?? '',
  };
}

function PrescriptionForm({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial: Draft;
  busy: boolean;
  onSave: (draft: Draft) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>(initial);

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft({ ...draft, [key]: e.target.value });

  const canSave =
    !!draft.medication.trim() && !!draft.dosage.trim() && !!draft.frequency.trim() && !busy;

  return (
    <div className="rise space-y-3 rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-950">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className={label}>{t('prescribe.medication')}</span>
          <input
            className={input}
            value={draft.medication}
            onChange={set('medication')}
            placeholder="Amoxicillin"
            autoFocus
          />
        </label>
        <label className="block">
          <span className={label}>{t('prescribe.dosage')}</span>
          <input
            className={input}
            value={draft.dosage}
            onChange={set('dosage')}
            placeholder="500 mg"
          />
        </label>
        <label className="block">
          <span className={label}>{t('prescribe.frequency')}</span>
          <input
            className={input}
            value={draft.frequency}
            onChange={set('frequency')}
            placeholder="Twice daily for 7 days"
          />
        </label>
      </div>
      <label className="block">
        <span className={label}>{t('prescribe.instructions')}</span>
        <input
          className={input}
          value={draft.instructions}
          onChange={set('instructions')}
          placeholder="Take with food"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          className={`flex items-center gap-1.5 ${btnGhost}`}
          disabled={!canSave}
          onClick={() => onSave(draft)}
        >
          <Pic
            src={busy ? img.hourglass : img.save}
            className={`h-5 w-5 ${busy ? 'hourglass' : ''}`}
          />
          {busy ? t('prescribe.saving') : t('prescribe.save')}
        </button>
        <button className={btnGhost} disabled={busy} onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

export default function Prescriptions({ appointment: a }: { appointment: Appointment }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const cache = useAppointmentCache();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Prescription | null>(null);

  const canManage = user?.role === 'DOCTOR' && !LOCKED_STATUSES.includes(a.status);

  const applyLocally = (update: (list: Prescription[]) => Prescription[]) =>
    cache.patch(a.id, (prev) => ({ ...prev, prescriptions: update(prev.prescriptions) }));

  const reconcile = () => cache.refresh(a.id);

  const save = useMutation({
    mutationFn: ({ id, draft }: { id: string | null; draft: Draft }) =>
      api<Prescription>(`/appointments/${a.id}/prescriptions${id ? `/${id}` : ''}`, {
        method: id ? 'PATCH' : 'POST',
        body: {
          medication: draft.medication,
          dosage: draft.dosage,
          frequency: draft.frequency,
          ...(draft.instructions.trim() ? { instructions: draft.instructions } : {}),
        },
      }),
    onSuccess: (saved, variables) => {
      applyLocally((list) =>
        variables.id
          ? list.map((p) => (p.id === variables.id ? saved : p))
          : [...list.filter((p) => p.id !== saved.id), saved],
      );
      setEditingId(null);
      setAdding(false);
      toast.success(t(variables.id ? 'prescribe.updated' : 'prescribe.saved'));
      reconcile();
    },
    onError: (err) => toast.error(errorMessage(err, t('prescribe.failed'))),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      api<void>(`/appointments/${a.id}/prescriptions/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      applyLocally((list) => list.filter((p) => p.id !== id));
      setRemoving(null);
      toast.success(t('prescribe.removed'));
      reconcile();
    },
    onError: (err) => toast.error(errorMessage(err, t('prescribe.removeFailed'))),
  });

  if (!canManage && a.prescriptions.length === 0) return null;

  return (
    <div className="mt-4 space-y-2 rounded-xl bg-teal-50/60 p-3 dark:bg-teal-500/5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
          <Pic src={img.pills} className="h-5 w-5" />
          {t('appointments.prescribed')}
        </p>
        {canManage && !adding && (
          <button
            onClick={() => {
              setEditingId(null);
              setAdding(true);
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100 dark:text-teal-300 dark:hover:bg-teal-500/15"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t('prescribe.add')}
          </button>
        )}
      </div>

      <div className="space-y-2 px-2.5">
        {a.prescriptions.length === 0 && !adding && (
          <p className="text-sm text-stone-500 dark:text-stone-400">{t('prescribe.none')}</p>
        )}

        {a.prescriptions.map((p) =>
        editingId === p.id ? (
          <PrescriptionForm
            key={p.id}
            initial={toDraft(p)}
            busy={save.isPending}
            onSave={(draft) => save.mutate({ id: p.id, draft })}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div key={p.id} className="rise flex items-start gap-2 text-sm">
            <Pic src={img.medicine} className="mt-0.5 h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="font-medium">{p.medication}</span> · {p.dosage}, {p.frequency}
              {p.instructions ? `. ${p.instructions}` : ''}
              <span className="ms-1 text-xs text-stone-400 dark:text-stone-500">
                ({p.prescribedBy})
              </span>
            </span>
            {canManage && (
              <span className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => {
                    setAdding(false);
                    setEditingId(p.id);
                  }}
                  aria-label={t('prescribe.edit')}
                  title={t('prescribe.edit')}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white transition-colors hover:border-teal-300 hover:bg-teal-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-teal-700 dark:hover:bg-teal-500/15"
                >
                  <Pic src={img.edit} className="no-tilt h-4 w-4" />
                </button>
                <button
                  onClick={() => setRemoving(p)}
                  aria-label={t('prescribe.remove')}
                  title={t('prescribe.remove')}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white transition-colors hover:border-rose-300 hover:bg-rose-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-rose-800 dark:hover:bg-rose-500/15"
                >
                  <Pic src={img.delete} className="no-tilt h-4 w-4" />
                </button>
              </span>
            )}
          </div>
          ),
        )}

        {adding && (
          <PrescriptionForm
            initial={DEFAULT_DRAFT}
            busy={save.isPending}
            onSave={(draft) => save.mutate({ id: null, draft })}
            onCancel={() => setAdding(false)}
          />
        )}
      </div>

      {removing && (
        <ConfirmDialog
          title={t('prescribe.confirmRemoveTitle')}
          message={t('prescribe.confirmRemoveBody', { medication: removing.medication })}
          confirmLabel={t('prescribe.remove')}
          busyLabel={t('prescribe.removing')}
          busy={remove.isPending}
          onConfirm={() => remove.mutate(removing.id)}
          onDismiss={() => setRemoving(null)}
        />
      )}
    </div>
  );
}
