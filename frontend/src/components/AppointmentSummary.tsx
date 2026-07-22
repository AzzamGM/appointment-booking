import { useTranslation } from 'react-i18next';
import { useLocalize } from '../lib/i18n';
import { formatDate, formatTime } from '../lib/format';
import { doctorAvatar, img, serviceIcon, specialtyIcon, statusIcon, userAvatar } from '../lib/images';
import { noteLabel, statusStyle } from '../lib/labels';
import { useAuth } from '../lib/auth';
import Pic from './Pic';
import Divider from './Divider';
import ReferenceChip from './ReferenceChip';
import Prescriptions from './Prescriptions';
import Money from './Money';
import type { Appointment } from '../types';

export default function AppointmentSummary({ appointment: a }: { appointment: Appointment }) {
  const { t } = useTranslation();
  const L = useLocalize();
  const { user } = useAuth();

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Pic
            src={doctorAvatar(a.doctor.name)}
            fit="cover"
            className="h-9 w-9 shrink-0 rounded-full bg-teal-50 ring-2 ring-teal-200 dark:bg-teal-500/10 dark:ring-teal-800"
          />
          {L(a.doctor.name, a.doctor.nameAr)}
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ReferenceChip reference={a.reference} />
          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold ${statusStyle[a.status]}`}
          >
            <Pic src={statusIcon[a.status]} className="h-5 w-5" />
            {t(`status.${a.status}`)}
          </span>
        </div>
      </div>

      <Divider className="my-4" />

      <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-2">
        <span className="flex items-center gap-2">
          <Pic src={serviceIcon(a.service.name)} className="h-5 w-5 shrink-0" />
          {L(a.service.name, a.service.nameAr)}
        </span>
        <span className="flex items-center gap-2">
          <Pic src={specialtyIcon[a.doctor.specialty]} className="h-5 w-5 shrink-0" />
          {L(a.doctor.name, a.doctor.nameAr)}
        </span>
        <span className="flex items-center gap-2">
          <Pic src={img.clock} className="h-5 w-5 shrink-0" />
          {formatDate(a.startAt)} {t('common.at')} {formatTime(a.startAt)}
        </span>
        <span className="flex items-center gap-2">
          <Pic src={img.mapLocation} className="h-5 w-5 shrink-0" />
          {L(a.clinic.name, a.clinic.nameAr)}, {L(a.clinic.city, a.clinic.cityAr)}
        </span>
        <span className="flex items-center gap-2">
          <Pic src={img.cashNote} className="h-5 w-5 shrink-0" />
          <Money amount={a.service.price} />
        </span>
        {a.notes && (
          <span className="flex items-center gap-2">
            <Pic src={img.paymentMethod} className="h-5 w-5 shrink-0" />
            {noteLabel(a.notes)}
          </span>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-stone-200/70 bg-stone-50/80 p-4 dark:border-stone-800 dark:bg-stone-950/40">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          <Pic src={img.userInfo} className="h-5 w-5" />
          {t('detail.patientDetails')}
          {a.patient.isGuest && (
            <span className="rounded-md bg-stone-200 px-1.5 py-0.5 text-xs font-medium normal-case tracking-normal text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              {t('common.guest')}
            </span>
          )}
        </p>

        <div className="flex items-center gap-3">
          <Pic
            src={userAvatar('PATIENT', a.patient.gender)}
            fit="cover"
            className="h-11 w-11 shrink-0 rounded-full border border-stone-200 bg-white p-0.5 dark:border-stone-700 dark:bg-stone-800"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {L(a.patient.fullName, a.patient.fullNameAr)}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {a.patient.isGuest ? t('detail.guestBooking') : t('detail.registeredPatient')}
            </p>
          </div>
        </div>

        {(a.patient.email || a.patient.phone) && (
          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-stone-200/70 pt-3 text-sm dark:border-stone-800 sm:grid-cols-2">
            {a.patient.email && (
              <a
                href={`mailto:${a.patient.email}`}
                className="flex w-fit min-w-0 max-w-full items-center justify-self-start gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-stone-200/60 dark:hover:bg-stone-800/60"
              >
                <Pic src={img.email} className="h-5 w-5 shrink-0" />
                <span className="truncate">{a.patient.email}</span>
              </a>
            )}
            {a.patient.phone && (
              <a
                href={`tel:${a.patient.phone}`}
                className="flex w-fit min-w-0 max-w-full items-center justify-self-start gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-stone-200/60 dark:hover:bg-stone-800/60"
              >
                <Pic src={img.phoneCall} className="h-5 w-5 shrink-0" />
                <span dir="ltr" className="truncate">
                  {a.patient.phone}
                </span>
              </a>
            )}
          </div>
        )}

        {user?.role === 'DOCTOR' && (
          <p className="mt-3 flex items-center gap-2 border-t border-stone-200/70 pt-3 text-xs text-stone-400 dark:border-stone-800 dark:text-stone-500">
            <Pic src={img.information} className="h-4 w-4 shrink-0" />
            {t('detail.contactHidden')}
          </p>
        )}
      </div>

      <Prescriptions appointment={a} />
    </div>
  );
}
