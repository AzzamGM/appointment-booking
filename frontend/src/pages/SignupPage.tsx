import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import { useToast } from '../lib/toast';
import { saveGender, img, type Gender } from '../lib/images';
import { DIAL_CODE } from '../components/GuestDetails';
import Pic from '../components/Pic';
import Select from '../components/Select';
import { btnPrimary, card, input, label } from '../lib/ui';

const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
];

interface SignupPrefill {
  fullName?: string;
  email?: string;
  phone?: string;
}

export default function SignupPage() {
  const { signup } = useAuth();
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

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!gender) {
      toast.error('Please select your gender.');
      return;
    }
    setBusy(true);
    try {
      await signup(email, password, fullName, phone ? `${DIAL_CODE}${phone}` : undefined);
      saveGender(email, gender);
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
      <h1 className="mb-1 flex items-center gap-2.5 text-2xl font-bold tracking-tight">
        <Pic src={img.addUser} className="h-9 w-9" />
        Create your account
      </h1>
      <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
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
            placeholder="Sara Al-Harbi"
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
            placeholder="name@example.com"
            required
          />
        </label>
        <label className="block">
          <span className={label}>Mobile number (optional)</span>
          <div className="flex">
            <span className="flex shrink-0 items-center rounded-l-xl border border-r-0 border-stone-200 bg-stone-100 px-3 font-mono text-base font-medium tracking-wide text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
              {DIAL_CODE}
            </span>
            <input
              className={`${input} rounded-l-none font-mono text-base tracking-widest tabular-nums`}
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
              autoComplete="tel-national"
              placeholder="55 123 4567"
            />
          </div>
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
              placeholder="At least 8 characters"
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
        <div>
          <span className={label}>Gender</span>
          <Select
            value={gender ?? ''}
            onChange={(v) => setGender(v ? (v as Gender) : null)}
            placeholder="Select gender"
            options={GENDER_OPTIONS}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className={`flex w-full items-center justify-center gap-2 ${btnPrimary}`}
        >
          {busy && <Pic src={img.hourglass} className="hourglass h-5 w-5" />}
          {busy ? 'Creating account...' : 'Sign up'}
        </button>
        <p className="text-center text-sm text-stone-500 dark:text-stone-400">
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
