# 04 — Metode Invest v0.1 untuk Bahan PRD

[Panduan utama](README.md) · [Keputusan](00-Decisions.md) · [Landasan riset](01-Investment-Research.md) · [Integrasi](02-Data-and-Integration.md) · [Hasil validasi](05-Validation-Results.md) · [PRD](PRD.md)

**Tanggal: 2026-10-13. Status: APPROVED sebagai baseline pelaksanaan melalui D12.** Versi aturan `invest-method-v0.1`. Arzaka menyetujui M1–M7 sebagai dasar [PRD](PRD.md); D1–D12 LOCKED. Persetujuan parameter bukan bukti questionnaire terkalibrasi pribadi atau portofolio optimal/teruji untuk produksi.

Tujuan metode adalah menghasilkan pembagian nominal dan shortlist yang cocok dengan tujuan serta batas risiko, bisa dihitung ulang, dan menunjukkan bukti. Metode tidak mencoba meramal aset mana yang akan memberi return tertinggi. Parameter berasal dari **hipotesis desain yang disepakati sebagai baseline produk**. Literatur mendukung prinsipnya; tidak ada sumber yang menetapkan parameter persis atau membuktikan optimalitasnya untuk Invest.

## M1. Jatah bulanan dan kesiapan dana

Dasar: D2/D10/D11 dan fakta K1–K5/K8. Usulan berikut melengkapi O1/O2/O8 tanpa mengubah dua angka yang sudah disetujui.

| Aturan | Definisi v0.1 |
| --- | --- |
| Bulan | Bulan kalender WIB, `[tanggal 1 00:00 WIB, tanggal 1 bulan berikutnya 00:00 WIB)`. Tidak menyamakan bulan dengan empat minggu. |
| Pemasukan aktual `A` | Jumlah pemasukan CONFIRMED yang `receivedAt` berada dalam bulan tersebut, termasuk pemasukan irregular yang benar-benar diterima; INTERNAL dan PENDING dikecualikan. Periode kerja yang dibayar tetap metadata. |
| Forecast `F` | `A + jumlah sisa expected dari event pembayaran terjadwal pada bulan tersebut`. Event memiliki ID, tanggal pembayaran, sumber stream, expected, dan realisasi terkait. `sisa = max(0, expected - confirmed_terkait_event)`. Event yang sudah selesai/diselesaikan bernilai sisa nol. |
| Skenario | Expected sebagai rencana utama; conservative dan max ditampilkan sebagai pembanding. Tidak mengartikan ketiganya probabilitas atau confidence interval. |
| Jadwal | WEEKLY memakai tanggal weekday pembayaran yang benar-benar berada dalam bulan; MONTHLY satu tanggal payday, dipotong ke hari terakhir jika tanggal 29–31 tidak tersedia. IRREGULAR tidak diproyeksikan otomatis; actual yang diterima tetap masuk A. |
| Jadwal tidak diketahui | Forecast berstatus tidak lengkap dan menunjukkan sumber yang belum terpetakan. Jangan menebak payday atau mengambil forecast minggu terakhir sebagai satu bulan. |
| Jatah | `J_rencana = round_half_up(F × 0.20, 2 desimal IDR)`; `J_aktual = round_half_up(A × 0.20, 2 desimal IDR)`. Simpan dengan Decimal/integer sen, tampilkan format IDR; pembulatan tampilan tidak boleh menambah dana. |
| Hubungan kedua angka | Dua pandangan jatah yang sama. Tidak dijumlahkan, dan perbandingan keduanya tidak dianggap profit investasi. |

Expected per event memakai kalkulator per jenis stream Trackster yang sudah ada; sampling histori mengikuti cadence. Untuk pembayaran bulanan, estimasi dibuat sekali per bulan, lalu ditempatkan pada payday. Untuk pembayaran mingguan, satu estimasi per event dengan cutoff data yang tersedia saat snapshot. Event lama yang belum jelas pencocokannya masuk antrean rekonsiliasi dan membatasi rekomendasi executable; jangan memasangkan dua receipt ke satu pembayaran hanya berdasarkan nominal sama.

