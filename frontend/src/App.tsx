import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from './lib/api';
import { useAuth } from './lib/auth';
import { useTheme } from './lib/theme';
import { useTranslation } from 'react-i18next';
import { LANG_SWITCH_MS, useLang, useLocalize, type Lang } from './lib/i18n';
import { useSettings } from './lib/settings';
import { isolate } from './lib/format';
import { img, userAvatar } from './lib/images';
import { useActiveAppointmentCount, useBookingNotifications } from './lib/notifications';
import { usePageTracking } from './lib/analytics';
import Pic from './components/Pic';
import Switch from './components/Switch';
import Splash from './components/Splash';
import Notifications from './components/Notifications';
import Drawer from './components/Drawer';
import WakeBanner from './components/WakeBanner';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import DoctorSchedulePage from './pages/DoctorSchedulePage';
import DoctorsPage from './pages/DoctorsPage';
import BookDoctorPage from './pages/BookDoctorPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import AppointmentDetailPage from './pages/AppointmentDetailPage';
import StaffPage from './pages/StaffPage';
import AccountPage from './pages/AccountPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

const SPLASH_MIN_MS = 1000;
const SPLASH_MAX_MS = 6000;
const SPLASH_FADE_MS = 450;

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const preloadImage = (src: string) =>
  new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = image.onerror = () => resolve();
    image.src = src;
  });

