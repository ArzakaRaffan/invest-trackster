'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { SidebarView } from '@trackster/components/v3/views/SidebarView';
import { BottomNavView } from '@trackster/components/v3/views/BottomNavView';
import { PageHeaderView } from '@trackster/components/v3/views/PageHeaderView';
import { TrackMascot } from '@trackster/components/v3/TrackMascot';
import { ApiError } from '@/lib/api';
import { tracksterUrl, type InvestStatus } from '@/lib/types';
import { usePreferences } from './InvestProvider';

const icons = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  wallet: 'M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15v12H5a2 2 0 0 1-2-2V5M21 11h-5v4h5',
  plan: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  market: 'M3 3v18h18M8 17v-5M13 17V8M18 17v-3',
  menu: 'M4 6h16M4 12h16M4 18h16',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z',
};
export function Icon({ name }: { name: keyof typeof icons }) { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icons[name]} /></svg>; }

export function InvestShell({ children }: { children: React.ReactNode }) {
  const p = usePreferences();
  const { t, theme, lang } = p;
  const pathname = usePathname();
  const router = useRouter();
  const [mini, setMini] = useState(false);
  const [offline, setOffline] = useState(false);
  const { data, error, mutate } = useSWR<InvestStatus, ApiError>('/invest/status');
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update(); window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const nav = [
    ['/app', t('Beranda', 'Home'), 'home'], ['/app/portfolio', t('Portofolio', 'Portfolio'), 'wallet'],
    ['/app/plan', t('Rencana', 'Plan'), 'plan'], ['/app/market', t('Pasar', 'Market'), 'market'], ['/app/menu', t('Menu', 'Menu'), 'menu'],
  ] as const;
  const active = pathname === '/app' ? '/app' : pathname.startsWith('/app/plan') || pathname === '/setup' ? '/app/plan' : pathname.startsWith('/app/portfolio') ? '/app/portfolio' : pathname.startsWith('/app/market') ? '/app/market' : '/app/menu';
  const tab = (href: string, label: string, icon: keyof typeof icons) => {
    const selected = active === href;
    return { label, d: icons[icon], go: () => router.push(href), cur: selected ? 'page' : 'false', bg: selected ? 'var(--card)' : 'transparent',
      c: selected ? 'var(--text)' : 'var(--text-subtle)', fw: selected ? 700 : 500, bar: selected ? 'var(--brand)' : 'transparent',
      tab: true, pill: selected ? 'var(--brand-subtle)' : 'transparent' };
  };
  const vm = {
    sideW: mini ? '76px' : '264px', sideFull: !mini, sideJustify: mini ? 'center' : 'flex-start', sideStack: mini ? 'column' : 'row', sideRot: mini ? '180deg' : '0deg',
    sideToggleLabel: mini ? t('Perlebar sidebar', 'Expand sidebar') : t('Ciutkan sidebar', 'Collapse sidebar'), toggleSide: () => setMini(!mini),
    sideGroups: [{ title: 'Invest', items: nav.map(([href, label, icon]) => tab(href, label, icon)) }, { title: t('Peninjauan', 'Review'), items: [tab('/app/reviews', t('Riwayat', 'History'), 'plan'), tab('/app/sources', t('Sumber data', 'Data sources'), 'market')] }],
    // This existing Trackster action deliberately links to Trackster's functioning assistant.
    openChatSide: () => { window.location.href = `${tracksterUrl}/app/chat`; }, goSourcesSide: () => router.push('/app/sources'), showPlus: false,
    sideSrc: data ? t('AKUN TRACKSTER · TERHUBUNG', 'TRACKSTER ACCOUNT · CONNECTED') : t('MEMERIKSA AKSES', 'CHECKING ACCESS'),
    syncedLabel: t('Invest · jatah bulanan', 'Invest · monthly allowance'),
    themeIcon: theme === 'dark' ? icons.sun : icons.moon, themeLabel: theme === 'dark' ? t('Gelap', 'Dark') : t('Terang', 'Light'),
    toggleTheme: p.toggleTheme, toggleLang: p.toggleLang, langLabel: lang.toUpperCase(),
    v3tabs: nav.map(([href, label, icon]) => ({ ...tab(href, label, icon), c: active === href ? 'var(--brand-text)' : 'var(--text-subtle)' })),
  };
  return <div className="invest-shell"><a className="skip-link" href="#invest-main">{t('Ke isi halaman', 'Skip to content')}</a>
    <div className="invest-desktop"><SidebarView vm={vm} /></div>
    <main id="invest-main" className="invest-main"><div className="invest-content">
      <div className="invest-topbar"><span className="mono subtle">INVEST <span aria-hidden="true">/</span> TRACKSTER</span><div className="actions">
        <button className="icon-button" onClick={p.toggleTheme} aria-label={t('Ganti tema', 'Change theme')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
        <button className="icon-button mono" onClick={p.toggleLang} aria-label={t('Ganti bahasa', 'Change language')}>{lang.toUpperCase()}</button>
      </div></div>
      {offline && <div role="status" className="notice warning">{t('Kamu sedang offline. Data terakhir mungkin sudah berubah; penyimpanan memerlukan koneksi.', 'You are offline. Cached data may have changed; saving needs a connection.')}</div>}
      {error ? <section className="card stack" role="alert"><TrackMascot size="64" mood="think" still="true" /><h1>{error.status === 403 ? t('Akses Invest belum aktif', 'Invest access is not enabled') : t('Belum bisa terhubung', 'Unable to connect')}</h1><p className="subtle">{error.status === 403 ? t('Sesi Trackster kamu valid. Invest perlu diaktifkan untuk akun ini oleh pengelola.', 'Your Trackster session is valid. An administrator needs to enable Invest for this account.') : t('Periksa koneksi, lalu coba lagi. Data kamu tetap tersimpan.', 'Check your connection and retry. Your data is still saved.')}</p><div className="actions"><button className="button" onClick={() => void mutate()}>{t('Coba lagi', 'Retry')}</button><a className="button secondary" href={tracksterUrl}>{t('Buka Trackster', 'Open Trackster')}</a></div></section>
        : !data ? <div role="status" className="card skeleton">{t('Memeriksa sesi Trackster…', 'Checking your Trackster session…')}</div> : children}
    </div></main><div className="invest-mobile"><BottomNavView vm={vm} /></div>
  </div>;
}

export function PageHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="invest-heading"><PageHeaderView vm={{ pageTitle: title, pageSub: subtitle, h1s: 'var(--heading-size)', h1l: 'var(--heading-line)' }} /></div>;
}