Jika stream memiliki PENDING receipt, tetap tampilkan adanya receipt yang belum dikonfirmasi; aktual belum bertambah. Forecast tidak boleh menggandakan expected dan pending receipt. Ketika receipt dikonfirmasi atau event dinyatakan selesai dengan actual berbeda, hitung ulang snapshot; jangan terus memproyeksikan selisih pembayaran yang sebenarnya sudah selesai.

**Dana rekomendasi aktual:** `sisa_jatah = J_aktual - penggunaan_aktual - reservasi_aktif - simpanan_tujuan_yang_memakai_jatah`. Penggunaan mencakup principal pembelian dan biaya nyata. `B = min(max(0, sisa_jatah), kas_bebas_yang_dikonfirmasi_pengguna)`. Kas bebas sudah mengecualikan kebutuhan hidup, kewajiban, dan dana darurat; saldo bank total tidak otomatis menjadi kas bebas. Jika kas bebas belum diketahui, hanya tampilkan simulasi rencana.

Default v0.1 tidak otomatis menambah jatah dari leftover budget harian atau mengaktifkan carry-over. Dana bulan lalu tetap tercatat sebagai kas/portofolio; penggunaan ulang memerlukan referensi alokasi lama dan tidak menjadi pemasukan baru. Proceeds jual/dividen adalah arus kas investasi yang direkonsiliasi terpisah, bukan otomatis jatah 20% baru. Jika sudah tercatat sebagai Income, minta klasifikasi/reference agar tidak masuk dua ledger.

Setiap penggunaan memiliki ID tahan-retry dan referensi bulan/tujuan/receipt. Koreksi income yang menurunkan jatah hingga di bawah pemakaian menghasilkan status `OVERCOMMITTED` dan B=0; tidak menghapus pembelian atau mengubah BankBalance. Mengedit harga/valuasi holdings tidak mengubah pemakaian jatah. Snapshot lama tetap menyimpan input serta versi, dengan koreksi dicatat terpisah.

## M2. Tujuan, pertanyaan, dan profil risiko

Landasan R1/R12/R13/R14: kemauan, kemampuan, horizon, dan pemahaman produk dinilai terpisah. Pertanyaan ditulis untuk Invest, bukan salinan instrumen psikometri tervalidasi. Ambang/skoring menjadi baseline yang disetujui; pemahaman dan kecocokan jawaban nyata tetap diperiksa pada pilot.

Data wajib per tujuan: nama tujuan, nilai target bila ada, tanggal dana dibutuhkan, kebutuhan pencairan, dana yang sudah tersedia, serta bagian B yang dialokasikan. Tujuan tidak dapat didanai dua kali. Pada v1 satu tujuan aktif menjadi default; jika beberapa tujuan diaktifkan, pengguna memilih prioritas dan nominal, total tidak boleh melebihi B. Sistem tidak mengisi gap tujuan dengan menaikkan risiko.

### Kemauan mengambil risiko T

Empat jawaban wajib, nilai 0–3. UI menjelaskan bahwa penurunan nyata dapat lebih besar dan pemulihan tidak dijamin. Angka skenario adalah bantuan percakapan, bukan kerugian maksimum produk.

