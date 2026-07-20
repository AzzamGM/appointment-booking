import { useState } from 'react';
import { img } from '../lib/images';
import Pic from './Pic';
import { input, label } from '../lib/ui';

export interface GuestFields {
  fullName: string;
  email: string;
  phone: string;
}

export const DIAL_CODE = '+966';
const NATIONAL_DIGITS = 9;

export const DUMMY_GUEST: GuestFields = {
  fullName: 'Sara Al-Harbi',
  email: 'sara.alharbi@example.com',
  phone: '551234567',
};

export const fullPhone = (guest: GuestFields) => `${DIAL_CODE}${guest.phone}`;

const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, '');
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 9)}`;
};

export function guestErrors(guest: GuestFields): Partial<Record<keyof GuestFields, string>> {
  const errors: Partial<Record<keyof GuestFields, string>> = {};

  if (!guest.fullName.trim()) {
    errors.fullName = 'Enter the name for the appointment';
  } else if (guest.fullName.trim().length < 2) {
    errors.fullName = 'That name looks too short';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(guest.email.trim())) {
    errors.email = 'Enter a valid email address, like name@example.com';
  }

  const digits = guest.phone.replace(/\D/g, '');
  if (!digits) {
    errors.phone = 'Enter your mobile number';
  } else if (digits.length !== NATIONAL_DIGITS) {
    errors.phone = `Enter the ${NATIONAL_DIGITS} digits after ${DIAL_CODE}`;
  } else if (!digits.startsWith('5')) {
    errors.phone = 'A Saudi mobile number starts with 5';
  }

  return errors;
}

export function isGuestValid(guest: GuestFields): boolean {
  return Object.keys(guestErrors(guest)).length === 0;
}

interface GuestDetailsProps {
  value: GuestFields;
  onChange: (guest: GuestFields) => void;
}

export default function GuestDetails({ value, onChange }: GuestDetailsProps) {
  const [touched, setTouched] = useState<Partial<Record<keyof GuestFields, boolean>>>({});
  const errors = guestErrors(value);

  const set = (key: keyof GuestFields, raw: string) => onChange({ ...value, [key]: raw });
  const touch = (key: keyof GuestFields) => setTouched((t) => ({ ...t, [key]: true }));

  const fieldError = (key: keyof GuestFields) => (touched[key] ? errors[key] : undefined);

  const errorText = (key: keyof GuestFields) => {
    const message = fieldError(key);
    return message ? (
      <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{message}</span>
    ) : null;
  };

  const ring = (key: keyof GuestFields) =>
    fieldError(key) ? 'border-rose-400 dark:border-rose-500' : '';

  return (
    <div className="space-y-3">
      <label className="block">
        <span className={label}>Full name</span>
        <input
          className={`${input} ${ring('fullName')}`}
          value={value.fullName}
          onChange={(e) => set('fullName', e.target.value)}
          onBlur={() => touch('fullName')}
          autoComplete="name"
          placeholder="Sara Al-Harbi"
        />
        {errorText('fullName')}
      </label>

      <label className="block">
        <span className={label}>Email</span>
        <input
          className={`${input} ${ring('email')}`}
          type="email"
          value={value.email}
          onChange={(e) => set('email', e.target.value)}
          onBlur={() => touch('email')}
          autoComplete="email"
          placeholder="name@example.com"
        />
        {errorText('email')}
      </label>

      <label className="block">
        <span className={label}>Mobile number</span>
        <div className="flex">
          <span className="flex shrink-0 items-center rounded-l-xl border border-r-0 border-stone-200 bg-stone-100 px-3 font-mono text-base font-medium tracking-wide text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
            {DIAL_CODE}
          </span>
          <input
            className={`${input} rounded-l-none font-mono text-base tracking-widest tabular-nums ${ring('phone')}`}
            type="tel"
            inputMode="numeric"
            value={formatPhone(value.phone)}
            onChange={(e) =>
              set('phone', e.target.value.replace(/\D/g, '').slice(0, NATIONAL_DIGITS))
            }
            onBlur={() => touch('phone')}
            autoComplete="tel-national"
            placeholder="55 123 4567"
          />
        </div>
        {errorText('phone')}
      </label>

      <p className="flex items-start gap-1.5 text-xs text-stone-400 dark:text-stone-500">
        <Pic src={img.information} className="mt-px h-4.5 w-4.5" />
        We use these to confirm your visit and to reach you if anything changes.
      </p>
    </div>
  );
}
