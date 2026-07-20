import { useState } from 'react';
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
  if (expiry.length !== 4) return 'Enter an expiry as MM/YY';
  const month = Number(expiry.slice(0, 2));
  if (month < 1 || month > 12) return 'Month must be between 01 and 12';

  const now = new Date();
  const currentYY = now.getFullYear() % 100;
  const year = Number(expiry.slice(2));
  if (year < currentYY || (year === currentYY && month < now.getMonth() + 1)) {
    return 'That expiry date has passed';
  }
  return null;
}

export function cardErrors(card: CardFields): Partial<Record<keyof CardFields, string>> {
  const errors: Partial<Record<keyof CardFields, string>> = {};
  if (!card.name.trim()) errors.name = 'Enter the name on the card';
  if (card.number.length !== 16) errors.number = 'Card number must be 16 digits';
  const expiry = expiryError(card.expiry);
  if (expiry) errors.expiry = expiry;
  if (card.cvc.length !== 3) errors.cvc = 'CVC must be 3 digits';
  return errors;
}

export function isCardValid(card: CardFields): boolean {
  return Object.keys(cardErrors(card)).length === 0;
}

interface CardDetailsProps {
  value: CardFields;
  onChange: (card: CardFields) => void;
}

export default function CardDetails({ value, onChange }: CardDetailsProps) {
  const [touched, setTouched] = useState<Partial<Record<keyof CardFields, boolean>>>({});
  const errors = cardErrors(value);

  const set = (key: keyof CardFields, raw: string) => onChange({ ...value, [key]: raw });
  const touch = (key: keyof CardFields) => setTouched((t) => ({ ...t, [key]: true }));

  const fieldError = (key: keyof CardFields) => (touched[key] ? errors[key] : undefined);

  const errorText = (key: keyof CardFields) => {
    const message = fieldError(key);
    return message ? (
      <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{message}</span>
    ) : null;
  };

  const ring = (key: keyof CardFields) =>
    fieldError(key) ? 'border-rose-400 dark:border-rose-500' : '';

  return (
    <div className="space-y-3">
      <label className="block">
        <span className={label}>Name on card</span>
        <input
          className={`${input} ${ring('name')}`}
          value={value.name}
          onChange={(e) => set('name', e.target.value)}
          onBlur={() => touch('name')}
          autoComplete="off"
          placeholder="A. Patient"
        />
        {errorText('name')}
      </label>

      <label className="block">
        <span className={label}>Card number</span>
        <input
          className={`${input} font-mono ${ring('number')}`}
          inputMode="numeric"
          value={groupCardNumber(value.number)}
          onChange={(e) => set('number', digitsOnly(e.target.value).slice(0, 16))}
          onBlur={() => touch('number')}
          autoComplete="off"
          placeholder="4242 4242 4242 4242"
        />
        {errorText('number')}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={label}>Expiry</span>
          <input
            className={`${input} font-mono ${ring('expiry')}`}
            inputMode="numeric"
            value={formatExpiry(value.expiry)}
            onChange={(e) => set('expiry', digitsOnly(e.target.value).slice(0, 4))}
            onBlur={() => touch('expiry')}
            autoComplete="off"
            placeholder="MM/YY"
          />
          {errorText('expiry')}
        </label>
        <label className="block">
          <span className={label}>CVC</span>
          <input
            className={`${input} font-mono ${ring('cvc')}`}
            inputMode="numeric"
            value={value.cvc}
            onChange={(e) => set('cvc', digitsOnly(e.target.value).slice(0, 3))}
            onBlur={() => touch('cvc')}
            autoComplete="off"
            placeholder="123"
          />
          {errorText('cvc')}
        </label>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-slate-400 dark:text-slate-500">
        <Pic src={img.information} className="mt-px h-4.5 w-4.5" />
        Demo only. No card is charged and nothing you type here is sent or stored.
      </p>
    </div>
  );
}