| ID | Pertanyaan asli Invest | Pilihan berurutan / skor |
| --- | --- | --- |
| T1 | Seberapa besar penurunan nilai pot investasi tujuan ini yang masih dapat kamu terima tanpa mengubah rencana? | Tidak menerima penurunan modal (0); sampai 10% (1); sampai 20% (2); sampai 35% (3). Pilihan terakhir tidak berarti kerugian hanya bisa 35%. |
| T2 | Jika nilai pot turun 15% selama satu tahun sementara kebutuhan dan tujuan tetap, apa respons yang paling mendekati kamu? | Keluar dari seluruh aset yang turun (0); mengurangi sebagian besar eksposur (1); mempertahankan sambil meninjau (2); tetap mengikuti rencana kontribusi setelah meninjau penyebabnya (3). |
| T3 | Jika pencapaian tujuan dapat tertunda akibat pasar, berapa lama penundaan yang nyaman untukmu? | Tidak dapat tertunda (0); sampai 6 bulan (1); sampai 2 tahun (2); lebih dari 2 tahun (3). Kemampuan keuangan tetap dinilai tersendiri. |
| T4 | Untuk dana yang sudah dipisahkan dari kebutuhan hidup, seberapa nyaman kamu melihat nilainya berfluktuasi? | Memilih dana tetap dalam kas (0); menerima fluktuasi kecil (1); menerima fluktuasi besar setelah memahami instrumen (2); menerima fluktuasi besar berulang dan tetap mengikuti rencana setelah review (3). |

Jumlah `S = T1+T2+T3+T4`: 0–2 → kelas T=0; 3–5 → T=1; 6–8 → T=2; 9–12 → T=3. Setelah itu `T = min(T, skor_T1)`, sehingga jawaban batas kerugian tidak ditutupi rata-rata jawaban lain. Jika jawaban menunjukkan konflik (misalnya T1=0 tetapi T2/T4=3), tampilkan konflik dan minta konfirmasi; hasil executable ditahan sampai jawaban ditinjau. Setelah ditinjau, batas yang lebih rendah tetap berlaku.

### Kemampuan menanggung rugi C

Gunakan input privat: pengeluaran esensial bulanan, cadangan likuid di luar pot investasi, stabilitas pemasukan yang dinyatakan pengguna, kewajiban mendesak, kebutuhan dana dalam waktu dekat, serta **kerugian dalam rupiah yang masih dapat ditanggung tanpa mengganggu kebutuhan esensial** (`loss_capacity_IDR`). Cadence mingguan tidak berarti pemasukan tidak stabil. Defisit, tunggakan, atau utang mahal yang dinyatakan pengguna memicu review kebutuhan dana; aplikasi tidak mengarang angka suku bunga atau data utang yang tidak dicatat Trackster.

`reserve_months = cadangan_likuid / pengeluaran_esensial`. Data tidak lengkap, pengeluaran esensial nol/tidak valid, loss capacity tidak diketahui, atau kas bebas belum dikonfirmasi → `NEEDS_INPUT`, bukan profil konservatif otomatis. Input lengkap tetapi kewajiban mendesak/defisit/utang mahal belum ditangani, loss capacity=0, atau reserve <3 bulan → C=0 dan pembelian berisiko ditunda. Reserve 3 hingga <6 bulan → C=1. Reserve ≥6 bulan + pemasukan tidak stabil → C=2; reserve ≥6 bulan + pemasukan stabil → C=3. Batas 3/6 bulan adalah hipotesis kebijakan, bukan standar universal atau hasil kalibrasi Arzaka. Batas kerugian rupiah tetap berlaku walaupun reserve dan kelas C tinggi.

### Horizon H dan pengetahuan K

Horizon berdasarkan tanggal kebutuhan dana tujuan: <36 bulan → H=0; 36–<60 → H=1; 60–<120 → H=2; ≥120 → H=3. Tujuan yang sudah jatuh tempo masuk H=0. Pencairan produk harus memenuhi kebutuhan pengguna walaupun horizon panjang.

Tiga pemeriksaan pemahaman: (1) diversifikasi tidak menghilangkan semua risiko; (2) obligasi/dana obligasi dapat turun sebelum jatuh tempo; (3) risiko mata uang dan crypto dapat menambah kerugian. Jawaban salah menampilkan edukasi dan tes ulang. Pengetahuan **tidak menambah T/C/H**; pemahaman khusus instrumen adalah gate sebelum instrumen tersebut dapat direkomendasikan. Tidak menganggap pengalaman membeli berarti sudah memahami produk.

