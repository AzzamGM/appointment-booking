import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const NOTIFICATIONS_KEY = 'medibook:notifications';

interface Settings {
  notifications: boolean;
  setNotifications: (value: boolean) => void;
}

const SettingsContext = createContext<Settings>({
  notifications: true,
  setNotifications: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem(NOTIFICATIONS_KEY) !== 'off',
  );

  useEffect(() => {
    localStorage.setItem(NOTIFICATIONS_KEY, notifications ? 'on' : 'off');
  }, [notifications]);

  return (
    <SettingsContext.Provider value={{ notifications, setNotifications }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
