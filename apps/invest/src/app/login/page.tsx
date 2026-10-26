'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { AuthView } from '@trackster/components/v3/views/AuthView';
import { api } from '@/lib/api';
import { tracksterUrl } from '@/lib/types';
import { usePreferences } from '@/components/InvestProvider';

export default function Login() {
  const { t } = usePreferences();
  const router = useRouter();
  const { data, mutate } = useSWR('/auth/me', { shouldRetryOnError: false });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (data) router.replace('/app'); }, [data, router]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!username.trim() || !password) { setError(t('Isi username dan password.', 'Enter your username and password.')); return; }
    setBusy(true); setError('');
    try { await api.post('/auth/login', { username: username.trim(), password }); await mutate(); router.replace('/app'); }
    catch (e) { setError(e instanceof Error ? e.message : t('Gagal masuk', 'Sign-in failed')); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><AuthView vm={{ apad: '24px', authMood: error ? 'thinking' : 'happy', authTitle: t('Masuk ke Invest.', 'Sign in to Invest.'),
    authTabs: [{ l: t('Akun Trackster', 'Trackster account'), sel: true, bg: 'var(--text)', c: 'var(--page)', go: () => {} }], authFields: true, authLogin: true, authCta: busy ? t('Memeriksa…', 'Checking…') : t('Masuk', 'Sign in'),
    authErr: error, showGoogle: false, forgotLive: false, forgotDemo: false, submitAuth: submit, toLanding: () => router.push('/'),
    idLabel: 'Username', idType: 'text', idAuto: 'username', idPh: t('Username Trackster', 'Trackster username'), email: username, emailBd: 'var(--border)', onEmail: (e: FormEvent<HTMLInputElement>) => setUsername(e.currentTarget.value),
    pw: password, pwType: visible ? 'text' : 'password', pwBd: 'var(--border)', pwBtn: visible ? t('Sembunyi', 'Hide') : t('Lihat', 'Show'), pwLabel: t('Tampilkan atau sembunyikan password', 'Show or hide password'), onPw: (e: FormEvent<HTMLInputElement>) => setPassword(e.currentTarget.value), togglePw: () => setVisible(!visible),
    forgot: () => { window.location.href = `${tracksterUrl}/login`; }, mascotStill: 'false',
  }} /></main>;
}
