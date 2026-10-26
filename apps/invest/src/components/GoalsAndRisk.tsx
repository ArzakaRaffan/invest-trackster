'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import useSWR, { useSWRConfig } from 'swr';
import { api, ApiError } from '@/lib/api';
import type { InvestGoal, PortfolioState, RiskAnswers } from '@/lib/types';
import { usePreferences } from './InvestProvider';
import { PageHeading } from './InvestShell';
import { InvestDialog, moneyPattern, SaveError, useInvestWrite } from './InvestForms';

const classes = [['Likuiditas', 'Liquidity'], ['Konservatif', 'Conservative'], ['Seimbang', 'Balanced'], ['Pertumbuhan', 'Growth']] as const;
export function RiskSummary({ goal }: { goal: InvestGoal }) {
  const { t, money } = usePreferences();
  const p = goal.profile;
  const missingLabels: Record<string, [string, string]> = { T1: ['batas penurunan', 'loss tolerance'], T2: ['respons penurunan', 'decline response'], T3: ['penundaan tujuan', 'goal delay'], T4: ['kenyamanan fluktuasi', 'fluctuation comfort'], essentialExpenseIDR: ['pengeluaran esensial', 'essential expenses'], liquidReserveIDR: ['cadangan likuid', 'liquid reserve'], lossCapacityIDR: ['kemampuan rugi', 'loss capacity'], incomeStable: ['stabilitas pemasukan', 'income stability'], urgentObligations: ['kewajiban mendesak', 'urgent obligations'], nearTermNeed: ['kebutuhan dekat', 'short-term needs'], hasDeficit: ['status defisit', 'deficit status'], expensiveDebt: ['utang mahal', 'expensive debt'], needDate: ['tanggal tujuan', 'goal date'], liquidityDays: ['waktu pencairan', 'payout time'], k1: ['pemahaman diversifikasi', 'diversification knowledge'], k2: ['pemahaman obligasi', 'bond knowledge'], k3: ['pemahaman FX/crypto', 'FX/crypto knowledge'], cashConfirmation: ['kas bebas', 'free cash'] };
  const label = (n: number | null) => n == null ? t('Belum lengkap', 'Incomplete') : t(classes[n][0], classes[n][1]);
  return <section className="card stack" data-testid="risk-summary"><div className="between wrap"><div><span className="mono kicker">{t('TUJUAN AKTIF', 'ACTIVE GOAL')}</span><h2>{goal.name}</h2></div><span className="badge">{label(p?.riskClass ?? null)}</span></div>
    <p className="subtle">{goal.needDate ?? t('Tanggal belum diisi', 'Date not set')} · {goal.targetAmountIDR == null ? t('Tanpa target nominal', 'No amount target') : money(goal.targetAmountIDR)}</p>
    {!p ? <p>{t('Lengkapi jawaban risiko agar rencana mengikuti kebutuhanmu.', 'Complete your risk answers so the plan reflects your needs.')}</p> : <>
      <div className="metrics"><div><span>{t('Kemauan', 'Willingness')}</span><strong>{label(p.tolerance)}</strong></div><div><span>{t('Kemampuan', 'Capacity')}</span><strong>{label(p.capacity)}</strong></div><div><span>{t('Horizon', 'Horizon')}</span><strong>{label(p.horizon)}</strong></div></div>
      <p className="subtle">{t('Profil mengikuti batas terendah dari ketiganya. Kerugian yang masih dapat ditanggung:', 'The profile follows the lowest of these three limits. Loss you can bear:')} {money(p.lossCapacityIDR)}.</p>
      <p className="small subtle">{t('Cadangan', 'Reserve')}: {p.reserveMonths ?? '—'} {t('bulan; horizon', 'months; horizon')}: {p.horizonMonths ?? '—'} {t('bulan lengkap.', 'complete months.')}</p>
      {!!p.missing.length && <p className="small warning-text">{t('Lengkapi', 'Complete')}: {p.missing.map(k => missingLabels[k] ? t(missingLabels[k][0], missingLabels[k][1]) : k).join(', ')}.</p>}
      {p.status !== 'READY' && <div className="notice warning" role="status">{p.status === 'NEEDS_INPUT' ? t('Masih ada data yang perlu dilengkapi.', 'Some inputs still need completing.') : t('Jawaban perlu ditinjau dan dikonfirmasi kembali.', 'Review and confirm your answers again.')}{p.missing.includes('cashConfirmation') && <p>{t('Konfirmasi kas bebas setelah tujuan dan kebutuhan dana terbaru tersimpan.', 'Confirm free cash after saving your latest goal and financial needs.')}</p>}{p.missing.includes('essentialExpenseIDR') && <p>{t('Pengeluaran esensial harus lebih dari nol.', 'Essential expenses must be greater than zero.')}</p>}{p.reasons.includes('GOAL_CHANGED') && <p>{t('Tujuan berubah sejak jawaban terakhir.', 'The goal changed since your last answers.')}</p>}{p.reasons.includes('PROFILE_EXPIRED') && <p>{t('Sudah 12 bulan sejak konfirmasi terakhir.', 'It has been 12 months since your last confirmation.')}</p>}</div>}
      {(p.capacity === 0 || p.tolerance === 0 || p.horizon === 0) && <div className="notice">{t('Dana berisiko ditunda. Tinjau kebutuhan likuiditas dan cadangan; kas juga tetap mempunyai risiko.', 'Risky allocations are deferred. Review liquidity needs and reserves; cash also carries risks.')}</div>}
      <p className="small subtle">{t('Batas skenario bukan jaminan kerugian maksimum. Pemahaman produk dinilai terpisah dan tidak menaikkan kelas risiko.', 'Scenario limits do not guarantee a maximum loss. Product knowledge is assessed separately and never raises your risk class.')}</p>
    </>}
    <Link href="/setup" className="text-button">{t('Kelola tujuan dan profil', 'Manage goals and profile')} →</Link>
  </section>;
}

