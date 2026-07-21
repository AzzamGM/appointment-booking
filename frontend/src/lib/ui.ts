export const pageTitle = 'font-display text-2xl font-bold tracking-tight sm:text-3xl';

export const card =
  'rounded-2xl border border-stone-200/80 bg-white/78 shadow-xs backdrop-blur transition-all hover:border-teal-300/70 dark:border-stone-800 dark:bg-stone-900/90 dark:hover:border-teal-700/50';

export const input =
  'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 transition-colors placeholder:text-stone-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-teal-400 dark:focus:ring-teal-400/25';

export const select = `${input} select-arrow`;

export const inputWithIcon = input.replace('px-3.5', 'ps-10 pe-3.5');

export const label = 'mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400';

export const btnPrimary =
  'rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 transition-all hover:-translate-y-0.5 hover:from-teal-400 hover:to-emerald-500 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:shadow-teal-500/15';

export const btnPrimaryFlat =
  'rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 transition-all hover:from-teal-400 hover:to-emerald-500 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:shadow-teal-500/15';

export const btnAccent =
  'rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-600/25 transition-all hover:-translate-y-0.5 hover:bg-accent-600 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:text-stone-950 dark:shadow-accent-500/15';

export const btnGhost =
  'rounded-xl border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800';

export const btnDanger =
  'rounded-xl border border-rose-200 px-3.5 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40';

export const errorText = 'text-sm text-rose-600 dark:text-rose-400';

export const invalidBorder = 'border-rose-400! dark:border-rose-500!';

export const fieldError = 'mt-1 block text-xs text-rose-600 dark:text-rose-400';

export const mutedText = 'text-sm text-stone-500 dark:text-stone-400';
