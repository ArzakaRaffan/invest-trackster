'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { TrackMascot } from '@trackster/components/v3/TrackMascot';
import { api, ApiError } from '@/lib/api';
import { currentMonth, tracksterUrl, type Budget, type PaymentEvent } from '@/lib/types';
import { usePreferences } from './InvestProvider';
import { PageHeading } from './InvestShell';

export function MonthlyBudget({ plan = false }: { plan?: boolean }) {
  const { t, money, lang } = usePreferences();
  const [month, setMonth] = useState(currentMonth);
  const [dialog, setDialog] = useState<'cash' | PaymentEvent | null>(null);
  const [message, setMessage] = useState('');
  const { data, error, isLoading, mutate } = useSWR<Budget, ApiError>(`/invest/budget?month=${month}`);
  const monthLabel = new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(`${month}-01T12:00:00+07:00`));
  const complete = data?.forecastStatus === 'COMPLETE';
  async function saved(next: Budget) { await mutate(next, false); setDialog(null); setMessage(t('Perubahan tersimpan.', 'Changes saved.')); }
  return <>
    <PageHeading title={plan ? t('Rencana bulanan', 'Monthly plan') : t('Sedikit demi sedikit.', 'A little at a time.')} subtitle={t('Satu jatah, dua sudut pandang: direncanakan dan sudah diterima.', 'One allowance, two perspectives: planned and already received.')} />
    <div className="between wrap"><label className="month-picker mono">{t('BULAN', 'MONTH')}<input aria-label={t('Pilih bulan', 'Select month')} type="month" value={month} min="2000-01" max="2099-12" onChange={e => { if (/^20\d{2}-(0[1-9]|1[0-2])$/.test(e.target.value)) { setMonth(e.target.value); setMessage(''); } }} /></label><button className="text-button" onClick={() => void mutate()}>{t('Perbarui data', 'Refresh data')} ↻</button></div>
    {message && <p role="status" className="notice success">{message}</p>}
    {error && <div className="notice warning" role="alert">{t('Data belum bisa diperbarui. Coba lagi sebelum menyimpan perubahan.', 'Could not refresh data. Retry before saving changes.')} <button className="text-button" onClick={() => void mutate()}>{t('Coba lagi', 'Retry')}</button></div>}
    {isLoading && <div className="card skeleton" role="status">{t('Menghitung jatah bulanan…', 'Calculating your monthly allowance…')}</div>}
    {data && <>
      <section className="budget-grid">
        <article className="card receipt hero"><div className="between"><span className="mono kicker">{t('JATAH AKTUAL', 'ACTUAL ALLOWANCE')}</span><span className="badge">20%</span></div><div className="hero-amount" data-testid="actual-quota">{money(data.actualQuota)}</div><p className="subtle">{monthLabel} · {t('dari pemasukan diterima', 'from received income')} {money(data.actualIncome)}</p><div className="dashed" /><div className="between"><span>{t('Berdasarkan pemasukan CONFIRMED', 'Based on CONFIRMED income')}</span><TrackMascot size="42" mood="happy" still="true" /></div></article>
        <article className="card stack"><span className="mono kicker">{t('RENCANA JATAH', 'PLANNED ALLOWANCE')}</span><div className="plan-amount" data-testid="planned-quota">{money(data.plannedQuota)}</div><p className="subtle">{complete ? t('20% dari perkiraan pemasukan bulan ini. Angka ini untuk perencanaan.', '20% of this month’s expected income. Use this amount for planning.') : t('Lengkapi jadwal atau cocokkan pemasukan agar uang yang sama tidak dihitung dua kali.', 'Complete schedules or link receipts so the same money is not counted twice.')}</p><div className="notice subtle small">{t('Rencana dan aktual tidak dijumlahkan.', 'Planned and actual allowances are not added together.')}</div></article>
      </section>
      <section className="card"><div className="between wrap"><h2>{t('Kas yang bisa disiapkan', 'Cash you can set aside')}</h2>{month === currentMonth() && <button className="button secondary" disabled={!!error} onClick={() => setDialog('cash')}>{data.cashConfirmation ? t('Perbarui kas bebas', 'Update free cash') : t('Konfirmasi kas bebas', 'Confirm free cash')}</button>}</div><div className="metrics">
        <div><span className="subtle">{t('Kas bebas terkonfirmasi', 'Confirmed free cash')}</span><strong>{money(data.freeCash)}</strong></div>
        <div><span className="subtle">{t('Sisa jatah setelah pemakaian', 'Allowance after usage')}</span><strong>{money(data.remainingQuota)}</strong></div>
        <div><span className="subtle">{t('Pembelian + biaya', 'Purchases + fees')}</span><strong>{money(data.usedQuota)}</strong></div><div><span className="subtle">{t('Simpanan tujuan', 'Goal savings')}</span><strong>{money(data.goalSavingUsage)}</strong></div><div><span className="subtle">{t('Reservasi aktif', 'Active reservations')}</span><strong>{money(data.reservations)}</strong></div><div><span className="subtle">{t('Batas untuk rencana', 'Planning limit')}</span><strong data-testid="planning-limit">{money(data.availableToAllocate)}</strong></div>
      </div><p className="subtle small">{data.status === 'OVERCOMMITTED' ? t('Pemakaian melampaui jatah atau kas. Dana untuk usulan baru ditahan pada nol. Periksa catatan dan kas bebas.', 'Usage exceeds allowance or cash. New allocation is held at zero. Review entries and free cash.') : data.status === 'STALE_CASH_CONFIRMATION' ? t('Pemasukan, kebutuhan dana, atau catatan mundur berubah. Konfirmasi kembali kas bebasmu.', 'Income, financial needs, or backdated entries changed. Confirm your free cash again.') : data.status === 'CLOSED_MONTH' ? t('Bulan ini sudah ditutup. Pemasukan terjadwal yang belum selesai tidak menambah forecast.', 'This month is closed. Unfinished payments no longer add to the forecast.') : data.status === 'PLAN_ONLY' ? t('Bulan mendatang hanya untuk perencanaan; kas belum bisa dikonfirmasi.', 'Future months are for planning; cash cannot yet be confirmed.') : data.freeCash === null ? t('Isi kas setelah menyisihkan kebutuhan wajib, utang, dan dana darurat. Saldo rekening tidak otomatis menjadi kas investasi.', 'Enter cash after setting aside essentials, debts, and emergency funds. Your bank balance is not automatically investment cash.') : t('Batas diambil dari yang lebih kecil: sisa jatah dan kas bebas setelah pemakaian. Buka Rencana untuk mengevaluasi instrumen bersumber.', 'The limit is the smaller of remaining allowance and free cash after usage. Open Plan to evaluate sourced instruments.')}</p></section>
      {plan && <div className="notice"><strong>{t('Dasar rencanamu', 'Your planning basis')}</strong><p>{t('Aktual memakai uang yang sudah diterima. Forecast menambahkan sisa pembayaran yang masih dijadwalkan pada bulan ini. Skenario konservatif dan maksimum adalah pembanding, bukan probabilitas.', 'Actual uses money already received. Forecast adds the remaining payments scheduled this month. Conservative and maximum scenarios are comparisons, not probabilities.')}</p><div className="metrics"><div><span>{t('Konservatif', 'Conservative')}</span><strong>{money(data.scenarios.conservative)}</strong></div><div><span>{t('Perkiraan', 'Expected')}</span><strong>{money(data.expectedIncome)}</strong></div><div><span>{t('Maksimum', 'Maximum')}</span><strong>{money(data.scenarios.maximum)}</strong></div></div></div>}
      <section className="card stack"><div className="between wrap"><h2>{t('Jadwal pemasukan', 'Payment schedule')}</h2><a className="text-button" href={`${tracksterUrl}/app/income`}>{t('Kelola di Trackster', 'Manage in Trackster')} ↗</a></div>
        {!complete && <div className="notice warning" role="status">{t('Rencana jatah ditahan sampai jadwal dan penerimaan cocok.', 'Planned allowance is withheld until schedules and receipts agree.')}{data.reasonCodes.includes('UNCLASSIFIED_RECEIPT') && <p>{t('Ada pemasukan tanpa stream. Hubungkan ke jadwal yang tepat, atau tandai sebagai pemasukan tidak tetap di Trackster.', 'Some receipts have no stream. Link them to the correct payment, or classify them as irregular income in Trackster.')}</p>}</div>}
        {data.incompleteStreams.map(s => <div key={s.id} className="notice warning"><strong>{s.name}</strong> · {s.reason === 'MISSING_PAYDAY' ? t('Hari pembayaran belum diisi di Trackster.', 'Payment day is missing in Trackster.') : t('Estimasi pemasukan belum lengkap di Trackster.', 'The income estimate is incomplete in Trackster.')}</div>)}
        {!data.events.length && <p className="subtle">{t('Belum ada jadwal pemasukan untuk bulan ini. Pemasukan aktual tetap dihitung.', 'No payment schedules for this month. Actual income still counts.')}</p>}
        <div>{data.events.map(event => <div className="payment-row" key={event.eventKey}><span className="date-tile mono">{event.scheduledDate.slice(-2)}</span><div className="grow"><strong>{event.streamName}</strong><div className="subtle small">{event.scheduledDate} · <EventStatus status={event.status} /></div>{event.reasonCodes.includes('RECEIPT_CHANGED') && <div className="warning-text small">{t('Receipt berubah; periksa tautannya.', 'Receipt changed; review its link.')}</div>}</div><div className="align-right"><strong className="mono small">{money(event.expected)}</strong><div className="subtle small">{t('Diterima', 'Received')} {money(event.received)}</div></div><button className="button secondary small" disabled={!!error} onClick={() => setDialog(event)}>{t('Periksa', 'Review')}</button></div>)}</div>
      </section>
      <section className="card stack"><h2>{t('Pemasukan yang menjadi dasar', 'Income used in this calculation')}</h2>{!data.receipts.length ? <p className="subtle">{t('Belum ada pemasukan CONFIRMED pada bulan ini.', 'No CONFIRMED income this month.')}</p> : data.receipts.map(receipt => <div key={receipt.id} className="income-row"><div className="grow"><strong>{receipt.description}</strong><p className="small subtle">{new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(receipt.receivedAt))} · {receipt.linked ? t('Sudah tertaut', 'Linked') : t('Belum tertaut ke jadwal', 'Not linked to a payment')}</p></div><span className="mono small">{money(receipt.amount)}</span></div>)}{data.receiptCount > data.receipts.length && <a href={`${tracksterUrl}/app/income`}>{t('Lihat seluruh pemasukan di Trackster', 'View all income in Trackster')}</a>}</section>
      <div className="notice between wrap"><div><strong>{t('Tujuan, profil, dan portofolio', 'Goals, profile, and portfolio')}</strong><p className="subtle small">{t('Lengkapi tujuan dan profil; kepemilikan serta realisasi dapat dicatat di Portofolio.', 'Complete your goal and profile; record holdings and completed movements in Portfolio.')}</p></div><Link className="button secondary" href="/setup">{t('Kelola persiapan', 'Manage setup')}</Link></div>
      <p className="mono small subtle">{t('Diperbarui', 'Updated')} {new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(data.asOf))} WIB · {data.ruleset}</p>
      {dialog && <BudgetDialog key={dialog === 'cash' ? `cash-${month}` : dialog.eventKey} budget={data} target={dialog} close={() => setDialog(null)} saved={saved} refresh={() => mutate()} />}
    </>}
  </>;
}

