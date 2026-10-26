'use client';
import Link from 'next/link';
import { usePreferences } from './InvestProvider';
import { PageHeading } from './InvestShell';

export function Readiness({ area }: { area: 'market' | 'reviews' | 'sources' }) {
  const { t } = usePreferences();
  const info = {
    market: [t('Pasar', 'Market'), t('Catalog instrumen belum dikonfigurasi. Belum ada shortlist atau nominal pembelian.', 'The instrument catalog is not configured. No shortlist or purchase amounts are available yet.')],
    reviews: [t('Riwayat peninjauan', 'Review history'), t('Arsip evaluasi tersedia setelah mesin rekomendasi diaktifkan.', 'Evaluation archives become available after the recommendation engine is enabled.')],
    sources: [t('Sumber data', 'Data sources'), t('Ketahui asal angka dan cakupan yang tersedia saat ini.', 'See where the numbers come from and what is available now.')],
  }[area];
  return <><PageHeading title={info[0]} subtitle={info[1]} />
    <section className="card stack"><span className="mono kicker">{t('TERSEDIA SEKARANG', 'AVAILABLE NOW')}</span><h2>{t('Pemasukan Trackster → jatah bulanan', 'Trackster income → monthly allowance')}</h2><p className="subtle">{t('Pemasukan CONFIRMED dihitung berdasarkan tanggal diterima dalam bulan kalender WIB. Forecast berasal dari jadwal stream mingguan atau bulanan, dengan tautan receipt yang diperiksa pengguna.', 'CONFIRMED income is counted by receipt date within the WIB calendar month. Forecasts use weekly or monthly stream schedules, with receipt links reviewed by the user.')}</p><Link className="button" href="/app/plan">{t('Periksa jatah dan kas bebas', 'Review allowance and free cash')}</Link></section>
    <section className="card stack"><h2>{t('Cakupan dan kesiapan', 'Coverage and readiness')}</h2><div className="income-row"><span>{t('Jatah aktual / rencana / kas bebas', 'Actual / planned allowance / free cash')}</span><span className="badge">{t('Aktif', 'Enabled')}</span></div>
      {[
        [t('Tujuan dan profil risiko', 'Goals and risk profile'), t('Aktif', 'Enabled')],
        [t('Portofolio dan catatan pergerakan', 'Portfolio and movement records'), t('Aktif · manual', 'Enabled · manual')],
        [t('Reservasi pembelian', 'Purchase reservations'), t('Menunggu evaluasi instrumen', 'Awaiting instrument evaluations')],
        [t('Instrumen Indonesia', 'Indonesian instruments'), t('Sumber belum dikonfigurasi', 'Sources not configured')],
        [t('Global dan crypto', 'Global and crypto'), t('Rencana cakupan riset', 'Planned research coverage')],
        [t('Ranking, evaluasi, dan AI', 'Ranking, evaluation, and AI'), t('Belum aktif', 'Not enabled')],
      ].map(([label, status]) => <div className="income-row" key={label}><span>{label}</span><span className="subtle small">{status}</span></div>)}
    </section><p className="subtle small">{t('Data yang belum tersedia ditampilkan sebagai belum tersedia. Tidak ada harga, histori, atau portofolio contoh yang dianggap sebagai data akunmu.', 'Unavailable data is labelled as unavailable. No sample prices, history, or holdings are treated as your account data.')}</p></>;
}