export function PlanProfile() {
  const { t } = usePreferences();
  const { data, error, mutate } = useSWR<PortfolioState, ApiError>('/invest/portfolio');
  if (error) return <div className="notice warning" role="alert">{t('Profil belum dapat dimuat.', 'Could not load profile.')} <button className="text-button" onClick={() => void mutate()}>{t('Coba lagi', 'Retry')}</button></div>;
  if (!data) return <div role="status" className="card">{t('Memuat tujuan…', 'Loading goal…')}</div>;
  const active = data.goals.find(g => g.status === 'ACTIVE');
  return active ? <RiskSummary goal={active} /> : <div className="notice between wrap"><p>{t('Mulai dengan satu tujuan investasi.', 'Start with one investment goal.')}</p><Link className="button" href="/setup">{t('Siapkan tujuan', 'Set up a goal')}</Link></div>;
}

export function GoalForm({ state, goal, done }: { state: PortfolioState; goal?: InvestGoal; done: () => void }) {
  const { t } = usePreferences();
  const [name, setName] = useState(goal?.name ?? ''), [target, setTarget] = useState(goal?.targetAmountIDR ?? ''), [date, setDate] = useState(goal?.needDate ?? '');
  const [days, setDays] = useState(goal?.liquidityDays?.toString() ?? ''), [status, setStatus] = useState(goal?.status ?? (state.activeGoalId ? 'DRAFT' : 'ACTIVE'));
  const [declaration, setDeclaration] = useState(goal?.holdingsDeclaration ?? 'UNKNOWN');
  const w = useInvestWrite(state.revision, done);
  return <InvestDialog title={goal ? t('Ubah tujuan', 'Edit goal') : t('Tujuan baru', 'New goal')} close={done} busy={w.busy}><form className="stack" onSubmit={e => { e.preventDefault(); void w.save(goal ? `/invest/goals/${goal.id}` : '/invest/goals', goal ? 'patch' : 'post', { name, targetAmountIDR: target || null, needDate: date || null, liquidityDays: days === '' ? null : Number(days), status, holdingsDeclaration: declaration, ...(goal ? { expectedVersion: goal.version } : {}) }); }}>
    <fieldset className="form-fields stack" disabled={w.locked}>
      <label>{t('Nama tujuan', 'Goal name')}<input autoFocus required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder={t('Misalnya: masa pensiun', 'For example: retirement')} /></label>
      <label>{t('Target dana IDR (opsional)', 'Target amount IDR (optional)')}<input inputMode="decimal" pattern={moneyPattern} value={target} onChange={e => setTarget(e.target.value)} /></label>
      <label>{t('Tanggal dana dibutuhkan', 'Date funds are needed')}<input type="date" min="2000-01-01" max="2099-12-31" value={date} onChange={e => setDate(e.target.value)} /></label>
      <label>{t('Batas waktu pencairan (hari kerja)', 'Maximum payout time (business days)')}<input type="number" min={0} max={36500} step={1} value={days} onChange={e => setDays(e.target.value)} /></label>
      <label>{t('Status tujuan', 'Goal status')}<select value={status} onChange={e => setStatus(e.target.value as 'ACTIVE' | 'DRAFT')}><option value="ACTIVE">{t('Aktif · memakai jatah', 'Active · uses allowance')}</option><option value="DRAFT">{t('Draft · disimpan dahulu', 'Draft · save for later')}</option></select></label>
      <p className="small subtle">{t('Hanya satu tujuan aktif. Mengaktifkan tujuan ini akan menjadikan tujuan sebelumnya draft.', 'Only one goal is active. Activating this goal moves the previous one to draft.')}</p>
      <label>{t('Portofolio awal tujuan ini', 'Starting portfolio for this goal')}<select value={declaration} onChange={e => setDeclaration(e.target.value as InvestGoal['holdingsDeclaration'])}><option value="UNKNOWN">{t('Belum saya periksa', 'Not checked yet')}</option><option value="EMPTY">{t('Saya mulai dari kosong', 'I am starting empty')}</option><option value="ENTERED">{t('Ada kepemilikan yang perlu dicatat', 'I have holdings to record')}</option></select></label>
    </fieldset><SaveError error={w.error} /><button className="button" disabled={w.busy || w.conflict}>{w.button}</button>
  </form></InvestDialog>;
}