function EventStatus({ status }: { status: string }) {
  const { t } = usePreferences();
  const labels: Record<string, [string, string]> = { SCHEDULED: ['Terjadwal', 'Scheduled'], PARTIAL: ['Diterima sebagian', 'Partially received'], COMPLETED: ['Selesai', 'Completed'], CANCELLED: ['Dibatalkan', 'Cancelled'], MISSED: ['Terlewat', 'Missed'], NEEDS_RECONCILIATION: ['Perlu dicocokkan', 'Needs reconciliation'] };
  return t(...(labels[status] ?? [status, status]));
}

function BudgetDialog({ budget, target, close, saved, refresh }: { budget: Budget; target: 'cash' | PaymentEvent; close: () => void; saved: (b: Budget) => Promise<void>; refresh: () => Promise<unknown> }) {
  const { t, money } = usePreferences();
  const dialog = useRef<HTMLDialogElement>(null);
  const [amount, setAmount] = useState(budget.cashConfirmation?.amount ?? '');
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState(target === 'cash' ? 'SCHEDULED' : target.status === 'NEEDS_RECONCILIATION' ? 'PARTIAL' : target.status);
  const [incomeIds, setIncomeIds] = useState<number[]>(target === 'cash' ? [] : target.incomeIds);
  const [reason, setReason] = useState('');
  const [reschedule, setReschedule] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // A changed revision requires closing/reopening the form so stale confirmations cannot be reused.
  const revision = useRef(budget.revision);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); previousFocus?.focus(); };
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      const next = target === 'cash'
        ? await api.put<Budget>('/invest/cash-confirmation', { month: budget.month, amountIDR: amount, confirmed, expectedRevision: revision.current })
        : await api.patch<Budget>(`/invest/payment-events/${target.eventKey}`, { month: budget.month, expectedRevision: revision.current, expectedVersion: target.version, status, reason, incomeIds, ...(reschedule ? { rescheduleTo: reschedule } : {}) });
      await saved(next);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) { setError(t('Data berubah. Tutup formulir, periksa ringkasan terbaru, lalu buka kembali. Isian belum disimpan.', 'Data changed. Close this form, review the refreshed summary, then reopen it. Your changes have not been saved.')); await refresh(); }
      else setError(e instanceof Error ? e.message : t('Gagal menyimpan. Coba lagi.', 'Could not save. Try again.'));
    } finally { setBusy(false); }
  }
  const selectable = target === 'cash' ? [] : budget.receipts.filter(r => (r.streamId == null || r.streamId === target.streamId) && (!r.linked || target.incomeIds.includes(r.id)));
  return <dialog ref={dialog} className="invest-dialog" onCancel={e => { if (busy) e.preventDefault(); else close(); }} aria-labelledby="dialog-title">
    <form onSubmit={submit} className="stack"><div className="between"><h2 id="dialog-title">{target === 'cash' ? t('Konfirmasi kas bebas', 'Confirm free cash') : t('Cocokkan pembayaran', 'Reconcile payment')}</h2><button type="button" className="icon-button" disabled={busy} aria-label={t('Tutup', 'Close')} onClick={close}>✕</button></div>
      {target === 'cash' ? <><p className="subtle">{t('Berapa uang yang bebas disisihkan sekarang, setelah kebutuhan wajib, utang, dan dana darurat?', 'How much cash can you set aside now, after essentials, debts, and emergency funds?')}</p><label>{t('Kas bebas (IDR)', 'Free cash (IDR)')}<input autoFocus required inputMode="decimal" value={amount} pattern="(0|[1-9][0-9]{0,15})(\.[0-9]{1,2})?" onChange={e => setAmount(e.target.value)} placeholder="0.00" /></label><label className="checkbox"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} required />{t('Ini kas bebas yang sudah saya periksa, bukan seluruh saldo rekening.', 'I have checked this free cash amount; it is not my entire bank balance.')}</label></>
        : <><p><strong>{target.streamName}</strong> · {target.scheduledDate}<br /><span className="subtle">{t('Perkiraan', 'Expected')} {money(target.expected)}</span></p><label>{t('Status pembayaran', 'Payment status')}<select autoFocus value={status} onChange={e => { setStatus(e.target.value); if (['CANCELLED', 'MISSED', 'SCHEDULED'].includes(e.target.value)) setIncomeIds([]); if (e.target.value !== 'CANCELLED') setReschedule(''); }}>{['SCHEDULED', 'PARTIAL', 'COMPLETED', 'CANCELLED', 'MISSED'].map(s => <option value={s} key={s}><EventStatus status={s} /></option>)}</select></label>
          {['PARTIAL', 'COMPLETED'].includes(status) && <fieldset><legend>{t('Pemasukan terkait', 'Linked receipts')}</legend>{selectable.length ? selectable.map(r => <label className="checkbox" key={r.id}><input type="checkbox" checked={incomeIds.includes(r.id)} onChange={e => setIncomeIds(ids => e.target.checked ? [...ids, r.id] : ids.filter(id => id !== r.id))} />{r.description} · {money(r.amount)}</label>) : <p className="subtle small">{t('Belum ada receipt bulan ini yang cocok. Catat/klasifikasikan pemasukan di Trackster lebih dahulu.', 'No matching receipts this month. Record or classify income in Trackster first.')}</p>}{target.incomeIds.filter(id => !selectable.some(r => r.id === id)).map(id => <label className="checkbox" key={id}><input type="checkbox" checked={incomeIds.includes(id)} onChange={e => setIncomeIds(ids => e.target.checked ? [...ids, id] : ids.filter(v => v !== id))} />{t('Tautan di luar daftar bulan ini / sumber berubah', 'Link outside this month / changed source')} #{id}</label>)}</fieldset>}
          {status === 'CANCELLED' && <label>{t('Jadwalkan ulang (opsional)', 'Reschedule (optional)')}<input type="date" value={reschedule} onChange={e => setReschedule(e.target.value)} /></label>}
          <label>{t('Alasan / catatan pemeriksaan', 'Reason / review note')}<textarea required maxLength={300} value={reason} onChange={e => setReason(e.target.value)} /></label><p className="subtle small">{t('Tautan hanya untuk rekonsiliasi. Tidak membuat pemasukan atau mengubah saldo bank.', 'Links are for reconciliation only. They do not create income or change bank balances.')}</p></>}
      {error && <div className="notice warning" role="alert">{error}</div>}
      {!error && budget.revision !== revision.current && <div className="notice warning" role="alert">{t('Data berubah. Tutup formulir dan periksa ringkasan terbaru sebelum menyimpan.', 'Data changed. Close this form and review the updated summary before saving.')}</div>}
      <button className="button" type="submit" disabled={busy || budget.revision !== revision.current}>{busy ? t('Menyimpan…', 'Saving…') : t('Simpan', 'Save')}</button>
    </form>
  </dialog>;
}
