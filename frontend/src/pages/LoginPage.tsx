import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { errorMessage } from '../lib/api';
import { useToast } from '../lib/toast';
import { img } from '../lib/images';
import Pic from '../components/Pic';
import Splash from '../components/Splash';
import { btnPrimary, card, fieldError, inputWithIcon, invalidBorder, label } from '../lib/ui';

const SEEDED_LOGINS = [
  { email: 'patient@medibook.test', role: 'Patient' },
  { email: 'staff@medibook.test', role: 'Staff' },
  { email: 'doctor@medibook.test', role: 'Doctor' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const [email, setEmail] = useState('patient@medibook.test');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);

  const errors = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) ? '' : t('login.errEmail'),
    password: password ? '' : t('login.errPassword'),
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
      const account = await login(email, password);
      setRedirecting(true);
      const home = account.role === 'STAFF' ? 'staff' : '';
      window.location.assign(`${import.meta.env.BASE_URL}${home}`);
    } catch (err) {
      toast.error(errorMessage(err, t('login.failed')));
      setBusy(false);
    }
  };

  if (redirecting) return <Splash label={t('login.signingIn')} />;

  return (
    <div className="mx-auto max-w-sm pt-6">
      <h1 className="mb-1 flex items-center gap-2.5 text-2xl font-bold tracking-tight">
        {t('login.title')}
      </h1>
      <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
        {t('login.subtitle')}
      </p>
      <form onSubmit={onSubmit} noValidate className={`${card} rise space-y-4 p-5`}>
        <label className="block">
          <span className={label}>{t('login.email')}</span>
          <div dir="ltr" className="relative">
            <Pic
              src={img.user}
              className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 opacity-60"
            />
            <input
              className={`${inputWithIcon} ${err('email') ? invalidBorder : ''}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          {err('email') && <span className={fieldError}>{err('email')}</span>}
        </label>
        <label className="block">
          <span className={label}>{t('login.password')}</span>
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
              autoComplete="current-password"
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
        <button
          type="submit"
          disabled={busy}
          className={`flex w-full items-center justify-center gap-2 ${btnPrimary}`}
        >
          {busy && <Pic src={img.hourglass} className="hourglass h-5 w-5" />}
          {busy ? t('login.loggingIn') : t('common.logIn')}
        </button>
        <p className="text-center text-sm text-stone-500 dark:text-stone-400">
          {t('login.newPatient')}{' '}
          <Link
            to="/signup"
            className="font-medium text-teal-700 underline underline-offset-2 hover:no-underline dark:text-teal-400"
          >
            {t('common.signUp')}
          </Link>
        </p>
        <div className="rounded-lg bg-stone-50 p-3 text-xs text-stone-400 dark:bg-stone-950 dark:text-stone-500">
          <p className="mb-1.5 text-center text-stone-300">{t('login.testUsers')}</p>
          <ul className="flex flex-col gap-1">
            {SEEDED_LOGINS.map((s) => (
              <li key={s.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(s.email);
                    setPassword('password123');
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded px-1.5 py-1 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  <span className="font-mono">{s.email}</span>
                  <span className="shrink-0 uppercase tracking-wide">{s.role}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </form>
    </div>
  );
}
