import i18n from './i18n';

function dateLocale(): string {
  return i18n.language === 'ar' ? 'ar' : 'en-US';
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTime(iso: string): string {
  const time = new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });
  if (i18n.language === 'ar') {
    return time.replace('AM', 'ص').replace('PM', 'م');
  }
  return time;
}

export function splitTime(iso: string): { clock: string; period: string } {
  const [clock, period = ''] = formatTime(iso).split(' ');
  return { clock, period };
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(dateLocale(), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

const TITLE = /^(dr|prof|mr|mrs|ms|د|أ|الدكتور|الدكتورة)\.?$/i;

export function firstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  return TITLE.test(parts[0]) ? `${parts[0]} ${parts[1]}` : parts[0];
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
}