export function RiskForm({ goal, state, done }: { goal: InvestGoal; state: PortfolioState; done: () => void }) {
  const { t } = usePreferences();
  const [a, setA] = useState<RiskAnswers>(goal.profile?.answers ?? {}), [confirmed, setConfirmed] = useState(false), [ack, setAck] = useState(false);
  const w = useInvestWrite(state.revision, done);
  const set = (key: keyof RiskAnswers, value: unknown) => { setA(old => ({ ...old, [key]: value })); setAck(false); setConfirmed(false); };
  const questions: [keyof RiskAnswers, string, string[]][] = [
    ['t1', t('Seberapa besar penurunan nilai pot investasi tujuan ini yang masih dapat kamu terima tanpa mengubah rencana?', 'How much decline in this goal’s investment pot could you accept without changing your plan?'), [t('Tidak menerima penurunan modal', 'No loss of capital'), t('Sampai 10%', 'Up to 10%'), t('Sampai 20%', 'Up to 20%'), t('Sampai 35%', 'Up to 35%')]],
    ['t2', t('Jika nilai pot turun 15% selama satu tahun sementara kebutuhan dan tujuan tetap, apa respons yang paling mendekati kamu?', 'If the pot fell 15% over one year while needs and goals stayed the same, how would you respond?'), [t('Keluar dari seluruh aset yang turun', 'Exit all declining assets'), t('Mengurangi sebagian besar eksposur', 'Reduce most exposure'), t('Mempertahankan sambil meninjau', 'Hold while reviewing'), t('Tetap mengikuti rencana kontribusi setelah meninjau penyebabnya', 'Follow the contribution plan after reviewing the causes')]],
    ['t3', t('Jika pencapaian tujuan dapat tertunda akibat pasar, berapa lama penundaan yang nyaman untukmu?', 'If markets delayed your goal, how long a delay would you be comfortable with?'), [t('Tidak dapat tertunda', 'No delay'), t('Sampai 6 bulan', 'Up to 6 months'), t('Sampai 2 tahun', 'Up to 2 years'), t('Lebih dari 2 tahun', 'More than 2 years')]],
    ['t4', t('Untuk dana yang sudah dipisahkan dari kebutuhan hidup, seberapa nyaman kamu melihat nilainya berfluktuasi?', 'How comfortable are you with fluctuations in money already separated from living needs?'), [t('Memilih dana tetap dalam kas', 'Prefer keeping funds in cash'), t('Menerima fluktuasi kecil', 'Accept small fluctuations'), t('Menerima fluktuasi besar setelah memahami instrumen', 'Accept large fluctuations after understanding the instrument'), t('Menerima fluktuasi besar berulang dan tetap mengikuti rencana setelah review', 'Accept repeated large fluctuations and follow the plan after review')]],
  ];
  const capacity: [keyof RiskAnswers, string][] = [['essentialExpenseIDR', t('Pengeluaran esensial bulanan (IDR)', 'Monthly essential expenses (IDR)')], ['liquidReserveIDR', t('Cadangan likuid di luar pot (IDR)', 'Liquid reserve outside the pot (IDR)')], ['lossCapacityIDR', t('Kerugian yang dapat ditanggung (IDR)', 'Loss you can bear (IDR)')]];
  const bools: [keyof RiskAnswers, string][] = [['incomeStable', t('Pemasukan saya stabil', 'My income is stable')], ['urgentObligations', t('Ada kewajiban mendesak yang belum ditangani', 'I have unresolved urgent obligations')], ['nearTermNeed', t('Ada kebutuhan dana dekat yang belum dipisahkan', 'I have short-term needs not yet funded')], ['hasDeficit', t('Keuangan saya sedang defisit', 'My finances are in deficit')], ['expensiveDebt', t('Ada utang mahal yang belum ditangani', 'I have unresolved expensive debt')]];
  const knowledge: [keyof RiskAnswers, string][] = [['k1', t('Diversifikasi tidak menghilangkan semua risiko.', 'Diversification does not remove every risk.')], ['k2', t('Obligasi atau dana obligasi dapat turun sebelum jatuh tempo.', 'Bonds or bond funds can decline before maturity.')], ['k3', t('Mata uang asing dan crypto dapat menambah kerugian.', 'Foreign currencies and crypto can add losses.')]];
  return <form className="card stack" onSubmit={(e: FormEvent) => { e.preventDefault(); void w.save(`/invest/goals/${goal.id}/profile`, 'put', { expectedVersion: goal.profile?.version ?? 0, answers: a, confirmed, conflictsAcknowledged: ack, ...(ack ? { reviewHash: goal.profile?.reviewHash } : {}) }); }}>
    <h2>{t('Kenali batasmu', 'Know your limits')}</h2><p className="subtle">{t('Jawab untuk tujuan ini. Penurunan nyata dapat lebih besar dan pemulihan tidak dijamin. Kamu boleh menyimpan jawaban yang belum lengkap sebagai draft.', 'Answer for this goal. Actual declines can be larger and recovery is not guaranteed. You can save incomplete answers as a draft.')}</p>
    <fieldset className="form-fields stack" disabled={w.locked}>
      {questions.map(([key, question, options]) => <label key={key}>{question}<select aria-label={key.toUpperCase()} value={a[key]?.toString() ?? ''} onChange={e => set(key, e.target.value === '' ? undefined : Number(e.target.value))}><option value="">{t('Pilih jawaban', 'Choose an answer')}</option>{options.map((o, i) => <option key={i} value={i}>{o}</option>)}</select>{key !== 't1' && a[key] != null && <span className="small subtle">{options[Number(a[key])]}</span>}</label>)}
      <div className="dashed" /><h2>{t('Kemampuan keuangan', 'Financial capacity')}</h2><p className="subtle small">{t('Cadence mingguan tidak berarti tidak stabil. Cadangan darurat berada di luar portofolio tujuan.', 'Weekly income is not necessarily unstable. Emergency reserves stay outside this goal’s portfolio.')}</p>
      {capacity.map(([key, label]) => <label key={key}>{label}<input inputMode="decimal" pattern={moneyPattern} value={a[key]?.toString() ?? ''} onChange={e => set(key, e.target.value || undefined)} /></label>)}
      {bools.map(([key, label]) => <label key={key}>{label}<select value={a[key] == null ? '' : String(a[key])} onChange={e => set(key, e.target.value === '' ? undefined : e.target.value === 'true')}><option value="">{t('Belum dijawab', 'Not answered')}</option><option value="true">{t('Ya', 'Yes')}</option><option value="false">{t('Tidak', 'No')}</option></select></label>)}
      <div className="dashed" /><h2>{t('Pemahaman produk', 'Product knowledge')}</h2>
      {knowledge.map(([key, label]) => <label key={key}>{label}<select value={a[key]?.toString() ?? ''} onChange={e => set(key, e.target.value || undefined)}><option value="">{t('Pilih jawaban', 'Choose an answer')}</option><option value="TRUE">{t('Benar', 'True')}</option><option value="FALSE">{t('Salah', 'False')}</option><option value="UNSURE">{t('Belum tahu', 'Unsure')}</option></select>{a[key] && a[key] !== 'TRUE' && <span className="notice small">{t('Pernyataan ini benar. Diversifikasi, nilai pasar, dan eksposur mata uang tetap membawa risiko. Pelajari kembali lalu jawab ulang; produk terkait ditahan sampai pemahaman sesuai.', 'This statement is true. Diversification, market prices, and currency exposure still carry risks. Review it and answer again; related products are withheld until understood.')}</span>}</label>)}
      <label className="checkbox"><input type="checkbox" checked={a.cryptoOptIn ?? false} onChange={e => set('cryptoOptIn', e.target.checked)} />{t('Saya ingin mempertimbangkan crypto ketika seluruh syarat terpenuhi.', 'I want to consider crypto when all conditions are met.')}</label>
      {a.cryptoOptIn && <label>{t('Batas crypto yang diminta (%)', 'Requested crypto limit (%)')}<input type="number" min={0} max={5} step="0.01" value={a.cryptoPercent ?? '0'} onChange={e => set('cryptoPercent', e.target.value)} /><span className="small subtle">{t('Maksimal 5%, hanya kelas Pertumbuhan dengan pemahaman, akses, dan data yang memadai. Saat ini belum ada rekomendasi nominal crypto.', 'Up to 5%, only for Growth with sufficient knowledge, access, and data. Crypto amounts are not available yet.')}</span></label>}
      {!!goal.profile?.conflicts.length && <div className="notice warning"><p>{t('Batas rugi nol bertentangan dengan respons menghadapi fluktuasi besar. Tinjau jawabanmu; batas terendah tetap berlaku.', 'A zero loss limit conflicts with your response to large fluctuations. Review your answers; the lower limit still applies.')}</p><label className="checkbox"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />{t('Saya sudah meninjau konflik pada jawaban tersimpan ini.', 'I have reviewed the conflict in these saved answers.')}</label></div>}
      <label className="checkbox"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{t('Saya sudah memeriksa seluruh jawaban ini sesuai keadaan dan tujuan saya sekarang.', 'I have reviewed these answers against my current circumstances and goal.')}</label>
    </fieldset><SaveError error={w.error} /><button className="button" disabled={w.busy || w.conflict}>{w.uncertain || w.busy ? w.button : confirmed ? t('Simpan dan konfirmasi', 'Save and confirm') : t('Simpan draft jawaban', 'Save draft answers')}</button>
  </form>;
}

