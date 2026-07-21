import { useTranslation } from 'react-i18next';
import i18n from '../lib/i18n';
import { img } from '../lib/images';
import { toAsciiDigits } from '../lib/format';
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

export function guestErrors(
  guest: GuestFields,
  requireEmail = true,
): Partial<Record<keyof GuestFields, string>> {
  const errors: Partial<Record<keyof GuestFields, string>> = {};

  if (!guest.fullName.trim()) {
    errors.fullName = i18n.t('guest.errName');
  } else if (guest.fullName.trim().length < 2) {
    errors.fullName = i18n.t('guest.errNameShort');
  }

  if (requireEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(guest.email.trim())) {
    errors.email = i18n.t('guest.errEmail');
  }

  const digits = guest.phone.replace(/\D/g, '');
  if (!digits) {
    errors.phone = i18n.t('guest.errPhoneEmpty');
  } else if (digits.length !== NATIONAL_DIGITS) {
    errors.phone = i18n.t('guest.errPhoneDigits', { count: NATIONAL_DIGITS, code: DIAL_CODE });
  } else if (!digits.startsWith('5')) {
    errors.phone = i18n.t('guest.errPhoneStart');
  }

  return errors;
}

export function isGuestValid(guest: GuestFields, requireEmail = true): boolean {
  return Object.keys(guestErrors(guest, requireEmail)).length === 0;
}

interface GuestDetailsProps {
  value: GuestFields;
  onChange: (guest: GuestFields) => void;
  showErrors?: boolean;
  withEmail?: boolean;
}

export default function GuestDetails({
  value,
  onChange,
  showErrors = false,
  withEmail = true,
}: GuestDetailsProps) {
  const { t } = useTranslation();
  const errors = guestErrors(value, withEmail);

  const set = (key: keyof GuestFields, raw: string) => onChange({ ...value, [key]: raw });

  const fieldError = (key: keyof GuestFields) => (showErrors ? errors[key] : undefined);

  const errorText = (key: keyof GuestFields) => {
    const message = fieldError(key);
    return message ? (
      <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{message}</span>
    ) : null;
  };

  const ring = (key: keyof GuestFields) =>
    fieldError(key) ? 'border-rose-400! dark:border-rose-500!' : '';

  return (
    <div className="space-y-3">
      <label className="block">
        <span className={label}>{t('guest.fullName')}</span>
        <input
          className={`${input} ${ring('fullName')}`}
          value={value.fullName}
          onChange={(e) => set('fullName', e.target.value)}
          autoComplete="name"
          placeholder="Sara Al-Harbi"
        />
        {errorText('fullName')}
      </label>

      {withEmail && (
        <label className="block">
          <span className={label}>{t('guest.email')}</span>
          <input
            dir="ltr"
            className={`${input} ${ring('email')}`}
            type="email"
            value={value.email}
            onChange={(e) => set('email', e.target.value)}
            autoComplete="email"
            placeholder="name@example.com"
          />
          {errorText('email')}
        </label>
      )}

      <label className="block">
        <span className={label}>{t('guest.mobile')}</span>
        <div dir="ltr" className="flex">
          <span className="flex shrink-0 items-center rounded-s-xl border border-e-0 border-stone-200 bg-stone-100 px-3 font-mono text-base font-medium tracking-wide text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
            {DIAL_CODE}
          </span>
          <input
            className={`${input} rounded-s-none font-mono text-base tracking-widest tabular-nums ${ring('phone')}`}
            type="tel"
            inputMode="numeric"
            value={formatPhone(value.phone)}
            onChange={(e) =>
              set('phone', toAsciiDigits(e.target.value).replace(/\D/g, '').slice(0, NATIONAL_DIGITS))
            }
            autoComplete="tel-national"
            placeholder="55 123 4567"
          />
        </div>
        {errorText('phone')}
      </label>

      <p className="flex items-start gap-1.5 text-xs text-stone-400 dark:text-stone-500">
        <Pic src={img.information} className="mt-px h-4.5 w-4.5" />
        {t('guest.privacyNote')}
      </p>
    </div>
  );
}
