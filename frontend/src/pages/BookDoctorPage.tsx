import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import StepBadge from '../components/StepBadge';
import CardDetails, { DUMMY_CARD, isCardValid, type CardFields } from '../components/CardDetails';
import GuestDetails, {
  DUMMY_GUEST,
  fullPhone,
  isGuestValid,
  type GuestFields,
} from '../components/GuestDetails';
import Fade from '../components/Fade';
import OtpDialog from '../components/OtpDialog';
import AppointmentSummary from '../components/AppointmentSummary';
import { revealStep } from '../lib/scroll';
import { btnGhost, btnPrimary, btnPrimaryFlat, card, errorText, label, mutedText, pageTitle } from '../lib/ui';
import type {
  Appointment,
  Clinic,
  DayAvailability,
  DoctorDetail,
  MonthAvailability,
  PatientRef,
  Service,
} from '../types';

type Payment = 'clinic' | 'online';

const PAYMENT_OPTIONS: Array<{
  value: Payment;
  icon: string;
  title: string;
  hint: string;
  note: string;
}> = [
  {
    value: 'clinic',
    icon: img.paymentMethod,
    title: 'Cash or card at clinic',
    hint: 'Pay at the front desk on the day',
    note: 'Pay at clinic (cash or card)',
  },
  {
    value: 'online',
    icon: img.creditCard,
    title: 'Pay online',
    hint: 'Card payment when you confirm',
    note: 'Paying online',
  },
];

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}
function toYM(d: Date): string {
  return toYMD(d).slice(0, 7);
}

