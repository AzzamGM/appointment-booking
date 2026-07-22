import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from './api';

const SESSION_KEY = 'medibook:session';

function sessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, '');
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function usePageTracking(): void {
  const { pathname } = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    const previous = lastPath.current;
    lastPath.current = pathname;

    void api('/analytics/visits', {
      method: 'POST',
      body: {
        sessionId: sessionId(),
        path: pathname,
        referrer: previous ?? document.referrer ?? undefined,
        language: document.documentElement.lang || undefined,
      },
    }).catch(() => {});
  }, [pathname]);
}