### Hasil per tujuan

`kelas = min(T, C, H)`: 0 **Likuiditas**, 1 **Konservatif**, 2 **Seimbang**, 3 **Pertumbuhan**. Selalu tampilkan ketiga kelas pembatas dan alasannya. Kelas 0 adalah jalur menahan dana/kebutuhan likuiditas, bukan klaim kas bebas risiko. Tidak memilih reksa dana pasar uang sebagai pengganti kas untuk pengguna yang menolak semua risiko kehilangan modal.

Profil ditinjau setiap 12 bulan atau setelah tujuan, pemasukan, kewajiban, maupun kebutuhan pencairan berubah. Kenaikan kelas memerlukan pengguna melengkapi dan mengonfirmasi ulang jawaban; pasar yang naik tidak otomatis menaikkan profil.

## M3. Alokasi kelompok dan penyesuaian portofolio

Landasan R1/R2/R15/R16. **Bobot di bawah adalah titik awal hipotesis v0.1, bukan rekomendasi teruji atau angka dari literatur.** Pengujian aritmetika/stress selesai; bukti historis terbatas dibahas dalam dokumen hasil.

| Kelas | Kas/penampungan IDR | Pendapatan tetap | Ekuitas terdiversifikasi | Crypto default |
| --- | ---: | ---: | ---: | ---: |
| 0 Likuiditas | 100% | 0% | 0% | 0% |
| 1 Konservatif | 60% | 30% | 10% | 0% |
| 2 Seimbang | 30% | 40% | 30% | 0% |
| 3 Pertumbuhan | 10% | 30% | 60% | 0% |

Kas/penampungan IDR adalah bagian dana yang tidak otomatis dibelikan aset. Jika dialihkan ke deposito atau reksa dana pasar uang, klasifikasi risiko dan liquidity gate mengikuti produk tersebut. Pendapatan tetap memerlukan metadata tenor/durasi/kredit, bukan asumsi semua obligasi aman. Ekuitas inti memakai instrumen terdiversifikasi; saham tunggal tetap dapat dipindai/dibandingkan tetapi tidak menjadi inti alokasi otomatis v0.1.

Global/Indonesia merupakan eksposur di dalam kelompok, bukan kelas risiko tambahan. Pilih satu eksposur inti terdiversifikasi yang tersedia dan cocok untuk tujuan; tidak menetapkan pembagian Indonesia/global seragam untuk semua pengguna. Jika suatu pasar belum dapat dibeli pengguna atau sumbernya belum memadai, dana kelompok itu ditahan dalam kas; jangan memindahkannya otomatis ke instrumen lain yang konsentrasinya lebih tinggi.

Crypto tetap masuk pemindaian. Untuk rekomendasi nominal, default 0%; opt-in hanya pada kelas 3, pemahaman lulus, akses/kualitas data lolos, dan batas yang diminta pengguna ≤5% pot tujuan. Bobot crypto diambil dari ekuitas, bukan dana tambahan. Tidak mencakup leverage, derivatif, staking/lending, atau stablecoin sebagai kas pada v0.1.

### Stress dan batas toleransi

Skenario desain bersifat hipotetis dan tanpa probabilitas:

| Skenario | Kas IDR | Pendapatan tetap | Ekuitas dalam IDR | Crypto |
| --- | ---: | ---: | ---: | ---: |
| Penurunan pasar | 0% | −15% | −50% | −100% |
| Perubahan suku bunga | 0% | −20% | −20% | −70% |
| Penurunan pasar + FX | 0% | −15% | −60% | −100% |

