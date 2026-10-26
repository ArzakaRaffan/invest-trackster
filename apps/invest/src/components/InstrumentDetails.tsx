'use client';
import Link from 'next/link';
import useSWR from 'swr';
import { assets, type Instrument, type Market } from '@/lib/market';
import { usePreferences } from './InvestProvider';
import { PageHeading } from './InvestShell';

export function InstrumentDetails({ item: i }: { item: Instrument }) {
  const { t, money } = usePreferences(), f = i.facts, unknown = t('Belum diketahui', 'Unknown');
  const date = (value?: string) => value ? new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta' }) + ' WIB' : unknown;
  const pct = (value?: string) => value == null ? unknown : `${(Number(value) * 100).toFixed(4).replace(/\.?0+$/, '')}%`;
  const row = (label: string, value: string | number | null | undefined) => <div className="fact-row" key={label}><dt>{label}</dt><dd>{value ?? unknown}</dd></div>;
  return <div className="stack instrument-detail">
    <section><h3>{t('Identitas dan pencairan', 'Identity and payout')}</h3><dl className="fact-list">
      {row(t('Kelompok aset', 'Asset class'), t(...assets[f.assetClass]))}{row(t('Eksposur', 'Exposure'), f.exposure)}{row(t('Tenor', 'Tenor'), ({ SHORT: t('Pendek', 'Short'), MEDIUM: t('Menengah', 'Medium'), LONG: t('Panjang', 'Long') } as Record<string,string>)[f.tenorBand])}{row(t('Status pembelian', 'Purchase lifecycle'), ({ OPEN: t('Terbuka', 'Open'), CLOSED: t('Ditutup', 'Closed'), ENDED: t('Berakhir', 'Ended'), UNKNOWN: unknown } as Record<string,string>)[f.lifecycle])}
      {row(t('Minimum (IDR)', 'Minimum (IDR)'), money(f.minimumIDR ?? null))}{row(t('Kelipatan unit', 'Unit step'), f.unitStep)}{row(t('Pencairan (hari kerja)', 'Payout (business days)'), f.payoutDays)}{row(t('Jatuh tempo', 'Maturity'), f.maturityDate)}
      {row(t('Akses pribadi', 'Private access'), ({ UNKNOWN: t('Belum diperiksa', 'Not reviewed'), ACTIVE: t('Aktif', 'Active'), FUNDING_REQUIRED: t('Perlu funding/FX', 'Funding/FX required'), STALE: t('Perlu ditinjau ulang', 'Review outdated') } as Record<string,string>)[i.accessState])}{row(t('Review akses', 'Access reviewed'), i.access ? date(i.access.reviewedAt) : unknown)}{row(t('Versi yang ditinjau', 'Reviewed access version'), i.access?.instrumentVersion)}
      {row(t('Metadata diperiksa', 'Metadata reviewed'), f.reviewed ? date(f.reviewedAt) : t('Belum diverifikasi', 'Unverified'))}{row(t('Berlaku sampai', 'Valid through'), date(f.validUntil))}
    </dl></section>
    <section><h3>{t('Biaya yang tercatat', 'Recorded costs')}</h3>{!f.fees ? <p className="subtle">{t('Biaya belum lengkap. Tidak diasumsikan nol.', 'Costs are incomplete. They are not assumed to be zero.')}</p> : <><dl className="fact-list">
      {row(t('Beli', 'Buy'), `${pct(f.fees.buyRate)} + ${money(f.fees.buyFixedIDR)}`)}{row(t('Keluar', 'Exit'), `${pct(f.fees.exitRate)} + ${money(f.fees.exitFixedIDR)}`)}
      {row(t('Pengelolaan per tahun', 'Annual management'), pct(f.fees.ongoingAnnual))}{row(t('Kustodian per tahun', 'Annual custody'), pct(f.fees.custodyAnnual))}
      {row(t('FX saat beli', 'Buy FX'), pct(f.fees.fxBuyRate))}{row(t('FX pulang-pergi', 'Round-trip FX'), pct(f.fees.fxRoundTripRate))}
    </dl><p className="small subtle">{f.fees.evidence}</p></>}</section>
    <section><h3>{t('Harga, kurs dan histori', 'Price, FX and history')}</h3><dl className="fact-list">
      {row(t('Harga/NAB', 'Price/NAV'), f.quote ? `${f.quote.price} ${f.currency}` : unknown)}{row(t('Waktu harga', 'Price timestamp'), date(f.quote?.asOf))}{row(t('Waktu pengambilan', 'Fetched timestamp'), date(f.quote?.fetchedAt))}
      {row(t('Kurs ke IDR', 'FX to IDR'), f.quote?.fxToIDR)}{row(t('Waktu kurs', 'FX timestamp'), date(f.quote?.fxAsOf))}{row(t('Cakupan kalender sampai', 'Calendar covered through'), date(f.quote?.calendarThrough))}
      {row(t('Bulan histori tercatat', 'Recorded history months'), f.history?.months.length)}{row(t('Cakupan sesi', 'Session coverage'), f.history ? `${f.history.observedSessions}/${f.history.expectedSessions}` : unknown)}
    </dl>{f.history && <><p className="small subtle">{[...f.history.months].sort()[0]} → {[...f.history.months].sort().at(-1)} · {f.history.convention}</p><p className="small subtle">{f.history.evidence}</p></>}<p className="small subtle">{t('Histori adalah catatan pemeriksaan bersumber, bukan audit seri otomatis. Belum ada perhitungan return, volatilitas atau drawdown terverifikasi.', 'History is a sourced review record, not an automated series audit. Verified return, volatility and drawdown calculations are not available.')}</p></section>
    <section><h3>{t('Bukti risiko', 'Risk evidence')}</h3><p>{f.stressEvidence || unknown}</p><p className="subtle small">{t('Skenario ini hipotetis dan bukan batas rugi yang dijamin. Kesesuaian tetap mengikuti profil, data dan risiko seluruh pot.', 'Scenarios are hypothetical and not a guaranteed loss limit. Suitability still depends on profile, evidence and whole-pot risk.')}</p></section>
  </div>;
}

