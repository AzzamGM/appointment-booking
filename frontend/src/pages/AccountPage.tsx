import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { img } from '../lib/images';
import Pic from '../components/Pic';
import Divider from '../components/Divider';
import {
  btnDanger,
  btnGhost,
  btnPrimary,
  card,
  fieldError,
  input,
  inputWithIcon,
  invalidBorder,
  label,
  mutedText,
  pageTitle,
} from '../lib/ui';
import type { PublicUser } from '../types';

export default function AccountPage() {
  const { user, setUserData, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, string> = {};
      if (fullName.trim() !== user?.fullName) body.fullName = fullName.trim();
      if ((phone || '') !== (user?.phone ?? '')) body.phone = phone.trim();
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      return api<PublicUser>('/users/me', { method: 'PATCH', body });
    },
    onSuccess: (updated) => {
      setUserData(updated);
      setCurrentPassword('');
      setNewPassword('');
      toast.success(t('account.updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('account.updateFailed'))),
  });

  const remove = useMutation({
    mutationFn: () => api<void>('/users/me', { method: 'DELETE' }),
    onSuccess: () => {
      logout();
      toast.success(t('account.deleted'));
      window.location.assign(import.meta.env.BASE_URL);
    },
    onError: (err) => toast.error(errorMessage(err, t('account.deleteFailed'))),
  });

  if (!user) {
    return (
      <p className={mutedText}>
        {t('account.please')}{' '}
        <Link to="/login" className="font-medium text-teal-700 underline dark:text-teal-400">
          {t('common.logIn')}
        </Link>{' '}
        {t('account.loginPrompt')}
      </p>
    );
  }

  const dirty =
    fullName.trim() !== user.fullName ||
    (phone || '') !== (user.phone ?? '') ||
    newPassword.length > 0;

  const errors = {
    fullName: fullName.trim().length < 2 ? t('account.errName') : '',
    phone: phone.trim() && !/^\+?[\d\s-]{9,20}$/.test(phone.trim()) ? t('account.errPhone') : '',
    currentPassword:
      newPassword.length > 0 && currentPassword.length === 0
        ? t('account.errCurrentPassword')
        : '',
    newPassword:
      newPassword.length > 0 && newPassword.length < 8
        ? t('account.errNewPassword')
        : '',
  };
  const isValid = !Object.values(errors).some(Boolean);
  const err = (key: keyof typeof errors) => (triedSubmit ? errors[key] : '');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setTriedSubmit(true);
      return;
    }
    if (!dirty) return;
    save.mutate();
  };

  return (
    <div className="mx-auto max-w-lg">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-base font-medium text-teal-700 transition-colors hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-500/10"
      >
        <svg
          className="rtl:rotate-180"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        {t('common.back')}
      </button>
      <h1 className={pageTitle}>{t('account.title')}</h1>
      <p className={`mt-1 ${mutedText}`}>{t('account.subtitle')}</p>

      <form onSubmit={onSubmit} className={`${card} rise mt-5 space-y-4 p-5`}>
        <label className="block">
          <span className={label}>{t('account.fullName')}</span>
          <div className="relative">
            <Pic
              src={img.user}
              className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 opacity-60"
            />
            <input
              className={`${inputWithIcon} ${err('fullName') ? invalidBorder : ''}`}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>
          {err('fullName') && <span className={fieldError}>{err('fullName')}</span>}
        </label>

        <div>
          <span className={label}>{t('account.email')}</span>
          <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-500 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-400">
            <Pic src={img.email} className="h-5 w-5 shrink-0 opacity-60" />
            {user.email}
          </div>
          <span className="mt-1 block text-xs text-stone-400 dark:text-stone-500">
            {t('account.emailFixed')}
          </span>
        </div>

        <label className="block">
          <span className={label}>{t('account.phone')}</span>
          <div className="relative">
            <Pic
              src={img.phoneCall}
              className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 opacity-60"
            />
            <input
              className={`${inputWithIcon} ${err('phone') ? invalidBorder : ''}`}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder="+966 55 123 4567"
            />
          </div>
          {err('phone') && <span className={fieldError}>{err('phone')}</span>}
        </label>

        <div>
          <Divider align="start" className="mb-3 mt-1">
            <span className="flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
              <Pic src={img.password} className="h-5 w-5" />
              {t('account.changePassword')}
            </span>
          </Divider>
          <div className="space-y-3">
            <label className="block">
              <span className={label}>{t('account.currentPassword')}</span>
              <div className="relative">
                <input
                  className={`${input} pe-16 ${err('currentPassword') ? invalidBorder : ''}`}
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder={t('account.currentPasswordHint')}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  aria-label={showCurrent ? t('common.hidePassword') : t('common.showPassword')}
                  className="absolute inset-y-0 end-2 my-auto flex h-9 w-9 items-center justify-center rounded transition-opacity hover:opacity-70"
                >
                  <Pic src={showCurrent ? img.hide : img.unhide} className="no-tilt h-6 w-6" />
                </button>
              </div>
              {err('currentPassword') && (
                <span className={fieldError}>{err('currentPassword')}</span>
              )}
            </label>
            <label className="block">
              <span className={label}>{t('account.newPassword')}</span>
              <div className="relative">
                <input
                  className={`${input} pe-16 ${err('newPassword') ? invalidBorder : ''}`}
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder={t('account.newPasswordHint')}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? t('common.hidePassword') : t('common.showPassword')}
                  className="absolute inset-y-0 end-2 my-auto flex h-9 w-9 items-center justify-center rounded transition-opacity hover:opacity-70"
                >
                  <Pic src={showNew ? img.hide : img.unhide} className="no-tilt h-6 w-6" />
                </button>
              </div>
              {err('newPassword') && <span className={fieldError}>{err('newPassword')}</span>}
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={!dirty || save.isPending}
          className={`flex w-full items-center justify-center gap-2 ${btnPrimary}`}
        >
          {save.isPending && <Pic src={img.hourglass} className="hourglass h-5 w-5" />}
          {save.isPending ? t('common.saving') : t('common.save')}
        </button>
      </form>

      {user.role === 'PATIENT' && (
      <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/50 p-5 dark:border-rose-900/60 dark:bg-rose-950/20">
        <p className="flex items-center gap-2 font-semibold text-rose-900 dark:text-rose-200">
          <Pic src={img.danger} className="h-5 w-5" />
          {t('account.deleteTitle')}
        </p>
        <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
          {t('account.deleteWarning')}
        </p>
        {confirmingDelete ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              className={`flex items-center justify-center gap-2 ${btnDanger}`}
            >
              {remove.isPending && <Pic src={img.hourglass} className="hourglass h-5 w-5" />}
              {remove.isPending ? t('account.deleting') : t('account.deleteConfirm')}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              disabled={remove.isPending}
              className={btnGhost}
            >
              {t('common.cancel')}
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmingDelete(true)} className={`mt-4 ${btnDanger}`}>
            {t('account.deleteButton')}
          </button>
        )}
      </div>
      )}
    </div>
  );
}
