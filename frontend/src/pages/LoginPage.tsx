import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import { useToast } from '../lib/toast';
import { btnPrimary, card, input, label } from '../lib/ui';

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
      toast.success('Logged in successfully.');
      navigate('/');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm pt-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
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
              className="absolute inset-y-0 right-2 my-auto h-6 rounded px-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>
        <button type="submit" disabled={busy} className={`w-full ${btnPrimary}`}>
          {busy ? 'Logging in...' : 'Log in'}
        </button>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          New patient?{' '}
          <Link
            to="/signup"
            className="font-medium text-teal-700 underline underline-offset-2 hover:no-underline dark:text-teal-400"
          >
            Sign up
          </Link>
        </p>
        <div className="rounded-lg bg-slate-50 p-3 text-center text-xs leading-relaxed text-slate-400 dark:bg-slate-950 dark:text-slate-500">
          Seeded logins (password123):
          <br />
          patient@medibook.test · staff@medibook.test · doctor@medibook.test
        </div>
      </form>
    </div>
  );
}
