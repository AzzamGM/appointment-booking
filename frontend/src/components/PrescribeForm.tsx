import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, errorMessage } from '../lib/api';
import { useToast } from '../lib/toast';
import { img } from '../lib/images';
import Pic from './Pic';
import { btnGhost, input, label } from '../lib/ui';
import type { Appointment } from '../types';

interface PrescriptionDraft {
  medication: string;
  dosage: string;
  frequency: string;
  instructions: string;
}

const DEFAULT_DRAFT: PrescriptionDraft = {
  medication: 'Amoxicillin',
  dosage: '500 mg',
  frequency: 'Twice daily for 7 days',
  instructions: 'Take with food',
};

export default function PrescribeForm({
  appointment,
  onDone,
}: {
  appointment: Appointment;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<PrescriptionDraft>(DEFAULT_DRAFT);

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
      queryClient.invalidateQueries({ queryKey: ['doctor-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      toast.success(`Prescription added for ${appointment.patient.fullName}.`);
      onDone();
    },
    onError: (err) => {
      toast.error(errorMessage(err, t('prescribe.failed')));
    },
  });

  const canSave = draft.medication.trim() && draft.dosage.trim() && draft.frequency.trim();

  return (
    <div className="rise mt-3 w-full space-y-3 rounded-xl bg-stone-50 p-3 dark:bg-stone-950">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className={label}>{t('prescribe.medication')}</span>
          <input
            className={input}
            value={draft.medication}
            onChange={(e) => setDraft({ ...draft, medication: e.target.value })}
            placeholder="Amoxicillin"
          />
        </label>
        <label className="block">
          <span className={label}>{t('prescribe.dosage')}</span>
          <input
            className={input}
            value={draft.dosage}
            onChange={(e) => setDraft({ ...draft, dosage: e.target.value })}
            placeholder="500 mg"
          />
        </label>
        <label className="block">
          <span className={label}>{t('prescribe.frequency')}</span>
          <input
            className={input}
            value={draft.frequency}
            onChange={(e) => setDraft({ ...draft, frequency: e.target.value })}
            placeholder="Twice daily for 7 days"
          />
        </label>
      </div>
      <label className="block">
        <span className={label}>{t('prescribe.instructions')}</span>
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
          {prescribe.isPending ? t('prescribe.saving') : t('prescribe.save')}
        </button>
        <button className={btnGhost} onClick={onDone}>
          {t('prescribe.close')}
        </button>
      </div>
    </div>
  );
}
