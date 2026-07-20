import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './lib/api';
import { useAuth } from './lib/auth';
import { useTheme } from './lib/theme';
import { useSettings } from './lib/settings';
import { img, userAvatar } from './lib/images';
import Pic from './components/Pic';
import Switch from './components/Switch';
import Splash from './components/Splash';
import BookingPage from './pages/BookingPage';
import DoctorSchedulePage from './pages/DoctorSchedulePage';
import DoctorsPage from './pages/DoctorsPage';
import BookDoctorPage from './pages/BookDoctorPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import StaffPage from './pages/StaffPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import type { Appointment } from './types';

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

function NotificationBell() {
  const { user } = useAuth();
  const { notifications } = useSettings();
  const navigate = useNavigate();
  const isStaff = user?.role === 'STAFF';

  const appts = useQuery({
    queryKey: isStaff ? ['staff-appointments'] : ['my-appointments'],
    enabled: !!user && user.role !== 'DOCTOR',
    refetchInterval: 30_000,
    queryFn: () =>
      api<{ appointments: Appointment[] }>(isStaff ? '/appointments' : '/patients/me/appointments'),
  });

  const count = useMemo(() => {
    const list = appts.data?.appointments ?? [];
    return isStaff
      ? list.filter((a) => a.status === 'REQUESTED').length
      : list.filter((a) => a.status === 'CONFIRMED' && new Date(a.startAt) > new Date()).length;
  }, [appts.data, isStaff]);

  if (!user || user.role === 'DOCTOR' || !notifications) return null;

  return (
    <button
      onClick={() => navigate(isStaff ? '/staff' : '/appointments')}
      title={
        isStaff
          ? `${count} booking request${count === 1 ? '' : 's'} awaiting review`
          : `${count} upcoming confirmed visit${count === 1 ? '' : 's'}`
      }
      className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <Pic src={img.notificationBell} alt="Notifications" className="h-6 w-6" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </button>
  );
}

