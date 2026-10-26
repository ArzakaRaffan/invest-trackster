'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSWRConfig } from 'swr';
import { api, ApiError } from '@/lib/api';
import { usePreferences } from './InvestProvider';

export const moneyPattern = '(0|[1-9][0-9]{0,15})(\\.[0-9]{1,2})?';
export const precisePattern = '(0|[1-9][0-9]{0,15})(\\.[0-9]{1,12})?';
export function useInvestWrite<T = unknown>(revision: string, done: (result?: T) => void) {
  const { t } = usePreferences();
  const { mutate } = useSWRConfig();
  const baseline = useRef(revision);
  const pending = useRef<{ path: string; method: 'post' | 'patch' | 'put'; body: unknown } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [uncertain, setUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  async function save(path: string, method: 'post' | 'patch' | 'put', body: Record<string, unknown>) {
    if (busy || conflict) return;
    setBusy(true); setError('');
    if (!pending.current) pending.current = { path, method, body: { ...body, expectedRevision: baseline.current, idempotencyKey: crypto.randomUUID() } };
    try {
      const p = pending.current;
      const result = await api[p.method]<T>(p.path, p.body);
      // A completed write must not be reported as failed merely because the refresh fails.
      void mutate(key => typeof key === 'string' && key.startsWith('/invest/')).catch(() => {});
      pending.current = null; setUncertain(false); done(result);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 409) { setConflict(true); setError(t('Data berubah. Isian tetap di sini. Tutup formulir lalu periksa data terbaru sebelum mencoba lagi.', 'Data changed. Your input is still here. Close this form and review the latest data before retrying.')); void mutate('/invest/portfolio'); }
        else { pending.current = null; setUncertain(false); setError(e.message); }
      } else {
        setUncertain(true); setError(t('Hasil kiriman belum diketahui. Ulangi kiriman yang sama untuk memeriksa hasilnya tanpa mencatat dua kali.', 'The result is unknown. Retry the same submission to check its result without recording it twice.'));
      }
    } finally { setBusy(false); }
  }
  return { busy, error, uncertain, conflict, locked: busy || uncertain || conflict, save,
    button: busy ? t('Menyimpan…', 'Saving…') : uncertain ? t('Ulangi kiriman', 'Retry submission') : t('Simpan', 'Save') };
}

export function InvestDialog({ title, close, busy, children }: { title: string; close: () => void; busy: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null), { t } = usePreferences();
  useEffect(() => { const el = ref.current, previous = document.activeElement as HTMLElement | null; el?.showModal(); return () => { el?.close(); previous?.focus(); }; }, []);
  return <dialog ref={ref} className="invest-dialog" aria-label={title} onCancel={e => { if (busy) e.preventDefault(); else close(); }}><div className="stack"><div className="between"><h2>{title}</h2><button type="button" className="icon-button" aria-label={t('Tutup', 'Close')} disabled={busy} onClick={close}>✕</button></div>{children}</div></dialog>;
}

export function SaveError({ error }: { error: string }) { return error ? <div className="notice warning" role="alert">{error}</div> : null; }