export function InstrumentComparison({ ids }: { ids: string }) {
  const { t } = usePreferences();
  const valid = /^[a-zA-Z0-9_-]{1,80}(,[a-zA-Z0-9_-]{1,80}){1,2}$/.test(ids);
  const { data, error, mutate } = useSWR<Market>(valid ? `/invest/instruments/compare?ids=${encodeURIComponent(ids)}` : null);
  return <><PageHeading title={t('Bandingkan fakta.', 'Compare the facts.')} subtitle={t('Maksimal tiga instrumen sebanding. Tidak menjumlahkan alternatif atau memprediksi hasil.', 'Up to three comparable instruments. Alternatives are not combined and returns are not predicted.')} /><Link className="text-button" href="/app/market">← {t('Kembali ke pasar', 'Back to market')}</Link>
    {(!valid || error) ? <div className="notice warning" role="alert">{t('Pilih 2–3 instrumen berbeda dengan kelompok pembanding yang sama. Data juga mungkin sudah berubah.', 'Choose 2–3 different instruments in the same peer group. Data may also have changed.')} {valid && <button className="text-button" onClick={() => void mutate()}>{t('Coba lagi', 'Retry')}</button>}</div> : !data ? <p role="status">{t('Memuat perbandingan…', 'Loading comparison…')}</p> : <div className="comparison-grid">{data.items.map(i => <article className="card stack" key={i.id} data-testid="comparison-instrument"><h2>{i.facts.name}</h2><p className="subtle">{i.facts.channel}</p><span className="badge">{i.reasons.length ? t('Perlu pemeriksaan', 'Needs review') : t('Lolos pemeriksaan data', 'Data checks passed')}</span><InstrumentDetails item={i} /><Link className="button secondary" href={`/app/market/${i.id}`}>{t('Sumber dan kelayakan', 'Sources and eligibility')}</Link></article>)}</div>}
  </>;
}