export default function BookDoctorPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(true);
  const [timesOpen, setTimesOpen] = useState(true);
  const [serviceId, setServiceId] = useState('');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [cardInfo, setCardInfo] = useState<CardFields>(DUMMY_CARD);
  const [guestInfo, setGuestInfo] = useState<GuestFields>(DUMMY_GUEST);
  const [completedBooking, setCompletedBooking] = useState<Appointment | null>(null);
  const [otpOpen, setOtpOpen] = useState(false);
  const [bookingFor, setBookingFor] = useState('');
  const isStaff = user?.role === 'STAFF';
  const isGuest = !user;

  const timeCardRef = useRef<HTMLDivElement>(null);
  const guestRef = useRef<HTMLDivElement>(null);
  const paymentCardRef = useRef<HTMLDivElement>(null);
  const paymentOptionsRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDate) revealStep(timeCardRef);
  }, [selectedDate]);

  useEffect(() => {
    if (selectedSlotId) revealStep(isGuest ? guestRef : paymentCardRef);
  }, [selectedSlotId, isGuest]);

  useEffect(() => {
    if (serviceId) revealStep(paymentOptionsRef);
  }, [serviceId]);

  useEffect(() => {
    if (payment) revealStep(payment === 'online' ? cardRef : confirmRef);
  }, [payment]);

  const clinics = useQuery({
    queryKey: ['clinics'],
    queryFn: () => api<{ clinics: Clinic[] }>('/clinics'),
  });

  const patients = useQuery({
    queryKey: ['patients'],
    enabled: isStaff,
    queryFn: () => api<{ patients: PatientRef[] }>('/patients'),
  });

  const doctor = useQuery({
    queryKey: ['doctor', id],
    queryFn: () => api<DoctorDetail>(`/doctors/${id}`),
  });

  const monthAvailability = useQuery({
    queryKey: ['availability-month', id, toYM(month)],
    queryFn: () => api<MonthAvailability>(`/doctors/${id}/availability?month=${toYM(month)}`),
  });

  const dayAvailability = useQuery({
    queryKey: ['availability-day', id, selectedDate && toYMD(selectedDate)],
    enabled: !!selectedDate,
    queryFn: () => api<DayAvailability>(`/doctors/${id}/availability?date=${toYMD(selectedDate!)}`),
  });

  const services = useQuery({
    queryKey: ['services', doctor.data?.specialty],
    enabled: !!doctor.data,
    queryFn: () => api<{ services: Service[] }>(`/services?specialty=${doctor.data!.specialty}`),
  });

  const availableDates = useMemo(() => {
    return new Set((monthAvailability.data?.days ?? []).map((d) => d.date));
  }, [monthAvailability.data]);

  const book = useMutation({
    mutationFn: () => {
      const body = {
        slotId: selectedSlotId,
        serviceId,
        ...(payment ? { notes: PAYMENT_OPTIONS.find((o) => o.value === payment)!.note } : {}),
      };
      return isGuest
        ? api<Appointment>('/appointments/guest', {
            method: 'POST',
            body: { ...body, ...guestInfo, phone: fullPhone(guestInfo) },
          })
        : api<Appointment>('/appointments', {
            method: 'POST',
            body: { ...body, ...(isStaff && bookingFor ? { patientId: bookingFor } : {}) },
          });
    },
    onSuccess: (appt) => {
      setSelectedSlotId(null);
      setPayment(null);
      setBookingFor('');
      setOtpOpen(false);
      dayAvailability.refetch();
      monthAvailability.refetch();
      setCompletedBooking(appt);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err) => {
      setOtpOpen(false);
      toast.error(`Booking failed: ${err instanceof ApiError ? err.message : 'unexpected error'}`);
    },
  });

  if (doctor.isLoading)
    return (
      <div className="space-y-3">
        <div className="h-7 w-56 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-4 w-80 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
        <div className="grid gap-6 pt-3 md:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
          <div className="h-80 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
        </div>
      </div>
    );
  if (doctor.isError)
    return (
      <p className={errorText}>Failed to load doctor: {(doctor.error as ApiError).message}</p>
    );
  const doc = doctor.data!;
  const selectedService = services.data?.services.find((s) => s.id === serviceId);
  const cardReady = payment !== 'online' || isCardValid(cardInfo);
  const guestReady = !isGuest || isGuestValid(guestInfo);
  const selectedSlot = dayAvailability.data?.slots.find((s) => s.id === selectedSlotId);

  const bookAnother = () => {
    setCompletedBooking(null);
    setSelectedDate(undefined);
    setSelectedSlotId(null);
    setDateOpen(true);
    setTimesOpen(true);
    setServiceId('');
    setPayment(null);
  };

  const confirmButton = (
    <div ref={confirmRef} className="scroll-mt-20">
      <button
        disabled={
          !serviceId ||
          !payment ||
          !cardReady ||
          !guestReady ||
          book.isPending ||
          (isStaff && !bookingFor)
        }
        onClick={() => setOtpOpen(true)}
        className={`flex w-full items-center justify-center gap-2 ${btnPrimary}`}
      >
        {book.isPending && <Pic src={img.hourglass} className="hourglass h-5 w-5" />}
        {book.isPending
          ? 'Booking...'
          : isStaff && !bookingFor
            ? 'Select a patient to book for'
            : !payment
              ? 'Choose a payment method'
              : !cardReady
                ? 'Complete your card details'
                : !guestReady
                  ? 'Complete your contact details'
                  : 'Confirm booking'}
      </button>
    </div>
  );

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-500/10"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
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
            <Pic src={specialtyIcon[doc.specialty]} className="h-6 w-6 shrink-0" />
            {specialtyLabel(doc.specialty)}
          </p>
        </div>
      </div>

      {completedBooking && (
        <div className={`${card} rise mb-6 p-5 sm:p-6`}>
          <AppointmentSummary appointment={completedBooking} />

          {isGuest && (
            <>
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                <Pic src={img.information} className="mt-px h-4.5 w-4.5 shrink-0" />
                Keep this reference. Guest bookings cannot be viewed or cancelled online, so quote
                it to the front desk if you need to change anything. We sent the details to{' '}
                {guestInfo.email}.
              </p>

              <div className="mt-4 rounded-xl border border-teal-200/70 bg-teal-50/60 p-4 dark:border-teal-800/50 dark:bg-teal-500/5">
                <p className="flex items-center gap-2 font-semibold">
                  <Pic src={img.addUser} className="h-6 w-6" />
                  Want an easier time next visit?
                </p>
                <p className={`mt-1 ${mutedText}`}>
                  With an account your details are filled in for you, and you can see, rate and
                  cancel your appointments without calling the clinic.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Link
                    to="/signup"
                    state={{
                      fullName: guestInfo.fullName,
                      email: guestInfo.email,
                      phone: guestInfo.phone,
                    }}
                    className={`flex items-center justify-center gap-2 sm:w-auto ${btnPrimaryFlat}`}
                  >
                    <Pic src={img.addUser} className="no-tilt h-5 w-5" />
                    Create an account
                  </Link>
                  <Link to="/login" className={`text-center ${btnGhost}`}>
                    Log in
                  </Link>
                </div>
              </div>
            </>
          )}

          <div className="mt-4 flex flex-col gap-2 border-t border-stone-100 pt-4 dark:border-stone-800 sm:flex-row">
            {user?.role === 'PATIENT' && (
              <Link
                to="/appointments"
                className={`flex items-center justify-center gap-2 sm:w-auto ${btnPrimaryFlat}`}
              >
                <Pic src={img.calendar} className="no-tilt h-5 w-5" />
                View my appointments
              </Link>
            )}
            {isStaff && (
              <Link
                to="/staff"
                className={`flex items-center justify-center gap-2 sm:w-auto ${btnPrimaryFlat}`}
              >
                <Pic src={img.customerServiceAgent} className="no-tilt h-5 w-5" />
                Back to front desk
              </Link>
            )}
            <button onClick={bookAnother} className={`text-center ${btnGhost}`}>
              Book another visit
            </button>
          </div>
        </div>
      )}

      {!completedBooking && (
      <div className="grid items-start gap-6 md:grid-cols-2">
        <div className={`${card} p-4`}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
            <StepBadge n={1} /> Pick a date
            <Pic src={img.calendar} className="h-5 w-5" />
          </h2>
          {selectedDate && !dateOpen ? (
            <div className="rise flex flex-wrap items-center gap-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3 dark:border-teal-800/60 dark:bg-teal-500/5">
              <Pic src={img.calendar} className="h-8 w-8" />
              <div className="flex-1">
                <p className="font-semibold">
                  {formatDate(`${toYMD(selectedDate)}T00:00:00.000Z`)}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {dayAvailability.data
                    ? `${dayAvailability.data.slots.length} time ${
                        dayAvailability.data.slots.length === 1 ? 'slot' : 'slots'
                      } open`
                    : 'Checking times...'}
                </p>
              </div>
              <button
                onClick={() => {
                  setDateOpen(true);
                  setSelectedDate(undefined);
                  setSelectedSlotId(null);
                  setTimesOpen(true);
                  setServiceId('');
                  setPayment(null);
                }}
                className={btnGhost}
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <div
                  className={`flex justify-center overflow-x-auto transition-opacity duration-200 ${
                    monthAvailability.isFetching ? 'pointer-events-none opacity-40' : ''
                  }`}
                >
                  <DayPicker
                    mode="single"
                    month={month}
                    onMonthChange={setMonth}
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date ?? undefined);
                      setSelectedSlotId(null);
                      setTimesOpen(true);
                      setDateOpen(!date);
                    }}
                    disabled={(date) => !availableDates.has(toYMD(date))}
                    modifiers={{ available: (date) => availableDates.has(toYMD(date)) }}
                    modifiersClassNames={{ available: 'day-available' }}
                  />
                </div>
                {monthAvailability.isFetching && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loading text="Checking availability..." />
                  </div>
                )}
              </div>
              {monthAvailability.data?.days.length === 0 && !monthAvailability.isFetching && (
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  No open slots this month. Try the next one.
                </p>
              )}
            </>
          )}
        </div>

        {selectedDate && (
        <div ref={timeCardRef} className={`${card} rise scroll-mt-20 p-4`}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
            <StepBadge n={2} /> Pick a time
            <Pic src={img.clock} className="h-5 w-5" />
          </h2>

          {dayAvailability.isFetching && !dayAvailability.data && (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 w-16 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800"
                />
              ))}
            </div>
          )}

          {dayAvailability.data && (
            <>
              {selectedSlot && !timesOpen ? (
                <div className="rise flex flex-wrap items-center gap-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3 dark:border-teal-800/60 dark:bg-teal-500/5">
                  <Pic src={img.clock} className="h-8 w-8" />
                  <div className="flex-1">
                    <p className="font-semibold">{formatTime(selectedSlot.startAt)} UTC</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {formatDate(selectedSlot.startAt)} - {selectedSlot.clinic.name}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setTimesOpen(true);
                      setSelectedSlotId(null);
                      setServiceId('');
                      setPayment(null);
                    }}
                    className={btnGhost}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {dayAvailability.data.slots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => {
                        setSelectedSlotId(slot.id);
                        setTimesOpen(false);
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${
                        selectedSlotId === slot.id
                          ? 'border-teal-600 bg-teal-600 text-white shadow-sm dark:border-teal-500 dark:bg-teal-500 dark:text-stone-950'
                          : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-teal-400 hover:bg-teal-50 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-300 dark:hover:border-teal-600 dark:hover:bg-teal-500/10'
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
              )}

            </>
          )}
        </div>
        )}

        {selectedSlotId && isGuest && (
          <div ref={guestRef} className={`${card} rise scroll-mt-20 p-4`}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
              <StepBadge n={3} /> Your details
              <Pic src={img.idCard} className="h-5 w-5" />
            </h2>
            <div className="space-y-3">
              <p className={mutedText}>
                You are booking as a guest, so we need a way to reach you about this visit.
              </p>
              <GuestDetails value={guestInfo} onChange={setGuestInfo} />
            </div>
          </div>
        )}

        {selectedSlotId && (
          <div ref={paymentCardRef} className={`${card} rise scroll-mt-20 p-4`}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
              <StepBadge n={isGuest ? 4 : 3} /> Visit and payment
              <Pic src={img.paymentMethod} className="h-5 w-5" />
            </h2>

            <div className="space-y-3">
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
                      label: `${p.fullName} - ${p.email}`,
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
                  dropUp
                  options={(services.data?.services ?? []).map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                />
              </div>

              {selectedService && (
                <div className="rise">
                  <span className={`${label} flex items-center gap-1.5`}>
                    <Pic src={img.cashNote} className="h-5 w-5" />
                    Cost
                  </span>
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm dark:border-stone-700 dark:bg-stone-950">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                        <Pic src={serviceIcon(selectedService.name)} className="h-5 w-5" />
                        {selectedService.name}
                      </span>
                      <span>{formatMoney(selectedService.price)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-stone-400 dark:text-stone-500">
                      <span>Appointment length</span>
                      <span>{selectedService.durationMinutes} min</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 border-t border-stone-200 pt-2 font-semibold dark:border-stone-800">
                      <span>Total due at clinic</span>
                      <span className="text-teal-700 dark:text-teal-300">
                        {formatMoney(selectedService.price)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {serviceId && (
              <div
                ref={paymentOptionsRef}
                className="grid scroll-mt-20 grid-cols-1 gap-2 sm:grid-cols-2"
              >
                {PAYMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPayment(opt.value)}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all active:scale-[0.98] ${
                      payment === opt.value
                        ? 'is-active border-teal-500 bg-teal-50 ring-2 ring-teal-500/25 dark:border-teal-500 dark:bg-teal-500/10'
                        : 'border-stone-200 bg-stone-50 hover:border-teal-300 dark:border-stone-700 dark:bg-stone-950 dark:hover:border-teal-700'
                    }`}
                  >
                    <Pic src={opt.icon} className="h-9 w-9" />
                    <span>
                      <span className="block text-sm font-medium">{opt.title}</span>
                      <span className="block text-xs text-stone-400 dark:text-stone-500">
                        {opt.hint}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              )}

              {selectedService && selectedSlot && (
                <div className="rounded-lg bg-stone-50 p-3 text-sm dark:bg-stone-950">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                      <Pic src={img.calendar} className="h-6 w-6" />
                      {formatDate(selectedSlot.startAt)} at {formatTime(selectedSlot.startAt)} UTC
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400 dark:text-stone-500">
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

              {isGuest ? (
                <>
                  <Fade show={payment === 'online'}>
                    <div
                      ref={cardRef}
                      className="scroll-mt-20 space-y-3 border-t border-stone-100 pt-3 dark:border-stone-800"
                    >
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
                        <Pic src={img.creditCard} className="h-5 w-5" />
                        Card details
                      </h3>
                      <CardDetails value={cardInfo} onChange={setCardInfo} />
                    </div>
                  </Fade>
                  {confirmButton}
                </>
              ) : (
                <Fade show={payment !== 'online'}>{confirmButton}</Fade>
              )}
            </div>
          </div>
        )}

        {!isGuest && (
          <Fade show={payment === 'online'}>
            <div ref={cardRef} className={`${card} scroll-mt-20 p-4`}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
                <Pic src={img.creditCard} className="h-5 w-5" />
                Card details
              </h2>
              <div className="space-y-3">
                <CardDetails value={cardInfo} onChange={setCardInfo} />
                {confirmButton}
              </div>
            </div>
          </Fade>
        )}
      </div>
      )}

      {otpOpen && (
        <OtpDialog
          phone={isGuest ? fullPhone(guestInfo) : user?.phone ?? null}
          busy={book.isPending}
          onVerified={() => book.mutate()}
          onCancel={() => setOtpOpen(false)}
        />
      )}
    </div>
  );
}