function SetupCash({ state }: { state: PortfolioState }) {
  const { t } = usePreferences(), { mutate } = useSWRConfig();
  const [amount, setAmount] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const b = state.budget;
  return <form className="card stack" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await api.put('/invest/cash-confirmation', { month: b.month, amountIDR: amount, confirmed: true, expectedRevision: b.revision }); await mutate('/invest/portfolio'); setAmount(''); } catch (e) { setError(e instanceof Error ? e.message : t('Gagal menyimpan', 'Save failed')); } finally { setBusy(false); } }}>
    <h2>{t('Kas bebas saat ini', 'Free cash right now')}</h2><p>{t('Isi dana kontribusi baru setelah kebutuhan hidup, kewajiban, dana darurat, dan dana yang sudah masuk pot tujuan dipisahkan.', 'Enter new contribution cash after separating living needs, obligations, emergency reserves, and money already in the goal’s pot.')}</p>
    <label>{t('Kas bebas (IDR)', 'Free cash (IDR)')}<input required inputMode="decimal" pattern={moneyPattern} value={amount} onChange={e => setAmount(e.target.value)} disabled={busy} /></label>
    <label className="checkbox"><input type="checkbox" required disabled={busy} />{t('Jumlah ini sudah saya periksa.', 'I have checked this amount.')}</label>
    <SaveError error={error} /><button className="button" disabled={busy}>{busy ? t('Menyimpan…', 'Saving…') : t('Konfirmasi kas', 'Confirm cash')}</button>
    {b.freeCash !== null && <p role="status" className="notice success">{t('Kas terkonfirmasi. Kamu dapat memeriksa profil dan sisa jatah di Rencana.', 'Cash is confirmed. Review your profile and remaining allowance in Plan.')}</p>}
  </form>;
}

