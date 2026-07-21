import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Pic from './Pic';

export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  dropUp?: boolean;
  invalid?: boolean;
}

export default function Select({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  dropUp = false,
  invalid = false,
}: SelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocPointer);
    document.addEventListener('touchstart', onDocPointer);
    return () => {
      document.removeEventListener('mousedown', onDocPointer);
      document.removeEventListener('touchstart', onDocPointer);
    };
  }, [open]);

  useEffect(() => {
    if (open && highlight >= 0) {
      listRef.current?.children[highlight]?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, highlight]);

  const openMenu = () => {
    setHighlight(options.findIndex((o) => o.value === value));
    setOpen(true);
  };

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(options.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (highlight >= 0) choose(options[highlight].value);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-start text-sm text-stone-900 transition-colors focus:outline-none focus:ring-2 dark:bg-stone-950 dark:text-stone-100 ${
          invalid
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/25 dark:border-rose-500'
            : 'border-stone-300 focus:border-teal-500 focus:ring-teal-500/25 dark:border-stone-700 dark:focus:border-teal-400 dark:focus:ring-teal-400/25'
        }`}
      >
        <span
          className={`flex min-w-0 items-center gap-2 ${
            selected ? '' : 'text-stone-400 dark:text-stone-500'
          }`}
        >
          {selected?.icon && <Pic src={selected.icon} className="h-5 w-5 shrink-0" />}
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
        <svg
          className={`shrink-0 text-stone-400 transition-transform duration-200 dark:text-stone-500 ${open ? 'rotate-180' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className={`drop absolute z-50 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900 ${
            dropUp ? 'bottom-full mb-2 sm:bottom-auto sm:mb-0 sm:mt-2' : 'mt-2'
          }`}
        >
          <div ref={listRef} role="listbox" className="max-h-64 overflow-y-auto p-1.5">
            {options.map((o, i) => {
              const isSelected = o.value === value;
              return (
                <button
                  key={o.value || '(empty)'}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => choose(o.value)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm transition-colors ${
                    i === highlight ? 'bg-stone-100 dark:bg-stone-800' : ''
                  } ${
                    isSelected
                      ? 'font-medium text-teal-700 dark:text-teal-300'
                      : 'text-stone-700 dark:text-stone-200'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {o.icon && <Pic src={o.icon} className="h-5 w-5 shrink-0" />}
                    <span className="truncate">{o.label}</span>
                  </span>
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              );
            })}
            {options.length === 0 && (
              <p className="px-3 py-2 text-sm text-stone-400 dark:text-stone-500">{t('appointments.noOptions')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
