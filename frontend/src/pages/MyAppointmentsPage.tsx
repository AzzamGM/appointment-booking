import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocalize } from '../lib/i18n';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settings';
import { groupByDay, useAppointmentFilters } from '../lib/appointments';
import { firstName } from '../lib/format';
import { doctorAvatar, img, serviceIcon } from '../lib/images';
import Pic from '../components/Pic';
import Loading from '../components/Loading';
import DayHeading from '../components/DayHeading';
import Divider from '../components/Divider';
import ErrorState from '../components/ErrorState';
import AppointmentCard, { MetaItem } from '../components/AppointmentCard';
import AppointmentFilters from '../components/AppointmentFilters';
import AppointmentActions, { VisitRating } from '../components/AppointmentActions';
import { btnPrimary, card, mutedText, pageTitle } from '../lib/ui';
import type { Appointment } from '../types';

function AppointmentSkeleton() {
  const bar = 'animate-pulse rounded bg-stone-200 dark:bg-stone-800';
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-start gap-2">
        <div className={`h-10 w-10 shrink-0 rounded-full ${bar}`} />
        <div className="flex-1 space-y-2">
          <div className={`h-5 w-40 ${bar}`} />
          <div className={`h-3.5 w-24 ${bar}`} />
        </div>
      </div>
      <div className={`my-3 h-px w-full ${bar}`} />
      <div className={`h-3.5 w-3/4 ${bar}`} />
    </div>
  );
}

function PatientAppointmentCard({
  appointment: a,
  index,
  elevated,
  onMenuChange,
}: {
  appointment: Appointment;
  index: number;
  elevated: boolean;
  onMenuChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const L = useLocalize();
  const navigate = useNavigate();
  const { notifications } = useSettings();

  const showReminder =
    notifications && a.status === 'CONFIRMED' && new Date(a.startAt) > new Date();

  return (
    <AppointmentCard
      appointment={a}
      index={index}
      elevated={elevated}
      avatar={doctorAvatar(a.doctor.name)}
      name={firstName(L(a.doctor.name, a.doctor.nameAr))}
      nameTitle={L(a.doctor.name, a.doctor.nameAr)}
      subtitle={t(`specialty.${a.doctor.specialty}`)}
      actions={
        <AppointmentActions
          appointment={a}
          onViewSummary={() => navigate(`/appointments/${a.id}`)}
          onOpenChange={onMenuChange}
        />
      }
      meta={
        <>
          <MetaItem icon={serviceIcon(a.service.name)} muted={false}>
            {L(a.service.name, a.service.nameAr)}
          </MetaItem>
          <MetaItem icon={img.locationPin}>
            {L(a.clinic.name, a.clinic.nameAr)}, {L(a.clinic.city, a.clinic.cityAr)}
          </MetaItem>
        </>
      }
    >
      {showReminder && (
        <p className="mt-2.5 flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
          <Pic src={img.mobileNotification} className="h-5 w-5 shrink-0" />
          {t('appointments.reminderNote')}
        </p>
      )}

      {a.prescriptions.length > 0 && (
        <div>
          <Divider align="start">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
              <Pic src={img.pills} className="h-5 w-5" />
              {t('appointments.prescribed')}
            </span>
          </Divider>
          <div className="space-y-1.5 px-2.5">
            {a.prescriptions.map((p) => (
              <p key={p.id} className="flex items-start gap-2 text-sm">
                <Pic src={img.medicine} className="mt-0.5 h-5 w-5 shrink-0" />
                <span>
                  <span className="font-medium">{p.medication}</span> — {p.dosage}, {p.frequency}
                  {p.instructions ? `. ${p.instructions}` : ''}
                  <span className="ms-1 text-xs text-stone-400 dark:text-stone-500">
                    ({p.prescribedBy})
                  </span>
                </span>
              </p>
            ))}
          </div>
        </div>
      )}

      {a.status === 'COMPLETED' && (
        <div>
          <Divider />
          <VisitRating appointmentId={a.id} />
        </div>
      )}
    </AppointmentCard>
  );
}

export default function MyAppointmentsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const appointments = useQuery({
    queryKey: ['my-appointments'],
    enabled: !!user,
    queryFn: () => api<{ appointments: Appointment[] }>('/patients/me/appointments'),
  });

  const all = appointments.data?.appointments ?? [];
  const filters = useAppointmentFilters(all);

  if (!user) {
    return (
      <p className={mutedText}>
        {t('appointments.please')}{' '}
        <Link
          to="/login"
          className="font-medium text-teal-700 underline underline-offset-2 hover:no-underline dark:text-teal-400"
        >
          {t('common.logIn')}
        </Link>{' '}
        {t('appointments.loginPrompt')}
      </p>
    );
  }

  return (
    <div>
      <h1 className={`mb-4 ${pageTitle}`}>{t('appointments.title')}</h1>

      {all.length > 0 && <AppointmentFilters state={filters} total={all.length} />}

      {appointments.isLoading && (
        <div className="space-y-3">
          <Loading text={t('appointments.loading')} inline />
          <AppointmentSkeleton />
          <AppointmentSkeleton />
        </div>
      )}

      {appointments.isError && (
        <ErrorState
          title={t('appointments.loadFailed')}
          error={appointments.error}
          onRetry={() => appointments.refetch()}
          retrying={appointments.isFetching}
        />
      )}

      {appointments.data?.appointments.length === 0 && (
        <div className={`${card} flex flex-col items-center gap-4 p-10 text-center`}>
          <Pic src={img.doctorAppointment} className="h-20 w-20 opacity-90" />
          <p className={mutedText}>{t('appointments.none')}</p>
          <Link to="/" className={`flex items-center gap-2 ${btnPrimary}`}>
            <Pic src={img.addCalendar} className="h-5 w-5" />
            {t('appointments.bookOne')}
          </Link>
        </div>
      )}

      {all.length > 0 && filters.results.length === 0 && (
        <div className={`${card} flex flex-col items-center gap-3 p-10 text-center`}>
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
            <div className="space-y-3">
              {list.map((a, i) => (
                <PatientAppointmentCard
                  key={a.id}
                  appointment={a}
                  index={i}
                  elevated={menuOpenId === a.id}
                  onMenuChange={(open) => setMenuOpenId(open ? a.id : null)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
