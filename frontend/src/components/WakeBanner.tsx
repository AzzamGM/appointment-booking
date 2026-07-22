import { useTranslation } from 'react-i18next';
import { isolate } from '../lib/format';
import { useWaking } from '../lib/wake';

export default function WakeBanner() {
  const { t } = useTranslation();
  const { waking, remaining, progress } = useWaking();

  if (!waking) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fade-in fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3 sm:inset-0 sm:items-center sm:bg-stone-950/20 sm:pt-0 sm:backdrop-blur-[2px]"
    >
      <div className="drop h-fit w-full max-w-md overflow-hidden rounded-2xl border border-stone-200/80 bg-white/95 shadow-xl backdrop-blur sm:max-w-sm dark:border-stone-700 dark:bg-stone-900/95">
        <div className="flex items-center gap-3 p-3.5">
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              {t('wake.title')}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {remaining > 0 ? t('wake.countdown', { seconds: isolate(remaining) }) : t('wake.almost')}
            </p>
          </div>
        </div>
        <div className="h-1 bg-stone-200 dark:bg-stone-800">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-[width] duration-300 ease-linear"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
