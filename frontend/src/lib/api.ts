import i18n from './i18n';
const TOKEN_KEY = 'medibook.token';
export const USER_KEY = 'medibook.user';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export function errorMessage(err: unknown, fallback?: string): string {
  const fb = fallback ?? i18n.t('errors.generic');
  if (err instanceof ApiError) {
    if (err.status === 0) return i18n.t('errors.network');
    if (err.status === 401) return i18n.t('errors.unauthorized');
    if (err.status === 404) return i18n.t('errors.notFound');
    if (err.status >= 500) return i18n.t('errors.server');
    return err.message || fb;
  }
  return fb;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) {
      clearToken();
      localStorage.removeItem(USER_KEY);
      window.location.assign(`${import.meta.env.BASE_URL}login`);
    }
    const message = data?.error?.message ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data?.error?.details);
  }
  return data as T;
}
