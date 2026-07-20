import { img } from '../lib/images';
import Pic from './Pic';

/** Flipping-hourglass loading line, shown alongside (or instead of) skeletons. */
export default function Loading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400" role="status">
      <Pic src={img.hourglass} className="hourglass h-5 w-5" />
      {text}
    </div>
  );
}
