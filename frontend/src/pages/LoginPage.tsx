import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import { useToast } from '../lib/toast';
import { img } from '../lib/images';
import Pic from '../components/Pic';
import { btnPrimary, card, input, label } from '../lib/ui';

const SEEDED_LOGINS = [
  { email: 'patient@medibook.test', role: 'Patient' },
  { email: 'staff@medibook.test', role: 'Staff' },
  { email: 'doctor@medibook.test', role: 'Doctor' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('patient@medibook.test');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      window.location.assign('/');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm pt-6">
      <h1 className="mb-1 flex items-center gap-2.5 text-2xl font-bold tracking-tight">
        <Pic src={img.user} className="h-9 w-9" />
        Welcome back
      </h1>
      <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
        Log in to book and manage your visits.
      </p>
      <form onSubmit={onSubmit} className={`${card} rise space-y-4 p-5`}>
        <label className="block">
          <span className={label}>Email</span>
          <input
            className={input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="block">
          <span className={label}>Password</span>
          <div className="relative">
            <input
              className={`${input} pr-16`}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-2 my-auto flex h-9 w-9 items-center justify-center rounded transition-opacity hover:opacity-70"
            >
              <Pic src={showPassword ? img.hide : img.unhide} className="no-tilt h-6 w-6" />
            </button>
          </div>
        </label>
        <button
          type="submit"
          disabled={busy}
          className={`flex w-full items-center justify-center gap-2 ${btnPrimary}`}
        >
          {busy && <Pic src={img.hourglass} className="hourglass h-5 w-5" />}
          {busy ? 'Logging in...' : 'Log in'}
        </button>
        <p className="text-center text-sm text-stone-500 dark:text-stone-400">
          New patient?{' '}
          <Link
            to="/signup"
            className="font-medium text-teal-700 underline underline-offset-2 hover:no-underline dark:text-teal-400"
          >
            Sign up
          </Link>
        </p>
        <div className="rounded-lg bg-stone-50 p-3 text-xs text-stone-400 dark:bg-stone-950 dark:text-stone-500">
          <p className="mb-1.5 text-center">Seeded logins (password123):</p>
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
