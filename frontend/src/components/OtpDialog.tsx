import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { img } from '../lib/images';
import Pic from './Pic';
import { btnGhost, card } from '../lib/ui';

const LENGTH = 4;
const RESEND_SECONDS = 30;

interface OtpDialogProps {
  phone: string | null;
  busy?: boolean;
  onVerified: () => void;
  onCancel: () => void;
}

export default function OtpDialog({ phone, busy = false, onVerified, onCancel }: OtpDialogProps) {
  const { t } = useTranslation();
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  const complete = digits.every(Boolean);
  const verify = useRef(onVerified);
  verify.current = onVerified;

  useEffect(() => {
    boxes.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (!complete) return;
    const timer = window.setTimeout(() => verify.current(), 250);
    return () => window.clearTimeout(timer);
  }, [complete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  useEffect(() => {
    if (seconds === 0) return;
    const timer = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  const write = (index: number, raw: string) => {
    const typed = raw.replace(/\D/g, '');
    if (!typed) return;

    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < typed.length && index + i < LENGTH; i += 1) {
        next[index + i] = typed[i];
      }
      return next;
    });
    boxes.current[Math.min(index + typed.length, LENGTH - 1)]?.focus();
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      setDigits((prev) => {
        const next = [...prev];
        if (next[index]) next[index] = '';
        else if (index > 0) next[index - 1] = '';
        return next;
      });
      if (!digits[index] && index > 0) boxes.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) boxes.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < LENGTH - 1) boxes.current[index + 1]?.focus();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('otp.title')}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="fade-in absolute inset-0 bg-stone-950/50 backdrop-blur-sm"
        onClick={() => !busy && onCancel()}
      />

      <div className={`${card} drop relative w-full max-w-sm p-6 text-center`}>
        <Pic src={img.otp} className="mx-auto h-14 w-14" />
        <h2 className="mt-3 font-display text-lg font-bold">{t('otp.title')}</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {phone ? (
            <>
              {t('otp.sentTo', { count: LENGTH })}{' '}
              <span className="font-mono font-semibold text-stone-700 dark:text-stone-200">
                {phone}
              </span>
            </>
          ) : (
            t('otp.sentToAccount', { count: LENGTH })
          )}
        </p>

        <div className="mt-5 flex justify-center gap-2.5">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                boxes.current[i] = el;
              }}
              value={digit}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={LENGTH}
              disabled={busy}
              onChange={(e) => write(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
              className={`h-14 w-12 rounded-xl border text-center font-mono text-xl font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/25 disabled:opacity-50 ${
                digit
                  ? 'border-teal-500 bg-teal-50 text-teal-700 dark:border-teal-500 dark:bg-teal-500/10 dark:text-teal-300'
                  : 'border-stone-300 bg-white text-stone-900 focus:border-teal-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100'
              }`}
            />
          ))}
        </div>

        <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">
          {seconds > 0 ? (
            t('otp.resendIn', { seconds })
          ) : (
            <button
              onClick={() => setSeconds(RESEND_SECONDS)}
              className="font-medium text-teal-700 underline underline-offset-2 hover:no-underline dark:text-teal-400"
            >
              {t('otp.resend')}
            </button>
          )}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {busy ? (
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-teal-700 dark:text-teal-300">
              <Pic src={img.hourglass} className="hourglass h-5 w-5" />
              {t('otp.verifying')}
            </p>
          ) : (
            <button onClick={onCancel} className={btnGhost}>
              {t('common.cancel')}
            </button>
          )}
        </div>

        <p className="mt-4 flex items-start gap-1.5 text-start text-xs text-stone-400 dark:text-stone-500">
          <Pic src={img.information} className="mt-px h-4.5 w-4.5 shrink-0" />
          {t('otp.demoNote', { count: LENGTH })}
        </p>
      </div>
    </div>
  );
}
