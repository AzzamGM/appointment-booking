import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { useActiveAppointmentCount } from '../lib/notifications';
import { firstName } from '../lib/format';
import { img, userAvatar } from '../lib/images';
import Pic from '../components/Pic';
import { btnAccent, btnGhost, card, mutedText } from '../lib/ui';
import type { Role } from '../types';

interface Destination {
  to: string;
  icon: string;
  titleKey: string;
  bodyKey: string;
  badge?: number;
}

const GUEST_LINKS: Destination[] = [
  { to: '/book', icon: img.addCalendar, titleKey: 'home.bookTitle', bodyKey: 'home.bookBody' },
  { to: '/doctors', icon: img.search, titleKey: 'home.findTitle', bodyKey: 'home.findBody' },
  { to: '/login', icon: img.login, titleKey: 'home.logInTitle', bodyKey: 'home.logInBody' },
  { to: '/signup', icon: img.addUser, titleKey: 'home.signUpTitle', bodyKey: 'home.signUpBody' },
];

function linksFor(role: Role | undefined, activeCount: number): Destination[] {
  if (!role) return GUEST_LINKS;

  const account: Destination = {
    to: '/account',
    icon: img.accountSettings,
    titleKey: 'home.accountTitle',
    bodyKey: 'home.accountBody',
  };
  const find: Destination = {
    to: '/doctors',
    icon: img.search,
    titleKey: 'home.findTitle',
    bodyKey: 'home.findBody',
  };

  if (role === 'DOCTOR') {
    return [
      {
        to: '/schedule',
        icon: img.checkUp,
        titleKey: 'home.scheduleTitle',
        bodyKey: 'home.scheduleBody',
        badge: activeCount,
      },
      find,
      account,
    ];
  }

  if (role === 'STAFF') {
    return [
      {
        to: '/staff',
        icon: img.customerServiceAgent,
        titleKey: 'home.frontDeskTitle',
        bodyKey: 'home.frontDeskBody',
        badge: activeCount,
      },
      { to: '/book', icon: img.new, titleKey: 'home.newBookingTitle', bodyKey: 'home.newBookingBody' },
      find,
      account,
    ];
  }

  return [
    { to: '/book', icon: img.addCalendar, titleKey: 'home.bookTitle', bodyKey: 'home.bookBody' },
    {
      to: '/appointments',
      icon: img.calendar,
      titleKey: 'home.myAppointmentsTitle',
      bodyKey: 'home.myAppointmentsBody',
      badge: activeCount,
    },
    find,
    account,
  ];
}

function primaryFor(role: Role | undefined) {
  if (role === 'DOCTOR') return { to: '/schedule', icon: img.checkUp, key: 'home.ctaSchedule' };
  if (role === 'STAFF') return { to: '/staff', icon: img.customerServiceAgent, key: 'home.ctaFrontDesk' };
  return { to: '/book', icon: img.addCalendar, key: 'home.ctaBook' };
}

const FEATURES = [
  { icon: img.calendar, titleKey: 'home.f1Title', bodyKey: 'home.f1Body' },
  { icon: img.mobileNotification, titleKey: 'home.f2Title', bodyKey: 'home.f2Body' },
  { icon: img.medicine, titleKey: 'home.f3Title', bodyKey: 'home.f3Body' },
];

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const activeCount = useActiveAppointmentCount();

  const links = linksFor(user?.role, activeCount);
  const primary = primaryFor(user?.role);

  return (
    <div className="space-y-8">
      <section className="rise relative overflow-hidden rounded-3xl border border-teal-200/60 bg-gradient-to-br from-teal-50 via-white to-emerald-50/60 p-6 shadow-xs sm:p-8 dark:border-teal-900/50 dark:from-teal-500/10 dark:via-stone-900 dark:to-emerald-500/5">
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="order-2 min-w-0 flex-1 sm:order-1">
            {user ? (
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/70 py-1 pe-3 ps-1 text-xs font-medium text-stone-600 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-300">
                <Pic
                  src={userAvatar(user.role, user.gender)}
                  fit="cover"
                  className="h-6 w-6 rounded-full bg-stone-100 dark:bg-stone-800"
                />
                {t(`home.role.${user.role}`)}
              </span>
            ) : (
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-teal-100/70 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-teal-800 dark:bg-teal-500/15 dark:text-teal-300">
                {t('home.tagline')}
              </span>
            )}

            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {user
                ? t('home.welcomeBack', { name: firstName(user.fullName) })
                : t('home.heroTitle')}
            </h1>
            <p className={`mt-2 max-w-prose ${mutedText}`}>
              {user ? t(`home.intro.${user.role}`) : t('home.heroBody')}
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                to={primary.to}
                className={`flex items-center justify-center gap-2 ${btnAccent}`}
              >
                <Pic src={primary.icon} className="h-5 w-5" />
                {t(primary.key)}
              </Link>
              {!user && (
                <Link to="/login" className={`flex items-center justify-center gap-2 ${btnGhost}`}>
                  <Pic src={img.login} className="no-tilt h-5 w-5" />
                  {t('common.logIn')}
                </Link>
              )}
            </div>
          </div>

          <Pic
            src={img.doctorAppointment}
            alt=""
            className="order-first mx-auto h-40 w-40 shrink-0 sm:order-0 sm:h-48 sm:w-48"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">{t('home.whereTo')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {links.map((link, i) => (
            <Link
              key={link.to + link.titleKey}
              to={link.to}
              style={{ animationDelay: `${i * 50}ms` }}
              className={`${card} rise group flex items-start gap-3 p-4 transition-all hover:-translate-y-0.5`}
            >
              <Pic src={link.icon} className="h-10 w-10 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-semibold">
                  {t(link.titleKey)}
                  {!!link.badge && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1.5 text-xs font-bold tabular-nums text-white dark:bg-teal-500 dark:text-stone-950">
                      {link.badge}
                    </span>
                  )}
                </span>
                <span className={`mt-0.5 block ${mutedText}`}>{t(link.bodyKey)}</span>
              </span>
              <svg
                className="mt-1 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 dark:text-stone-600"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      {!user && (
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">{t('home.whyTitle')}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.titleKey} className={`${card} p-4`}>
                <Pic src={f.icon} className="h-9 w-9" />
                <p className="mt-2 font-semibold">{t(f.titleKey)}</p>
                <p className={`mt-0.5 ${mutedText}`}>{t(f.bodyKey)}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
