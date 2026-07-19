import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { useTheme } from './lib/theme';
import DoctorsPage from './pages/DoctorsPage';
import BookDoctorPage from './pages/BookDoctorPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import StaffPage from './pages/StaffPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export default function App() {
  const { user, logout } = useAuth();

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <Link to="/" className="group flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white transition-transform group-hover:scale-105 dark:bg-teal-500 dark:text-slate-950">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              MediBook
            </span>
          </Link>
          <nav className="flex items-center gap-1.5">
            <NavLink to="/" className={navLink} end>
              Find a doctor
            </NavLink>
            {user?.role === 'PATIENT' && (
              <NavLink to="/appointments" className={navLink}>
                My appointments
              </NavLink>
            )}
            {user?.role === 'STAFF' && (
              <NavLink to="/staff" className={navLink}>
                Front desk
              </NavLink>
            )}
            <ThemeToggle />
            {user ? (
              <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-800">
                <span className="hidden text-sm text-slate-500 sm:inline dark:text-slate-400">
                  {user.fullName}
                  <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">
                    ({user.role.toLowerCase()})
                  </span>
                </span>
                <button
                  onClick={logout}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Log out
                </button>
              </div>
            ) : (
              <NavLink to="/login" className={navLink}>
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
