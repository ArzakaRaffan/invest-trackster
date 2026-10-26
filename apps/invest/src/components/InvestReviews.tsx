'use client';
import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { assets } from '@/lib/market';
import { usePreferences } from './InvestProvider';
import { InvestDialog, SaveError, useInvestWrite } from './InvestForms';

type Review = {
  id: string; goalId: string; goalName: string; month: string; baselineMonth: string; baselineAt: string; asOf: string; revision: string; reviewKey: string;
  status: 'NO_CHANGE' | 'NEEDS_REVIEW' | 'ACKNOWLEDGED'; reasons: string[]; potIDR: string | null; driftState: string;
  metrics: { key: string; before: string | null; now: string | null }[];
  drift: { assetClass: string; valueIDR: string; weightPercent: string; targetPercent: string; deltaPP: string; triggered: boolean }[];
  acknowledgment: { id: string; at: string; note: string } | null;
};
const labels: Record<string, [string, string]> = {
  MONTHLY_REVIEW: ['Sudah memasuki bulan review berikutnya.', 'A new review month has started.'],
  TARGET_CHANGED: ['Profil, tujuan, atau metode berubah; buat target dari evaluasi baru.', 'Profile, goal or method changed; obtain a target from a new evaluation.'],
  PROFILE_REVIEW: ['Profil atau konfirmasi kas memerlukan pemeriksaan ulang.', 'Profile or cash confirmation needs review.'],
  SOURCE_CHANGED: ['Versi data sumber berubah.', 'Source data versions changed.'],
  BUDGET_CHANGED: ['Jatah atau dana tersedia berubah.', 'Allowance or available funds changed.'],
  HOLDINGS_CHANGED: ['Nilai kepemilikan atau kas tujuan berubah.', 'Holding values or goal cash changed.'],
  ELIGIBILITY_CHANGED: ['Kelayakan instrumen berubah, termasuk umur data atau akses.', 'Instrument eligibility changed, including data age or access.'],
  INPUT_CHANGED: ['Ada input terkait yang berubah.', 'A related input changed.'],
  VALUATION_REQUIRED: ['Nilai/FX atau deklarasi kepemilikan belum lengkap; deviasi ditahan.', 'Values/FX or the holdings declaration are incomplete; drift is withheld.'],
  TARGET_REQUIRED: ['Belum ada target yang berlaku untuk perbandingan ini.', 'No current target is available for this comparison.'],
  DRIFT_5PP: ['Ada kelompok menyimpang setidaknya 5 poin persentase dari target arsip.', 'An asset class differs by at least 5 percentage points from the archived target.'],
};
const metrics: Record<string, [string, string]> = { actualQuota: ['Jatah aktual', 'Actual allowance'], plannedQuota: ['Rencana jatah', 'Planned allowance'], availableToAllocate: ['Dana tersedia', 'Available funds'] };

function AcknowledgeForm({ review, close }: { review: Review; close: () => void }) {
  const { t } = usePreferences(), w = useInvestWrite(review.revision, close), [note, setNote] = useState(''), [confirmed, setConfirmed] = useState(false);
  return <InvestDialog title={t('Catat peninjauan', 'Record review')} close={close} busy={w.busy}><form className="stack" onSubmit={e => { e.preventDefault(); void w.save(`/invest/reviews/${review.id}/acknowledge`, 'post', { reviewKey: review.reviewKey, confirmed, note }); }}>
    <p className="subtle">{t('Catatan ini menyimpan bahwa keadaan yang tampil sudah kamu tinjau. Input baru memerlukan peninjauan lagi. Jatah, transaksi, dan kelayakan evaluasi tidak diubah.', 'This records that you reviewed the displayed state. New inputs require another review. Allowances, transactions and evaluation eligibility stay unchanged.')}</p>
    <fieldset className="form-fields stack" disabled={w.locked}><label>{t('Catatan peninjauan', 'Review note')}<textarea required maxLength={300} value={note} onChange={e => setNote(e.target.value)} /></label><label className="check-row"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{t('Saya sudah memeriksa perubahan dan data yang masih kurang.', 'I reviewed the changes and missing information.')}</label></fieldset><SaveError error={w.error} /><button className="button" disabled={!confirmed || !note.trim() || w.busy || w.conflict}>{w.uncertain ? w.button : t('Sudah ditinjau', 'Mark reviewed')}</button>
  </form></InvestDialog>;
}