function ProfileMenu({
  onNavigate,
  compact = false,
}: {
  onNavigate: () => void;
  compact?: boolean;
}) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { notifications, setNotifications } = useSettings();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  const row = 'flex items-center gap-2.5 rounded-lg px-2.5 py-2';
  const iconOnly = compact || !user;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={user ? 'Account settings' : 'Settings'}
        aria-label={user ? 'Account settings' : 'Settings'}
        className={`group flex items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ${
          iconOnly ? 'h-9 w-9 justify-center' : 'w-full gap-2 px-1.5 py-1'
        }`}
      >
        {user ? (
          <>
            <Pic
              src={userAvatar(user.email, user.role)}
              alt=""
              fit="cover"
              className="no-tilt h-6 w-6 rounded-full bg-slate-100 ring-1 ring-slate-200 transition-colors group-hover:ring-teal-400 dark:bg-slate-800 dark:ring-slate-700 dark:group-hover:ring-teal-400"
            />
            {!compact && (
              <>
                <span className="text-sm text-slate-600 transition-colors group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white">
                  {user.fullName}
                </span>
                <Pic src={img.settings} className="h-6 w-6 opacity-70" />
              </>
            )}
          </>
        ) : (
          <Pic src={img.settings} className="h-6 w-6" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="drop absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {user && (
            <div className="flex items-center gap-3 border-b border-slate-100 p-3 dark:border-slate-800">
              <Pic
                src={userAvatar(user.email, user.role)}
                alt=""
                fit="cover"
                className="h-11 w-11 rounded-full bg-slate-100 dark:bg-slate-800"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.fullName}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                <span className="mt-1 inline-block rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                  {user.role.toLowerCase()}
                </span>
              </div>
            </div>
          )}

          <div className="p-1.5">
            <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Settings
            </p>

            <div className={row}>
              <Pic src={theme === 'dark' ? img.moon : img.sun} className="h-6 w-6" />
              <span className="flex-1 text-sm">Dark mode</span>
              <Switch checked={theme === 'dark'} onChange={toggle} label="Dark mode" />
            </div>

            {user && (
              <div className={row}>
                <Pic
                  src={notifications ? img.notificationBell : img.disableBell}
                  className="h-6 w-6"
                />
                <span className="flex-1 text-sm">Notifications</span>
                <Switch
                  checked={notifications}
                  onChange={setNotifications}
                  label="Enable notifications"
                />
              </div>
            )}
          </div>

          {user && (
            <div className="border-t border-slate-100 p-1.5 dark:border-slate-800">
              <button
                onClick={() => {
                  setOpen(false);
                  onNavigate();
                  logout();
                  window.location.assign('/');
                }}
                className={`${row} w-full text-left text-sm text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40`}
              >
                <Pic src={img.idCard} className="h-6 w-6" />
                Log out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [booting, setBooting] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const queryClient = useQueryClient();

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
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
    }`;

  const closeMenu = () => setMenuOpen(false);

  const navLinks = (
    <>
      {user?.role !== 'DOCTOR' && (
        <NavLink to="/" className={navLink} end onClick={closeMenu}>
          <Pic src={img.addCalendar} className="h-6 w-6" />
          Book an appointment
        </NavLink>
      )}
      {user?.role === 'DOCTOR' && (
        <NavLink to="/schedule" className={navLink} onClick={closeMenu}>
          <Pic src={img.checkUp} className="h-6 w-6" />
          My schedule
        </NavLink>
      )}
      <NavLink to="/doctors" className={navLink} end onClick={closeMenu}>
        <Pic src={img.search} className="h-6 w-6" />
        Find a doctor
      </NavLink>
      {user?.role === 'PATIENT' && (
        <NavLink to="/appointments" className={navLink} onClick={closeMenu}>
          <Pic src={img.calendar} className="h-6 w-6" />
          My appointments
        </NavLink>
      )}
      {user?.role === 'STAFF' && (
        <NavLink to="/staff" className={navLink} onClick={closeMenu}>
          <Pic src={img.customerServiceAgent} className="h-6 w-6" />
          Front desk
        </NavLink>
      )}
      {!user && (
        <NavLink to="/login" className={navLink} onClick={closeMenu}>
          <Pic src={img.login} className="no-tilt h-6 w-6" />
          Log in
        </NavLink>
      )}
    </>
  );

  const logo = (
    <Link to="/" className="group flex items-center gap-2" onClick={closeMenu}>
      <span className="hidden h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-600/30 transition-transform group-hover:scale-105 sm:flex">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
          <path className="ekg-trace" d="M2 12h4l3-8 4 16 3-8h6" />
        </svg>
      </span>
      <span className="font-display bg-gradient-to-r from-teal-600 to-cyan-500 bg-clip-text text-lg font-bold tracking-tight text-transparent dark:from-teal-300 dark:to-cyan-400">
        MediBook
      </span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased transition-colors dark:bg-slate-950 dark:text-slate-100">
      {booting && <Splash label="Loading MediBook" leaving={leaving} />}
      <div className="aurora" aria-hidden="true" />
      <header
        ref={headerRef}
        className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85"
      >
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="relative flex items-center justify-between gap-x-4 sm:justify-start">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 sm:hidden dark:hover:bg-slate-800"
            >
              <Pic src={img.menu} alt="" className="no-tilt h-6 w-6" />
            </button>

            <div className="absolute left-1/2 -translate-x-1/2 sm:static sm:translate-x-0">
              {logo}
            </div>

            <div className="flex items-center gap-1.5 sm:hidden">
              <NotificationBell />
              <ProfileMenu onNavigate={closeMenu} compact />
            </div>

            <nav className="ml-auto hidden items-center gap-1.5 sm:flex">
              {navLinks}
              <NotificationBell />
              <div
                className={
                  user ? 'ml-1 border-l border-slate-200 pl-3 dark:border-slate-800' : undefined
                }
              >
                <ProfileMenu onNavigate={closeMenu} />
              </div>
            </nav>
          </div>

          <div
            className={`grid overflow-hidden transition-all duration-250 ease-out motion-reduce:transition-none sm:hidden ${
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
          <Route
            path="/"
            element={user?.role === 'DOCTOR' ? <DoctorSchedulePage /> : <BookingPage />}
          />
          <Route path="/schedule" element={<DoctorSchedulePage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/doctors/:id/book" element={<BookDoctorPage />} />
          <Route path="/appointments" element={<MyAppointmentsPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Routes>
      </main>
    </div>
  );
}
