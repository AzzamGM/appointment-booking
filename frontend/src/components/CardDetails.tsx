import { useTranslation } from 'react-i18next';
import i18n from '../lib/i18n';
import { img } from '../lib/images';
import Pic from './Pic';
import { input, label } from '../lib/ui';

export interface CardFields {
  name: string;
  number: string;
  expiry: string;
  cvc: string;
}

export const DUMMY_CARD: CardFields = {
  name: 'A. Patient',
  number: '4242424242424242',
  expiry: '1234',
  cvc: '123',
};

const digitsOnly = (s: string) => s.replace(/\D/g, '');

const groupCardNumber = (digits: string) => digits.replace(/(.{4})/g, '$1 ').trim();

const formatExpiry = (digits: string) =>
  digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;

function expiryError(expiry: string): string | null {
  if (expiry.length !== 4) return i18n.t('card.errExpiry');
  const month = Number(expiry.slice(0, 2));
  if (month < 1 || month > 12) return i18n.t('card.errMonth');

  const now = new Date();
  const currentYY = now.getFullYear() % 100;
  const year = Number(expiry.slice(2));
  if (year < currentYY || (year === currentYY && month < now.getMonth() + 1)) {
    return i18n.t('card.errExpired');
  }
  return null;
}

export function cardErrors(card: CardFields): Partial<Record<keyof CardFields, string>> {
  const errors: Partial<Record<keyof CardFields, string>> = {};
  if (!card.name.trim()) errors.name = i18n.t('card.errName');
  if (card.number.length !== 16) errors.number = i18n.t('card.errNumber');
  const expiry = expiryError(card.expiry);
  if (expiry) errors.expiry = expiry;
  if (card.cvc.length !== 3) errors.cvc = i18n.t('card.errCvc');
  return errors;
}

export function isCardValid(card: CardFields): boolean {
  return Object.keys(cardErrors(card)).length === 0;
}

interface CardDetailsProps {
  value: CardFields;
  onChange: (card: CardFields) => void;
  showErrors?: boolean;
}

export default function CardDetails({ value, onChange, showErrors = false }: CardDetailsProps) {
  const { t } = useTranslation();
  const errors = cardErrors(value);

  const set = (key: keyof CardFields, raw: string) => onChange({ ...value, [key]: raw });

  const fieldError = (key: keyof CardFields) => (showErrors ? errors[key] : undefined);

  const errorText = (key: keyof CardFields) => {
    const message = fieldError(key);
    return message ? (
      <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{message}</span>
    ) : null;
  };

  const ring = (key: keyof CardFields) =>
    fieldError(key) ? 'border-rose-400! dark:border-rose-500!' : '';

  return (
    <div className="space-y-3">
      <label className="block">
        <span className={label}>{t('card.nameOnCard')}</span>
        <input
          className={`${input} ${ring('name')}`}
          value={value.name}
          onChange={(e) => set('name', e.target.value)}
          autoComplete="off"
          placeholder="A. Patient"
        />
        {errorText('name')}
      </label>

      <label className="block">
        <span className={label}>{t('card.cardNumber')}</span>
        <input
          className={`${input} font-mono ${ring('number')}`}
          inputMode="numeric"
          value={groupCardNumber(value.number)}
          onChange={(e) => set('number', digitsOnly(e.target.value).slice(0, 16))}
          autoComplete="off"
          placeholder="4242 4242 4242 4242"
        />
        {errorText('number')}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={label}>{t('card.expiry')}</span>
          <input
            className={`${input} font-mono ${ring('expiry')}`}
            inputMode="numeric"
            value={formatExpiry(value.expiry)}
            onChange={(e) => set('expiry', digitsOnly(e.target.value).slice(0, 4))}
            autoComplete="off"
            placeholder="MM/YY"
          />
          {errorText('expiry')}
        </label>
        <label className="block">
          <span className={label}>{t('card.cvc')}</span>
          <input
            className={`${input} font-mono ${ring('cvc')}`}
            inputMode="numeric"
            value={value.cvc}
            onChange={(e) => set('cvc', digitsOnly(e.target.value).slice(0, 3))}
            autoComplete="off"
            placeholder="123"
          />
          {errorText('cvc')}
        </label>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-stone-400 dark:text-stone-500">
        <Pic src={img.information} className="mt-px h-4.5 w-4.5" />
        {t('card.demoNote')}
      </p>
    </div>
  );
}
