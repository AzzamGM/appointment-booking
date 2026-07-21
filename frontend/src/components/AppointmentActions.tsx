import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { img } from '../lib/images';
import Pic from './Pic';
import type { Appointment } from '../types';

type Rating = 'up' | 'down';
const ratingKey = (id: string) => `medibook:rating:${id}`;

export function VisitRating({ appointmentId }: { appointmentId: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [rating, setRating] = useState<Rating | null>(
    () => localStorage.getItem(ratingKey(appointmentId)) as Rating | null,
  );

  const rate = (r: Rating) => {
    localStorage.setItem(ratingKey(appointmentId), r);
    setRating(r);
    toast.success(t(r === 'up' ? 'appointments.thanksFeedback' : 'appointments.sorryFeedback'));
  };

  if (rating) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
        <Pic src={rating === 'up' ? img.thumbsUp : img.thumbDown} className="h-6 w-6" />
        {t('appointments.youRated')}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-xs text-stone-400 dark:text-stone-500">
        {t('appointments.howWasVisit')}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          rate('up');
        }}
        title={t('appointments.goodVisit')}
        className="rounded-lg p-1.5 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
      >
        <Pic src={img.thumbsUp} alt="Thumbs up" className="h-6 w-6" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          rate('down');
        }}
        title={t('appointments.notGreat')}
        className="rounded-lg p-1.5 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
      >
        <Pic src={img.thumbDown} alt="Thumbs down" className="h-6 w-6" />
      </button>
    </span>
  );
}

export function useCancelAppointment() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api<Appointment>(`/appointments/${id}/cancel`, { method: 'PATCH' }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success(t('appointments.cancelled'));
    },
    onError: (err) => {
      toast.error(errorMessage(err, t('errors.cancelFailed')));
    },
  });
}

const menuItem =
  'flex w-full items-center gap-2.5 px-3 py-2.5 text-start text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50';

export default function AppointmentActions({
  appointment: a,
  onViewSummary,
  onOpenChange,
}: {
  appointment: Appointment;
  onViewSummary?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const cancel = useCancelAppointment();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const toggle = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) toggle(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggle(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const cancelling = cancel.isPending && cancel.variables === a.id;
  const canCancel =
    (a.status === 'REQUESTED' || a.status === 'CONFIRMED') && user?.role !== 'DOCTOR';

  if (!onViewSummary && !canCancel) return null;

  return (
    <div ref={ref} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('appointments.actions')}
        title={t('appointments.actions')}
        onClick={() => toggle(!open)}
        className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
          open
            ? 'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-700 dark:bg-teal-500/10 dark:text-teal-300'
            : 'border-stone-200 text-stone-500 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800'
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="drop absolute end-0 top-full z-30 mt-1.5 w-52 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900"
        >
          {onViewSummary && (
            <button
              role="menuitem"
              onClick={() => {
                toggle(false);
                onViewSummary();
              }}
              className={`${menuItem} text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800`}
            >
              <Pic src={img.unhide} className="no-tilt h-5 w-5" />
              {t('appointments.viewSummary')}
            </button>
          )}
          {canCancel && (
            <button
              role="menuitem"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(a.id, { onSuccess: () => toggle(false) })}
              className={`${menuItem} text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40`}
            >
              {cancelling ? (
                <>
                  <Pic src={img.hourglass} className="hourglass h-5 w-5" />
                  {t('appointments.cancelling')}
                </>
              ) : (
                <>
                  <Pic src={img.cancel} className="no-tilt h-5 w-5" />
                  {t('appointments.cancel')}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
