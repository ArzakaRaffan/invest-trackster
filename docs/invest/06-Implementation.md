# 06 — Implementasi Invest

[PRD](PRD.md) · [Keputusan](00-Decisions.md) · [Metode](04-Methodology.md) · [Menjalankan lokal](../../apps/invest/README.md)

## 2026-10-26 — Penjelasan evaluasi dan bantuan AI terbatas

Permintaan Arzaka: lanjutkan pekerjaan dan langsung push ke repository Invest setelah selesai. Branch `feat/invest-explanations`, baseline `aba1a64`. D1–D12 dan `invest-method-v0.1` tidak berubah. Riset serta batas kontrak ada di [10-Explanation-Research.md](10-Explanation-Research.md).

### Hasil yang tersedia

- Halaman detail evaluasi mempunyai **Alasan hasil ini**: dasar nominal aktual/forecast, target pot, skenario risiko, aturan ranking, posisi kandidat pilihan termasuk alternatif, nominal/biaya, sumber dan batas cakupan. Teks ID/EN dan angka berasal dari snapshot server; unknown tetap kosong. Indikator stale tetap terlihat.
- Penjelasan aturan tersedia tanpa AI. Bantuan AI bersifat opsional dan eksperimental: memilih `brief/detail` untuk klaim server; tidak menulis teks bebas, mengubah angka/urutan/sumber, membuat transaksi atau membuka gate. Tidak ada panggilan model saat membuka halaman.
- UI memakai card, badge, notice, details, tombol dan token v3 bersama. Loading/error, retry, kuota, cooldown serta pemulihan respons hilang bekerja. Hasil tersimpan terbaca lagi setelah reload dan terpisah per bahasa.

### API, privasi dan penyimpanan

GET `/invest/evaluations/:id/explanation?language=id|en` membaca penjelasan/fallback, tanpa kuota. POST rute yang sama menerima hanya `{language}`. JWT/access/body validation/ownership berjalan sebelum quota berbayar; milik user lain404. `InvestExplanationQuotaGuard` memakai batas per menit dan `AiUsage` harian yang sudah ada. Cache replay dan default off tidak memakan kuota. HTTP429 lokal tidak menghilangkan GET penjelasan; HTTP429 provider menjadi fallback dengan reason aman.

Tidak ada migrasi. `InvestMutation` menyimpan artifact privat per evaluation/version/bahasa dengan lease token. Unique constraint dan compare-and-swap menjaga satu provider call saat bersamaan; provider berada di luar transaksi DB. Lease dan cooldown60detik; sukses dibaca ulang, retry kegagalan harus eksplisit setelah cooldown. Isi yang disimpan hanya pilihan terverifikasi/outcome, bukan respons model mentah. Tidak menulis ulang evaluation, ledger, holdings, reservasi, Income atau saldo bank; revision uang tidak berubah.

Adapter terpisah memakai konfigurasi `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL_FAST` (fallback `AI_MODEL`) melalui protokol kompatibel yang sudah digunakan Trackster. Timeout12detik, maksimum respons32KiB, non-streaming, tanpa redirect/retry otomatis/log body. Paket input hanya klaim/varian/ID sumber lokal; tidak memuat nama/ID akun, nominal, jawaban profil, transaksi, holdings, URL atau prosa sumber. Validator menolak field tambahan, klaim/sumber asing, urutan berubah, omit/duplicate, refusal, tool call dan hasil terpotong. JSON valid saja tidak cukup.

**Env baru:** `INVEST_AI_ENABLED=false`. Biarkan off sampai uji model nyata dan kebijakan provider untuk pilot selesai. Config belum lengkap tetap fallback; config tidak diteruskan ke frontend. `capabilities.explanations=true`, `ai` mengikuti config eksplisit; phase tetap I3 karena seluruh acceptance I4 belum selesai. Tidak mengubah konfigurasi/deployment Trackster.

### Bukti pemeriksaan sesi ini

- Backend build cap1536MB, Invest production build/typecheck, frontend Trackster `tsc --noEmit` lulus. **6/6 check Invest** lulus; helper/adapter penjelasan **327 assertion**, termasuk semua256 kombinasi varian pada fixture, decimal besar, unknown, source permissions, payload injection, output malformed, timeout dan error provider. Audit tenancy **0 temuan**.
- **322 assertion API** lulus pada database PostgreSQL17 loopback baru dengan48 migrasi yang sudah ada. Termasuk56 pemeriksaan tambahan penjelasan: auth/access/ownership, input palsu, quota, request bersamaan, cache bahasa, failure/cooldown, pemulihan lease, arsip dan financial revision tetap identik. Provider HTTP sintetis berada di loopback; tidak memanggil vendor atau data akun asli.
- **46 assertion browser pasar/review**, **22 assertion browser penjelasan**, dan **13 pemeriksaan visual read-only** lulus pada build produksi lokal. Browser penjelasan memakai HTTP fixture provider lewat adapter sebenarnya; unsupported response/provider429 diuji, local429 disimulasikan pada jaringan browser (guard quota diuji nyata pada suite API). Respons sengaja diputus setelah hasil disimpan; GET memulihkan hasil tanpa perubahan uang.
- Screenshot mobile390 tema gelap/terang dan ID/EN diperiksa; tidak ada overflow, exception browser, atau5xx. Script browser mengambil detail evaluasi terlebih dahulu karena endpoint daftar hanya mengembalikan ringkasan. Screenshot `.artifacts/` tidak di-commit.
- Windows Node22.12.0; image Node24/Docker dan production tidak diuji. Server API/Invest, fixture provider serta PostgreSQL uji sudah dihentikan; port3000/3001/4000/55439/provider tertutup.

