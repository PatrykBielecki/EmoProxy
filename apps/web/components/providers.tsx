'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { LOCALES, TRANSLATIONS, type Locale, type TranslationKey } from '../lib/i18n';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30
          }
        }
      })
  );

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('locale') : null;
    if (stored && (LOCALES as readonly string[]).includes(stored)) setLocale(stored as Locale);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('locale', locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => TRANSLATIONS[locale][key]
    }),
    [locale]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
    </QueryClientProvider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within Providers');
  }
  return context;
}
