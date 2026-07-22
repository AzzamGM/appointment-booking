import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, setToken, USER_KEY } from './api';
import { storedLang } from './i18n';
import type { AuthResponse, Gender, PublicUser } from '../types';

interface AuthContextValue {
  user: PublicUser | null;
  login: (email: string, password: string) => Promise<PublicUser>;
  signup: (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    gender?: Gender,
  ) => Promise<void>;
  setUserData: (user: PublicUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredUser(): PublicUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as PublicUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(loadStoredUser);

  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    api<PublicUser>('/users/me')
      .then((fresh) => {
        if (cancelled) return;
        localStorage.setItem(USER_KEY, JSON.stringify(fresh));
        setUser(fresh);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const applyAuth = (res: AuthResponse) => {
    setToken(res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setUser(res.user);
  };

  const login = async (email: string, password: string) => {
    const res = await api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    applyAuth(res);
    return res.user;
  };

  const signup = async (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    gender?: Gender,
  ) => {
    const fullNameAr = storedLang() === 'ar' ? fullName : undefined;
    applyAuth(
      await api<AuthResponse>('/auth/signup', {
        method: 'POST',
        body: { email, password, fullName, fullNameAr, phone, gender },
      }),
    );
  };

  const setUserData = (next: PublicUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(next));
    setUser(next);
  };

  const logout = () => {
    clearToken();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, setUserData, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
