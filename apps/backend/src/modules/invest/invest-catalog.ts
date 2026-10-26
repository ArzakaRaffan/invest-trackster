import { Instrument } from './invest-engine';
import { InvestFactsDto, InvestSourceDto } from './invest-market.dto';

// Reading notes, not a live feed or licensed executable catalog. Never invent a quote.
const checked = '2026-10-26T05:00:00.000Z';
const source = (url: string, title: string, section: string): InvestSourceDto => ({ url, title, section, observedAt: checked, fetchedAt: checked,
  rights: 'UNKNOWN', rightsEvidence: 'Belum ada bukti hak penyimpanan/distribusi data pasar untuk deployment Invest.', store: false, display: false, analyze: false });
const base: Omit<InvestFactsDto, 'name' | 'issuer' | 'kind' | 'assetClass' | 'exposure' | 'channel' | 'sources'> = {
  region: 'INDONESIA', currency: 'IDR', tenorBand: 'LONG', lifecycle: 'UNKNOWN', reviewedAt: checked,
  reviewed: false, identityVerified: false, locked: false, contractVerified: false, exitVerified: false,
  diversification: 25, diversificationVerified: false, stressEvidence: '', note: '',
};
export const RESEARCH_CATALOG: Instrument[] = [
  { id: 'id-schroder-dana-likuid-mybca', version: 0, facts: { ...base, name: 'Schroder Dana Likuid', issuer: 'PT Schroder Investment Management Indonesia', kind: 'FUND', assetClass: 'CASH', exposure: 'Pasar uang Indonesia', channel: 'myBCA', tenorBand: 'SHORT', minimumIDR: '10000.00', payoutDays: 7,
    note: 'Catatan riset kanal myBCA. Minimum cabang berbeda. Batas maksimum biaya pengelolaan bukan biaya aktual terverifikasi. Bukan kas bebas risiko; tidak otomatis mengisi alokasi kas. NAB/histori/akses/hak pakai belum diverifikasi.',
    sources: [source('https://www.bca.co.id/id/individu/produk/investasi-dan-asuransi/reksadana/pilihan-produk-reksadana/schroder-dana-likuid', 'BCA — Schroder Dana Likuid', 'Informasi produk; minimum kanal myBCA/cabang dan batas biaya tahunan'),
      source('https://pustaka.bca.co.id/-/media/Files/others/Investasi/Prospektus/Schroder-Dana-Likuid.pdf', 'Prospektus Schroder Dana Likuid, Mei 2026', 'Bab XIII, pembayaran penjualan kembali setelah aplikasi lengkap, hlm100–101')] } },
  { id: 'id-mandiri-etf-sri-kehati', version: 0, facts: { ...base, name: 'Mandiri ETF SRI-KEHATI', issuer: 'PT Mandiri Manajemen Investasi', kind: 'ETF', assetClass: 'EQUITY', exposure: 'Saham Indonesia SRI-KEHATI', channel: 'Broker pasar sekunder — belum dipilih', unitStep: '100',
    note: 'Booklet Januari 2025 menjelaskan pembelian pasar sekunder per100 unit. Dokumen lama belum membuktikan lifecycle, quote, biaya broker, holdings, kalender, atau akses saat ini. Tidak mengambil angka lot dari kategori ETF lain.',
    sources: [source('https://mandiri-investasi.co.id/wp-content/uploads/2025/05/Booklet-KEHATI-Jan25.pdf', 'Mandiri Investasi — Booklet SRI-KEHATI Januari 2025', 'Pasar primer/sekunder, hlm9; dokumen historis')] } },
  { id: 'id-ori025t3-primary', version: 0, facts: { ...base, name: 'ORI025T3 · penawaran perdana historis', issuer: 'Pemerintah Republik Indonesia', kind: 'CONTRACTUAL', assetClass: 'BONDS', exposure: 'SBN IDR pemerintah', channel: 'Mitra distribusi penawaran perdana ORI025', tenorBand: 'SHORT', lifecycle: 'CLOSED', purchaseUntil: '2024-02-22T16:59:59.000Z', minimumIDR: '1000000.00', maturityDate: '2027-02-15',
    note: 'Penawaran perdana sudah berakhir. Tercatat untuk penelitian kontrak; keberadaan pasar sekunder tidak membuka kembali penawaran atau membuktikan harga, biaya, dan akses. Tidak menerima order.',
    sources: [source('https://api-djppr.kemenkeu.go.id/web/api/v1/media/1D8CFF97-D177-4237-A684-6DB429CB912E', 'DJPPR — ORI025T3/T6, 2024', 'Halaman1,5,8–9; jadwal penawaran, minimum dan jatuh tempo')] } },
];
