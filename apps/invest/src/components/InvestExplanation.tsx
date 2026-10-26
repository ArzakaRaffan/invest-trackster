'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError } from '@/lib/api';
import { usePreferences } from './InvestProvider';

type Explanation = {
  version: string; evaluationId: string; evaluatedAt: string; language: string; evidenceHash: string; origin: 'RULES' | 'AI_ASSISTED';
  fallbackReason: string | null; generatedAt: string | null; aiAvailable: boolean; canRequestAi: boolean; retryAfter: string | null;
  blocks: { id: string; title: string; text: string; sourceIds: string[]; facts: { label: string; value: string | null; format: 'money' | 'text' | 'percent'; path: string }[] }[];
  sources: { id: string; title: string; url: string; section: string; observedAt: string; fetchedAt: string; instrumentVersion: number }[];
};

function ExplanationPanel({ id, stale }: { id: string; stale: boolean }) {
  const { t, lang, money } = usePreferences(), [busy, setBusy] = useState(false), [requestError, setRequestError] = useState('');
  const path = `/invest/evaluations/${id}/explanation`;
  const { data, error, mutate } = useSWR<Explanation>(`${path}?language=${lang}`, { refreshInterval: value => value?.retryAfter ? 15000 : 0 });
  const request = async () => {
    if (busy) return; setBusy(true); setRequestError('');
    try { const result = await api.post<Explanation>(path, { language: lang }); await mutate(result, { revalidate: false }); }
    catch (err) { setRequestError(err instanceof ApiError && err.status === 429 ? t('Kuota AI tercapai. Penjelasan aturan tetap tersedia.', 'AI quota reached. The rule explanation remains available.') : t('Bantuan AI belum dapat dimuat. Penjelasan aturan tetap tersedia; periksa hasil sebelum mencoba lagi.', 'AI assistance could not be loaded. The rule explanation remains available; check the result before retrying.')); const recovered = await mutate(); if (recovered?.origin === 'AI_ASSISTED') setRequestError(''); }
    finally { setBusy(false); }
  };
  const failed = data?.fallbackReason && !['DISABLED', 'IN_PROGRESS'].includes(data.fallbackReason);
  return <section className="card stack" aria-labelledby="explanation-title" data-testid="invest-explanation">
    <div className="between wrap"><h2 id="explanation-title">{t('Alasan hasil ini', 'Why this result')}</h2>{data && <span className="badge">{data.origin === 'AI_ASSISTED' ? t('Dengan bantuan AI', 'AI assisted') : t('Aturan perhitungan', 'Calculation rules')}</span>}</div>
    {!data && !error && <p role="status">{t('Memuat penjelasan…', 'Loading explanation…')}</p>}
    {error && <p className="notice warning" role="alert">{t('Penjelasan belum bisa dimuat. Angka evaluasi tetap tersedia.', 'The explanation could not be loaded. Evaluation figures remain available.')} <button className="text-button" onClick={() => void mutate()}>{t('Coba lagi', 'Retry')}</button></p>}
    {data && <>
      {stale && <p className="notice warning">{t('Penjelasan ini mengikuti arsip lama. Evaluasi ulang untuk memakai kondisi terkini.', 'This explanation follows an older archive. Evaluate again to use current conditions.')}</p>}
      <p>{data.blocks[0]?.text}</p>
      <details><summary>{t('Anggaran, risiko, dan bukti', 'Budget, risk, and evidence')}</summary><div className="stack">
        {data.blocks.slice(1).map(block => <article key={block.id} className="source-record stack"><h3>{block.title}</h3><p className="subtle">{block.text}</p>
          {!!block.facts.length && <dl className="stack">{block.facts.map((f, n) => <div className="fact-row" key={n}><dt>{f.label}</dt><dd className="mono">{f.format === 'money' ? money(f.value) : f.value == null ? '—' : `${f.value}${f.format === 'percent' ? '%' : ''}`}</dd></div>)}</dl>}
          {block.sourceIds.map(sourceId => { const s = data.sources.find(s => s.id === sourceId); return s && <p className="small" key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a> · {s.section} · {t('diamati', 'observed')} {s.observedAt.slice(0, 10)} · v{s.instrumentVersion}</p>; })}
        </article>)}
        <p className="subtle small">{t('Sesuai evaluasi', 'As evaluated')} {new Date(data.evaluatedAt).toLocaleString(lang === 'id' ? 'id-ID' : 'en-GB', { timeZone: 'Asia/Jakarta' })} WIB</p>
      </div></details>
      {failed && <p className="notice warning" role="status">{t('Bantuan AI tidak tersedia untuk permintaan ini. Penjelasan aturan ditampilkan.', 'AI assistance is unavailable for this request. The rule explanation is shown.')}</p>}
      {data.aiAvailable && <><p className="subtle small">{t('AI memilih bentuk penjelasan dari fakta yang sudah diperiksa. Nama, nominal, dan jawaban profil tidak dikirim ke AI.', 'AI selects wording from checked claims. Names, amounts, and profile answers are not sent to AI.')}</p>
        {data.origin !== 'AI_ASSISTED' && <div className="actions"><button className="button secondary" disabled={busy || !data.canRequestAi} onClick={() => void request()}>{busy || data.fallbackReason === 'IN_PROGRESS' ? t('Menyiapkan penjelasan…', 'Preparing explanation…') : t('Sesuaikan penjelasan dengan AI', 'Adapt explanation with AI')}</button>{data.retryAfter && <span className="small subtle">{t('Dapat diperiksa kembali setelah', 'Check again after')} {new Date(data.retryAfter).toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-GB', { timeZone: 'Asia/Jakarta' })} WIB</span>}</div>}
      </>}
      {requestError && <p className="notice warning" role="alert">{requestError}</p>}
    </>}
  </section>;
}

export function InvestExplanation(props: { id: string; stale: boolean }) {
  const { lang } = usePreferences();
  return <ExplanationPanel key={`${props.id}:${lang}`} {...props} />;
}
