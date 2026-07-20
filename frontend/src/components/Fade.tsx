import { useEffect, useRef, useState, type ReactNode } from 'react';

const EXIT_MS = 200;

export default function Fade({
  show,
  children,
  className = '',
}: {
  show: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [exiting, setExiting] = useState(false);
  const wasShown = useRef(show);

  if (wasShown.current !== show) {
    wasShown.current = show;
    if (!show) setExiting(true);
    else if (exiting) setExiting(false);
  }

  useEffect(() => {
    if (!exiting) return;
    const timer = window.setTimeout(() => setExiting(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [exiting]);

  if (!show && !exiting) return null;

  return <div className={`${show ? 'fade-in' : 'fade-out'} ${className}`}>{children}</div>;
}