Angka −60% menyederhanakan kombinasi ekuitas asing turun 50% dan rupiah menguat 20% terhadap mata uang aset: `(1−0.50)×(1−0.20)−1`. Ini proxy desain konservatif, bukan prediksi; underlying/durasi/kredit bisa membutuhkan shock berbeda. Kas 0% hanya berarti skenario tidak memodelkan kerugian nominalnya; risiko inflasi, bank, dan akses tetap ada. Pengujian ini tidak memasang batas atas rugi nyata.

`D = max_s(max(0, −sum(w_j × shock_sj)))`; `L = min(batas_T1, loss_capacity_IDR / nilai_pot_setelah_kontribusi)`. Batas_T1 adalah 0/10/20/35%; pot bernilai nol tidak menghasilkan order. Jika D>L, `k=min(1,L/D)`, kalikan bobot non-kas dengan k, pindahkan sisa ke kas. Perhitungan ini memperkecil eksposur; tidak menjamin kerugian nyata ≤L atau ≤loss_capacity_IDR. Pemilihan jenis instrumen tetap harus lolos gate dan stress produk spesifik sebelum hasil executable.

Contoh hasil hipotesis sesudah stress ketika kemampuan rugi rupiah tidak lebih membatasi: kelas 1 dengan L10% → kas 61,90%, obligasi 28,57%, ekuitas 9,52%; kelas 2 dengan L20% → 41,67%/33,33%/25%; kelas 3 dengan L35% → 22,22%/25,93%/51,85%. Angka tampilan dibulatkan; perhitungan memakai presisi penuh. Opt-in crypto 5% pada kelas 3 juga dikurangi bersama seluruh bobot berisiko bila batas skenario terlampaui.

### Kontribusi baru pada portofolio yang sudah ada

Scope adalah pot tujuan yang dipilih; cadangan darurat tidak dimasukkan sebagai holdings pot agar tidak menyamarkan risiko. Nilai holdings perlu fresh dan dalam IDR; jika mapping tujuan, nilai atau kurs tidak lengkap, hanya tampilkan simulasi tanpa instruksi pembelian.

Untuk B dana baru dan V_j holdings per kelompok, hitung `V_total=sum(V_j)+B`, `defisit_j=max(0,w_j×V_total−V_j)` bagi kelompok non-kas. Bagikan dana ke defisit secara proporsional, dibatasi B; sisa ke kas. Tidak membeli kelompok overweight. Periksa ulang stress dan batas produk pada keseluruhan pot sesudah usulan; jika melampaui L, tahan B dalam kas dan tampilkan review. Jika portofolio lama sendiri melampaui batas, tidak mengklaim bahwa kontribusi kas langsung membuatnya cocok. Tidak mengeksekusi penjualan otomatis.

Perubahan harga dievaluasi bulanan. Deviasi ≥5 percentage points dari target memunculkan usulan review kontribusi; ambang 5 pp adalah hipotesis, bukan frekuensi transaksi optimal. Perubahan profil/tujuan atau status produk dapat memicu review segera. Review tidak sama dengan transaksi/rebalancing bulanan otomatis.

## M4. Kelayakan sebelum ranking

Semua gate wajib lolos. Hasil yang gagal tetap dapat masuk daftar riset dengan alasan, tetapi tidak mendapat nominal pembelian. Unknown tidak diperlakukan sebagai nilai baik atau nol biaya.

