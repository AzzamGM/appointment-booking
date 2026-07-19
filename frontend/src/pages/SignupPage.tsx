import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import { useToast } from '../lib/toast';
import { btnPrimary, card, input, label } from '../lib/ui';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signup(email, password, fullName);
      toast.success('Account created. Welcome to MediBook.');
      navigate('/');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Signup failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm pt-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Sign up as a new patient to start booking.
      </p>
      <form onSubmit={onSubmit} className={`${card} rise space-y-4 p-5`}>
        <label className="block">
          <span className={label}>Full name</span>
          <input
            className={input}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
          />
        </label>
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
          <span className={label}>Password (min 8 chars)</span>
          <div className="relative">
            <input
              className={`${input} pr-16`}
              type={showPassword ? 'text' : 'password'}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
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
          {busy ? 'Creating account...' : 'Sign up'}
        </button>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Already registered?{' '}
          <Link
            to="/login"
            className="font-medium text-teal-700 underline underline-offset-2 hover:no-underline dark:text-teal-400"
          >
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
