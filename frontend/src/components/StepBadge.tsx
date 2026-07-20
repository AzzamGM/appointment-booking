export default function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white dark:bg-teal-500 dark:text-slate-950">
      {n}
    </span>
  );
}