| Gate | Aturan v0.1 yang dapat diperiksa |
| --- | --- |
| Identitas/lifecycle | ID instrumen, issuer, jenis, bursa/mata uang/chain jelas; active/open untuk pembelian; bukan produk dalam likuidasi, terminated, atau stale lifecycle. |
| Akses | Kanal pembelian pengguna dan persyaratan akses sudah diketahui, serta status pihak/produk diverifikasi dari sumber yang tepat; tidak berasumsi listing global berarti dapat dibeli pengguna Indonesia. |
| Hak pakai sumber | Data dapat digunakan pada deployment/fitur yang dipilih. Probe publik Yahoo adalah sumber eksplorasi, bukan adapter produksi yang otomatis dipilih. |
| Tujuan/risiko | Horizon dan pencairan cocok, pemahaman produk lulus, jenis diizinkan profil, serta eksposur/stress pot sesudah usulan memenuhi aturan. |
| Nilai/biaya | Mata uang, harga/NAB/quote, minimum, step/lot, fee beli/FX/kustodian/exit dan kondisi berlakunya diketahui. Nilai nol hanya jika sumber menyatakan nol. |
| Histori | Untuk ranking fund/ekuitas/crypto: ≥36 observasi bulan selesai dalam jendela 36 bulan dan ≥95% observasi perdagangan yang diharapkan pada seri harian/NAB sumber. Distribusi/split dan adjusted convention tercatat. Produk baru dengan histori pendek hanya daftar riset. |
| Instrumen kontraktual | Kas/deposito/SBN langsung dinilai melalui dokumen kontrak, maturity dan akses/biaya, bukan dipaksa mempunyai histori harga 36 bulan. Rankingnya peer kontraktual tersendiri; tidak dicampur dengan equity/fund. |
| Freshness | Harga saham/ETF ≤2 sesi perdagangan selesai; NAB ≤3 hari kerja sumber; crypto/FX reference untuk valuasi ≤24 jam (FX hari libur mengikuti rilis resmi terakhir dan label). Metadata biaya/akses ditinjau ≤90 hari dan dokumen berlaku; lifecycle/penawaran harus berlaku pada asOf. |

Ambang histori/freshness adalah kebijakan awal, bukan standar universal. Data yang tidak bisa mengisi kalender perdagangan, corporate actions, atau identitas menurunkan cakupan nyata. Dengan histori Demo crypto 365 hari, crypto belum lolos gate 36 bulan; default nominalnya tetap nol sampai sumber histori yang memadai tersedia. Penundaan tersebut mempertahankan cakupan pemindaian tanpa mengarang statistik.

## M5. Ranking yang eksplisit

Ranking menilai kecocokan praktis **setelah** gate, bukan prediksi return. Kelompok pembanding: jenis produk, eksposur yang ingin diisi, mata uang, profil risiko/tenor yang sebanding, dan horizon tujuan. Produk kontraktual dinilai dalam kelompok tersendiri; jangan mengadu skor SBN, ekuitas, dan crypto dalam satu papan peringkat.

`score = 0.30×COST + 0.20×DIV + 0.20×DATA + 0.15×LIQ + 0.15×ACCESS`, seluruh fitur 0–100. Alpha adalah hipotesis v0.1; tidak dilatih terhadap return terbaik. Kebutuhan tujuan/risiko bukan fitur yang dapat dikompensasi biaya murah karena sudah menjadi gate.

