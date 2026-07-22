import { useTranslation } from 'react-i18next';
import { isolate } from '../lib/format';
import { img, statusIcon } from '../lib/images';
import { statusStyle } from '../lib/labels';
import { input } from '../lib/ui';
import type { AppointmentFiltersState, TimeFilter } from '../lib/appointments';
import type { AppointmentStatus } from '../types';
import Pic from './Pic';
import Select from './Select';

const TIMES: TimeFilter[] = ['upcoming', 'past', 'all'];

export default function AppointmentFilters({
  state,
  total,
}: {
  state: AppointmentFiltersState;
  total: number;
}) {
  const { t } = useTranslation();
  const { search, setSearch, status, setStatus, time, setTime, statuses, results, active, reset } =
    state;

  return (
    <div className="mb-4 space-y-2.5">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Pic
            src={img.search}
            className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 opacity-60"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('filters.searchPlaceholder')}
            aria-label={t('filters.search')}
            className={input.replace('px-3.5', 'ps-10 pe-3.5')}
          />
        </div>

        <div className="sm:w-60">
          <Select
            value={status}
            onChange={(v) => setStatus(v as AppointmentStatus | 'ALL')}
            options={[
              { value: 'ALL', label: t('filters.allStatuses'), icon: img.filter },
              ...statuses.map((s) => ({
                value: s,
                label: t(`status.${s}`),
                icon: statusIcon[s],
              })),
            ]}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-stone-300 dark:border-stone-700">
          {TIMES.map((value) => (
            <button
              key={value}
              onClick={() => setTime(value)}
              aria-pressed={time === value}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                time === value
                  ? 'bg-teal-600 text-white'
                  : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
              }`}
            >
              {t(`filters.${value}`)}
            </button>
          ))}
        </div>

        {status !== 'ALL' && (
          <span
            className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${statusStyle[status]}`}
          >
            <Pic src={statusIcon[status]} className="h-4 w-4" />
            {t(`statusShort.${status}`)}
          </span>
        )}

        <span className="text-xs text-stone-500 dark:text-stone-400">
          {t('filters.showing', {
            count: isolate(results.length),
            total: isolate(total),
          })}
        </span>

        {active && (
          <button
            onClick={reset}
            className="text-xs font-medium text-teal-700 underline underline-offset-2 hover:no-underline dark:text-teal-400"
          >
            {t('filters.clear')}
          </button>
        )}
      </div>
    </div>
  );
}
