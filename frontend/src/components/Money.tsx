import { formatMoney } from '../lib/format';

export default function Money({ amount, className }: { amount: number; className?: string }) {
  return (
    <span dir="ltr" className={`inline-flex items-center gap-1 [unicode-bidi:isolate] ${className ?? ''}`}>
      <span className="icon-saudi_riyal translate-y-px text-[0.9em] leading-none" aria-hidden="true" />
      <span className="tabular-nums">{formatMoney(amount)}</span>
    </span>
  );
}
