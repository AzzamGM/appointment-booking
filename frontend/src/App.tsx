import { useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from './lib/api';
import { useAuth } from './lib/auth';
import { useTheme } from './lib/theme';
import { img, userAvatar } from './lib/images';
import Pic from './components/Pic';
import DoctorsPage from './pages/DoctorsPage';
import BookDoctorPage from './pages/BookDoctorPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import StaffPage from './pages/StaffPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import type { Appointment } from './types';

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <Pic src={theme === 'dark' ? img.sun : img.moon} alt="" className="h-6 w-6" />
    </button>
  );
}

/**
 * Header bell with a live badge: patients see their upcoming confirmed visits,
 * staff see booking requests waiting for review. Polls every 30s.
 */
function NotificationBell() {
  const { user } = useAuth();
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

  if (!user || user.role === 'DOCTOR') return null;

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

export default function App() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
    }`;

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="aurora" aria-hidden="true" />
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <Link to="/" className="group flex items-center gap-2" onClick={closeMenu}>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-600/30 transition-transform group-hover:scale-105">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <path className="ekg-trace" d="M2 12h4l3-8 4 16 3-8h6" />
              </svg>
            </span>
            <span className="font-display bg-gradient-to-r from-teal-600 to-cyan-500 bg-clip-text text-lg font-bold tracking-tight text-transparent dark:from-teal-300 dark:to-cyan-400">
              MediBook
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:hidden">
            <NotificationBell />
            <ThemeToggle />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Pic src={img.menu} alt="" className="h-6 w-6" />
            </button>
          </div>

          <nav
            className={`${
              menuOpen ? 'flex' : 'hidden'
            } w-full flex-col items-stretch gap-1.5 pb-2 sm:flex sm:w-auto sm:flex-row sm:items-center sm:pb-0`}
          >
            <NavLink to="/" className={navLink} end onClick={closeMenu}>
              <Pic src={img.home} className="h-6 w-6" />
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
            <span className="hidden sm:contents">
              <NotificationBell />
              <ThemeToggle />
            </span>
            {user ? (
              <div className="flex items-center gap-2 border-t border-slate-200 pt-2 sm:ml-1 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0 dark:border-slate-800">
                <Pic
                  src={userAvatar(user.email, user.role)}
                  alt=""
                  fit="cover"
                  className="h-9 w-9 rounded-full bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
                />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {user.fullName}
                  <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">
                    ({user.role.toLowerCase()})
                  </span>
                </span>
                <button
                  onClick={() => {
                    closeMenu();
                    logout();
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Log out
                </button>
              </div>
            ) : (
              <NavLink to="/login" className={navLink} onClick={closeMenu}>
                <Pic src={img.idCard} className="h-6 w-6" />
                Log in
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <Routes>
          <Route path="/" element={<DoctorsPage />} />
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