### Batas dan langkah berikutnya

AC-AI1 model nyata masih terbuka: belum ada repeated prompts pada model vendor, pengukuran kegunaan editorial/latency/biaya, atau konfirmasi retensi provider. Ini penjelasan terstruktur yang dibantu AI, bukan chat investasi bebas. AC-AI2 lokal telah diperiksa pada fixture; jangan menyamakannya dengan pilot. Data catalog nyata/rights/fees/history, kalibrasi, UX pilot, receipt lintas bulan dan arsip profil tetap agenda berikutnya. Tidak ada deploy dalam sesi ini.

## 2026-10-26 — Detail/perbandingan pasar dan review I4

**Otorisasi:** Arzaka meminta melanjutkan lagi. Branch kerja `feat/invest-market-review`, baseline `b6fe0fa` di repository Invest terpisah. D12, anggaran bulanan20% dan pemisahan PLAN/ACTUAL tetap. Riset primer dan batas penerapan ada di [09-Review-Research.md](09-Review-Research.md).

### Perilaku baru

- Pasar menyediakan pencarian nama/issuer/kanal, filter wilayah/kelas/gate/akses, jumlah hasil dan pagination. Filter dilakukan sebelum paging; akses user lain tidak memengaruhi hasil. Akses berbeda versi atau lebih dari90hari berstatus STALE. Catalog menolak penambahan melebihi1000 record tersimpan, mencegah catatan diterima tetapi tak terlihat.
- `/app/market/:id` menampilkan identitas, ketentuan, minimum/step/payout, biaya, timestamp harga/kurs, coverage histori, risiko dan sumber. Metadata, quote dan fee unknown tetap unknown. Tidak membuat CAGR/volatilitas/drawdown karangan dari metadata coverage.
- `/app/market/compare?ids=...` membandingkan2–3 ID unik dalam peer yang sama. Jenis, kelas, exposure, currency dan tenor diperiksa server; mixed peer/ID hilang/duplikat/max3 diuji. Perbandingan fakta tidak membuat ranking tanpa budget/horizon atau menjumlahkan order alternatif.
- Review pada arsip/detail evaluasi ACTUAL menampilkan perubahan jatah, profil/tujuan/metode, holdings/kas tujuan, source/access eligibility dan pergantian bulan WIB. Pot untuk deviasi hanya holdings tervaluasi+kas tujuan yang tercatat; B yang belum disisihkan tidak masuk denominator. Unknown/basi menahan rasio; target lama tidak dipakai setelah profil/goal/metode berubah. Deviasi≥5 pp dihitung Decimal sebelum display rounding.
- **Catat peninjauan** menyimpan acknowledgment privat terikat reviewKey. Input/source/gate/bulan berubah membuatnya perlu ditinjau lagi. Acknowledgment tidak memperbaiki data, mengubah uang, membatalkan stale evaluation atau menghidupkan kembali reservasi. Form mempertahankan isian dan mengulang body/key yang sama ketika respons hilang.
- Review dihitung saat dibaca, UI refresh30detik. Tidak ada cron, notifikasi, AI, atau transaksi broker. Ini bagian review deterministik I4, belum seluruh I4 atau release.

### Penyimpanan dan API

Tidak ada migrasi baru. `InvestChange` menyimpan audit `REVIEW_ACK` dan snapshot per keadaan; `InvestMutation` memakai idempotensi yang sudah ada. Audit tidak dimasukkan ke portfolio revision agar acknowledgment tidak membatalkan cash confirmation atau menghasilkan siklus review sendiri. Serializable dan pemeriksaan state/reviewKey mencegah acknowledgment pada tampilan basi; request concurrent dengan key sama maupun berbeda memakai satu record untuk keadaan yang sama. Perubahan keadaan dapat mempunyai audit baru tanpa menimpa yang lama.

Tambahan API: GET `/invest/instruments/compare?ids=a,b`; filter `assetClass`, `gate`, `access`, `peer`, `search` pada daftar. GET `/invest/reviews` berisi10 review/halaman, `cursor` privat, `evaluationId` opsional. POST `/invest/reviews/:id/acknowledge` memakai reviewKey/confirmed/note/revision/idempotency. Scope user dari JWT; PLAN bukan baseline review aktual. Service/helper baru tidak memanggil provider eksternal dan tidak menulis tabel keuangan Trackster.

### Bukti pemeriksaan