export function InvestReviews({ evaluationId }: { evaluationId?: string }) {
  const { t, money } = usePreferences(), [cursor, setCursor] = useState(''), [selected, setSelected] = useState<Review | null>(null);
  const query = new URLSearchParams(); if (evaluationId) query.set('evaluationId', evaluationId); if (cursor) query.set('cursor', cursor);
  const { data, error, mutate } = useSWR<{ items: Review[]; nextCursor: string | null }>(`/invest/reviews${query.size ? `?${query}` : ''}`, { refreshInterval: 30000 });
  return <section className="stack"><div><span className="mono kicker">{t('REVIEW BERKALA', 'PERIODIC REVIEW')}</span><h2>{t('Apa yang berubah?', 'What changed?')}</h2><p className="subtle">{t('Perbandingan dengan evaluasi aktual tersimpan. Deviasi 5 poin persentase memicu review, tanpa instruksi penjualan atau pembelian otomatis.', 'Comparison with saved actual evaluations. A 5 percentage point drift triggers review, without automatic buy or sell instructions.')}</p></div>
    {error ? <p className="notice warning" role="alert">{t('Review belum dapat dimuat.', 'Could not load reviews.')} <button className="text-button" onClick={() => void mutate()}>{t('Coba lagi', 'Retry')}</button></p> : !data ? <p role="status">{t('Memeriksa perubahan…', 'Checking changes…')}</p> : <>
      {!data.items.length && <div className="card"><p>{t('Belum ada evaluasi aktual untuk dibandingkan.', 'No actual evaluation to compare yet.')}</p><Link href="/app/plan">{t('Buat evaluasi aktual', 'Create an actual evaluation')}</Link></div>}
      {data.items.map(r => <article className="card stack" key={r.id} data-testid="review-item"><div className="between wrap"><h3>{r.goalName} · {r.baselineMonth}</h3><span className="badge" data-testid="review-status">{r.status === 'ACKNOWLEDGED' ? t('Sudah ditinjau', 'Reviewed') : r.status === 'NEEDS_REVIEW' ? t('Perlu ditinjau', 'Needs review') : t('Tidak ada pemicu baru', 'No new triggers')}</span></div>
        <p className="subtle small">{t('Evaluasi', 'Evaluation')} {new Date(r.baselineAt).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta' })} WIB → {t('Keadaan diperiksa', 'State checked')} {new Date(r.asOf).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta' })} WIB</p>
        <ul className="market-reasons">{r.reasons.map(code => <li key={code}>{labels[code] ? t(...labels[code]) : t('Periksa keadaan terbaru.', 'Review the latest state.')}</li>)}</ul>
        <details><summary>{t('Jatah saat evaluasi → sekarang', 'Allowance at evaluation → now')}</summary>{r.metrics.map(m => <div className="fact-row" key={m.key}><span>{t(...metrics[m.key])}</span><strong className="mono">{money(m.before)} → {money(m.now)}</strong></div>)}</details>
        <p>{t('Nilai pot yang sudah ada', 'Existing goal pot')}: <strong className="mono">{money(r.potIDR)}</strong></p>
        {r.drift.length ? <div className="stack">{r.drift.map(d => <div className="drift-row" key={d.assetClass}><div className="between wrap"><strong>{t(...assets[d.assetClass])}</strong><span className={d.triggered ? 'badge' : 'mono'}>{d.deltaPP} pp</span></div><p className="small subtle">{t('Sekarang', 'Now')} {d.weightPercent}% → {t('Target arsip', 'Archived target')} {d.targetPercent}%</p><meter min={0} max={100} value={Number(d.weightPercent)} aria-label={`${t(...assets[d.assetClass])} ${t('sekarang', 'now')}`} /></div>)}<p className="subtle small">{t('Kas kontribusi yang belum disisihkan dan order rencana tidak masuk nilai pot ini. Ambang 5 pp adalah aturan review v0.1, belum hasil kalibrasi optimal.', 'Uncommitted contribution cash and planned orders are excluded from this pot. The 5 pp threshold is a v0.1 review rule, not an optimized calibration.')}</p></div> : <p className="subtle">{r.driftState === 'EMPTY_POT' ? t('Pot masih kosong; belum ada deviasi yang dapat dihitung.', 'The pot is empty; there is no drift to calculate.') : t('Deviasi belum tersedia sampai valuasi dan target memadai.', 'Drift is unavailable until valuations and targets are sufficient.')}</p>}
        {r.acknowledgment && <p className="notice">{new Date(r.acknowledgment.at).toLocaleDateString('en-GB')} · {r.acknowledgment.note}</p>}
        <div className="actions">{!r.acknowledgment && <button className="button secondary" onClick={() => setSelected(r)}>{t('Catat peninjauan', 'Record review')}</button>}<Link className="text-button" href={`/app/reviews/${r.id}`}>{t('Buka arsip', 'Open archive')}</Link><Link className="text-button" href="/app/plan">{t('Evaluasi baru', 'New evaluation')}</Link></div>
      </article>)}<div className="actions">{cursor && <button className="button secondary" onClick={() => setCursor('')}>{t('Terbaru', 'Latest')}</button>}{data.nextCursor && <button className="button secondary" onClick={() => setCursor(data.nextCursor!)}>{t('Review lebih lama', 'Older reviews')}</button>}</div>
    </>}{selected && <AcknowledgeForm review={selected} close={() => { setSelected(null); void mutate(); }} />}
  </section>;
}
