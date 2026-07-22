import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function BackButton({
  to = '/',
  className = 'mb-4',
}: {
  to?: string | number;
  className?: string;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <button
      onClick={() => (typeof to === 'number' ? navigate(to) : navigate(to, { replace: false }))}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-base font-medium text-teal-700 transition-colors hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-500/10 ${className}`}
    >
      <svg
        className="rtl:rotate-180"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      {t('common.back')}
    </button>
  );
}