- Backend build cap1536MB, Invest production build/typecheck, frontend Trackster `tsc --noEmit` lulus;5 check Invest lulus, termasuk **25 assertion review** untuk5pp, WIB rollover, unknown/zero, target/version dan pot tanpa kontribusi hipotetis. Audit tenancy0temuan. Windows Node22.12.0; belum image produksi Node24.
- **266 assertion API** lulus pada Nest/Auth/Invest asli dan PostgreSQL17 loopback kosong dengan48 migrasi yang sudah ada. Termasuk filter/access/compare, private review/cursor, input palsu, concurrent acknowledgment key sama/berbeda, source-change invalidation, replay setelah input berubah, dan golden financial rows/evaluation identik sesudah acknowledge.
- **46 assertion browser I3/I4** lulus: detail/filter/peer comparison, alokasi/alternatif/reserve/settle, review/acknowledgment, respons sengaja diputus setelah commit, reload, perubahan source, archive, ID/EN dan light/dark. Inspeksi screenshot memperbaiki label/headings, area klik/arah checkbox dan token warna meter. Selector tes menunggu navigation/data dan memakai label select yang sesuai accessible name. Artefak sintetis di `.artifacts/`, diabaikan Git.
- Sesudah perapian token/area klik, **13 pemeriksaan visual/read-only tambahan** lulus pada build production final: filter/label44px, perbandingan dua kolom desktop, review dan meter390px, light/compact/EN, tanpa runtime error/5xx. Script `apps/invest/scripts/review-visual-check.mjs`; data uang tidak ditulis.
- Regresi browser I1/I2 dari sesi sebelumnya tidak diklaim diulang; suite API lengkapnya tetap dijalankan. Verifikasi code/schema/rumus tidak membuktikan kalibrasi investasi nyata.

### Batas dan kelanjutan

UI detail/filter/perbandingan I3 dan review deterministik I4 tersedia lokal. Source rights, akses akun/biaya/seri historis produk nyata tetap AC-D4 terbuka. Narasi AI, validator/fallback model nyata, receipt lintas bulan I1, arsip UI versi profil, kalibrasi/pilot serta deployment belum selesai. Katalog awal tetap research-only. Kompatibilitas schema lama terjaga karena tidak ada perubahan schema; kompatibilitas pasangan image produksi belum diuji.

Proses API, frontend dan PostgreSQL scratch milik sesi sudah dihentikan; port3000/3001/4000/55439 tidak mendengarkan. Perubahan hanya source repo Invest dan database sintetis; tidak ada migrasi/deployment produksi.

## 2026-10-26 — Catalog, engine dan realisasi I3

**Otorisasi:** Arzaka meminta melanjutkan riset dan implementasi setelah source masuk repository Invest. Pekerjaan di checkout `invest-trackster`, branch `feat/invest-market-evaluation`, dari `2fee407`; metode D12 tetap `invest-method-v0.1`. Publikasi source mengikuti permintaan push ke repo Invest sebelumnya, tanpa deployment Trackster/Invest.

### Hasil yang dapat dijalankan

- Pasar/Sumber memuat tiga catatan penelitian Indonesia beserta URL, bagian dokumen, tanggal pemeriksaan, dan batas hak pakai. [Riset primer I3](08-Catalog-Research.md) membedakan minimum per kanal, tarif maksimum versus aktual, payout, lot dan seri yang penawaran perdananya sudah ditutup. Tidak ada quote/histori/fee sintetis pada catalog produksi; semuanya tetap research/withheld sampai lengkap.
- Curator ADMIN yang mempunyai akses Invest dapat menyimpan versi metadata dan observasi melalui form JSON/API. Audit actor tidak ikut dibagikan. Member meninjau akses kanal, pemahaman dan lock secara privat; review terikat versi catalog. Holding dapat dipetakan ke instrumen yang kelas/mata uangnya cocok.
- Engine Decimal M3–M6 memeriksa profil, source rights, lifecycle/review, kanal, harga/NAB/FX, kalender sumber,36 bulan selesai dan coverage≥95%, biaya/minimum/lot, knowledge dan stress produk. Jalur kontraktual mempunyai pemeriksaan dokumen sendiri. Tanggal fetched tidak menggantikan market asOf. Valuasi manual maksimal24jam adalah aturan operasional konservatif yang dinyatakan eksplisit, bukan hasil kalibrasi pasar.
- Alokasi menghitung pot lama+kontribusi, skala toleransi/capacity rupiah, kekurangan alokasi, pembulatan sen, unit dan biaya. Pot lama yang melampaui batas tidak ditutupi dengan tambahan kas. Cash fund terpetakan memerlukan stress sendiri; kas asing ditahan untuk review. Crypto dibatasi pada seluruh pot. Semua nominal yang dikeluarkan lolos stress termasuk biaya; hasil bukan janji batas kerugian pasar.
- Ranking hanya dalam peer sebanding: COST/DIV/DATA/LIQ/ACCESS, tie-break deterministik, maksimal3 alternatif, near-tie<3 poin. Satu kandidat inti per kelas; pengguna dapat memilih alternatif dengan membuat evaluasi baru. Pilihan yang tidak lagi memenuhi gate/top3 tidak memaksa pembelian. Overlap tetap unknown, bukan klaim diversifikasi teruji.
- Evaluasi PLAN/ACTUAL tersimpan immutable: input goal/profile/holdings/budget, versi catalog, pilihan peer/kandidat, aturan dan hasil. Arsip20 per halaman tersedia di `/app/reviews`; detail hasil di `/app/reviews/:id` (route PRD diselaraskan). Stale dihitung ulang dari revision dan hasil gate; arsip tidak ditimpa.
- Reservasi hanya dari ACTUAL yang masih layak, mencakup seluruh kontribusi B (order+residu kas), TTL maksimal24jam. Settlement meminta bukti pembelian sudah terjadi dan sisa dana sudah dipisahkan. PURCHASE serta GOAL_SAVING menggantikan reservasi tepat sekali, atomis, tanpa debit bank. Snapshot/quote/input basi menahan settlement; fakta pembelian di luar rencana tetap dapat dicatat lewat ledger manual dengan alasan.
- UI memakai source v3 Trackster yang sama, dukungan ID/EN, dua tema/density, form yang mempertahankan input, dan retry key saat respons hilang. Tidak ada update nominal optimistis atau LLM Invest pada tahap ini.