export function SetupWorkspace() {
  const { t } = usePreferences();
  const { data, error, mutate } = useSWR<PortfolioState, ApiError>('/invest/portfolio');
  const [step, setStep] = useState(0), [editing, setEditing] = useState<InvestGoal | 'new' | null>(null), [message, setMessage] = useState('');
  const active = data?.goals.find(g => g.status === 'ACTIVE');
  const labels = [t('Tujuan', 'Goal'), t('Profil risiko', 'Risk profile'), t('Portofolio awal', 'Starting portfolio'), t('Kas bebas', 'Free cash')];
  return <><PageHeading title={t('Rencana yang sesuai kamu.', 'A plan that fits you.')} subtitle={t('Lengkapi bertahap. Draft tetap tersimpan dan jatah bulanan tetap bisa dibaca.', 'Complete this step by step. Drafts stay saved and your monthly allowance remains available.')} />
    <nav className="setup-steps" aria-label={t('Langkah persiapan', 'Setup steps')}>{labels.map((l, i) => <button type="button" key={l} className={`button ${i === step ? '' : 'secondary'}`} aria-current={i === step ? 'step' : undefined} onClick={() => { setStep(i); setMessage(''); }}>{i + 1}. {l}</button>)}</nav>
    {error && <div className="notice warning" role="alert">{t('Belum dapat memuat data.', 'Could not load data.')} <button className="text-button" onClick={() => void mutate()}>{t('Coba lagi', 'Retry')}</button></div>}
    {!data && !error && <div className="card" role="status">{t('Memuat persiapan…', 'Loading setup…')}</div>}
    {message && <div className="notice success" role="status">{message}</div>}
    {data && <>
      {step === 0 && <section className="card stack"><div className="between wrap"><h2>{t('Tujuan investasimu', 'Your investment goals')}</h2><button className="button secondary" disabled={!!error} onClick={() => setEditing('new')}>{t('Tambah tujuan', 'Add goal')}</button></div>{!data.goals.length && <p className="subtle">{t('Belum ada tujuan. Buat satu tujuan aktif untuk jatah bulananmu.', 'No goals yet. Create one active goal for your monthly allowance.')}</p>}{data.goals.map(g => <div className="income-row" key={g.id}><div className="grow"><strong>{g.name}</strong><p className="subtle small">{g.status === 'ACTIVE' ? t('Aktif', 'Active') : t('Draft', 'Draft')} · {g.needDate ?? t('Tanggal belum diisi', 'No date yet')}</p></div><button className="button secondary" disabled={!!error} onClick={() => setEditing(g)}>{t('Ubah', 'Edit')}</button></div>)}</section>}
      {step === 1 && (active ? <><RiskSummary goal={active} /><RiskForm key={`${active.id}-${active.profile?.version ?? 0}`} goal={active} state={data} done={() => { void mutate(); setMessage(t('Jawaban tersimpan. Periksa ringkasan profil di atas.', 'Answers saved. Review the profile summary above.')); }} /></> : <div className="notice">{t('Aktifkan tujuan pada langkah pertama.', 'Activate a goal in the first step.')}</div>)}
      {step === 2 && <section className="card stack"><h2>{t('Dana yang sudah dimiliki', 'Money you already own')}</h2><p>{t('Catat kepemilikan sebelum pembelian berikutnya. Kepemilikan awal tidak memakai jatah bulan ini. Dana darurat tetap berada di luar pot.', 'Record existing holdings before your next purchase. Opening holdings do not consume this month’s allowance. Emergency reserves remain outside the pot.')}</p><p className="notice">{active?.holdingsDeclaration === 'EMPTY' ? t('Kamu menyatakan mulai dari kosong.', 'You declared an empty starting portfolio.') : active?.holdingsDeclaration === 'ENTERED' ? t('Lengkapi kepemilikan yang kamu miliki di Portofolio.', 'Complete your existing holdings in Portfolio.') : t('Keadaan awal belum dinyatakan. Pilih mulai kosong atau ada kepemilikan pada tujuan.', 'Starting state is not declared. Choose empty or existing holdings in your goal.')}</p><div className="actions">{active && <button className="button secondary" onClick={() => setEditing(active)}>{t('Ubah keadaan awal', 'Edit starting state')}</button>}<Link className="button" href="/app/portfolio">{t('Buka Portofolio', 'Open Portfolio')}</Link></div></section>}
      {step === 3 && <><SetupCash state={data} /><Link href="/app/plan" className="button secondary">{t('Lihat rencana', 'View plan')} →</Link></>}
      <div className="between"><button className="button secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>{t('Sebelumnya', 'Previous')}</button><button className="button" disabled={step === 3} onClick={() => { setStep(step + 1); setMessage(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{t('Berikutnya', 'Next')}</button></div>
      {editing && <GoalForm state={data} goal={editing === 'new' ? undefined : editing} done={() => { setEditing(null); void mutate(); }} />}
    </>}
  </>;
}
