import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocalize } from '../lib/i18n';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { statusStyle } from '../lib/labels';
import { formatDate, formatTime } from '../lib/format';
import { img, serviceIcon, statusIcon, userAvatar } from '../lib/images';
import Pic from '../components/Pic';
import Loading from '../components/Loading';
import PrescribeForm from '../components/PrescribeForm';
import ErrorState from '../components/ErrorState';
import { btnGhost, card, mutedText, pageTitle } from '../lib/ui';
import type { Appointment } from '../types';

function groupByDay(appointments: Appointment[]) {
  const days = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const key = a.startAt.slice(0, 10);
    days.set(key, [...(days.get(key) ?? []), a]);
  }
  return [...days.entries()];
}

export default function DoctorSchedulePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const L = useLocalize();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [prescribingId, setPrescribingId] = useState<string | null>(null);

  const appointments = useQuery({
    queryKey: ['doctor-schedule'],
    enabled: user?.role === 'DOCTOR',
    queryFn: () => api<{ appointments: Appointment[] }>('/doctors/me/appointments'),
  });

  const complete = useMutation({
    mutationFn: (id: string) =>
      api<Appointment>(`/appointments/${id}/status`, {
        method: 'PATCH',
        body: { status: 'COMPLETED' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-schedule'] });
      toast.success(t('schedule.completed'));
    },
    onError: (err) => {
      toast.error(errorMessage(err, t('errors.actionFailed')));
    },
  });

  const days = useMemo(
    () => groupByDay(appointments.data?.appointments ?? []),
    [appointments.data],
  );

  if (user?.role !== 'DOCTOR') {
    return (
      <p className="text-sm text-stone-600 dark:text-stone-300">
        {t('schedule.doctorsOnly')}
      </p>
    );
  }

  const total = appointments.data?.appointments.length ?? 0;

  return (
    <div>
      <h1 className={`flex items-center gap-2.5 ${pageTitle}`}>
        <Pic src={img.checkUp} className="h-10 w-10" />
        {t('schedule.title')}
      </h1>
      <p className={`mb-4 mt-1 ${mutedText}`}>
        {total > 0
          ? t('schedule.subtitle', { patients: total, days: days.length })
          : t('schedule.empty')}
      </p>

      {appointments.isLoading && <Loading text={t('schedule.loading')} />}

      {appointments.isError && (
        <ErrorState
          title={t('schedule.loadFailed')}
          error={appointments.error}
          onRetry={() => appointments.refetch()}
          retrying={appointments.isFetching}
        />
      )}

      {appointments.data && total === 0 && (
        <div className={`${card} flex flex-col items-center gap-3 p-10 text-center`}>
          <Pic src={img.calendar} className="h-16 w-16 opacity-80" />
          <p className={mutedText}>{t('schedule.empty')}</p>
        </div>
      )}

      <div className="space-y-6">
        {days.map(([date, list]) => (
          <section key={date}>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
              <Pic src={img.calendar} className="h-5 w-5" />
              {formatDate(`${date}T00:00:00.000Z`)}
              <span className="text-xs font-normal text-stone-400 dark:text-stone-500">
                {list.length} {list.length === 1 ? 'patient' : 'patients'}
              </span>
            </h2>

            <div className="space-y-2">
              {list.map((a, i) => (
                <div
                  key={a.id}
                  className={`${card} rise flex flex-wrap items-center gap-3 p-3 sm:p-4`}
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <span className="flex w-20 shrink-0 items-center gap-1.5 font-mono text-sm font-semibold">
                    <Pic src={img.clock} className="h-4.5 w-4.5" />
                    {formatTime(a.startAt)}
                  </span>

                  <Pic
                    src={userAvatar(a.patient.id ?? a.patient.fullName, 'PATIENT')}
                    alt=""
                    fit="cover"
                    className="h-10 w-10 shrink-0 rounded-full bg-stone-100 ring-2 ring-stone-200 dark:bg-stone-800 dark:ring-stone-700"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.patient.fullName}</p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500 dark:text-stone-400">
                      <span className="flex items-center gap-1">
                        <Pic src={serviceIcon(a.service.name)} className="h-4.5 w-4.5" />
                        {L(a.service.name, a.service.nameAr)} - {a.service.durationMinutes}{' '}
                        {t('common.minutes')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Pic src={img.locationPin} className="h-4 w-4" />
                        {L(a.clinic.name, a.clinic.nameAr)}
                      </span>
                    </p>
                    {a.notes && (
                      <p className="mt-1 flex items-start gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                        <Pic src={img.information} className="mt-0.5 h-4 w-4" />
                        {a.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {a.prescriptions.length > 0 && (
                      <span
                        title={a.prescriptions.map((p) => p.medication).join(', ')}
                        className="flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
                      >
                        <Pic src={img.pills} className="h-4.5 w-4.5" />
                        {a.prescriptions.length}
                      </span>
                    )}
                    <span
                      className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${statusStyle[a.status]}`}
                    >
                      <Pic src={statusIcon[a.status]} className="h-4.5 w-4.5" />
                      {t(`statusShort.${a.status}`)}
                    </span>

                    {a.status === 'CHECKED_IN' && (
                      <button
                        className={`flex items-center gap-1.5 ${btnGhost}`}
                        disabled={complete.isPending && complete.variables === a.id}
                        onClick={() => complete.mutate(a.id)}
                      >
                        {complete.isPending && complete.variables === a.id ? (
                          <>
                            <Pic src={img.hourglass} className="hourglass h-5 w-5" />
                            {t('schedule.completing')}
                          </>
                        ) : (
                          <>
                            <Pic src={img.healthy} className="h-5 w-5" />
                            {t('schedule.complete')}
                          </>
                        )}
                      </button>
                    )}

                    {(a.status === 'CHECKED_IN' || a.status === 'COMPLETED') && (
                      <button
                        className={`flex items-center gap-1.5 ${btnGhost}`}
                        onClick={() => setPrescribingId((v) => (v === a.id ? null : a.id))}
                      >
                        <Pic src={img.medicine} className="h-5 w-5" />
                        Prescribe
                      </button>
                    )}
                  </div>

                  {prescribingId === a.id && (
                    <PrescribeForm appointment={a} onDone={() => setPrescribingId(null)} />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