### Penyimpanan dan kontrak

Migrasi aditif `20261026140000_invest_market_evaluation` menambah `InvestInstrument` bersama; `InvestCatalogRevision` (actor audit), `InvestInstrumentAccess`, `InvestEvaluation` privat/berscope user. FK evaluasi→goal memakai user komposit. Tambahan `InvestHolding.instrumentId` serta `InvestReservation.plan/settledLedgerIds` hanya menyentuh tabel Invest. Identifier holding/access dapat menunjuk catatan built-in yang belum ditulis ke DB, sehingga tidak memakai FK instrument. Histori catalog dan snapshot immutable dipertahankan. Tidak ada perubahan kolom/row keuangan lama.

API baru: GET `/invest/instruments` dan `/:id`; POST/PATCH `/invest/catalog/instruments`; POST `/:id/observations`; PUT `/invest/instruments/:id/access`, `/invest/holdings/:id/instrument`; POST/GET `/invest/evaluations` dan GET `/:id`; POST `/invest/reservations` serta `/:id/settle`. DTO/write contract dan instruksi kurasi ada di [README app](../../apps/invest/README.md). Rate berupa pecahan desimal, unknown tidak diisi0. POST menggunakan revision + idempotency key; catalog juga memakai expectedVersion. Feature flag global/crypto defaultfalse, tanpa menghapus gate saat diaktifkan.

Migrasi ini dapat dipasangkan dengan kode lama karena seluruh tambahan aditif dan kolom lama tetap. Rollback kode menghentikan endpoint baru; jangan menghapus tabel/arsip yang sudah ditulis. Kompatibilitas tersebut ditinjau dari SQL, belum diuji sebagai pasangan image produksi lama+baru. Tidak ada migrasi produksi dijalankan.

### Verifikasi dan temuan

| Pemeriksaan | Hasil / batas bukti |
| --- | --- |
| Build/schema | Prisma valid; backend build dengan heap1536MB, Invest production build/typecheck, frontend Trackster `tsc --noEmit` lulus. Windows Node22.12.0, bukan klaim verifikasi image Node24 produksi. Build berat berurutan. |
| Engine | Empat check Invest lulus. Check baru **1.240 assertion**: kalender/coverage/rights/age/fees/lot/crypto/pot lama/kapasitas rupiah, pilihan alternatif, urutan deterministik dan konservasi B pada300 anggaran sintetis. Check profil/accounting/budget sebelumnya tetap lulus. |
| Database/API | **227 assertion** suite lulus pada Nest/Auth/Invest asli dan PostgreSQL17 loopback baru dengan seluruh48 migrasi. Isolasi dua akun+satu denied, curator/member, arsip/akses privat, extra-field rejection, versi sumber, pilihan alternatif, concurrent reserve/settle, replay, TTL/cancel, koreksi income dan golden keuangan lama identik. Tanpa cron/provider/akun nyata. |
| Browser | **32 regresi I1 +31 alur I2 +30 alur I3**, lalu **8 pemeriksaan visual/arsip tambahan** lulus pada build production. I3 mencakup lost-response→retry, data riset ditahan, akses privat, pilihan alternatif membuat snapshot baru, reserve→settle, history, ID/EN, mobile390px/desktop1400px. Token/font/sidebar dibandingkan dengan `/demo` build Trackster lokal sebelumnya, source v3 tidak berubah. Tidak ada runtime error atau respons lokal5xx. |
| Tenancy | Audit statis0temuan; tiga model privat ditambahkan ke daftar. `InvestInstrument` sengaja shared; actor audit dan akses pengguna tidak dibagikan melalui catalog. |
| Dokumentasi | UTF-8 dan target tautan lokal diperiksa, diff whitespace bersih; artefak/gambar/log sintetis berada di `.artifacts/` yang diabaikan Git. |

Dua masalah aplikasi ditemukan dan diperbaiki: global ValidationPipe lama semula menghapus unknown fields sebelum validasi strict; guard khusus market kini memeriksa raw DTO lebih dahulu tanpa mengubah API finansial lama. PostgreSQL JSONB mengubah urutan key sehingga snapshot yang sama semula tampak basi; equality sekarang mengkanonisasi key. Regresi API memeriksa kedua perilaku. Fixture TTL awal menyalahi constraint createdAt<expiresAt; fixture diperbaiki tanpa melonggarkan constraint. Pemeriksaan browser menunggu data asinkron dan font selesai sebelum menghitung isi/menangkap gambar. Encoding file yang sempat terkena default Windows diperbaiki dan diperiksa terhadap baseline.

### Acceptance yang masih terbuka

