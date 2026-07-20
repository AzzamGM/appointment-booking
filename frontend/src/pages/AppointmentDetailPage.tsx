import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { img } from '../lib/images';
import Pic from '../components/Pic';
import Loading from '../components/Loading';
import AppointmentSummary from '../components/AppointmentSummary';
import { card, errorText } from '../lib/ui';
import type { Appointment } from '../types';

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const appointment = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => api<Appointment>(`/appointments/${id}`),
  });

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-500/10"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {appointment.isLoading && (
        <div className={`${card} p-5 sm:p-6`}>
          <Loading text="Loading appointment..." />
        </div>
      )}

      {appointment.isError && (
        <div className={`${card} flex flex-col items-center gap-3 p-8 text-center`}>
          <Pic src={img.questionMark} className="h-10 w-10 opacity-80" />
          <p className={errorText}>
            {(appointment.error as ApiError).message || 'Could not load this appointment.'}
          </p>
        </div>
      )}

      {appointment.data && (
        <div className={`${card} rise p-5 sm:p-6`}>
          <AppointmentSummary appointment={appointment.data} />
        </div>
      )}
    </div>
  );
}
