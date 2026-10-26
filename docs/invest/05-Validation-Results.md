# 05 — Hasil Riset dan Validasi Metode v0.1

[Panduan utama](README.md) · [Keputusan](00-Decisions.md) · [Literatur](01-Investment-Research.md) · [Metode konkret](04-Methodology.md)

**Pemeriksaan: 2026-10-13.** Tujuan penelitian: menilai keterjelasan, aritmetika, mekanisme risiko dan perilaku metode sebelum PRD. Metode `invest-method-v0.1` kini disetujui sebagai baseline melalui D12. Penelitian tetap tidak mengukur preferensi finansial Arzaka atau membuktikan return unggul; persetujuan tidak mengubah hasil/lingkup penelitian.

Artefak: [skrip penelitian](research/method_checks.py) dan [hasil JSON](research/results-v0.1.json). Skrip memakai Python standard library; tidak mengakses database, kredensial, atau API AI Trackster. Respons harga publik hanya diproses di memori; repo menyimpan agregat, URL, dan hash, bukan histori mentah.

## 1. Ruang lingkup dan reproduksi

Jalankan dari root repo:

```powershell
python docs/invest/research/method_checks.py
python docs/invest/research/method_checks.py --history
```

Perintah pertama offline, menghasilkan hasil assertion/simulasi sintetis. Perintah kedua menambahkan GET histori publik Yahoo tanpa akun, satu simbol per request dan timeout 20 detik. Tidak menjalankan frontend/backend atau menulis saldo. Hasil tersimpan terakhir dibuat pada **2026-10-13 09:12:08 UTC / 16:12:08 WIB**; sumber bisa direvisi sehingga run berikutnya dapat berbeda. Hash SHA-256 mengidentifikasi respons saat run, tetapi histori mentah tidak diarsipkan untuk replay persis.

Skrip adalah prototype beberapa perhitungan inti; bukan implementasi penuh gate, skoring fitur dari sumber, penyimpanan ledger, atau validasi narasi AI. Fixture AI memakai field terstruktur, bukan respons model nyata. Jumlah assertion adalah pemeriksaan berulang pada kombinasi input, bukan jumlah studi independen atau pengguna.

## 2. Pengujian sintetis — hasil yang diamati

**Jenis: PERCOBAAN SINTETIS.** Sumber: script/result lokal, 2026-10-13. Total **47.596 assertion lulus**, termasuk enumerasi **6.144 kombinasi profil**. Semua input dan nama instrumen fixture sintetis. Tidak ada data pribadi.

| Area | Pemeriksaan / hasil | Konteks, keterbatasan, dan dampak produk |
| --- | --- | --- |
| Bulan dan realisasi | 7 assertion: lima payday Jumat Oktober 2026, empat Februari 2026, tanggal 31 dipotong ke 28/29 Februari, boundary WIB, PENDING/INTERNAL tidak masuk aktual, partial/finished event tidak menggandakan forecast. | Fixture lengkap, bukan API bulanan Trackster. Mendukung M1; reconciliation event nyata masih perlu implementasi. |
| Pembulatan | 4.007 assertion: Decimal jatah, nominal kecil, 0–1.000 sen dibagi empat template; jumlah tepat dan nonnegatif. | Bukan audit penyimpanan Decimal/JSON/frontend. Memverifikasi prinsip konservasi nominal M1/M6. |
| Profil | 24.576 assertion pada 6.144 kombinasi serta 18.432 pemeriksaan monotonicity jawaban. Kelas tidak melampaui T1, reserve rendah/horizon pendek membatasi hasil, blocked menghasilkan kelas 0, jawaban lebih tinggi tidak menurunkan kelas. | Tidak mengukur pemahaman, reliabilitas psikometri, preferensi atau perilaku pengguna. Gate missing/conflict perlu UI/runtime. Mendukung algoritme kelas M2. |
| Alokasi/stress | 11 assertion: bobot berjumlah satu, nonnegatif, stress yang dimodelkan ≤L, crypto opt-in dibatasi, loss capacity lebih kecil mengurangi eksposur, L=0 menahan seluruh dana. | Lulus untuk shock yang diberikan, bukan batas rugi nyata. Mendukung M3 dengan batas yang dibahas di §3. |
| Kontribusi holdings | 17 assertion: kontribusi menjumlah ke B, tidak membeli kelompok overweight, usulan yang melampaui batas stress ditahan sebagai kas. | Empat portofolio sintetis; data aktual/FX/mapping tujuan belum dihubungkan. Portofolio lama dapat tetap terlalu berisiko. |
| Ranking | 27 assertion: kandidat gagal gate/biaya unknown tersisih; 24 permutasi input tidak mengubah urutan; biaya lebih rendah menaikkan skor; tie-break ID stabil. A=92,0 dan B=77,0 pada fitur lain identik. | Hanya ranking dari fitur terverifikasi yang diasumsikan fixture. Tidak memvalidasi fitur nyata, cutoff, top-3 atau kemampuan memprediksi return. Mendukung determinisme M5. |
| Order/minimum | 504 assertion: 252 kombinasi budget/price/lot/fee; principal+fee+residu=budget, unit sesuai lot, tidak overspend. | Tarif sintetis, bukan biaya broker tertentu; fee FX/exit serta step fractional masih perlu implementasi produk. |
| Ledger | 2 assertion: pengulangan ID pembelian tidak menambah pemakaian, koreksi jatah di bawah pemakaian menghasilkan sisa executable nol. | Dictionary lokal tidak membuktikan atomisitas DB, race, atau idempotency runtime. |
| Kontrak AI | 4 assertion: perubahan nominal/urutan/sumber ditolak pada validator field. | Tidak menguji teks bebas, model nyata, prompt injection, klaim salah, atau latency. V6 produksi tetap belum lulus. |
| Input tidak valid | 9 assertion: nilai negatif/NaN, jawaban tidak lengkap/out-of-range, crypto pada profil terlarang/melebihi cap, bobot tidak valid, payday dan price tidak valid ditolak. | Cakupan prototype, bukan validasi semua trust boundary aplikasi. |