Inti I3 dan reserve→settle I2 kini tersedia lokal; ini **bukan kelulusan seluruh PRD**. AC-D4/data produk nyata masih terbuka: akses akun, tarif lengkap, hak pakai deployment, kalender/histori yang direkonsiliasi, dan stress spesifik belum terbukti. Catatan manual histori adalah attestasi dengan bukti, belum audit seri otomatis. Cakupan server saat ini memuat hingga1.000 record tersimpan ditambah built-in; perlu strategi skala sebelum universe luas.

Sisa UI I3: detail instrumen mandiri, filter kelas/akses/gate dan perbandingan detail; saat ini identitas/sumber/gate ada di kartu Pasar/Sumber dan alternatif di detail evaluasi. I4 review perubahan pot/deviasi, acknowledgment review dan AI tervalidasi belum aktif. Riset lanjutan tetap mencakup kalibrasi profil risiko, pengujian alokasi, biaya/minimum, kualitas histori, evaluasi shortlist, konsistensi AI, serta rekonsiliasi jatah dengan portofolio. Receipt lintas bulan I1, arsip UI profil, kalibrasi/pilot V1–V7, produk nyata Indonesia/global/crypto dan release I5/I6 tetap pekerjaan berikutnya. Tidak ada feed harga/vendor, prediksi return, broker order, atau klaim rekomendasi nyata yang sudah teruji.

Proses API, frontend dan PostgreSQL scratch milik sesi sudah dihentikan. Port3000/3001/4000/55439 diperiksa tidak mendengarkan; tidak ada data pribadi, perubahan DNS, migrasi produksi atau transaksi investasi nyata.

## 2026-10-26 — Import ke repository Invest

Arzaka meminta seluruh source di-push ke `ArzakaRaffan/invest-trackster`. Snapshot disiapkan dalam checkout Git terpisah dengan frontend Invest, dependensi UI Trackster, backend, migrasi, pengujian, serta seluruh dokumentasi publik. Asal snapshot, pengecualian file lokal, dan guard pipeline dijelaskan di [07-Repository.md](07-Repository.md). Ini publikasi source; status fitur tetap I0/I1 dan inti I2, bukan rilis produksi atau penyelesaian I3–I6.

Verifikasi ulang pada checkout baru (Windows, Node22.12.0): instalasi `npm ci` ketiga app, generate Prisma, build backend dengan heap1536MB, tiga check Invest, audit tenancy0temuan, TypeScript frontend bersama, typecheck dan build production Invest semuanya lulus. Pemeriksaan browser Chromium terhadap build tersebut meluluskan11 assertion untuk landing/login, interaksi form, viewport390px, font dan asset maskot bersama; tidak ada runtime error/5xx. Tes ini tidak mengulang autentikasi/database maupun seluruh alur portofolio; bukti sebelumnya tetap tercatat pada bagian I2/I1. Dua percobaan awal smoke check memakai selector/kapitalisasi yang tidak cocok; diperbaiki berdasarkan source halaman, tanpa perubahan kode aplikasi.

Inventaris source969 file dari checkout asal lengkap setelah dua file konfigurasi `.claude` dikecualikan; README Trackster lama dan catatan repository ditambahkan. Mode file cocok dengan index asal. Environment nyata dan artefak lokal tidak masuk staging; template identitas/kredensial dibersihkan dan pemindaian pola token tidak menemukan token literal. Tautan lokal pada dokumen awal dan seluruh dokumen Invest diperiksa. Pemeriksaan whitespace pada initial import menemukan31 temuan yang seluruhnya sudah ada di baseline; dipertahankan agar isi migrasi dan fixture tidak berubah. Tidak ada whitespace baru dari penyesuaian export.

## 2026-10-26 — Lanjutan: inti profil dan portofolio I2

**Otorisasi:** Arzaka meminta "lanjut yaa" setelah handoff I0/I1. Implementasi tetap lokal pada branch yang sama, dengan metode `invest-method-v0.1` / D12. Catatan I0/I1 di bawah adalah bukti tahap sebelumnya.

### Fitur yang kini berjalan

