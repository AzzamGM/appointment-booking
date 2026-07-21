import { formatDate } from '../lib/format';
import { img } from '../lib/images';
import Pic from './Pic';

export default function DayHeading({ date, label }: { date: string; label: string }) {
  return (
    <h2 className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-stone-700 dark:text-stone-300">
      <Pic src={img.calendar} className="h-5 w-5 shrink-0" />
      {formatDate(`${date}T00:00:00.000Z`)}
      <span className="text-xs font-normal text-stone-400 dark:text-stone-500">{label}</span>
    </h2>
  );
}
