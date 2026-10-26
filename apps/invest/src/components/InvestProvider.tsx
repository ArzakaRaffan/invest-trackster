'use client';
import { createContext, useContext, useEffect, useState, type CSSProperties } from 'react';
import { SWRConfig } from 'swr';
import { DARK, LIGHT, DENSITY } from '@trackster/components/v3/tokens';
import { api, ApiError } from '@/lib/api';
import { formatIDR } from '@/lib/money';

type Preferences = {
  theme: 'dark' | 'light'; lang: 'id' | 'en'; density: 'lega' | 'ringkas';
  toggleTheme: () => void; toggleLang: () => void; toggleDensity: () => void;
  t: (id: string, en: string) => string; money: (value: string | null) => string;
};
const Context = createContext<Preferences>(null!);
export const usePreferences = () => useContext(Context);

export function InvestProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lang, setLang] = useState<'id' | 'en'>('id');
  const [density, setDensity] = useState<'lega' | 'ringkas'>('lega');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem('v3-theme') === 'light') setTheme('light');
      if (localStorage.getItem('v3-lang') === 'en') setLang('en');
      if (localStorage.getItem('v3-density') === 'ringkas') setDensity('ringkas');
    } catch { /* Storage unavailable: usable in-memory preferences. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = lang;
    try { localStorage.setItem('v3-theme', theme); localStorage.setItem('v3-lang', lang); localStorage.setItem('v3-density', density); } catch { /* optional persistence */ }
  }, [theme, lang, density, ready]);
  const value: Preferences = { theme, lang, density,
    toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark'),
    toggleLang: () => setLang(l => l === 'id' ? 'en' : 'id'),
    toggleDensity: () => setDensity(d => d === 'lega' ? 'ringkas' : 'lega'),
    t: (id, en) => lang === 'id' ? id : en,
    money: amount => formatIDR(amount, lang === 'id' ? 'id-ID' : 'en-US'),
  };
  return <Context.Provider value={value}><SWRConfig value={{ fetcher: (key: string) => api.get(key), revalidateOnFocus: true, shouldRetryOnError: (error: ApiError) => error.status !== 401 && error.status !== 403, errorRetryCount: 2 }}>
    <div className="invest-root" style={{ ...(theme === 'dark' ? DARK : LIGHT), ...DENSITY[density], colorScheme: theme } as CSSProperties}>{children}</div>
  </SWRConfig></Context.Provider>;
}