- `/setup` menjadi wizard empat langkah nyata: tujuan, risiko/kemampuan/pemahaman, keadaan portofolio awal, dan kas bebas. Draft tersimpan; belum dijawab tetap unknown. Satu tujuan aktif per user ditegakkan dengan unique index parsial dan pergantian atomis. Maksimal50 tujuan dan500 holdings per akun pada implementasi ini; tidak ada penghapusan history melalui UI.
- Profil M2 menyimpan versi immutable, jawaban T1–T4, kapasitas, tanggal/likuiditas, hasil T/C/H dan knowledge gates. `min(T,C,H)`, cutoff3/6bulan, horizon36/60/120 complete months WIB, essential expense0, loss capacity0, konflik T1=0 dengan T2/T4=3, expiry12bulan, dan kebutuhan konfirmasi mengikuti baseline. Acknowledgement konflik terikat hash jawaban + versi goal terbaru. Knowledge tidak menaikkan kelas; crypto tetap default0 dan belum mempunyai nominal pembelian.
- Portofolio manual mendukung opening UNITS atau VALUE, currency, harga/nilai/asOf, FX/asOf dan modal opsional. Unit memakai Decimal28,12; operasi Invest memakai clone Decimal presisi60 sehingga tidak mengubah konfigurasi uang Trackster. Value-only tidak menciptakan unit atau P/L. Pengisian unit sesudah value-only memakai adjustment dengan alasan. Valuasi selalu berlabel manual/belum diverifikasi; FX hilang/basi dan unit berubah terlihat.
- Ledger immutable mencatat PURCHASE, SALE, DISTRIBUTION, GOAL_SAVING, QUANTITY_ADJUSTMENT dan REVERSAL. Koreksi dapat membalik dan mencatat pengganti secara atomis. Riwayat unit tidak boleh menjadi negatif; credit yang sudah dipakai tidak dapat dibalik sebelum pemakaiannya dikoreksi. Referensi transaksi/pemasukan Trackster hanya diperiksa kepemilikannya, tidak membuat debit bank baru. Pemasukan hasil investasi yang direferensikan wajib INTERNAL terlebih dahulu, agar tidak otomatis menghasilkan jatah baru.
- Pembelian+biaya dan simpanan tujuan mengurangi jatah pada bucket terpisah, masing-masing tepat sekali. Kas kontribusi baru berkurang mengikuti ledger setelah konfirmasi. Hasil jual/dividen menjadi **kas di dalam tujuan**, terpisah dari free cash kontribusi baru. Pembelian dari kas tujuan memilih ID asal alokasi; nominal tidak memotong jatah/kas kontribusi baru dua kali. Alokasi lama tidak dianggap income bulan sekarang.
- Pergerakan yang sudah terjadi dapat dicatat melewati cap dengan acknowledgment dan alasan. Penurunan income setelah pembelian atau kekurangan kas menghasilkan OVERCOMMITTED/B0 tanpa menghapus sejarah. Perubahan kebutuhan dana/goal dan movement mundur membuat kas perlu dikonfirmasi lagi. Cash confirmation menyimpan watermark ID ledger; tidak hanya membandingkan timestamp. `capacityRevision` dan goal version mencegah konfirmasi lama hidup kembali setelah input diubah lalu dikembalikan.
- Seluruh writes goal/profile/holding/ledger memakai revision, idempotency `(user, route, key)`, transaksi Serializable, dan audit/version. Retry body sama mengembalikan respons asli walaupun revision sudah bergeser; body berbeda pada key sama409. UI menahan update nominal sampai server berhasil, mempertahankan isian pada konflik, dan mengirim ulang key/body yang sama ketika respons hilang.
- Shell/token/fonts/generated views tetap bersama Trackster v3. Form/modal memakai pola yang sama; ID/EN, theme/density, keyboard/focus, mobile390px, pemilihan tujuan, ledger pagination50baris, dan keadaan kosong/error tersedia.

### Penyimpanan dan API

Migrasi `20261026110000_invest_profile_portfolio` menambah `InvestGoal`, `InvestRiskProfile`, `InvestHolding`, `InvestLedger`, `InvestReservation`, `InvestMutation`, `InvestChange`; ditambah `InvestMonth.cashLedgerIds` dengan default array kosong. Seluruh model privat mempunyai userId/index, relasi goal/holding memakai FK komposit bersama userId. Tabel keuangan lama tidak diubah oleh migrasi ini. Tidak ada provider baru atau perubahan auth/cookie/DNS.

Daftar/summary: `GET /invest/portfolio` (satu coherent revision), `/goals`, `/holdings`, `/ledger`, `/reservations`; status kini menghitung setup completeness. Writes mengikuti kontrak PRD, ditambah expectedRevision/idempotencyKey pada form. Pengubahan metadata holding melalui PATCH adalah valuasi/adjustment; pembelian lewat ledger. Profil lama tetap tersimpan di database; UI menampilkan versi terbaru, bukan browser arsip semua versi.

Reservasi memiliki TTL maksimum24jam, akuntansi active/expired, cancel idempotent dan isolasi. **POST create dan settlement belum diekspos:** harus mendapat evaluation ACTUAL, quote/source validation dan candidate selection dari I3. Fixture reservasi dibuat langsung oleh harness untuk menguji accounting/cancel; itu bukan bukti alur reserve→settle lengkap. Tidak menerima nominal reservasi karangan klien.

### Verifikasi sesi ini

| Pemeriksaan | Bukti dan batas |
| --- | --- |
| Build | Backend dengan heap1536MB lulus; Invest typecheck + build production lulus; frontend Trackster `tsc --noEmit` lulus. Runtime browser memakai hasil build, bukan dev/mock frontend. |
| Engine | Tiga check Invest lulus: jatah I1, profil **15.380 assertion**, accounting **19 assertion**. Kombinasi T/C/H, cutoff, incomplete/conflict/knowledge/expiry, unit pecahan besar, cash watermark, TTL dan pemakaian ulang tercakup. Ini verifikasi aritmetika, bukan kalibrasi pengguna nyata. |
| Database/API | **152 assertion suite + 2 assertion isolasi tambahan lulus** pada Nest/Auth/Invest asli dan PostgreSQL17 loopback baru; seluruh47 migrasi diterapkan. Termasuk dua akun berakses+satu denied, foreign refs/profile, replay, concurrent key sama/berbeda, switch goal, reversal/replacement, cap/cash/credit/expiry/cancel, dan golden fixture keuangan lama identik. Dua kasus tambahan dimasukkan harness untuk run berikutnya. |
| Tenancy | Audit statis0temuan; tujuh delegate baru ditambahkan. Uji isolasi runtime meliputi goals/profiles melalui goal ownership, holdings, ledger, references dan reservasi. |
| Browser | **32 regresi I1 + 29 alur I2 lulus**, lalu **7 pemeriksaan layout/runtime** sesudah perbaikan mobile. Login→goal→draft/profil→kas→opening→purchase→reversal, hasil response sengaja diputus sesudah commit lalu retry tanpa duplikat, stale conflict mempertahankan isian, focus/Escape, ID/EN, dua tema/density, desktop1400px/mobile390px. Tidak ada runtime error/5xx. Skrip [I1](../../apps/invest/scripts/browser-check.mjs) dan [I2](../../apps/invest/scripts/portfolio-browser-check.mjs); gambar sintetis di `.artifacts/` (ignored). |
| Dokumen | 188 tautan lokal diperiksa, tidak ada target hilang; UTF-8 valid, `git diff --check` bersih. |