## 3. Stress dan sensitivitas terhadap asumsi

**Jenis: PERCOBAAN SINTETIS.** Sumber: M3 dan hasil JSON; tanggal 2026-10-13. Ketika loss capacity rupiah tidak lebih membatasi, target disesuaikan sampai tiga shock desain memenuhi L. Hasil ini dapat dihitung ulang dari bobot, tanpa harga pasar.

| Kelas / L | Kas / obligasi / ekuitas sesudah penyesuaian | Kerugian terbesar pada shock desain | Kerugian pada shock tambahan: obligasi −25%, ekuitas −80% |
| --- | --- | ---: | ---: |
| Likuiditas / 0% | 100% / 0% / 0% | 0% | 0% nominal dalam model |
| Konservatif / 10% | 61,90% / 28,57% / 9,52% | 10% | 14,76% |
| Seimbang / 20% | 41,67% / 33,33% / 25% | 20% | 28,33% |
| Pertumbuhan / 35% | 22,22% / 25,93% / 51,85% | 35% | 47,96% |

**Temuan:** angka toleransi tidak dapat dipromosikan menjadi batas kerugian produk. Shock yang lebih berat melampaui L meskipun pemeriksaan desain lulus. Dampak: UI harus menyebut hasil sebagai skenario dan tidak menampilkan label “rugi maksimal 10/20/35%”. Parameter perlu dievaluasi lagi dengan produk/FX/risiko kredit yang benar-benar masuk universe.

Kelas 3 dengan opt-in crypto 5% menghasilkan bobot efektif kas 25,88%, obligasi 24,71%, ekuitas 45,29%, crypto 4,12% setelah stress adjustment. Ini contoh operasi aturan, bukan rekomendasi crypto bagi pengguna. Skenario kas 0% tidak mengukur bank/default, kebutuhan pencairan, atau inflasi.

## 4. Eksplorasi historis — USD, 2019–2025

