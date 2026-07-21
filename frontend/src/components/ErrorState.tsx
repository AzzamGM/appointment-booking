import { useTranslation } from 'react-i18next';
import { ApiError, errorMessage } from '../lib/api';
import { img } from '../lib/images';
import Pic from './Pic';
import { btnGhost } from '../lib/ui';

function errorIcon(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return img.errorNotFound;
    if (error.status === 0 || error.status >= 500) return img.errorNetwork;
  }
  return img.errorGeneral;
}

interface ErrorStateProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  retrying?: boolean;
  compact?: boolean;
}

export default function ErrorState({
  error,
  title,
  onRetry,
  retrying = false,
  compact = false,
}: ErrorStateProps) {
  const { t } = useTranslation();
  const message = errorMessage(error);
  const heading = title ?? t('common.somethingWrong');

  if (compact) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2.5 rounded-xl border-l-4 border-rose-500 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800 dark:border-rose-500 dark:bg-rose-950/40 dark:text-rose-200"
      >
        <Pic src={errorIcon(error)} className="mt-px h-5 w-5 shrink-0" />
        <span className="flex-1">{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={retrying}
            className="shrink-0 font-medium text-rose-700 underline underline-offset-2 hover:no-underline disabled:opacity-50 dark:text-rose-300"
          >
            {retrying ? t('common.retrying') : t('common.retry')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-8 text-center dark:border-rose-900/60 dark:bg-rose-950/30"
    >
      <Pic src={errorIcon(error)} className="h-20 w-20" />
      <div>
        <p className="font-semibold text-rose-900 dark:text-rose-200">{heading}</p>
        <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={retrying}
          className={`flex items-center gap-2 ${btnGhost}`}
        >
          {retrying && <Pic src={img.hourglass} className="hourglass h-5 w-5" />}
          {retrying ? t('common.retrying') : t('common.retry')}
        </button>
      )}
    </div>
  );
}
