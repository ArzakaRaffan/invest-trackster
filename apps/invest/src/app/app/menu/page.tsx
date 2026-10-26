'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useSWRConfig } from 'swr';
import { usePreferences } from '@/components/InvestProvider';
import { PageHeading } from '@/components/InvestShell';
import { api } from '@/lib/api';
import { tracksterUrl } from '@/lib/types';

export default function Menu() {
  const p = usePreferences(); const { t } = p; const { cache } = useSWRConfig();
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true); setError('');
    try { await api.post('/auth/logout'); for (const key of cache.keys()) cache.delete(key); window.location.href = '/login'; }
    catch { setBusy(false); setError(t('Gagal keluar. Periksa koneksi lalu coba lagi.', 'Sign-out failed. Check your connection and retry.')); }
  }
  return <><PageHeading title={t('Menu', 'Menu')} subtitle={t('Pengaturan yang sama, untuk rencana yang lebih panjang.', 'Familiar settings, for a longer-term plan.')} />
    <section className="card stack"><h2>{t('Tampilan', 'Appearance')}</h2><div className="between"><span>{t('Tema', 'Theme')}</span><button className="button secondary" onClick={p.toggleTheme}>{p.theme === 'dark' ? t('Gelap', 'Dark') : t('Terang', 'Light')}</button></div><div className="between"><span>{t('Bahasa', 'Language')}</span><button className="button secondary" onClick={p.toggleLang}>{p.lang === 'id' ? 'Indonesia' : 'English'}</button></div><div className="between"><span>{t('Kepadatan', 'Density')}</span><button className="button secondary" onClick={p.toggleDensity}>{p.density === 'lega' ? t('Lega', 'Comfortable') : t('Ringkas', 'Compact')}</button></div></section>
    <section className="card stack"><h2>{t('Tinjau dan lanjutkan', 'Review and continue')}</h2><Link className="menu-link" href="/app/reviews">{t('Riwayat peninjauan', 'Review history')} →</Link><Link className="menu-link" href="/app/sources">{t('Sumber dan cakupan data', 'Data sources and coverage')} →</Link><Link className="menu-link" href="/setup">{t('Tujuan dan profil risiko', 'Goals and risk profile')} →</Link><a className="menu-link" href={tracksterUrl}>{t('Kembali ke Trackster', 'Return to Trackster')} ↗</a></section>
    {error && <p role="alert" className="notice warning">{error}</p>}<button className="button secondary" onClick={logout} disabled={busy}>{busy ? t('Keluar…', 'Signing out…') : t('Keluar dari sesi bersama', 'Sign out of the shared session')}</button>
  </>;
}
