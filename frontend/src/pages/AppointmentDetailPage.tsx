import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import AppointmentSummary from '../components/AppointmentSummary';
import AppointmentActions, { VisitRating } from '../components/AppointmentActions';
import ErrorState from '../components/ErrorState';
import Divider from '../components/Divider';
import { card } from '../lib/ui';
import type { Appointment } from '../types';

const bar = 'animate-pulse rounded bg-stone-200 dark:bg-stone-800';

function SummarySkeleton({ label }: { label: string }) {
  return (
    <div className={`${card} p-5 sm:p-6`} role="status" aria-label={label}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-9 w-9 shrink-0 rounded-full ${bar}`} />
          <div className={`h-6 w-44 ${bar}`} />
        </div>
        <div className="flex gap-3">
          <div className={`h-8 w-32 rounded-lg ${bar}`} />
          <div className={`h-8 w-24 rounded-lg ${bar}`} />
        </div>
      </div>

      <Divider className="my-4" />

      <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`h-5 w-5 shrink-0 ${bar}`} />
            <div className={`h-4 w-40 max-w-full ${bar}`} />
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-stone-200/70 bg-stone-50/80 p-4 dark:border-stone-800 dark:bg-stone-950/40">
        <div className={`mb-3 h-4 w-36 ${bar}`} />
        <div className="flex items-center gap-3">
          <div className={`h-11 w-11 shrink-0 rounded-full ${bar}`} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className={`h-4 w-40 max-w-full ${bar}`} />
            <div className={`h-3 w-28 max-w-full ${bar}`} />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-stone-200/70 pt-3 dark:border-stone-800 sm:grid-cols-2">
          <div className={`h-5 w-48 max-w-full ${bar}`} />
          <div className={`h-5 w-36 max-w-full ${bar}`} />
        </div>
      </div>
    </div>
  );
}

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const appointment = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => api<Appointment>(`/appointments/${id}`),
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-base font-medium text-teal-700 transition-colors hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-500/10"
        >
          <svg className="rtl:rotate-180" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {t('common.back')}
        </button>
        {appointment.data && <AppointmentActions appointment={appointment.data} />}
      </div>

      {appointment.isLoading && <SummarySkeleton label={t('detail.loading')} />}

      {appointment.isError && (
        <ErrorState
          title={t('detail.loadFailed')}
          error={appointment.error}
          onRetry={() => appointment.refetch()}
          retrying={appointment.isFetching}
        />
      )}

      {appointment.data && (
        <div className={`${card} rise p-5 sm:p-6`}>
          <AppointmentSummary appointment={appointment.data} />
          {appointment.data.status === 'COMPLETED' && (
            <div>
              <Divider className="my-4" />
              <VisitRating appointmentId={appointment.data.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
