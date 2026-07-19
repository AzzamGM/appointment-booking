// The two-step calendar booking flow:
//
//   Step 1: month calendar. Dates with at least one open slot are marked
//           (teal dot + bold); every other date is disabled. Data comes
//           from GET /doctors/:id/availability?month=YYYY-MM.
//   Step 2: click a date, then the open time slots for that day appear,
//           from GET /doctors/:id/availability?date=YYYY-MM-DD.
//           Pick a time + a service, confirm, POST /appointments.
//
// The calendar widget itself is react-day-picker (UI is not the learning
// scope); the availability data behind it is what the backend gaps are about.
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { specialtyLabel } from '../lib/labels';
import { formatDate, formatMoney, formatTime } from '../lib/format';
import { btnPrimary, card, errorText, label, mutedText, pageTitle, select } from '../lib/ui';
import type {
  Appointment,
  DayAvailability,
  DoctorDetail,
  MonthAvailability,
  Service,
} from '../types';

/** Local-calendar YYYY-MM-DD for a Date the picker hands us. */
function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}
function toYM(d: Date): string {
  return toYMD(d).slice(0, 7);
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white dark:bg-teal-500 dark:text-slate-950">
      {n}
    </span>
  );
}

export default function BookDoctorPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState('');

  const doctor = useQuery({
    queryKey: ['doctor', id],
    queryFn: () => api<DoctorDetail>(`/doctors/${id}`),
  });

  // Step 1 data: which dates this month are bookable at all.
  const monthAvailability = useQuery({
    queryKey: ['availability-month', id, toYM(month)],
    queryFn: () => api<MonthAvailability>(`/doctors/${id}/availability?month=${toYM(month)}`),
  });

  // Step 2 data: the concrete times, fetched only once a date is clicked.
  const dayAvailability = useQuery({
    queryKey: ['availability-day', id, selectedDate && toYMD(selectedDate)],
    enabled: !!selectedDate,
    queryFn: () => api<DayAvailability>(`/doctors/${id}/availability?date=${toYMD(selectedDate!)}`),
  });

  // Services this doctor's specialty can perform (for the service dropdown).
  const services = useQuery({
    queryKey: ['services', doctor.data?.specialty],
    enabled: !!doctor.data,
    queryFn: () => api<{ services: Service[] }>(`/services?specialty=${doctor.data!.specialty}`),
  });

  const availableDates = useMemo(() => {
    // NOTE: the API keys days by UTC date; the picker deals in local dates.
    // Clinic hours don't straddle midnight, so for most timezones these
    // coincide, a deliberate simplification (see Gap 4's timezone notes).
    return new Set((monthAvailability.data?.days ?? []).map((d) => d.date));
  }, [monthAvailability.data]);

  const book = useMutation({
    mutationFn: () =>
      api<Appointment>('/appointments', {
        method: 'POST',
        body: { slotId: selectedSlotId, serviceId },
      }),
    onSuccess: (appt) => {
      setSelectedSlotId(null);
      dayAvailability.refetch();
      monthAvailability.refetch();
      toast.success(
        appt.status === 'REQUESTED'
          ? `Request submitted (ref ${appt.reference}). ${appt.service.name} with ${appt.doctor.name}. The front desk will review and confirm it.`
          : `Appointment confirmed (ref ${appt.reference}). ${appt.service.name} with ${appt.doctor.name} at ${appt.clinic.name}.`,
        user?.role === 'PATIENT'
          ? { label: 'View my appointments', onClick: () => navigate('/appointments') }
          : undefined,
      );
    },
    onError: (err) => {
      toast.error(`Booking failed: ${err instanceof ApiError ? err.message : 'unexpected error'}`);
    },
  });

  if (doctor.isLoading)
    return (
      <div className="space-y-3">
        <div className="h-7 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-80 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-6 pt-3 md:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-80 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  if (doctor.isError)
    return (
      <p className={errorText}>Failed to load doctor: {(doctor.error as ApiError).message}</p>
    );
  const doc = doctor.data!;
  const selectedService = services.data?.services.find((s) => s.id === serviceId);
  const selectedSlot = dayAvailability.data?.slots.find((s) => s.id === selectedSlotId);

  return (
    <div>
      <button
        onClick={() => navigate('/')}
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-500/10"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        All doctors
      </button>
      <h1 className={pageTitle}>{doc.name}</h1>
      <p className={`mb-6 mt-0.5 ${mutedText}`}>
        {specialtyLabel(doc.specialty)}
        {doc.bio ? `. ${doc.bio}` : ''}
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ---- Step 1: pick a date on the month calendar ---- */}
        <div className={`${card} p-4`}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <StepBadge n={1} /> Pick a date
          </h2>
          <div className="flex justify-center overflow-x-auto">
            <DayPicker
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date ?? undefined);
              setSelectedSlotId(null);
            }}
            // A date is clickable only if the month summary says it has
            // at least one open slot.
            disabled={(date) => !availableDates.has(toYMD(date))}
            modifiers={{ available: (date) => availableDates.has(toYMD(date)) }}
            modifiersClassNames={{ available: 'day-available' }}
            />
          </div>
          {monthAvailability.isFetching && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Checking availability...
            </p>
          )}
          {monthAvailability.data?.days.length === 0 && !monthAvailability.isFetching && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              No open slots this month. Try the next one.
            </p>
          )}
        </div>

        {/* ---- Step 2: pick a time + service, then confirm ---- */}
        <div className={`${card} p-4`}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <StepBadge n={2} /> Pick a time
          </h2>

          {!selectedDate && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <svg
                className="text-slate-300 dark:text-slate-700"
                width="32"
                height="32"
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
              <p className={mutedText}>Select an available date on the calendar first.</p>
            </div>
          )}

          {selectedDate && dayAvailability.isFetching && !dayAvailability.data && (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 w-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800"
                />
              ))}
            </div>
          )}

          {selectedDate && dayAvailability.data && (
            <>
              <div className="flex flex-wrap gap-2">
                {dayAvailability.data.slots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${
                      selectedSlotId === slot.id
                        ? 'border-teal-600 bg-teal-600 text-white shadow-sm dark:border-teal-500 dark:bg-teal-500 dark:text-slate-950'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-400 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-teal-600 dark:hover:bg-teal-500/10'
                    }`}
                    title={`${slot.clinic.name}, ${slot.clinic.city}`}
                  >
                    {formatTime(slot.startAt)}
                  </button>
                ))}
                {dayAvailability.data.slots.length === 0 && (
                  <p className={mutedText}>
                    No open times left on this day. It may have just filled up.
                  </p>
                )}
              </div>

              {selectedSlotId && (
                <div className="rise mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <label className="block">
                    <span className={label}>Visit type</span>
                    <select
                      className={select}
                      value={serviceId}
                      onChange={(e) => setServiceId(e.target.value)}
                    >
                      <option value="">Choose a visit type...</option>
                      {services.data?.services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {s.durationMinutes}min · {formatMoney(s.price)}
                          {s.requiresApproval ? ' (needs approval)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedService && selectedSlot && (
                    <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">
                          {formatDate(selectedSlot.startAt)} at {formatTime(selectedSlot.startAt)}{' '}
                          UTC
                        </span>
                        <span className="font-semibold">{formatMoney(selectedService.price)}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                        {selectedSlot.clinic.name}, {selectedSlot.clinic.city}
                      </div>
                    </div>
                  )}

                  {selectedService?.requiresApproval && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      This visit type is reviewed by the front desk, so your booking starts as a
                      request.
                    </p>
                  )}
                  <button
                    disabled={!serviceId || book.isPending}
                    onClick={() => (user ? book.mutate() : navigate('/login'))}
                    className={`w-full ${btnPrimary}`}
                  >
                    {book.isPending ? 'Booking...' : user ? 'Confirm booking' : 'Log in to book'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
