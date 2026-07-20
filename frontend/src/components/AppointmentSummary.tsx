import { useState } from 'react';
import { formatDate, formatMoney, formatTime } from '../lib/format';
import { doctorAvatar, img, serviceIcon, specialtyIcon, statusIcon } from '../lib/images';
import { statusLabel, statusStyle } from '../lib/labels';
import { useToast } from '../lib/toast';
import Pic from './Pic';
import type { Appointment } from '../types';

export default function AppointmentSummary({ appointment: a }: { appointment: Appointment }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(a.reference);
      setCopied(true);
      toast.success(`Reference ${a.reference} copied to your clipboard.`);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Your browser blocked clipboard access.');
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Pic
            src={doctorAvatar(a.doctor.name)}
            fit="cover"
            className="h-9 w-9 shrink-0 rounded-full bg-teal-50 dark:bg-teal-500/10"
          />
          {a.doctor.name}
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={copyReference}
            title={copied ? 'Copied' : 'Copy reference'}
            aria-label={`Copy reference ${a.reference}`}
            className={`flex w-fit items-center gap-2 rounded-lg px-2.5 py-1 transition-colors ${
              copied
                ? 'bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400'
                : 'bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20'
            }`}
          >
            <Pic src={copied ? img.approved : img.copy} className="no-tilt h-5 w-5 shrink-0" />
            <span className="font-mono font-bold tracking-widest">
              {copied ? 'Copied' : a.reference}
            </span>
          </button>
          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold ${statusStyle[a.status]}`}
          >
            <Pic src={statusIcon[a.status]} className="h-5 w-5" />
            {statusLabel[a.status]}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2.5 border-t border-stone-100 pt-4 text-sm dark:border-stone-800 sm:grid-cols-2">
        <span className="flex items-center gap-2">
          <Pic src={serviceIcon(a.service.name)} className="h-5 w-5 shrink-0" />
          {a.service.name}
        </span>
        <span className="flex items-center gap-2">
          <Pic src={specialtyIcon[a.doctor.specialty]} className="h-5 w-5 shrink-0" />
          {a.doctor.name}
        </span>
        <span className="flex items-center gap-2">
          <Pic src={img.clock} className="h-5 w-5 shrink-0" />
          {formatDate(a.startAt)} at {formatTime(a.startAt)} UTC
        </span>
        <span className="flex items-center gap-2">
          <Pic src={img.mapLocation} className="h-5 w-5 shrink-0" />
          {a.clinic.name}, {a.clinic.city}
        </span>
        <span className="flex items-center gap-2">
          <Pic src={img.cashNote} className="h-5 w-5 shrink-0" />
          {formatMoney(a.service.price)}
        </span>
        {a.notes && (
          <span className="flex items-center gap-2">
            <Pic src={img.paymentMethod} className="h-5 w-5 shrink-0" />
            {a.notes}
          </span>
        )}
      </div>

      <div className="mt-4 border-t border-stone-100 pt-4 dark:border-stone-800">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          <Pic src={img.userInfo} className="h-6 w-6" />
          Patient details
        </p>
        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <Pic src={img.idCard} className="h-5 w-5 shrink-0" />
            {a.patient.fullName}
            {a.patient.isGuest && (
              <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                Guest
              </span>
            )}
          </span>
          {a.patient.email && (
            <span className="flex items-center gap-2">
              <Pic src={img.addUser} className="h-5 w-5 shrink-0" />
              {a.patient.email}
            </span>
          )}
          {a.patient.phone && (
            <span className="flex items-center gap-2">
              <Pic src={img.phoneCall} className="h-5 w-5 shrink-0" />
              {a.patient.phone}
            </span>
          )}
        </div>
      </div>

      {a.prescriptions.length > 0 && (
        <div className="mt-4 space-y-1.5 rounded-xl bg-teal-50/60 p-3 dark:bg-teal-500/5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
            <Pic src={img.pills} className="h-5 w-5" />
            Prescribed medication
          </p>
          {a.prescriptions.map((p) => (
            <p key={p.id} className="flex items-start gap-2 text-sm">
              <Pic src={img.medicine} className="mt-0.5 h-5 w-5" />
              <span>
                <span className="font-medium">{p.medication}</span> — {p.dosage}, {p.frequency}
                {p.instructions ? `. ${p.instructions}` : ''}
                <span className="ml-1 text-xs text-stone-400 dark:text-stone-500">
                  ({p.prescribedBy})
                </span>
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
