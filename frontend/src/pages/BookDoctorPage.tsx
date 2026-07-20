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
import { doctorAvatar, img, serviceIcon, specialtyIcon } from '../lib/images';
import Pic from '../components/Pic';
import Loading from '../components/Loading';
import Select from '../components/Select';
import { btnPrimary, card, errorText, label, mutedText, pageTitle } from '../lib/ui';
import type {
  Appointment,
  Clinic,
  DayAvailability,
  DoctorDetail,
  MonthAvailability,
  PatientRef,
  Service,
} from '../types';

type Payment = 'cash' | 'card';

const PAYMENT_OPTIONS: Array<{ value: Payment; icon: string; title: string; hint: string }> = [
  { value: 'cash', icon: img.cashNote, title: 'Cash at clinic', hint: 'Pay at the front desk' },
  { value: 'card', icon: img.creditCard, title: 'Card at clinic', hint: 'All major cards accepted' },
];

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
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white dark:bg-teal-500 dark:text-slate-950">
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
  const [payment, setPayment] = useState<Payment | null>(null);
  // Front-desk flow: which patient this booking is for.
  const [bookingFor, setBookingFor] = useState('');
  const isStaff = user?.role === 'STAFF';

  // For showing the clinic's phone number in the booking summary.
  const clinics = useQuery({
    queryKey: ['clinics'],
    queryFn: () => api<{ clinics: Clinic[] }>('/clinics'),
  });

  // Staff pick a patient to book on behalf of.
  const patients = useQuery({
    queryKey: ['patients'],
    enabled: isStaff,
    queryFn: () => api<{ patients: PatientRef[] }>('/patients'),
  });

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
        body: {
          slotId: selectedSlotId,
          serviceId,
          // Staff book on behalf of the selected patient (backend verifies role).
          ...(isStaff && bookingFor ? { patientId: bookingFor } : {}),
          // The payment picker is frontend-only; the choice rides along in the
          // free-text notes field the API already accepts.
          ...(payment ? { notes: `Payment preference: ${payment} at clinic` } : {}),
        },
      }),
    onSuccess: (appt) => {
      setSelectedSlotId(null);
      setPayment(null);
      setBookingFor('');
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
      <div className="mb-6 flex items-center gap-4">
        <Pic
          src={doctorAvatar(doc.name)}
          alt=""
          fit="cover"
          className="h-20 w-20 shrink-0 rounded-full bg-teal-50 dark:bg-teal-500/10"
        />
        <div>
          <h1 className={pageTitle}>{doc.name}</h1>
          <p className={`mt-0.5 flex items-center gap-1.5 ${mutedText}`}>
            <Pic src={specialtyIcon[doc.specialty]} className="h-5 w-5" />
            {specialtyLabel(doc.specialty)}
            {doc.bio ? `. ${doc.bio}` : ''}
          </p>
        </div>
      </div>

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
            <div className="mt-1">
              <Loading text="Checking availability..." />
            </div>
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
            <Pic src={img.clock} className="h-5 w-5" />
          </h2>

          {!selectedDate && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Pic src={img.calendar} className="h-12 w-12 opacity-80" />
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
                  {isStaff && (
                    <div>
                      <span className={`${label} flex items-center gap-1.5`}>
                        <Pic src={img.customerServiceAgent} className="h-4 w-4" />
                        Booking for (front desk)
                      </span>
                      <Select
                        value={bookingFor}
                        onChange={setBookingFor}
                        placeholder="Choose a patient..."
                        options={(patients.data?.patients ?? []).map((p) => ({
                          value: p.id,
                          label: `${p.fullName} · ${p.email}`,
                        }))}
                      />
                    </div>
                  )}
                  <div>
                    <span className={label}>Visit type</span>
                    <Select
                      value={serviceId}
                      onChange={setServiceId}
                      placeholder="Choose a visit type..."
                      options={(services.data?.services ?? []).map((s) => ({
                        value: s.id,
                        label: `${s.name} · ${s.durationMinutes}min · ${formatMoney(s.price)}${
                          s.requiresApproval ? ' (needs approval)' : ''
                        }`,
                      }))}
                    />
                  </div>

                  {serviceId && (
                    <div>
                      <span className={`${label} flex items-center gap-1.5`}>
                        <Pic src={img.paymentMethod} className="h-5 w-5" />
                        Payment preference (optional)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {PAYMENT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setPayment((p) => (p === opt.value ? null : opt.value))}
                            className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all active:scale-[0.98] ${
                              payment === opt.value
                                ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/25 dark:border-teal-500 dark:bg-teal-500/10'
                                : 'border-slate-200 bg-slate-50 hover:border-teal-300 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-teal-700'
                            }`}
                          >
                            <Pic src={opt.icon} className="h-9 w-9" />
                            <span>
                              <span className="block text-sm font-medium">{opt.title}</span>
                              <span className="block text-xs text-slate-400 dark:text-slate-500">
                                {opt.hint}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedService && selectedSlot && (
                    <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <Pic src={serviceIcon(selectedService.name)} className="h-6 w-6" />
                          {formatDate(selectedSlot.startAt)} at {formatTime(selectedSlot.startAt)}{' '}
                          UTC
                        </span>
                        <span className="font-semibold">{formatMoney(selectedService.price)}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <Pic src={img.locationPin} className="h-4 w-4" />
                          {selectedSlot.clinic.name}, {selectedSlot.clinic.city}
                        </span>
                        {(() => {
                          const phone = clinics.data?.clinics.find(
                            (c) => c.code === selectedSlot.clinic.code,
                          )?.phone;
                          return phone ? (
                            <span className="flex items-center gap-1">
                              <Pic src={img.phoneCall} className="h-4 w-4" />
                              {phone}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  )}

                  {selectedService?.requiresApproval && (
                    <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                      <Pic src={img.information} className="mt-px h-4.5 w-4.5" />
                      This visit type is reviewed by the front desk, so your booking starts as a
                      request.
                    </p>
                  )}
                  <button
                    disabled={!serviceId || book.isPending || (isStaff && !bookingFor)}
                    onClick={() => (user ? book.mutate() : navigate('/login'))}
                    className={`flex w-full items-center justify-center gap-2 ${btnPrimary}`}
                  >
                    {book.isPending && <Pic src={img.hourglass} className="hourglass h-5 w-5" />}
                    {book.isPending
                      ? 'Booking...'
                      : !user
                        ? 'Log in to book'
                        : isStaff && !bookingFor
                          ? 'Select a patient to book for'
                          : 'Confirm booking'}
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
