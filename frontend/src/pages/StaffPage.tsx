import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocalize } from '../lib/i18n';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { firstName, formatDate, formatTime } from '../lib/format';
import { img, specialtyIcon, userAvatar } from '../lib/images';
import Pic from '../components/Pic';
import BackButton from '../components/BackButton';
import Loading from '../components/Loading';
import ConfirmDialog from '../components/ConfirmDialog';
import AppointmentCard, { MetaItem } from '../components/AppointmentCard';
import AppointmentFilters from '../components/AppointmentFilters';
import { btnDanger, btnGhost, card, input, label, mutedText, pageTitle } from '../lib/ui';
import DayHeading from '../components/DayHeading';
import Divider from '../components/Divider';
import { groupByDay, useAppointmentCache, useAppointmentFilters } from '../lib/appointments';
import type { Appointment, AuditEntry } from '../types';

type Action = 'confirm' | 'check-in' | 'decline' | 'no-show';

const ACTION_COPY: Record<
  Action,
  { done: string; title: string; body: string; yes: string; busy: string; danger?: boolean }
> = {
  confirm: {
    done: 'staff.confirmed',
    title: 'staff.confirmConfirmTitle',
    body: 'staff.confirmConfirmBody',
    yes: 'staff.confirmConfirmYes',
    busy: 'staff.confirming',
  },
  'check-in': {
    done: 'staff.checkedIn',
    title: 'staff.confirmCheckInTitle',
    body: 'staff.confirmCheckInBody',
    yes: 'staff.confirmCheckInYes',
    busy: 'staff.checkingIn',
  },
  decline: {
    done: 'appointments.cancelled',
    title: 'staff.confirmDeclineTitle',
    body: 'staff.confirmCancelBody',
    yes: 'staff.confirmDeclineYes',
    busy: 'appointments.cancelling',
    danger: true,
  },
  'no-show': {
    done: 'staff.noShowMarked',
    title: 'staff.confirmNoShowTitle',
    body: 'staff.confirmNoShowBody',
    yes: 'staff.confirmNoShowYes',
    busy: 'staff.markingNoShow',
    danger: true,
  },
};

function auditIcon(action: string): string {
  if (action.startsWith('auth.')) return img.idCard;
  if (action === 'appointment.create') return img.new;
  if (action === 'appointment.status') return img.confirmed;
  if (action.startsWith('prescription.')) return img.medicine;
  return img.information;
}