Temuan yang diperbaiki selama verifikasi: cash confirmation lama semula bisa hidup kembali saat goal/input kembali ke nilai lama; kini ada revisi monoton. Presisi operasi unit dipisahkan dari Decimal global. Inspeksi screenshot menangkap label portofolio mobile EN terlipat per huruf walaupun tidak ada overflow; flex basis diperbaiki dan lebar label ditambahkan ke checks. Uji script awal memerlukan import CommonJS assert dan selector form yang memperhitungkan label/select/textarea; pemeriksaan final memakai harness yang diperbaiki, tanpa menurunkan assertion domain.

### Kelanjutan dan batas acceptance

Inti I2 dapat digunakan lokal untuk tujuan/profil, opening dan pencatatan realisasi. **I2 belum seluruhnya selesai:** AC-L1 reserve→settle dan pencegahan pembelian dari evaluation basi menunggu I3. M3 full-pot stress/loss capacity, alokasi, lot/fee, ranking, catalog/source gates dan snapshot belum aktif; kemampuan membaca saldo/pembelian manual bukan rekomendasi executable. Kesimpulan kalibrasi profil/pilot Arzaka juga belum dapat dibuat dari fixture.

Langkah berikutnya: I3 catalog Indonesia manual bersumber + eligibility M4, alokasi/stress M3/M6, ranking M5 dan immutable evaluation. Hubungkan create/settle reservasi hanya ke evaluation ACTUAL yang masih valid, dengan penggantian reserve→usage sekali dalam transaksi. Setelah itu review/AI I4 dan pilot I5. Sumber pasar, fee/minimum nyata, FX/calendar dan hak pakai harus diverifikasi sebelum capability nominal diaktifkan. Receipt selector lintas bulan I1 dan arsip UI versi profil tetap menjadi pekerjaan sebelum pilot.

Tidak ada data finansial pribadi di dokumentasi, transaksi investasi nyata, commit/push/merge atau deployment pada sesi ini. API, kedua frontend, dan PostgreSQL scratch milik sesi dihentikan; port3000/3001/4000/55439 diperiksa sudah tidak mendengarkan.

## 2026-10-26 — Fondasi dan jatah bulanan (I0/I1)

**Sumber otorisasi:** Arzaka meminta mulai membangun berdasarkan PRD. Metode tetap D12 / `invest-method-v0.1`; tidak mengunci ulang parameter atau membuat keputusan deployment. Branch kerja `feat/invest-foundation`, dari working tree `feat/overnight-improvements` yang tersedia saat mulai. Perubahan `.claude/launch.json` sudah ada sebelumnya dan tidak disentuh.

### Yang diimplementasi

- Frontend Next mandiri `apps/invest`; login melalui Auth Trackster dan akses v1 default deny. Akun diizinkan melalui `INVEST_USER_IDS` bersama flag `INVEST_ENABLED=true`.
- Sumber token v3 dipisahkan ke `tokens.ts` dan dipakai kedua frontend. Invest memakai generated Sidebar/BottomNav/PageHeader/Auth, CSS/pseudo states, font, mascot, dan transport API asli. Domain content mengikuti pola v3.
- Modul Nest `invest`: status, anggaran bulanan, daftar event, konfirmasi kas, dan rekonsiliasi event. CORS dan CSRF memakai allowlist origin yang sama; origin Trackster lama dipertahankan. Auth/cookie/revocation tidak diganti.
- Migrasi `20261026090000_invest_monthly_foundation`: hanya enum/tabel/index/FK Invest baru (`InvestMonth`, `InvestPaymentEvent`, `InvestReceiptLink`, `InvestEventAudit`). Tidak ada backfill atau perubahan saldo/Income/DailyBudget.
- Kalender WIB, 4/5 payday mingguan, clamp tanggal31 ke akhir bulan, actual CONFIRMED (termasuk irregular), dua jatah20% Decimal half-up. Kalkulator per kind memakai fungsi Trackster; observasi historis dibatasi cutoff awal bulan dan dikelompokkan per periode agar partial receipts bukan periode terpisah.
- Forecast ambigu/missing payday/estimasi belum lengkap ditampilkan `null` dengan alasan; angka0 hanya untuk nilai yang memang diketahui nol. User menautkan receipt secara eksplisit, menandai sebagian/selesai/terlewat/batal, atau memindah event ke tanggal mendatang. Pemindahan pembayaran sebagian membawa tautan receipt ke pengganti secara atomis; hanya residual masuk bulan tujuan. Closed month memberi status efektif MISSED pada event yang belum terminal dan tidak memproyeksikan sisanya.
- Revision dihitung dari sumber keuangan/event hidup, sehingga edit/hapus/resolve Income tidak membutuhkan perubahan write path Trackster. Konfirmasi kas membandingkan financial revision; perubahan membuatnya basi. Mutation memakai transaksi Serializable dan expected revision/version; konflik membalas409, form mempertahankan isian.
- Audit event append-only dan receipt unik per user. Sumber lama yang dihapus tidak menghapus bukti tautan; user harus memeriksa ulang. BankBalance hanya dibaca, tidak dimutasi.
- Memperbaiki build backend berulang: `tsBuildInfoFile` pindah ke `dist/`, supaya `deleteOutDir` juga membuang cache incremental. Sebelumnya build kedua dapat menghilangkan module runtime yang dianggap tidak berubah. Dua build berurutan kini memuat entrypoint dan Prisma module lengkap.

