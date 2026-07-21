import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import AppointmentSummary from '../components/AppointmentSummary';
import AppointmentActions, { VisitRating } from '../components/AppointmentActions';
import ErrorState from '../components/ErrorState';
import Divider from '../components/Divider';
import { card } from '../lib/ui';
import type { Appointment } from '../types';

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

      {appointment.isLoading && (
        <div className={`${card} p-5 sm:p-6`}>
          <Loading text={t('detail.loading')} />
        </div>
      )}

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