export default function StaffPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const L = useLocalize();
  const cache = useAppointmentCache();
  const navigate = useNavigate();
  const toast = useToast();
  const [showLog, setShowLog] = useState(false);
  const [confirming, setConfirming] = useState<{
    appointment: Appointment;
    action: Action;
  } | null>(null);

  const appointments = useQuery({
    queryKey: ['staff-appointments'],
    enabled: user?.role === 'STAFF',
    queryFn: () => api<{ appointments: Appointment[] }>('/appointments'),
  });

  const all = appointments.data?.appointments ?? [];
  const filters = useAppointmentFilters(all);

  const audit = useQuery({
    queryKey: ['audit'],
    enabled: user?.role === 'STAFF' && showLog,
    refetchInterval: 30_000,
    queryFn: () => api<{ entries: AuditEntry[] }>('/audit?limit=50'),
  });

  const act = useMutation({
    mutationFn: (input: { id: string; action: Action }) => {
      if (input.action === 'check-in') {
        return api<Appointment>(`/appointments/${input.id}/check-in`, { method: 'PATCH' });
      }
      if (input.action === 'decline') {
        return api<Appointment>(`/appointments/${input.id}/cancel`, { method: 'PATCH' });
      }
      return api<Appointment>(`/appointments/${input.id}/status`, {
        method: 'PATCH',
        body: { status: input.action === 'confirm' ? 'CONFIRMED' : 'NO_SHOW' },
      });
    },
    onSuccess: (updated, vars) => {
      cache.write(updated);
      toast.success(t(ACTION_COPY[vars.action].done));
      setConfirming(null);
      cache.refresh(updated.id);
    },
    onError: (err) => {
      toast.error(errorMessage(err, t('errors.actionFailed')));
    },
  });

  if (user?.role !== 'STAFF') {
    return (
      <p className="text-sm text-stone-600 dark:text-stone-300">
        {t('staff.staffOnly')}
      </p>
    );
  }

  const rowBusy = (id: string) => act.isPending && act.variables?.id === id;
  const actionBusy = (id: string, action: Action) =>
    rowBusy(id) && act.variables?.action === action;
  const pending = (appointments.data?.appointments ?? []).filter(
    (a) => a.status === 'REQUESTED',
  ).length;

  const actionButton = (a: Appointment, action: Action, icon: string, idleLabel: string) => {
    const copy = ACTION_COPY[action];
    const busy = actionBusy(a.id, action);
    return (
      <button
        className={`flex items-center gap-1.5 ${copy.danger ? btnDanger : btnGhost}`}
        disabled={rowBusy(a.id)}
        onClick={() => setConfirming({ appointment: a, action })}
      >
        <Pic
          src={busy ? img.hourglass : icon}
          className={`h-5 w-5 ${busy ? 'hourglass' : ''}`}
        />
        {busy ? t(copy.busy) : idleLabel}
      </button>
    );
  };

  return (
    <div>
      <BackButton />
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className={`flex items-center gap-2.5 ${pageTitle}`}>
          <Pic src={img.customerServiceAgent} className="h-10 w-10" />
          {t('staff.title')}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/book" className={`flex items-center gap-1.5 ${btnGhost}`}>
            <Pic src={img.new} className="h-5 w-5" />
            {t('staff.newBooking')}
          </Link>
          <button
            className={`flex items-center gap-1.5 ${btnGhost}`}
            onClick={() => setShowLog((v) => !v)}
          >
            <Pic src={img.information} className="h-5 w-5" />
            {showLog ? t('staff.hideActivityLog') : t('staff.activityLog')}
          </button>
          <button
            className={`flex items-center gap-1.5 ${btnGhost}`}
            onClick={() =>
              toast.info(t('staff.settingsUnavailable'))
            }
          >
            <Pic src={img.settings} className="h-5 w-5" />
            {t('staff.clinicSettings')}
          </button>
        </div>
      </div>
      <p className={`mb-4 ${mutedText}`}>{t('staff.subtitle')}</p>

      {showLog && (
        <div className={`${card} rise mb-4 p-4`}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
            <Pic src={img.information} className="h-5 w-5" />
            {t('staff.recentActivity')}
          </h2>
          {audit.isLoading && <Loading text={t('staff.loadingActivity')} />}
          {audit.data?.entries.length === 0 && (
            <p className={mutedText}>{t('staff.noActivity')}</p>
          )}
          <ul className="max-h-80 space-y-1.5 overflow-y-auto">
            {audit.data?.entries.map((e) => (
              <li key={e.id} className="flex items-start gap-2.5 text-sm">
                <Pic src={auditIcon(e.action)} className="mt-0.5 h-5 w-5" />
                <span className="min-w-0">
                  <span className="font-medium">{e.user?.fullName ?? t('staff.system')}</span>{' '}
                  <span className="text-stone-500 dark:text-stone-400">{e.action}</span>
                  {e.detail && (
                    <span className="text-stone-500 dark:text-stone-400"> · {e.detail}</span>
                  )}
                  <span className="ml-2 text-xs text-stone-400 dark:text-stone-500">
                    {formatDate(e.createdAt)} {formatTime(e.createdAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pending > 0 && (
        <div className="rise mb-4 flex items-center gap-3 rounded-xl border border-amber-200/70 bg-amber-50/70 px-4 py-2.5 dark:border-amber-800/40 dark:bg-amber-500/5">
          <Pic src={img.notificationBell} className="h-7 w-7" />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            {t('staff.pendingRequests')}: {pending}
          </p>
        </div>
      )}

      {all.length > 0 && <AppointmentFilters state={filters} total={all.length} />}

      {appointments.isLoading && (
        <div className="space-y-2">
          <Loading text={t('staff.loadingSchedule')} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${card} p-3`}>
              <div className="h-5 w-3/4 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
            </div>
          ))}
        </div>
      )}

      {appointments.data?.appointments.length === 0 && (
        <div className={`${card} flex flex-col items-center gap-3 p-8 text-center`}>
          <Pic src={img.calendar} className="h-12 w-12 opacity-80" />
          <p className={mutedText}>{t('staff.nothingScheduled')}</p>
        </div>
      )}

      {all.length > 0 && filters.results.length === 0 && (
        <div className={`${card} flex flex-col items-center gap-3 p-8 text-center`}>
          <Pic src={img.search} className="h-12 w-12 opacity-60" />
          <p className={mutedText}>{t('filters.noMatches')}</p>
        </div>
      )}

      <div className="space-y-5">
        {groupByDay(filters.results).map(([date, list]) => (
          <div key={date}>
            <DayHeading
              date={date}
              label={`${list.length} ${t(
                list.length === 1
                  ? 'appointments.appointmentOnDay'
                  : 'appointments.appointmentsOnDay',
              )}`}
            />
            <div className="space-y-2">
        {list.map((a, i) => (
          <AppointmentCard
            key={a.id}
            appointment={a}
            index={i}
            avatar={userAvatar('PATIENT', a.patient.gender)}
            name={firstName(L(a.patient.fullName, a.patient.fullNameAr))}
            nameTitle={L(a.patient.fullName, a.patient.fullNameAr)}
            subtitle={L(a.service.name, a.service.nameAr)}
            meta={
              <>
                {a.patient.isGuest && (
                  <span
                    title={a.patient.email ?? undefined}
                    className="w-fit shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                  >
                    {t('common.guest')}
                  </span>
                )}
                {a.patient.phone && (
                  <MetaItem icon={img.phoneCall}>
                    <span dir="ltr">{a.patient.phone}</span>
                  </MetaItem>
                )}
                <MetaItem icon={specialtyIcon[a.doctor.specialty]} muted={false}>
                  {t(`specialty.${a.doctor.specialty}`)}
                </MetaItem>
                <MetaItem
                  icon={img.maleDoctor}
                  title={L(a.doctor.name, a.doctor.nameAr)}
                >
                  {firstName(L(a.doctor.name, a.doctor.nameAr))}
                </MetaItem>
                <MetaItem icon={img.locationPin} title={L(a.clinic.name, a.clinic.nameAr)}>
                  {L(a.clinic.code, a.clinic.cityAr)}
                </MetaItem>
              </>
            }
            footer={
              <>
                <button
                  className={`flex items-center gap-1.5 ${btnGhost}`}
                  onClick={() => navigate(`/appointments/${a.id}`)}
                >
                  <Pic src={img.view} className="h-5 w-5" />
                  {t('appointments.viewSummary')}
                </button>
                {a.status === 'REQUESTED' &&
                  actionButton(a, 'confirm', img.approved, t('staff.confirm'))}
                {a.status === 'CONFIRMED' &&
                  actionButton(a, 'check-in', img.idCard, t('staff.checkIn'))}
                {(a.status === 'CHECKED_IN' || a.status === 'IN_PROGRESS') && (
                  <span className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
                    <Pic
                      src={a.status === 'IN_PROGRESS' ? img.checkUp : img.hourglass}
                      className="h-5 w-5"
                    />
                    {t(a.status === 'IN_PROGRESS' ? 'staff.withDoctor' : 'staff.waiting')}
                  </span>
                )}
                {a.status === 'REQUESTED' &&
                  actionButton(a, 'decline', img.unapproved, t('staff.decline'))}
                {a.status === 'CONFIRMED' &&
                  actionButton(a, 'no-show', img.noShow, t('staff.noShow'))}
              </>
            }
          >
            {a.prescriptions.length > 0 && (
              <div>
                <Divider align="start">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                    <Pic src={img.pills} className="h-4.5 w-4.5" />
                    {t('appointments.prescribed')}
                  </span>
                </Divider>
                <div className="flex flex-wrap gap-x-5 gap-y-1 px-2.5">
                  {a.prescriptions.map((p) => (
                    <span
                      key={p.id}
                      className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400"
                    >
                      <Pic src={img.medicine} className="h-4 w-4" />
                      {p.medication} {p.dosage}, {p.frequency}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </AppointmentCard>
        ))}
            </div>
          </div>
        ))}
      </div>

      {confirming && (
        <ConfirmDialog
          title={t(ACTION_COPY[confirming.action].title)}
          message={t(ACTION_COPY[confirming.action].body, {
            patient: L(
              confirming.appointment.patient.fullName,
              confirming.appointment.patient.fullNameAr,
            ),
          })}
          confirmLabel={t(ACTION_COPY[confirming.action].yes)}
          cancelLabel={t('common.back')}
          busyLabel={t(ACTION_COPY[confirming.action].busy)}
          icon={ACTION_COPY[confirming.action].danger ? img.caution : img.questionMark}
          tone={ACTION_COPY[confirming.action].danger ? 'danger' : 'primary'}
          busy={actionBusy(confirming.appointment.id, confirming.action)}
          onConfirm={() =>
            act.mutate({ id: confirming.appointment.id, action: confirming.action })
          }
          onDismiss={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
