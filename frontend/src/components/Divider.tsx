import type { ReactNode } from 'react';

const RULE = 'h-px flex-1 bg-stone-100 dark:bg-stone-800';

export default function Divider({
  children,
  align = 'center',
  className = 'my-3',
}: {
  children?: ReactNode;
  align?: 'center' | 'start';
  className?: string;
}) {
  if (!children) return <div className={`${RULE} ${className}`} />;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {align === 'center' && <span className={RULE} />}
      <span className="flex shrink-0 items-center gap-1.5">{children}</span>
      <span className={RULE} />
    </div>
  );
}