| Fitur | Definisi dan skala awal |
| --- | --- |
| COST | `cost_annual = ongoing_fee + custody_annual + (biaya_beli + estimasi_biaya_exit_berdasar_tarif + FX/spread_roundtrip)/(nominal_principal × horizon_tahun)`. Hanya biaya yang benar-benar terpisah; spread dan fee yang sama tidak dihitung dua kali. `COST=100×max(0,1−cost_annual/cap)`, cap kas/kontraktual 2%, bond/fund/equity 3%, crypto 5% per tahun. Hasil ini skor biaya, bukan estimasi return net. |
| DIV | 100 = broad multi-region/multi-sector dengan holdings/benchmark terverifikasi; 75 = broad single-country/multi-issuer; 50 = satu sektor tetapi multi-issuer; 25 = single issuer/token. Gate jenis produk dan konsentrasi tetap berlaku. Kas/deposito/SBN kontraktual: 100 jika issuer exposure sesudah usulan ≤10% pot, 75 ≤25%, 50 ≤50%, 25 >50%; label konsentrasi selalu ditampilkan. |
| DATA | Untuk instrumen pasar: 25 poin masing-masing untuk histori lengkap gate, adjusted/distributions direkonsiliasi pada sampel, identitas+kalender+matauang tervalidasi, serta silang nilai pada sumber kedua (toleransi 1% untuk quote waktu sebanding atau 0,5% NAB). Untuk kontraktual: dokumen berlaku, fee/minimum/tenor lengkap, identitas/status issuer diverifikasi, dan syarat exit/payout diverifikasi silang. Gate lebih ketat tidak boleh dilewati oleh skor. |
| LIQ | Dana dapat digunakan sesudah pencairan/settlement: ≤1 hari kerja 100, ≤2 80, ≤7 60, ≤30 20, >30 0. Tenor yang melebihi kebutuhan dana gagal gate; produk terkunci hanya lolos jika pengguna menerima lock sampai maturity yang memenuhi tanggal tujuan. Bid/ask atau volume tidak menggantikan syarat payout. |
| ACCESS | 100 = kanal aktif pengguna, biaya/minimum/mata uang/payout dipahami dan terverifikasi tanpa tahap tambahan; 80 = kanal sudah memenuhi syarat, tetapi perlu funding/FX yang diketahui; akses belum diverifikasi gagal gate. Tidak memberi skor lebih tinggi karena afiliasi atau promosi. |

Satu currency/peer group memakai cap yang sama. COST dihitung pada nominal kelas yang benar-benar tersedia, dengan unit/lot yang layak; fixed fee pada nominal kecil tidak diabaikan. Current expense ratio boleh menjadi metadata biaya untuk keputusan sekarang; tidak dipakai ulang sebagai fee historis seluruh tahun jika sudah termasuk adjusted return/NAB.

Urutkan berdasarkan skor presisi 6 desimal menurun, biaya tahunan menaik, asOf lebih baru, lalu ID instrumen secara leksikografis. Tampilkan skor 1 desimal. Ambil maksimal tiga kandidat per kelompok; boleh nol/satu/dua. Selisih skor <3 poin ditandai hampir setara, sehingga posisi pertama tidak dibahas sebagai pemenang pasti.

Return/CAGR historis, drawdown dan volatilitas ditampilkan sebagai bukti tambahan dengan periode dan kualitasnya. Yield kontraktual boleh diperbandingkan dalam peer group serta dijelaskan dengan pajak/biaya; tidak dianggap total return yang sama dengan equity CAGR. Sentimen/news/AI tidak menambah skor v0.1.

Overlap holdings: sebelum menambah dua fund pada eksposur yang sama, hitung overlap dengan `sum(min(weight_a,weight_b))` dari holdings bertanggal selaras. Jika overlap >70%, daftar keduanya sebagai alternatif, bukan kebutuhan pembelian keduanya; holdings tidak lengkap berarti overlap unknown dan diversifikasi tidak diklaim. Batas 70% adalah hipotesis operasional.

## M6. Nominal pembelian, AI, dan bukti

Kandidat per kelompok adalah alternatif. Default mengusulkan maksimal satu kandidat inti per kelompok yang dapat dibeli; maksimal tiga baris order non-kas per kontribusi. Jika nominal kandidat terbaik tidak mencapai minimum atau total biaya sekali-beli >1% dari dana order, coba kandidat berikut yang lolos; jika semuanya gagal, tahan alokasi kelompok itu. Batas biaya 1% adalah hipotesis efisiensi, bukan ketentuan broker.

Hitung principal+biaya dalam integer minor unit/Decimal. Cari jumlah unit terbesar yang memenuhi minimum/step/lot serta `principal+biaya_beli+FX≤budget_kelompok`. Harga/FX indicative → order indicative, harus diperiksa ulang sebelum pencatatan pembelian manual. Pembelian tidak layak tidak mengenakan biaya hipotetis. Gunakan largest remainder dengan tie-break urutan cash/bonds/equity/crypto untuk membagi sen sehingga total tetap tepat; nominal kelompok tidak mengizinkan melampaui stress setelah lot/fee. Dana residu tetap kas.

