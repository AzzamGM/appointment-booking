import { useEffect, useState } from 'react';
import { img } from '../lib/images';
import Pic from './Pic';

export default function Loading({
  text = 'Loading...',
  inline = false,
  delay = 250,
}: {
  text?: string;
  inline?: boolean;
  delay?: number;
}) {
  const [show, setShow] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const timer = window.setTimeout(() => setShow(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);

  if (!show) return null;

  if (inline) {
    return (
      <div
        className="fade-in flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
        role="status"
      >
        <Pic src={img.hourglass} className="hourglass h-5 w-5" />
        {text}
      </div>
    );
  }

  return (
    <div
      className="fade-in flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
      role="status"
    >
      <Pic src={img.hourglass} className="hourglass h-10 w-10" />
      {text}
    </div>
  );
}
