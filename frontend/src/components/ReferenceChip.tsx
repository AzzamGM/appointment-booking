import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../lib/toast';
import { img } from '../lib/images';
import Pic from './Pic';

export default function ReferenceChip({
  reference,
  size = 'md',
}: {
  reference: string;
  size?: 'sm' | 'md';
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      toast.success(`${t('common.copied')}: ${reference}`);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('errors.clipboard'));
    }
  };

  const small = size === 'sm';

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? t('common.copied') : t('common.copyReference')}
      aria-label={t('common.copyReference')}
      className={`flex w-fit shrink-0 items-center gap-1.5 rounded-lg transition-colors ${
        small ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1'
      } ${
        copied
          ? 'bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400'
          : 'bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20'
      }`}
    >
      <Pic
        src={copied ? img.approved : img.copy}
        className={`no-tilt shrink-0 ${small ? 'h-4 w-4' : 'h-5 w-5'}`}
      />
      <span className="font-mono font-bold tracking-widest">
        {copied ? t('common.copied') : reference}
      </span>
    </button>
  );
}