**Jenis: API + ANALISIS HISTORIS EKSPLORATIF.** Data publik diambil 2026-10-13. Universe dipilih sebagai proxy: BIL (US T-bill pendek), IEF (US Treasury 7–10 tahun), VT (ekuitas dunia). Identitas/peran diperiksa melalui [State Street BIL](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-bloomberg-1-3-month-t-bill-etf-bil), [iShares IEF](https://www.ishares.com/us/products/239456/ishares-710-year-treasury-bond-etf), dan [prospektus VT di SEC](https://www.sec.gov/Archives/edgar/data/857489/000119312526077566/f44201d1.htm). Ketiganya bukan shortlist pembelian bagi Arzaka.

Endpoint: [BIL](https://query1.finance.yahoo.com/v8/finance/chart/BIL?period1=1543622400&period2=1767225600&interval=1d), [IEF](https://query1.finance.yahoo.com/v8/finance/chart/IEF?period1=1543622400&period2=1767225600&interval=1d), [VT](https://query1.finance.yahoo.com/v8/finance/chart/VT?period1=1543622400&period2=1767225600&interval=1d). Lisensi/kontrak feed Yahoo belum dipilih untuk produksi. Sumber price feed ini merupakan data provider; adjusted convention-nya belum direkonsiliasi penuh dengan issuer.

| Audit yang benar-benar dilakukan | Hasil |
| --- | --- |
| Rentang yang diminta / valid | Desember 2018–Desember 2025; titik valid pertama 2018-12-03, terakhir 2025-12-31. Desember 2018 menjadi baseline return Januari 2019. |
| Titik per simbol | 1.779 daily adjusted closes, 85 bulan, mata uang USD; timestamp terurut. |
| Null/nonpositive/nonfinite / duplicate tanggal | 0 / 0 pada tiap simbol. |
| Bulan wajib | 85 bulan tersedia pada ketiga simbol; menghasilkan 84 return bulanan 2019–2025. |
| Yang tidak diperiksa | Setiap sesi bursa yang mungkin hilang, split/dividen satu per satu, sumber quote kedua, tax/FX, hak penggunaan produksi dan akses pembelian pengguna. |

Metode simulasi: last valid trading price tiap bulan, rasio adjusted close, fractional holdings, modal awal satu unit USD, **tanpa setoran/penarikan**, reset ke fixed weights tiap bulan. Fee hipotesis `0,1% × one_way_turnover` diterapkan setelah return bulanan; ongoing fund fee tidak dikurangkan lagi karena seri adjusted price diperlakukan sebagai return investor dana. Belum ada rekonsiliasi distribusi untuk memastikan perlakuan ini tepat pada semua titik.

Bobot M3 dan pembanding 1/N serta equity-only ditulis sebelum pengambilan seri, tidak dioptimalkan dari hasil. Periode dibagi 2019–2022 dan 2023–2025 untuk membandingkan perilaku, **bukan klaim uji prediksi out-of-sample yang bebas bias**. Pemilihan ETF bertahan, metode setelah mengetahui sejarah umum, dan tidak adanya pemilihan universe pada tiap tanggal tetap membatasi kesimpulan.

| Portofolio proxy | CAGR 2019–2025 | Max drawdown akhir bulan | Volatilitas tahunan | CAGR 2019–2022 / 2023–2025 |
| --- | ---: | ---: | ---: | ---: |
| BIL saja, proxy likuiditas USD | 2,55% | 0,16% | 0,61% | 0,93% / 4,76% |
| Hipotesis kelas 1 setelah stress | 3,34% | 7,09% | 2,94% | 1,45% / 5,92% |
| Hipotesis kelas 2 setelah stress | 5,10% | 11,75% | 5,23% | 2,83% / 8,20% |
| Hipotesis kelas 3 setelah stress | 8,29% | 17,49% | 9,02% | 5,31% / 12,40% |
| 1/N pada BIL/IEF/VT | 6,07% | 13,91% | 6,45% | 3,59% / 9,47% |
| VT saja, pembanding equity-only | 13,95% | 25,51% | 16,08% | 9,43% / 20,29% |

**Temuan pada sampel:** kandidat dengan ekuitas lebih banyak memperlihatkan return, volatilitas, dan drawdown lebih tinggi; hasil berubah cukup besar antara dua subperiode. Tidak ada dasar untuk memilih kandidat hanya karena CAGR terbesar. Pembanding 1/N juga tidak menjadi bobot profil pengguna otomatis.

**Batas material:** semua angka USD; BIL bukan kas IDR, IEF bukan SBN Indonesia, VT bukan seluruh universe global yang tersedia untuk pengguna. Drawdown akhir bulan melewatkan penurunan intrabulan. Belum memasukkan FX, pajak, spread, biaya awal/akhir, minimum, pencairan, maupun kontribusi bulanan. Sampel tujuh tahun tidak memvalidasi horizon ≥10 tahun. Historis ini tidak mencakup crypto atau saham/reksa dana Indonesia. Tidak ada estimasi expected return masa depan, optimisasi bobot, atau klaim strategi unggul.

Dampak produk: pertahankan pemisahan suitability dan return historis; jangan membuat janji keuntungan, jangan menamai BIL sebagai kas tanpa risiko, dan jangan mengaktifkan rekomendasi produk lokal berdasarkan proxy USD ini. V2/V4 produksi masih memerlukan dataset dan friksi yang sesuai universe terpilih.

## 5. Pemeriksaan biaya dan lifecycle dari sumber primer

**Jenis: LITERATUR/dokumen penerbit. Tanggal diperiksa 2026-10-13.** Ini sampel bukti, bukan tabel fee lengkap kanal pengguna.

| Sumber / observasi | Keterbatasan | Dampak metode |
| --- | --- | --- |
| [VT summary prospectus, filing SEC 2026](https://www.sec.gov/Archives/edgar/data/857489/000119312526077566/f44201d1.htm) memuat total annual fund operating expenses 0,06%. | Tidak memuat semua biaya broker Indonesia, FX, pajak pengguna, atau minimum kanal yang tersedia. Bukan fee historis semua tahun. | Expense ratio saja tidak cukup untuk COST atau gate pembelian. |
| [BIL issuer page](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-bloomberg-1-3-month-t-bill-etf-bil) menampilkan gross expense ratio 0,1353% dan menjelaskan biaya/risiko ETF. | Gross/net waiver dan broker cost perlu dibedakan; metadata current bukan harga beli pengguna. | Penampungan berbentuk ETF tetap investasi; tidak disamakan dengan kas nominal. |
| [POJK 25/2020, dokumen OJK](https://www.ojk.go.id/id/regulasi/Documents/Pages/Pedoman-Bentuk-dan-Isi-Prospektus-dalam-Rangka-Penawaran-Umum-Reksa-Dana-/POJK%2025-2020.pdf) menguraikan komponen biaya, pajak, syarat pembelian dan faktor risiko pada prospektus. | Isi dokumen 2020 digunakan sebagai daftar data; status perubahan regulasi dan prospektus produk aktual belum diaudit. | Catalog manual memerlukan biaya/minimum/exit yang bersumber, bukan asumsi semua reksa dana sama. |
| [Pemberitahuan penerbit Schroders](https://www.schroders.com/en-id/id/individual/funds-and-strategies/notice-to-investors/) memuat bagian rencana likuidasi suatu dana serta pembaruan prospektus. | Tidak menyimpulkan status semua dana atau tanggal berakhir tertentu dari heading saja. | Eligibility harus memeriksa lifecycle dan dokumen berlaku; histori yang lengkap saja tidak cukup. |

Nominal biaya/minimum Indonesia dan kanal pembelian pengguna belum dipilih. Karena itu tidak ada shortlist instrumen nyata yang diklaim siap dibeli. M4/M6 menyediakan aturan dan penerimaan datanya, sementara V3 lengkap merupakan gate saat catalog diisi.

## 6. Status V1–V7 dan bahan handoff

| Agenda | Selesai pada tahap penelitian ini | Yang tetap perlu dibuktikan saat pilot/implementasi |
| --- | --- | --- |
| V1 Kalibrasi risiko | Landasan regulator/psikometri, pertanyaan asli, skoring/caps dan enumerasi konsistensi. | Jawaban pengguna, uji pemahaman, test-retest dan kesesuaian psikometri; tidak mengklaim kalibrasi pribadi selesai. |
| V2 Alokasi | Template hipotesis, stress/absolute loss-cap rule, kontribusi, pembanding historis USD terbatas. | Data IDR/local/global/crypto yang dipilih, biaya/order riil, kontribusi dan horizon memadai. |
| V3 Biaya/minimum | Rumus all-in cost, rule pembelian, sampel dokumen issuer dan lot/fee fixture. | Tarif/minimum/pajak/payout semua produk dan kanal terpilih yang masih berlaku. |
| V4 Histori | Audit ringan tiga seri publik dan 84 return bulanan; quality/freshness gate konkret. | Kalender lengkap, corporate actions, cross-source, hak pakai dan histori seluruh universe. |
| V5 Shortlist | Formula, peer grouping, deterministic sort, missing-data gate dan contoh ranking. | Fitur nyata, sensitivity bobot/threshold pada universe nyata, review kecocokan/overlap pengguna. |
| V6 AI | Kontrak, invariants, validator fixture dan fallback. | Narasi/model nyata, prompt injection, sumber palsu, timeout/kuota dan privacy runtime. |
| V7 Rekonsiliasi | Definisi A/F/B, event completion, ledger/correction fixture dan batas bulan. | API monthly/events, atomisitas/dedup DB, mapping receipt/holdings serta tes isolasi user. |

**Pekerjaan penyusunan metode dan riset awal selesai; metode disetujui melalui D12.** Sumber, pengujian serta batas bukti tetap berlaku. Validasi pilot/produksi yang bergantung pada app atau input pengguna tidak diberi status lulus. [PRD](PRD.md) siap untuk pembangunan lokal berdasarkan metode tersebut.

PRD memasukkan metode M1–M7, alur v3, kontrak API dan acceptance pilot/produksi. Nama domain, kanal pembelian, serta provider produksi yang belum dipilih tetap gate deployment/data; tidak menghalangi implementasi lokal dengan data manual/sintetis yang jelas jenisnya.
