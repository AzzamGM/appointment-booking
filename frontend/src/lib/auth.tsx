import { createContext, useContext, useState, type ReactNode } from 'react';
import { api, clearToken, setToken, USER_KEY } from './api';
import type { AuthResponse, PublicUser } from '../types';

interface AuthContextValue {
  user: PublicUser | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
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

  const applyAuth = (res: AuthResponse) => {
    setToken(res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setUser(res.user);
  };

  const login = async (email: string, password: string) => {
    applyAuth(await api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }));
  };

  const signup = async (email: string, password: string, fullName: string) => {
    applyAuth(
      await api<AuthResponse>('/auth/signup', { method: 'POST', body: { email, password, fullName } }),
    );
  };

  const logout = () => {
    clearToken();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
