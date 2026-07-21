import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { statusStyle } from '../lib/labels';
import { splitTime } from '../lib/format';
import { statusIcon } from '../lib/images';
import { card } from '../lib/ui';
import Pic from './Pic';
import Divider from './Divider';
import ReferenceChip from './ReferenceChip';
import type { Appointment } from '../types';

function TimeDivider({ appointment: a }: { appointment: Appointment }) {
  const start = splitTime(a.startAt);

  return (
    <Divider>
      <span dir="ltr" className="flex items-baseline gap-1 whitespace-nowrap">
        <span className="font-mono text-sm font-bold leading-none tabular-nums">{start.clock}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
          {start.period}
        </span>
      </span>
    </Divider>
  );
}

function StatusBadge({ appointment: a, className }: { appointment: Appointment; className: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={`items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${statusStyle[a.status]} ${className}`}
    >
      <Pic src={statusIcon[a.status]} className="h-4.5 w-4.5" />
      {t(`statusShort.${a.status}`)}
    </span>
  );
}

function CardMenu({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0 sm:hidden">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('appointments.actions')}
        title={t('appointments.actions')}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-10 w-14 items-center justify-center rounded-2xl border transition-colors ${
          open
            ? 'border-stone-200/80 bg-white text-teal-700 shadow-sm dark:border-stone-700 dark:bg-stone-900 dark:text-teal-300'
            : 'border-stone-200 text-stone-500 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800'
        }`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        >
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className="drop absolute end-0 top-full z-30 mt-1.5 flex w-56 flex-col gap-2 rounded-2xl border border-stone-200/80 bg-white/95 p-2 shadow-xl ring-1 ring-stone-900/5 backdrop-blur dark:border-stone-700 dark:bg-stone-900/95 dark:ring-black/40"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MetaItem({
  icon,
  children,
  title,
  muted = true,
}: {
  icon: string;
  children: ReactNode;
  title?: string;
  muted?: boolean;
}) {
  return (
    <span
      title={title}
      className={`flex min-w-0 items-center gap-1.5 ${
        muted ? 'text-stone-500 dark:text-stone-400' : 'font-medium'
      }`}
    >
      <Pic src={icon} className="h-4.5 w-4.5 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}

export default function AppointmentCard({
  appointment: a,
  index = 0,
  elevated = false,
  avatar,
  name,
  nameTitle,
  subtitle,
  headerBadges,
  actions,
  meta,
  footer,
  children,
}: {
  appointment: Appointment;
  index?: number;
  elevated?: boolean;
  avatar: string;
  name: string;
  nameTitle?: string;
  subtitle?: ReactNode;
  headerBadges?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const faded = a.status === 'CANCELLED' || a.status === 'NO_SHOW';

  return (
    <div
      className={`${card} rise relative p-3 sm:p-4 ${elevated ? 'z-20' : ''} ${faded ? 'opacity-70' : ''}`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="flex min-w-0 flex-col">
          <div className="flex items-start gap-2">
            <Pic
              src={avatar}
              className="h-10 w-10 shrink-0 rounded-full border border-stone-200 bg-white p-0.5 dark:border-stone-700 dark:bg-stone-800"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p
                  className="min-w-0 truncate font-semibold leading-tight"
                  title={nameTitle ?? name}
                >
                  {name}
                </p>
                <StatusBadge appointment={a} className="inline-flex shrink-0" />
              </div>
              {subtitle && (
                <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
                  {subtitle}
                </p>
              )}
            </div>
            {headerBadges}
            {actions}
            {footer && <CardMenu>{footer}</CardMenu>}
          </div>

          <TimeDivider appointment={a} />

          <div className="flex flex-col gap-1.5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
            <ReferenceChip reference={a.reference} size="sm" />
            {meta}
          </div>

          {children}

          {footer && (
            <div className="hidden sm:block">
              <Divider />
              <div className="flex flex-wrap gap-2">{footer}</div>
            </div>
          )}
      </div>
    </div>
  );
}