function SettingsPanel({
  onChangeLang,
  onClose,
  onNavigate,
}: {
  onChangeLang: (next: Lang) => void;
  onClose: () => void;
  onNavigate: () => void;
}) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { notifications, setNotifications } = useSettings();
  const { t } = useTranslation();
  const { lang } = useLang();
  const L = useLocalize();

  const row = 'flex items-center gap-2.5 rounded-lg px-2.5 py-2';
  const setOpen = (_: boolean) => onClose();

  return (
    <>
          {user && (
            <div className="flex items-center gap-3 border-b border-stone-100 p-3 dark:border-stone-800">
              <Pic
                src={userAvatar(user.role, user.gender)}
                alt=""
                fit="cover"
                className="h-11 w-11 rounded-full bg-stone-100 ring-2 ring-stone-200 dark:bg-stone-800 dark:ring-stone-700"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {L(user.fullName, user.fullNameAr)}
                </p>
                <p className="truncate text-xs text-stone-500 dark:text-stone-400">{user.email}</p>
                <span className="mt-1 inline-block rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                  {user.role.toLowerCase()}
                </span>
              </div>
            </div>
          )}

          <div className="p-1.5">
            <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
              {t('common.settings')}
            </p>

            <div className={row}>
              <Pic src={theme === 'dark' ? img.moon : img.sun} className="h-6 w-6" />
              <span className="flex-1 text-sm">{t('common.darkMode')}</span>
              <Switch checked={theme === 'dark'} onChange={toggle} label={t('common.darkMode')} />
            </div>

            <div className={row}>
              <svg
                className="h-6 w-6 text-stone-500 dark:text-stone-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
              </svg>
              <span className="flex-1 text-sm">{t('common.language')}</span>
              <div className="flex overflow-hidden rounded-lg border border-stone-300 dark:border-stone-700">
                <button
                  onClick={() => onChangeLang('ar')}
                  aria-pressed={lang === 'ar'}
                  className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                    lang === 'ar'
                      ? 'bg-teal-600 text-white'
                      : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                  }`}
                >
                  العربية
                </button>
                <button
                  onClick={() => onChangeLang('en')}
                  aria-pressed={lang === 'en'}
                  className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                    lang === 'en'
                      ? 'bg-teal-600 text-white'
                      : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {user && (
              <div className={row}>
                <Pic
                  src={notifications ? img.notificationBell : img.disableBell}
                  className="h-6 w-6"
                />
                <span className="flex-1 text-sm">{t('common.notifications')}</span>
                <Switch
                  checked={notifications}
                  onChange={setNotifications}
                  label={t('common.notifications')}
                />
              </div>
            )}
          </div>

          {user && (
            <div className="border-t border-stone-100 p-1.5 dark:border-stone-800">
              <Link
                to="/account"
                onClick={() => {
                  setOpen(false);
                  onNavigate();
                }}
                className={`${row} text-sm text-stone-700 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800`}
              >
                <Pic src={img.accountSettings} className="h-6 w-6" />
                {t('common.accountSettings')}
              </Link>
              <button
                onClick={() => {
                  setOpen(false);
                  onNavigate();
                  logout();
                  window.location.assign(import.meta.env.BASE_URL);
                }}
                className={`${row} w-full text-start text-sm text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40`}
              >
                <Pic src={img.idCard} className="h-6 w-6" />
                {t('common.logOut')}
              </button>
            </div>
          )}
    </>
  );
}

function ProfileMenu({
  onNavigate,
  onChangeLang,
  compact = false,
  drawer = false,
}: {
  onNavigate: () => void;
  onChangeLang: (next: Lang) => void;
  compact?: boolean;
  drawer?: boolean;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const L = useLocalize();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || drawer) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, drawer]);

  const iconOnly = compact || !user;

  const trigger = (
    <button
      onClick={() => setOpen((v) => !v)}
      aria-haspopup={drawer ? 'dialog' : 'menu'}
      aria-expanded={open}
      title={user ? t('common.accountSettings') : t('common.settings')}
      aria-label={user ? t('common.accountSettings') : t('common.settings')}
      className={`group flex items-center rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 ${
        iconOnly ? 'h-9 w-9 justify-center' : 'w-full gap-2 px-1.5 py-1'
      }`}
    >
      {user ? (
        <>
          <Pic
            src={userAvatar(user.role, user.gender)}
            alt=""
            fit="cover"
            className="no-tilt h-6 w-6 rounded-full bg-stone-100 ring-1 ring-stone-200 transition-colors group-hover:ring-teal-400 dark:bg-stone-800 dark:ring-stone-700 dark:group-hover:ring-teal-400"
          />
          {!compact && (
            <>
              <span className="text-sm text-stone-600 transition-colors group-hover:text-stone-900 dark:text-stone-300 dark:group-hover:text-white">
                {L(user.fullName, user.fullNameAr)}
              </span>
              <Pic src={img.settings} className="h-6 w-6 opacity-70" />
            </>
          )}
        </>
      ) : (
        <Pic src={img.settings} className="h-6 w-6" />
      )}
    </button>
  );

  const panel = (
    <SettingsPanel
      onChangeLang={onChangeLang}
      onClose={() => setOpen(false)}
      onNavigate={onNavigate}
    />
  );

  if (drawer) {
    return (
      <>
        {trigger}
        <Drawer open={open} title={t('common.settings')} onClose={() => setOpen(false)}>
          {panel}
        </Drawer>
      </>
    );
  }

  return (
    <div ref={ref} className="relative">
      {trigger}
      {open && (
        <div
          role="menu"
          className="drop absolute end-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900"
        >
          {panel}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { lang, setLang } = useLang();
  const [switchingLang, setSwitchingLang] = useState(false);
  const [langLeaving, setLangLeaving] = useState(false);
  const langTimers = useRef<number[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [booting, setBooting] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const queryClient = useQueryClient();
  const notif = useBookingNotifications();
  const activeCount = useActiveAppointmentCount();
  usePageTracking();

  const requestLangChange = (next: Lang) => {
    if (next === lang || switchingLang) return;
    setSwitchingLang(true);
    setLangLeaving(false);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setLang(next);
        langTimers.current.push(
          window.setTimeout(() => setLangLeaving(true), LANG_SWITCH_MS),
          window.setTimeout(() => {
            setSwitchingLang(false);
            setLangLeaving(false);
          }, LANG_SWITCH_MS + SPLASH_FADE_MS),
        );
      }),
    );
  };

  useEffect(() => {
    const timers = langTimers.current;
    return () => timers.forEach(window.clearTimeout);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!booting) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [booting]);

  useEffect(() => {
    let cancelled = false;

    const floor = wait(SPLASH_MIN_MS);
    const fonts = document.fonts?.ready ?? Promise.resolve();
    const images = Promise.all(Object.values(img).map(preloadImage));
    const data = Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['clinics'],
        queryFn: () => api<unknown>('/clinics'),
      }),
      queryClient.prefetchQuery({
        queryKey: ['doctors'],
        queryFn: () => api<unknown>('/doctors'),
      }),
    ]);

    const ready = Promise.all([fonts, images, data]);

    Promise.all([floor, Promise.race([ready, wait(SPLASH_MAX_MS)])]).then(() => {
      if (cancelled) return;
      setLeaving(true);
      window.setTimeout(() => {
        if (!cancelled) setBooting(false);
      }, SPLASH_FADE_MS);
    });

    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300'
        : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100'
    }`;

  const closeMenu = () => setMenuOpen(false);

  const navBadge = activeCount > 0 && (
    <span
      title={t('nav.activeCount', { count: isolate(activeCount) })}
      className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white"
    >
      {activeCount}
    </span>
  );

  const navLinks = (
    <>
      {user?.role !== 'DOCTOR' && (
        <NavLink to="/book" className={navLink} onClick={closeMenu}>
          <Pic src={img.addCalendar} className="h-6 w-6" />
          {t('nav.book')}
        </NavLink>
      )}
      {user?.role === 'DOCTOR' && (
        <NavLink to="/schedule" className={navLink} onClick={closeMenu}>
          <Pic src={img.checkUp} className="h-6 w-6" />
          {t('nav.mySchedule')}
          {navBadge}
        </NavLink>
      )}
      {user?.role === 'PATIENT' && (
        <NavLink to="/appointments" className={navLink} onClick={closeMenu}>
          <Pic src={img.calendar} className="h-6 w-6" />
          {t('nav.myAppointments')}
          {navBadge}
        </NavLink>
      )}
      {user?.role === 'STAFF' && (
        <NavLink to="/staff" className={navLink} onClick={closeMenu}>
          <Pic src={img.customerServiceAgent} className="h-6 w-6" />
          {t('nav.frontDesk')}
          {navBadge}
        </NavLink>
      )}
      <NavLink to="/doctors" className={navLink} end onClick={closeMenu}>
        <Pic src={img.search} className="h-6 w-6" />
        {t('nav.findDoctor')}
      </NavLink>
      {!user && (
        <NavLink to="/login" className={navLink} onClick={closeMenu}>
          <Pic src={img.login} className="no-tilt h-6 w-6" />
          {t('common.logIn')}
        </NavLink>
      )}
    </>
  );

  const logo = (
    <Link to="/" className="group flex items-center gap-2" onClick={closeMenu}>
      <span className="hidden h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white transition-transform group-hover:scale-105 sm:flex">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
          <path className="ekg-trace" d="M2 12h4l3-8 4 16 3-8h6" />
        </svg>
      </span>
      <span className="font-display bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-lg font-bold tracking-tight text-transparent dark:from-teal-300 dark:to-emerald-400">
        MediBook
      </span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 antialiased transition-colors dark:bg-stone-950 dark:text-stone-100">
      {(booting || switchingLang) && (
        <Splash label={t('common.loading')} leaving={booting ? leaving : langLeaving} />
      )}
      <WakeBanner />
      <div className="aurora" aria-hidden="true" />
      <header
        ref={headerRef}
        className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/75 backdrop-blur dark:border-stone-800 dark:bg-stone-950/85"
      >
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="relative flex items-center justify-between gap-x-4 sm:justify-start">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? t('common.closeMenu') : t('common.openMenu')}
              aria-expanded={menuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-stone-100 sm:hidden dark:hover:bg-stone-800"
            >
              <Pic src={img.menu} alt="" className="no-tilt h-6 w-6" />
            </button>

            <div className="absolute left-1/2 -translate-x-1/2 sm:static sm:translate-x-0">
              {logo}
            </div>

            <div className="flex items-center gap-1.5 sm:hidden">
              <Notifications state={notif} drawer />
              <ProfileMenu onNavigate={closeMenu} onChangeLang={requestLangChange} compact drawer />
            </div>

            <nav className="ms-auto hidden items-center gap-1.5 sm:flex">
              {navLinks}
              <Notifications state={notif} />
              <div
                className={
                  user ? 'ml-1 border-l border-stone-200 pl-3 dark:border-stone-800' : undefined
                }
              >
                <ProfileMenu onNavigate={closeMenu} onChangeLang={requestLangChange} />
              </div>
            </nav>
          </div>

          <div
            className={`grid overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none sm:hidden ${
              menuOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <nav
                aria-hidden={!menuOpen}
                className="flex flex-col items-stretch gap-1.5 pb-1 pt-3"
              >
                {navLinks}
              </nav>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/book" element={<BookingPage />} />
          <Route path="/schedule" element={<DoctorSchedulePage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/doctors/:id/book" element={<BookDoctorPage />} />
          <Route path="/appointments" element={<MyAppointmentsPage />} />
          <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Routes>
      </main>
    </div>
  );
}
