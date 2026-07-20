import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import { useToast } from '../lib/toast';
import { img, saveAvatarChoice, type AvatarChoice } from '../lib/images';
import Pic from '../components/Pic';
import { btnPrimary, card, input, label } from '../lib/ui';

const AVATARS: Array<{ value: AvatarChoice; src: string }> = [
  { value: 'female', src: img.femaleUser },
  { value: 'male', src: img.maleUser },
];

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState<AvatarChoice | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signup(email, password, fullName);
      if (avatar) saveAvatarChoice(email, avatar);
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
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-2 my-auto flex h-9 w-9 items-center justify-center rounded transition-opacity hover:opacity-70"
            >
              <Pic src={showPassword ? img.hide : img.unhide} className="h-6 w-6" />
            </button>
          </div>
        </label>
        <div>
          <span className={label}>Pick an avatar (optional)</span>
          <div className="flex gap-2">
            {AVATARS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setAvatar((v) => (v === a.value ? null : a.value))}
                aria-pressed={avatar === a.value}
                className={`rounded-xl border p-2 transition-all active:scale-95 ${
                  avatar === a.value
                    ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/25 dark:border-teal-500 dark:bg-teal-500/10'
                    : 'border-slate-200 bg-slate-50 hover:border-teal-300 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-teal-700'
                }`}
              >
                <Pic src={a.src} className="h-12 w-12" />
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className={`flex w-full items-center justify-center gap-2 ${btnPrimary}`}
        >
          {busy && <Pic src={img.hourglass} className="hourglass h-5 w-5" />}
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
