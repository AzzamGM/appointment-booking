import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { errorMessage } from '../lib/api';
import { useToast } from '../lib/toast';
import { saveGender, img, type Gender } from '../lib/images';
import { toAsciiDigits } from '../lib/format';
import { DIAL_CODE } from '../components/GuestDetails';
import Pic from '../components/Pic';
import Select from '../components/Select';
import { btnPrimary, card, fieldError, input, inputWithIcon, invalidBorder, label } from '../lib/ui';

const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: 'female', label: 'female' },
  { value: 'male', label: 'male' },
];

interface SignupPrefill {
  fullName?: string;
  email?: string;
  phone?: string;
}

export default function SignupPage() {
  const { signup } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const prefill = (location.state as SignupPrefill | null) ?? null;
  const [fullName, setFullName] = useState(prefill?.fullName ?? '');
  const [email, setEmail] = useState(prefill?.email ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState(prefill?.phone ?? '');
  const [gender, setGender] = useState<Gender | null>(null);
  const [busy, setBusy] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);

  const errors = {
    fullName: fullName.trim().length < 2 ? t('signup.errName') : '',
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) ? '' : t('signup.errEmail'),
    phone: phone && phone.length !== 9 ? t('signup.errPhone') : '',
    password: password.length < 8 ? t('signup.errPassword') : '',
    gender: gender ? '' : t('signup.errGender'),
  };
  const isValid = !Object.values(errors).some(Boolean);
  const err = (key: keyof typeof errors) => (triedSubmit ? errors[key] : '');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setTriedSubmit(true);
      return;
    }
    setBusy(true);
    try {
      await signup(email, password, fullName, phone ? `${DIAL_CODE}${phone}` : undefined);
      saveGender(email, gender!);
      toast.success(t('signup.created'));
      navigate('/');
    } catch (err) {
      toast.error(errorMessage(err, t('signup.failed')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm pt-6">
      <h1 className="mb-1 flex items-center gap-2.5 text-2xl font-bold tracking-tight">
        <Pic src={img.addUser} className="h-9 w-9" />
        {t('signup.title')}
      </h1>
      <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
        {t('signup.subtitle')}
      </p>
      <form onSubmit={onSubmit} noValidate className={`${card} rise space-y-4 p-5`}>
        <label className="block">
          <span className={label}>{t('signup.fullName')}</span>
          <input
            className={`${input} ${err('fullName') ? invalidBorder : ''}`}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            placeholder="Sara Al-Harbi"
          />
          {err('fullName') && <span className={fieldError}>{err('fullName')}</span>}
        </label>
        <label className="block">
          <span className={label}>{t('signup.email')}</span>
          <input
            dir="ltr"
            className={`${input} ${err('email') ? invalidBorder : ''}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="name@example.com"
          />
          {err('email') && <span className={fieldError}>{err('email')}</span>}
        </label>
        <label className="block">
          <span className={label}>{t('signup.mobileOptional')}</span>
          <div dir="ltr" className="flex">
            <span className="flex shrink-0 items-center rounded-s-xl border border-e-0 border-stone-200 bg-stone-100 px-3 font-mono text-base font-medium tracking-wide text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
              {DIAL_CODE}
            </span>
            <input
              className={`${input} rounded-s-none font-mono text-base tracking-widest tabular-nums ${
                err('phone') ? invalidBorder : ''
              }`}
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(toAsciiDigits(e.target.value).replace(/\D/g, '').slice(0, 9))}
              autoComplete="tel-national"
              placeholder="55 123 4567"
            />
          </div>
          {err('phone') && <span className={fieldError}>{err('phone')}</span>}
        </label>
        <label className="block">
          <span className={label}>{t('signup.password')}</span>
          <div dir="ltr" className="relative">
            <Pic
              src={img.password}
              className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 opacity-60"
            />
            <input
              className={`${inputWithIcon} pe-16 ${err('password') ? invalidBorder : ''}`}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder={t('signup.passwordPlaceholder')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')}
              title={showPassword ? t('common.hidePassword') : t('common.showPassword')}
              className="absolute inset-y-0 end-2 my-auto flex h-9 w-9 items-center justify-center rounded transition-opacity hover:opacity-70"
            >
              <Pic src={showPassword ? img.hide : img.unhide} className="no-tilt h-6 w-6" />
            </button>
          </div>
          {err('password') && <span className={fieldError}>{err('password')}</span>}
        </label>
        <div>
          <span className={label}>{t('signup.gender')}</span>
          <Select
            value={gender ?? ''}
            onChange={(v) => setGender(v ? (v as Gender) : null)}
            invalid={!!err('gender')}
            placeholder={t('signup.selectGender')}
            options={GENDER_OPTIONS.map((g) => ({ value: g.value, label: t(`signup.${g.label}`) }))}
          />
          {err('gender') && <span className={fieldError}>{err('gender')}</span>}
        </div>
        <button
          type="submit"
          disabled={busy}
          className={`flex w-full items-center justify-center gap-2 ${btnPrimary}`}
        >
          {busy && <Pic src={img.hourglass} className="hourglass h-5 w-5" />}
          {busy ? t('signup.creating') : t('common.signUp')}
        </button>
        <p className="text-center text-sm text-stone-500 dark:text-stone-400">
          {t('signup.alreadyRegistered')}{' '}
          <Link
            to="/login"
            className="font-medium text-teal-700 underline underline-offset-2 hover:no-underline dark:text-teal-400"
          >
            {t('common.logIn')}
          </Link>
        </p>
      </form>
    </div>
  );
}
