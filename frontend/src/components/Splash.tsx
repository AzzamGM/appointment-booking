export default function Splash({
  label = 'Loading',
  leaving = false,
}: {
  label?: string;
  leaving?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`fixed inset-0 z-100 flex flex-col items-center justify-center gap-5 bg-stone-50 dark:bg-stone-950 ${
        leaving ? 'splash-leaving' : ''
      }`}
    >
      <div className="splash-mark flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
        <svg
          width="38"
          height="38"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path className="ekg-trace" d="M2 12h4l3-8 4 16 3-8h6" />
        </svg>
      </div>

      <span className="font-display bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent dark:from-teal-300 dark:to-emerald-400">
        MediBook
      </span>

      <div className="flex gap-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="bounce-dot h-2.5 w-2.5 rounded-full bg-teal-500 dark:bg-teal-400"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