### Bukti pemeriksaan

| Pemeriksaan | Hasil / konteks |
| --- | --- |
| Prisma schema + migration | Schema valid; seluruh46 migrasi termasuk Invest diterapkan pada PostgreSQL17 scratch loopback yang baru. Bukan database production. |
| Backend build | Lulus dengan heap1536MB; build berurutan mempertahankan `dist/main.js` dan `dist/prisma.module.js`. |
| TypeScript dan build frontend | Frontend Trackster dan Invest lulus; build production lokal, belum deployment. |
| Check backend | 41/41 lulus lintas dua run:34 check tanpa DB, lalu7 check yang membutuhkan DB pada scratch. Run awal tujuh ini gagal karena Postgres lokal5434 belum berjalan, bukan assertion domain; diulang pada database uji terpisah. |
| Tenancy audit | 0 temuan; empat delegate Invest dimasukkan audit. Satu create replacement memakai data object yang mewarisi userId server, dengan alasan scoping eksplisit. |
| API PostgreSQL/Nest | 52 assertion lulus: guard, tiga akun sintetis, isolasi, cash/receipt/source revision, race Serializable, reschedule partial lintas bulan, CSRF/CORS origin lama+baru, revoke, unknown forecast input, serta legacy financial rows identik. |
| Browser | 32 assertion lulus pada Chromium/build production: login, cash save/reload, receipt reconciliation, konflik yang mempertahankan isian, Escape/focus, token/font/sidebar v3 dibandingkan live `/demo`, light/dark, lega/ringkas, ID/EN, navigasi390px/lima tab/44px, dialog mobile, offline, logout bersama dan redirect sesi. Tidak ada runtime error atau respons lokal5xx. Empat screenshot sintetis di `apps/invest/.artifacts/` (ignored). |
| Dokumen | 145 tautan lokal diperiksa, UTF-8 valid, `git diff --check` bersih. Spasi akhir yang sudah ada di checklist lama tidak diubah. |

Harness API sengaja memakai modul Auth/Invest asli dan middleware terkait pada aplikasi Nest uji tanpa cron/provider; tidak menguji seluruh jalur produksi Nginx atau layanan eksternal. Golden comparison hanya terhadap fixture sintetis, bukan rekening Arzaka. Scope tes ada pada file [API](../../apps/backend/scripts/invest-e2e.mjs), [engine](../../apps/backend/src/modules/invest/invest-budget.check.ts), dan [browser](../../apps/invest/scripts/browser-check.mjs).

### Status acceptance dan kelanjutan

I0/I1 mempunyai implementasi lokal yang dapat dijalankan. Bukti awal mencakup AC-B1–B4, guard/isolation AC-I1/I2, dan shell/state AC-U1/U2 sesuai scope yang telah dibuat. Ini **belum** meluluskan seluruh acceptance PRD untuk app lengkap. Nominal `availableToAllocate` pada tahap ini adalah batas anggaran; `canEvaluate=false` dan tidak ada endpoint pembelian/reservasi. `usedQuota` dan `reservations` masih0 karena ledger belum diaktifkan.

I2 berikutnya: goal aktif/draft, profil/knowledge M2, holdings, ledger dan cash movement, idempotency/reservations serta batas full-pot. Lalu I3 engine/catalog/snapshot, I4 review/AI, I5 pilot data/account nyata, I6 release tersendiri. Halaman Portofolio/Pasar/Review/Setup saat ini menyampaikan kesiapan fitur, bukan wizard risiko atau catalog palsu.

Keterbatasan yang tetap nyata: receipt selector UI menampilkan200 receipt bulan terpilih; receipt luar bulan yang sudah tertaut ditampilkan sebagai referensi ID. Untuk menautkan receipt lintas bulan pertama kali, API menerima ID milik user yang valid; UI pencarian lintas bulan/pagination perlu ditambahkan sebelum pilot. Estimasi memakai konfigurasi stream saat refresh; arsip evaluasi/asOf historis lengkap baru pada I3. Domain, source licenses, biaya/minimum produk, profil pengguna dan pilot investasi belum diverifikasi.

Tidak ada commit/push/merge, perubahan DNS, migrasi produksi, pemakaian provider berbayar, atau transaksi investasi nyata pada sesi ini. Proses uji milik sesi dihentikan setelah verifikasi.
