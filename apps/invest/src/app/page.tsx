'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { TrackMascot } from '@trackster/components/v3/TrackMascot';
import { usePreferences } from '@/components/InvestProvider';

export default function Entry() {
  const { t } = usePreferences();
  const router = useRouter();
  const { data } = useSWR('/auth/me', { shouldRetryOnError: false });
  useEffect(() => { if (data) router.replace('/app'); }, [data, router]);
  return <main className="entry"><div className="entry-content stack"><span className="mono subtle">INVEST / TRACKSTER</span><TrackMascot size="100" mood="happy" pointer="true" /><h1>{t('Dari jatah bulanan, untuk rencana panjang.', 'A monthly allowance. A long-term plan.')}</h1><p className="subtle">{t('Lihat jatah 20% dari pemasukan Trackster, pisahkan rencana dan uang yang sudah diterima, lalu pastikan kas bebasmu.', 'See your 20% Trackster allowance, separate forecasts from received income, and confirm your free cash.')}</p><Link className="button" href="/login">{t('Masuk dengan akun Trackster', 'Sign in with your Trackster account')}</Link><p className="mono subtle small">{t('Akun yang sama. Langkah berikutnya untuk uangmu.', 'The same account. Your next step with money.')}</p></div></main>;
}