AI menerima: profile/goal version, snapshot jatah dan holdings yang diperlukan, ruleset, nominal, fitur/skor, ranking, alasan gate, fakta sumber yang boleh dipakai, dan kekurangan data. AI mengembalikan narasi dan ID sumber; nominal/skor tetap dirender langsung dari engine. Tidak mengirim nama rekening, email bank, atau transaksi yang tidak diperlukan.

Validator menolak perubahan angka/urutan, sumber asing, klaim return masa depan, dan instruksi untuk melewati gate. Fallback berupa penjelasan template dari ruleset dan daftar kekurangan. Validasi field terstruktur telah diuji pada fixture; konsistensi narasi LLM nyata masih perlu pengujian saat AI Invest diimplementasi. Bahasa narasi boleh berubah, fakta/perhitungan tidak.

Setiap hasil menyimpan: user/goal, input source IDs, asOf/fetchedAt, bulan, A/F/J aktual/J rencana/B, holdings/kurs, profil T/C/H dan jawaban, template+stress+hasil penyesuaian, universe/coverage, fitur/ranking, order/residu, versi ruleset, serta alasan withheld. UI tetap menggunakan Trackster v3 menurut D9; detail engine ditempatkan pada bagian alasan/bukti, bukan memenuhi layar utama dengan istilah teknis.

## M7. Pembaruan, tahap data, dan kriteria handoff

Usulan operasional: evaluasi jatah saat income/status/ledger berubah; snapshot rekomendasi bulanan atau manual refresh pada input baru; harga/NAB harian sesuai source/calendar, crypto harian untuk pemindaian; metadata biaya/status sesuai dokumen dan event lifecycle. Review tidak menghasilkan order otomatis. Versi metode yang berubah membatalkan rekomendasi lama untuk pembelian berikutnya tanpa mengubah arsip.

Tahap 1 memakai catalog Indonesia manual bersumber (kas/kontraktual/reksa dana/ekuitas terdiversifikasi) dan menunjukkan global/crypto sebagai cakupan riset. Tahap 2 membuka nominal global setelah akses, biaya, FX, dan source lolos. Tahap 3 membuka crypto opt-in setelah histori dan gate lengkap. Ini usulan urutan, bukan pemilihan nama broker/provider atau janji seluruh pasar tersedia sejak hari pertama.

| Pertanyaan PRD | Bahan jawaban v0.1 |
| --- | --- |
| O1/O2: jatah | M1: bulan WIB, receipt CONFIRMED, expected event pembayaran, rounding Decimal, irregular actual saja. |
| O3/O10: profil/alokasi | M2/M3: pertanyaan, min(T,C,H), knowledge gate, templates dan stress adjustment. |
| O4: shortlist | M4/M5/M6: gate, score 30/20/20/15/15, tie-break, top-3 dan satu kandidat per kelompok. |
| O5/O6/O7: operasi/data | M4/M7: umur data/histori, pembaruan, cakupan bertahap dan source gate. Provider produksi tetap diverifikasi sebelum adapter. |
| O8: rekonsiliasi | M1/M6: B dibatasi aktual+kas bebas, ledger biaya/pemakaian, koreksi, default tanpa carry-over otomatis. |
| O9: website bersama | D1/D9, K6/K7; rencana domain/hosting membutuhkan keputusan deployment tersendiri, tidak mengubah metode investasi. |

Bahan metode telah disetujui untuk [PRD pelaksanaan](PRD.md). Backtest/AI/akses/kualitas sumber yang belum tervalidasi untuk produksi tetap menjadi acceptance gate. Hasil dan keterbatasan penelitian ada di [05-Validation-Results.md](05-Validation-Results.md); persetujuan tidak mengubah fixture menjadi bukti produksi.
