# PRD — Invest Trackster v1

> **Status: siap untuk memulai pembangunan lokal.** Metode `invest-method-v0.1` disetujui Arzaka pada **2026-10-13** (D12).
> **Pembaruan 2026-10-26:** implementasi lokal I0/I1 serta tujuan/profil/portofolio manual I2 sudah tersedia; [status dan bukti](06-Implementation.md). Inti I3 catalog/alokasi/ranking/snapshot serta create/settle reservasi kini tersedia lokal. Sisa detail/filter catalog, review/AI, data nyata/pilot, serta deployment belum selesai. Kesiapan spesifikasi tidak berarti produk lengkap sudah lolos acceptance.
> **Pemilik produk/keputusan:** Arzaka. Domain/hosting O9 dan gate data/pilot/release tetap diselesaikan sebelum peluncuran terkait.

[Keputusan](00-Decisions.md) · [Metode yang disepakati](04-Methodology.md) · [Bukti penelitian](05-Validation-Results.md) · [Data dan kode](02-Data-and-Integration.md) · [Riset](01-Investment-Research.md)

## 1. Tujuan, pengguna, dan batas produk

Invest adalah website terpisah dengan akun serta backend Trackster bersama. Pengguna pertama Arzaka; bentuk produk harus dapat menerima cadence pemasukan mingguan, bulanan, atau tidak tetap. Pertanyaan utama: **berapa jatah investasi bulan ini, bagaimana membaginya sesuai tujuan/risiko, dan kandidat apa yang memenuhi syarat?**

Keberhasilan v1: pengguna dapat memahami dua jatah bulanan, melengkapi profil/tujuan, memasukkan portofolio manual, melihat pembagian nominal dan shortlist bersumber, serta mencatat keputusan/pembelian manual tanpa memakai jatah dua kali. Hasil perhitungan dapat direproduksi dari snapshot dan ruleset; tidak bergantung pada narasi AI.

| Termasuk v1 | Batas |
| --- | --- |
| Login akun Trackster, frontend terpisah dan UI/UX Trackster v3 | Tidak membuat akun/auth provider baru. Akses v1 dibatasi secara eksplisit ke akun pengguna awal di server. |
| Jatah bulan kalender WIB; rencana/aktual, pemakaian, reservasi, kas bebas | Tidak mengubah budget harian, alokasi mingguan, parser, saldo bank, atau definisi endpoint Trackster lama. |
| Tujuan dan profil per tujuan, alokasi kelompok, holdings/ledger manual | Satu tujuan aktif pada v1; tujuan tambahan dapat disimpan sebagai draft. Dana tidak otomatis dibagi ke beberapa tujuan. |
| Catalog Indonesia manual bersumber, pemindaian/gate/shortlist | Cakupan parsial terlihat. Global/crypto boleh tampil sebagai riset; nominal dibuka bertahap setelah gate yang disepakati lolos. |
| Review bulanan, perubahan input, penjelasan/perbandingan AI | Tidak ada transaksi broker, order otomatis, custody, sinkronisasi holdings, atau prediksi return sebagai fakta. |
| Loading/kosong/error/kurang data, arsip hasil dan bukti | Produksi tidak menampilkan fixture sebagai angka pengguna. Demo sintetis hanya pada mode yang jelas berlabel. |

## 2. Sumber kebenaran dan kompatibilitas

Keputusan D1–D12 menentukan intent. [04-Methodology.md](04-Methodology.md) adalah sumber tunggal pertanyaan, cutoff, bobot, shock dan skor M1–M7. PRD ini menentukan alur, kontrak serta acceptance pelaksanaannya; contoh riset bukan preset tambahan. Perubahan metode setelah pembangunan dimulai perlu revisi ruleset dan decision log, dengan snapshot lama tetap dapat dibaca.

Pemeriksaan pelaksanaan pada 2026-10-13 dilakukan di working tree branch `fix/gmail-confirm-link`, HEAD `5111fb0`. Snapshot riset awal `3694740` tetap bukti historis tersendiri. Source lokal bukan bukti deployment produksi. [package frontend](../../apps/frontend/package.json) saat pemeriksaan menyatakan Next `^15.5.27`/React `^19.3.0`; [backend](../../apps/backend/package.json) memakai NestJS 10/Prisma 5. Gunakan versi/lockfile yang berlaku saat implementasi, tidak menyalin keterangan stack lama secara buta.

Arsitektur pelaksanaan: frontend Invest mandiri di `apps/invest` sebagai target struktur, memakai pola Next/SWR/API cookie yang sudah ada; fitur backend di `apps/backend/src/modules/invest`. Gunakan PostgreSQL/Prisma bersama dan `userId` dari sesi. Token/komponen shell v3 yang dipakai kedua frontend harus berasal dari sumber bersama yang terawat; jangan membangun sistem desain baru atau mengandalkan salinan manual yang kemudian berbeda. Penempatan module shared dapat mengikuti konfigurasi build repo tanpa refactor seluruh frontend lama.

Invarian wajib: saldo bank tetap live incremental; membaca/menulis Invest tidak menghitung ulang atau menggerakkan BankBalance. Parser, Income, DailyBudget, check-in, laporan, tools publik dan login Trackster tetap berfungsi. Data Invest baru bersifat additive; tidak ada backfill data lama atau perubahan makna endpoint lama yang dibutuhkan untuk menyalakan v1.

## 3. Layar dan alur pengguna

Navigasi Invest memakai shell, sidebar desktop, topbar, dan bar bawah lima slot mobile yang sama dengan v3. Isi tab Invest: **Beranda, Portofolio, Rencana, Pasar, Menu**; geometri, perilaku, breakpoint dan gaya mengikuti Trackster. Rekomendasi menjadi sublayar Rencana; review/riwayat menjadi sublayar Menu. Perubahan label/isi sesuai domain investasi, dengan pola interaksi yang sama.

| Route frontend | Isi / alur tindakan | Keadaan dan hasil |
| --- | --- | --- |
| `/` | Entry Invest dengan identitas keluarga Trackster, tujuan produk, CTA Masuk; sesi valid diarahkan ke Beranda. | Entry minimal v1 memakai pola landing v3. Tidak menambahkan pricing/testimoni atau klaim hasil investasi yang tidak ada. |
| `/login` | Login username/password via `/auth/login` Trackster; logout/revoke berlaku pada sesi bersama. | Kesalahan memakai pola auth v3; 401 kembali login; sesi valid tanpa akses Invest menampilkan keadaan akses ditolak. |
| `/setup` | Wizard: pilih/buat tujuan, jawaban risiko dan kebutuhan dana, pemahaman, portofolio awal kosong/terisi, kas bebas. Draft dapat disimpan. | Tujuan/profil belum lengkap tidak disamakan dengan profil konservatif; user dapat membaca ringkasan jatah sambil melengkapi. |
| `/app` | Pilih bulan; hero **Jatah aktual** dengan label bulan; kartu **Rencana jatah**, pemakaian, reservasi dan dana untuk evaluasi; CTA Lengkapi profil/Lihat rencana. | Dua jatah tidak dijumlahkan; sumber/kelengkapan ditampilkan. Jika kas bebas belum diketahui, dana executable tidak diberi nominal seolah pasti. |
| `/app/portfolio` | Daftar holdings menurut tujuan/kelas, unit/nilai/date/currency, kualitas valuasi; Tambah kepemilikan awal atau Catat pergerakan. | Opening holdings berbeda dari pembelian bulan berjalan. P/L ditahan jika cost basis atau data arus kas tidak cukup. |
| `/app/plan` | Tujuan aktif, profil T/C/H, batas rugi rupiah, kas bebas, pilihan bulan, simulasi rencana dan evaluasi aktual yang jelas terpisah. | Menampilkan alasan pembatas profil; konflik/input kurang punya CTA spesifik. Simulasi forecast tidak memiliki aksi reservasi/pembelian. |
| `/app/reviews/:id` | Pembagian kelompok, maximal tiga alternatif per peer, kandidat utama, nominal/biaya/residu, stress dan bukti. Pilih kandidat → preview reservasi → konfirmasi manual. | Hasil partial/withheld tidak dipaksa menjadi shortlist penuh. Sumber atau input berubah menandai hasil perlu diperbarui sebelum reservasi. |
| `/app/market` | Universe terdaftar, filter kelas/wilayah/akses/gate, jumlah tercakup/belum, tanggal sumber. | Global/crypto riset berlabel; kandidat gagal gate tetap bisa dibaca alasannya tanpa CTA nominal executable. |
| `/app/market/:instrumentId` | Identitas, dokumen/biaya/minimum/payout, histori dengan periode, risiko dan akses pengguna, alasan kelayakan. Bandingkan maksimal tiga instrumen sebanding. | Unknown ditampilkan sebagai data kurang; source/asOf melekat pada setiap angka penting. |
| `/app/menu` | Review/riwayat, sumber/catalog, pengaturan tema/bahasa/density, tautan kembali Trackster, keluar. | Tema/lang/density mengikuti perilaku v3; penyimpanan preferensi per origin tidak diasumsikan tersinkron lintas website. |
| `/app/reviews` | Snapshot per bulan, perubahan jatah/profil/holdings, deviasi ≥5 pp, alasan review; tandai sudah ditinjau atau refresh hasil. | Meninjau bukan membeli. Perubahan metode/source tidak mengubah arsip hasil lama. |
| `/app/sources` | Status cakupan, sumber/lisensi/umur/histori; user awal yang berwenang dapat mengisi catalog/data manual bersumber. | Perubahan metadata memiliki versi dan audit; tidak menerima upload kredensial atau data finansial pribadi sebagai sumber pasar. |

Setiap layar mempunyai loading, kosong yang nyata, error+retry, offline/data lama, dan keadaan akses ditolak yang sesuai kebutuhan. Tidak ada optimistic update nominal uang sebelum backend mengonfirmasi; request gagal mempertahankan input form dan tidak mengurangi jatah di tampilan.

## 4. UI/UX — ketentuan fidelity

Sumber aktif: [template v3](../Rework%20Design%20Trackster/Trackster%20v3%20App.dc.html), [standalone](../Rework%20Design%20Trackster/Trackster%20v3%20App%20%28standalone%29.html), [handoff](../Rework%20Design%20Trackster/README.md), [logic.tsx](../../apps/frontend/src/components/v3/logic.tsx), [V3Tree](../../apps/frontend/src/components/v3/V3Tree.tsx), [CSS](../../apps/frontend/src/components/v3/v3.css). Gunakan nilai aktual sumber, termasuk perbaikan aksesibilitas yang sudah masuk; `design_system/` bukan baseline lama yang harus dihidupkan kembali.

Wajib sama: tema terang/gelap, token DARK/LIGHT/DENSITY, Bricolage Grotesque/DM Mono, angka tabular, spacing, radius/border, kartu struk, garis pemisah, icon stroke, maskot, states tombol, navigasi, form/modal/toast, animasi dan reduced motion. Jangan menerapkan Tailwind preflight pada layar v3 jika mengubah geometri. Jangan menyalin runtime prototipe `support.js` atau data contohnya ke alur produksi.

Pemetaan pola: Beranda Invest → Dashboard/hero v3; Portofolio → row/modal Today/Weekly; Rencana → Budget/Income/Goals; Pasar/detail → list/card Analysis/Sources; review → Reports; narasi → Chat. Isi bisnis Invest baru, tetapi komponen/pola bersama harus identik. Field numerik mobile tetap terbaca dan target sentuh minimal 44px. Navigasi keyboard, focus-visible, label form, dialog focus/escape dan status screen reader berfungsi.

Visual acceptance membandingkan pola bersama pada desktop ≥1280px dan mobile 390px, kedua tema/density serta ID/EN. Periksa computed tokens, font, bounds, spacing, border, modal/navigation dan states. Tidak ada selisih komponen bersama yang dibiarkan tanpa alasan tercatat; perbedaan isi/data Invest tidak dianggap perubahan sistem desain.

## 5. Aturan jatah dan event pemasukan

| ID | Kebutuhan pelaksanaan |
| --- | --- |
| B1 | Bulan `[awal WIB, awal bulan berikutnya WIB)`; actual dari CONFIRMED receivedAt, termasuk irregular, mengeluarkan INTERNAL/PENDING. Date-only tidak ditafsirkan sebagai UTC tengah malam. |
| B2 | `F=A+Σ max(0,expected_event−confirmed_terkait_event)` untuk event bulan yang belum terminal; expected utama, conservative/max pembanding. Event `COMPLETED/CANCELLED/MISSED` menyumbang sisa nol. |
| B3 | Event dibentuk dari stream+scheduled payment date. WEEKLY mengikuti weekday yang ada di bulan; MONTHLY dipotong ke akhir bulan; tanpa payday menjadi incomplete. Histori estimasi hanya yang tersedia pada cutoff snapshot. |
| B4 | Receipt-event link eksplisit, unique dalam scope user. Partial payment mempertahankan sisa hanya selama belum diselesaikan; bayar lunas kurang dari expected yang ditandai selesai tidak memproyeksikan selisih lagi. Month closed memfinalkan unpaid event sebagai MISSED; reschedule ke bulan lain harus membatalkan event lama agar tidak dobel. |
| B5 | Jatah 20% pada Decimal 2 desimal IDR, half-up. Simpan uang sebagai Decimal/integer sen dan JSON string. Rencana/aktual tidak dijumlahkan; pembulatan UI tidak menjadi dana order. |
| B6 | Edit/hapus/resolve Income menaikkan revision atau menginvalidasi snapshot Invest terkait setelah operasi Trackster berhasil. Sumber actual tetap Income, bukan salinan yang divergen. Arsip menyimpan fakta pada asOf. |

Status event minimum: `SCHEDULED`, `PARTIAL`, `COMPLETED`, `CANCELLED`, `MISSED`, `NEEDS_RECONCILIATION`. Event unlinked yang ambigu tidak dicocokkan hanya karena nominal sama. API menyediakan review/link/selesaikan event manual tanpa menulis receipt Income baru. Untuk historical month, arsip plan sebelumnya boleh ditampilkan dengan label asOf; hasil refresh closed month mengikuti event terminal dan actual yang sudah direkonsiliasi.

Re-use kalkulator per kind stream Trackster; buat jalur monthly terpisah dari `/income/forecast/week` dan `/horizon`. Sampling kalender bulanan dan event matching diuji baru; jangan mengubah respons forecast mingguan lama.

## 6. Profil, alokasi, dan ranking

Baseline implementasi tepat M2–M6, dengan field/parameter yang harus tersimpan:

| Area | Nilai/aturan yang disepakati |
| --- | --- |
| T | Empat item T1–T4 dan opsi persis M2, skor 0–3; sum 0–2/3–5/6–8/9–12 → 0/1/2/3; lalu min dengan T1. Conflict review tercatat pada version jawaban terbaru. |
| C | Essential expense, reserve, stable income, kewajiban dan loss capacity IDR wajib. Input invalid/unknown → NEEDS_INPUT; blocked/loss capacity 0/reserve<3 →0; reserve3–<6 →1; reserve≥6 unstabil →2/stabil →3. |
| H/K | Horizon complete months kalender WIB: <36/36–<60/60–<120/≥120 →0/1/2/3. Tes pemahaman M2 memberi gate produk, bukan tambahan skor. |
| Profil | min(T,C,H); Likuiditas/Konservatif/Seimbang/Pertumbuhan. Umur cadence pemasukan tidak menjadi indikator stabilitas otomatis. Kenaikan kelas memerlukan jawaban/konfirmasi baru. |
| Template | Cash/bonds/equity/crypto: 100/0/0/0; 60/30/10/0; 30/40/30/0; 10/30/60/0. Crypto default 0%, opt-in ≤5% kelas3/pemahaman/gate, dari equity. |
| Stress | Tiga shock M3; `L=min(T1_limit,loss_capacity_IDR/pot_after_contribution)`; scale noncash dengan min(1,L/D), sisa ke cash. Kerugian skenario tidak dilabeli rugi maksimal yang dijamin. |
| Kontribusi | Isi defisit noncash terhadap nilai pot+B secara proporsional, maksimal B; tidak membeli overweight; ulangi full-pot gate/stress setelah unit/fee. Jika gagal, tahan dana dan review. |
| Eligibility | Identitas/lifecycle, akses, source rights, tujuan/profil/pemahaman, biaya/minimum, histori/freshness sesuai M4. Unknown kritis → gagal gate; kontraktual punya jalur dokumen tersendiri. |
| Score | COST/DIV/DATA/LIQ/ACCESS =30/20/20/15/15; skala dan cap persis M5. Dibandingkan dalam peer group sejenis, exposure/currency/tenor/horizon sebanding. |
| Urutan | Score 6-desimal desc, annual cost asc, asOf desc, ID lexicographic asc. Max3 alternatif/peer; selisih<3 poin hampir setara. Nilai/display rounding tidak mengubah urutan. |
| Order | Satu kandidat inti/kelompok, max3 order noncash/kontribusi; coba alternatif jika minimum gagal atau biaya sekali-beli>1%; tidak ada kandidat layak →cash. Alternatif bukan order ketiganya. |
| Pembulatan | Largest remainder pada sen, tie cash/bonds/equity/crypto; floor unit/lot sesuai step, fee tidak membuat overspend; residu cash. |

Holding awal per tujuan harus dinyatakan kosong atau terisi oleh pengguna. Missing holdings tidak dianggap kosong. Unit/nilai/kurs yang stale membuat hasil rencana/withheld, bukan nominal executable. Nilai tujuan yang tidak tercapai tidak diselesaikan dengan otomatis meningkatkan risiko. Target multiregion vs Indonesia tidak memaksa pengguna membeli produk global yang belum punya akses.

## 7. Portofolio, ledger dan reservasi

Opening holding menyimpan quantity atau value snapshot yang jelas jenisnya, tanggal, mata uang, instrumen/goal dan cost basis opsional. Holdings unit dihitung dari opening+movement unit; koreksi quantity menggunakan adjustment dengan alasan/audit, bukan menghapus sejarah transaksi. Holding value-only tidak mengizinkan angka unit/profit yang dikarang; sebelum pencatatan sale unit, pengguna melengkapi unit.

Ledger menyimpan `PURCHASE`, `SALE`, `DISTRIBUTION`, `GOAL_SAVING`, `CORRECTION/REVERSAL`, referensi receipt/holding/goal dan bulan asal alokasi. PURCHASE principal+biaya dan GOAL_SAVING menghabiskan jatah; sale/distribution masuk kas investasi terpisah, tidak membuat jatah baru otomatis. Opening holding/valuasi bukan penggunaan jatah. Ledger dan pemakaian quota diubah dalam satu transaksi DB dengan idempotency key serta concurrency control.

`Q=J_actual−settled_quota_usage−active_reservations−goal_saving_usage`; nominal GOAL_SAVING tidak juga dimasukkan settled usage untuk menghindari potongan dua kali. Jika Q<0, status OVERCOMMITTED dan B=0. `B=min(max(0,Q),available_confirmed_free_cash)`. Reservasi mengurangi Q dan free cash sekali pada dua cap yang berbeda; ketika settle, reservasi dilepas dan realisasi menggantikannya secara atomis, tidak mengurangi budget dua kali.

Kas bebas memiliki jumlah/asOf/version dan konfirmasi pengguna. Movement setelah asOf mengurangi/menambah saldo kas Invest yang relevan, terpisah dari bank; reservasi juga mengurangi available cash. Backdated/ambigu movement atau perubahan material kebutuhan dana menginvalidasi konfirmasi dan meminta nilai terbaru sebelum pembelian berikutnya. Nilai kas bebas tidak dianggap tetap setelah dipakai. Transaksi Invest tidak otomatis membuat debit BankBalance atau Income.

Alur nyata: evaluasi aktual → pilih kandidat → server memvalidasi ulang input/source → reservasi manual → pengguna membeli di kanal luar → catat realisasi principal/fee/unit/receipt → settle. Reservasi berakhir dalam 24 jam atau dibatalkan pengguna; quote/FX diperiksa ulang sebelum realisasi. Ini detail concurrency/UX, bukan janji dana benar-benar dikunci pada bank/broker. Pembelian manual tanpa reservasi tetap dapat dicatat jika cap/status valid; jika sudah terlanjur terjadi di luar cap, catat dengan alasan sebagai realisasi, tandai overcommitted dan hentikan usulan baru—jangan menyembunyikan fakta.

Receipt reference membantu rekonsiliasi biaya/pembelian yang sudah terlihat di Trackster. Linking hanya referensi; tidak membuat transaksi bank kedua. Retry ID yang sama+body sama membalas hasil yang sama; body berbeda pada key sama →409. Koreksi berupa entry reversal/replacement yang ditransaksikan, tidak hard-delete ledger/arsip keuangan.

## 8. Data pasar, quality, dan pembaruan

Catalog source/manual memuat ID/version, jenis/exposure/currency, issuer, lifecycle, kanal/minimum/step/lot, fees/payout/tenor, source URLs/dokumen/bagian, observedAt/fetchedAt/reviewedAt, hak simpan/tampil/analisis, dan review status. Informasi akses pengguna tetap privat; fakta pasar boleh shared hanya jika hak pakai mengizinkan.

| Data | Gate baseline |
| --- | --- |
| Fund/ekuitas/crypto untuk ranking historis | 36 bulan selesai tersedia, ≥95% sesi harian/NAB yang diharapkan, convention adjusted/distributions tercatat. Produk histori pendek hanya daftar riset. |
| Cash/deposito/SBN langsung | Dokumen kontrak/maturity/fee/status lengkap; peer kontraktual, tidak dipaksa mempunyai seri 36 bulan. |
| Saham/ETF / NAB | Fresh masing-masing ≤2 completed trading sessions / ≤3 hari kerja sumber. Calendar market terkait wajib diketahui. |
| Crypto / FX valuation | ≤24 jam; FX reference pada hari libur memakai rilis resmi terakhir dengan label. Tidak menganggap kurs referensi sebagai harga FX pembelian. |
| Fee/akses/lifecycle | Review fee/akses ≤90 hari dan dokumen masih berlaku; lifecycle/penawaran valid pada asOf. Product event membatalkan metadata lama walau belum90 hari. |
| DATA cross-check | Nilai quote waktu sebanding toleransi1%, NAB0,5%; hasil/timestamp dicatat. Jika belum cross-check, tidak memberi poin itu. |

Pembaruan: harga/NAB sesuai kalender source harian, crypto harian untuk penelitian, makro sesuai jadwal rilis, fees/status menurut dokumen/event. Gagal provider memakai snapshot terakhir hanya jika hak dan freshness mengizinkan. Expired/unlicensed/missing critical data →WITHHELD/RESEARCH_ONLY dengan alasan; AI tidak mengisi gap. HTTP200 yang berisi quota/error bukan observasi valid.

Default source v1 adalah catalog/data manual bersumber. Alpha Vantage/CoinGecko/IDX/BI/BPS adalah kandidat, bukan entitlement otomatis. Yahoo dalam penelitian tidak menjadi feed produksi yang disetujui. Crypto Demo dengan histori365 hari tidak lolos36 bulan; tetap tampil sebagai riset sampai ada sumber memadai. Credential provider hanya di konfigurasi server, tidak di frontend, catalog public atau repo.

## 9. Konsep penyimpanan dan kontrak API

Nama model di bawah adalah rancangan pelaksanaan; endpoint semuanya **baru dan belum ada saat PRD ditulis**. Backend menggunakan guard/session/userId dan pola Nest/Prisma yang ada. Seluruh model privat wajib userId required, indexed, dan kepemilikan hubungan diverifikasi. Data catalog shared hanya ditulis pihak berwenang; tidak menyimpan portofolio pada cache shared.

| Konsep model | Field penting / constraint |
| --- | --- |
| InvestGoal + RiskProfileVersion | Goal/date/target/status, T answers, C inputs+loss capacity, H/K, conflicts/ack, version/asOf; satu aktif per user v1. |
| PaymentEvent + receipt link | user+stream+scheduledDate+version, scenario/status, linked Income IDs; unique event per jadwal/stream dan link receipt; event ambiguity disimpan. |
| MonthlyBudgetSnapshot + CashConfirmation | month/WIB/inputRevision, A/F/scenarios/J/Q/cash/version/status/source IDs; snapshot immutable, confirmation versioned. |
| Instrument + MarketObservation | canonical instrument/issuer/exposure/lifecycle; field values/source/timestamps/rights/review/version; tidak menjadikan symbol saja unique global. |
| Holding + Ledger + Reservation | User/goal/instrument, unit atau value mode, movement/reference/asOf, money/currency/FX, month origin, status/expiry; user+route+idempotency key unique. |
| Evaluation + Explanation | Ruleset/input/source versions, gate/features/rank/allocation/order/residu, status/asOf; narasi/validator outcome terpisah dari authoritative amounts. |

Money memakai Decimal dengan kapasitas agregat bulan yang cukup, minimal 18,2 untuk nominal IDR baru; quantity/FX memakai precision memadai seperti 28,12. JSON decimal string; unit/nilai negatif atau nonfinite ditolak sesuai operation type. Profile inputs privat tidak dicatat dalam log biasa. Retensi snapshot/audit mendukung review tanpa menyimpan respons mentah email atau histori pasar yang tidak berhak diarsipkan.

| Method/path | Kontrak utama |
| --- | --- |
| `GET /invest/status` | Akses, ruleset, setup completeness, cakupan enabled/research dan status data. |
| `GET /invest/budget?month=YYYY-MM` | Read live summary dengan dua jatah, scenarios, quota/cash/reservations, status/revision/source refs. AsOf server. |
| `PUT /invest/cash-confirmation` | month, amountIDR string, user confirmation, expectedRevision; balas version/asOf/cash status. |
| `GET/POST /invest/goals`, `PATCH /invest/goals/:id` | Baca/buat/edit tujuan; active switch atomis, draft lain tidak menghabiskan B. |
| `PUT /invest/goals/:id/profile` | T/C/knowledge inputs, conflict acknowledgements dan expectedVersion; output version/T/C/H/class/limitations/status. |
| `GET /invest/payment-events?month=...`, `PATCH /invest/payment-events/:id` | Read/reconcile receipt links, complete/cancel/reschedule dengan alasan/version; bukan CRUD Income kedua. |
| `GET/POST /invest/holdings`, `PATCH /invest/holdings/:id` | Baca/opening holding/valuasi atau adjustment terjelaskan; pembelian lewat ledger. |
| `GET/POST /invest/ledger`, `POST /invest/ledger/:id/correction` | Movement+reference/idempotency/version; balas holdings/quota revision. Correction menyimpan reversal/replacement. |
| `GET /invest/instruments`, `GET /invest/instruments/:id` | Filter/pagination peer/region/gate; detail source/rights/data quality, akses user privat. |
| `POST /invest/catalog/instruments`, `PATCH /invest/catalog/instruments/:id`, `POST /invest/catalog/instruments/:id/observations` | Write instrument/observation manual dengan source refs, rights dan review; khusus pengguna catalog berwenang, schema allowlist. |
| `POST /invest/evaluations`, `GET /invest/evaluations/:id` | month, goalId, mode PLAN/ACTUAL, inputRevision; balas snapshot/result/status. PLAN tidak mengizinkan reserve/settle. |
| `POST /invest/reservations`, `DELETE /invest/reservations/:id` | evaluationId/selected candidates/version, TTL24h; cap/source dievaluasi ulang. Cancel idempotent. |
| `POST /invest/evaluations/:id/explanation` | Narrative request untuk result server yang dimiliki user; AI quota/fallback, tidak menerima angka authoritative dari klien. |
| `GET /invest/reviews`, `POST /invest/reviews/:id/acknowledge` | Arsip/diff/ack review; acknowledge bukan transaksi. |

Catalog writers adalah account berakses Invest yang mempunyai kewenangan ADMIN server-side; akses v1 saja tidak cukup. User biasa tidak dapat menaikkan status source menjadi reviewed/licensed dari body request. Riwayat review mencatat actor, perubahan/version dan bukti hak pakai; review tidak mengubah source facts lama secara diam-diam.

Respons uang contoh sintetis: `{"month":"2026-10","currency":"IDR","actualIncome":"1000000.00","expectedIncome":"1500000.00","actualQuota":"200000.00","plannedQuota":"300000.00","freeCash":null,"availableToAllocate":null,"status":"NEEDS_CASH_CONFIRMATION","ruleset":"invest-method-v0.1"}`. Unknown null dengan alasan; zero adalah angka yang benar-benar dihitung. Tidak ada angka keuangan pribadi dalam contoh PRD.

Shared errors: 400 input malformed; 401 sesi invalid; 403 akses v1/catalog denied; resource privat user lain404; 409 revision/idempotency conflict; 422 state transisi tidak diizinkan; 429 quota AI. Evaluation sah dengan data kurang membalas snapshot WITHHELD/RESEARCH_ONLY+reason codes, bukan error umum yang menyembunyikan alasan. Daftar cursor/limit dibatasi server; date/currency/enum/Decimal dan relasi ID divalidasi.

## 10. AI, privasi, dan sesi bersama

Perhitungan, gate, fitur/skor/urutan dan nominal berasal dari engine deterministik. AI menjelaskan hasil dan membandingkan fakta yang disediakan; tidak menentukan bobot atau membuat sumber baru. Render angka/kartu dari result server, pisahkan narasi. Validasi field/source IDs dan klaim narasi; hasil invalid →template ruleset, dengan alasan kegagalan internal yang tidak membocorkan source pribadi. Tes model nyata diperlukan sebelum fitur AI enabled pada pilot.

Pasang JwtAuthGuard sebelum akses Invest dan AiRateLimitGuard pada rute berbayar. UserId dari CurrentUser; query/body tidak dapat memilih identitas. Batasi v1 ke user IDs yang dipilih secara eksplisit melalui konfigurasi server, default deny jika belum dikonfigurasi; jangan mengandalkan hardcode ID=1 atau fallback owner yang dapat memilih akun lain. Akun awal ditentukan pada environment pilot, tanpa mempublikasikan nilai pribadi.

Origin Invest baru harus masuk allowlist CORS credentials eksplisit, tanpa wildcard; origin Trackster lama tetap diterima. Cookie httpOnly/secure/SameSite/domain dan tokenVersion/revocation mengikuti auth yang ada. Origin mutations Invest diperiksa dan konfigurasi cookie/proxy diuji. Tidak mengubah seluruh auth flow atau melemahkan guard lama. Domain produksi O9 ditetapkan sebelum konfigurasi DNS/hosting/certificate; pembangunan lokal memakai origin yang dikonfigurasi.

AI tidak menerima raw email, nomor rekening atau transaksi yang tidak diperlukan. Log operasional memakai IDs/status/ruleset/source/error tanpa saldo/jawaban capacity/tokens. API data user tidak di-cache publik. Tidak melakukan forwarding data pribadi untuk pengujian atau menggunakan fixture rekening asli.

## 11. Acceptance criteria dan verifikasi

Semua baris adalah **kriteria yang wajib diluluskan saat implementasi**, bukan laporan bahwa app sudah diuji. [47.596 assertion penelitian](05-Validation-Results.md) menjadi baseline kasus, bukan pengganti runtime/pilot.

| ID | Trigger / hasil yang harus terjadi | Bukti yang diperlukan |
| --- | --- | --- |
| AC-B1 | Income CONFIRMED pada boundary awal/akhir WIB masuk bulan tepat; INTERNAL/PENDING tidak menambah actual; irregular actual masuk. | Fixture timestamp UTC/WIB, resolve/edit/delete test. |
| AC-B2 | Bulan dengan4/5 paydays dan February28/29/31 menghasilkan event benar; missing payday berstatus incomplete. | Pure check kalender dan monthly API dengan DB uji. |
| AC-B3 | Partial/completed/missed/rescheduled event dan receipt replay tidak menggandakan F atau A; F tidak memakai snapshot minggu×4. | Event-link reconciliation scenarios, duplicate IDs. |
| AC-B4 | Dua jatah20% Decimal tepat; PLAN tidak dapat reserve; sisa bukan planned+actual; revisi Income menginvalidasi hasil. | Money fixtures dan integration revisions. |
| AC-R1 | Semua kombinasi T/C/H serta batas3/6bulan/36/60/120 menghormati minimum; loss capacity rupiah membatasi L. | Pure checks, boundary date tests. |
| AC-R2 | Jawaban missing/invalid/conflict atau essential expense0 tidak menghasilkan profil otomatis; acknowledgment berlaku hanya versi terbaru. | Form+API state tests. |
| AC-R3 | Knowledge gagal menahan produk terkait; pengalaman tinggi tidak menaikkan kelas sendiri. | Wizard dan product-gate cases. |
| AC-R4 | Kelas0 tidak diberi dana berisiko otomatis; kenaikan kelas memerlukan jawaban/konfirmasi baru. | Pilot pemahaman dan profile version tests. |
| AC-A1 | Template/stress/crypto cap sesuai M3; model shock≤L dan shock lebih berat dapat melampaui L tanpa label jaminan. | Replikasi fixture loss dan pemeriksaan copy UI. |
| AC-A2 | Holdings overweight tidak ditambah; full-pot constraint pasca-unit/fee gagal→tahan dana, tanpa sell otomatis. | Opening/ledger holdings dengan FX, stale valuation cases. |
| AC-A3 | Bounded allocation+fee+residu sama dengan B, largest remainder deterministik, lot/minimum tidak overspend. | Nominal kecil/besar, fixed fee, fractional unit dan currency tests. |
| AC-A4 | Goal draft/tambahan dan dana darurat tidak menghitung ulang pot aktif atau memakai B dua kali. | Active-goal switch dan mapping holding tests. |
| AC-S1 | Semua gate diuji sebelum score; unknown fee/access/rights/history tidak mendapat nominal executable. | Catalog fixture lengkap/kurang dengan reason codes. |
| AC-S2 | Peer/feature/score30/20/20/15/15, sort+tie-break menghasilkan urutan sama untuk permutation/input sama. | Golden feature/result dan DB row-order independence. |
| AC-S3 | Top3 adalah alternatif; satu inti/kelompok, max3 order, near-tie<3p ditampilkan tanpa klaim pemenang pasti. | UI+API selection cases. |
| AC-S4 | Fee tinggi/minimum gagal mencoba alternatif valid atau menahan kelompok; overlap unknown tidak disebut diversifikasi teruji. | All-in fee/minimum/overlap cases. |
| AC-L1 | Reservasi+settlement mengganti pemakaian sekali; TTL/cancel/retry/dua request concurrent tidak overspend quota/cash. | Transaction race/idempotency tests dengan DB terpisah. |
| AC-L2 | Opening/valuasi tidak mengubah bank atau jatah; purchase/reference bank tidak menciptakan debit kedua. | Golden Trackster sebelum/sesudah dan ledger refs. |
| AC-L3 | Koreksi pemasukan setelah purchase→OVERCOMMITTED B0, history tidak hilang; reversal/correction konsisten. | Integration scenario dan audit entries. |
| AC-L4 | Cash confirmation terpakai/stale, backdated movement, sale/distribution dan prior-month cash tidak membuat jatah baru otomatis. | Cash/ledger/asOf fixtures dan alur manual browser. |
| AC-D1 | Source rights/review/lifecycle/age/calendar/quality sesuai M4; quote tidak memakai fetchedAt sebagai market asOf. | Audit catalog dan source cross-check. |
| AC-D2 | Data manual mempertahankan source/version; provider HTTP200-error/quota/timeout dan data expired→partial/withheld. | Adapter/fallback tests. |
| AC-D3 | Cakupan Indonesia/global/crypto ditampilkan jujur; histori365hari tidak diberi label36bulan; riset tidak dapat dibeli lewat nominal. | Coverage dan capability UI/API tests. |
| AC-D4 | Untuk produk nyata pilot: minimum, fee, payout, currency, akses dan dokumen berlaku diverifikasi. | Review data instrument/kanal, tidak hanya fixture. |
| AC-I1 | Dua pengguna sintetis tidak dapat membaca/menulis profile/goal/holdings/ledger/snapshot user lain; user tanpa akses v1 denied. | Tenant isolation E2E dan API tests. |
| AC-I2 | Login/logout/revoke lintas website, CORS/cookie dan session expiry bekerja; route lama Trackster tetap. | Browser network+console, regresi auth/source/budget. |
| AC-AI1 | Model nyata tidak mengubah angka/ranking/sumber; klaim unsupported/injection/timeout/429→fallback yang valid. | Repeated prompts, negative cases dan validator tests. |
| AC-AI2 | AI gagal tidak menghalangi result engine; data pribadi yang tidak perlu tidak masuk prompt/log/shared cache. | Failure/privacy integration inspection. |
| AC-U1 | Token/fonts/geometry/interactions shell dan komponen identik v3 pada1280+/390, light/dark, lega/ringkas dan ID/EN. | Visual/browser comparison ke sumber desain aktif. |
| AC-U2 | Loading/error/empty/offline/missing data, keyboard/dialog focus, mobile44px dan reduced motion bekerja. | Browser interaction/a11y inspection. |
| AC-E1 | Monthly review/deviation≥5pp/profile expiry/event changes menampilkan alasan dan tidak mengeksekusi order. | Cron/event checks dan UI diff. |
| AC-E2 | Snapshot/ruleset/source revisions dapat dibaca ulang; hasil stale tidak direservasi; refresh tidak mengubah arsip. | Immutable snapshot/version tests. |

Checks kode mengikuti repo: backend build dengan cap memori sesuai [CAUTION](../../CAUTION.md), frontend TypeScript/build untuk kedua app yang terdampak, relevant `*.check.ts`, isolation/idempotency/golden serta browser nyata. Proses berat sequential; database uji terpisah. Pengujian privat tidak disalin ke repo public. Tidak mewajibkan pengulangan build saat perubahan hanya dokumentasi.

## 12. Tahap pembangunan dan release gate

| Fase | Deliverable | Exit criteria |
| --- | --- | --- |
| I0 Fondasi | Feature flag/access deny-default, frontend mandiri, shared design source, auth local, schema additive/model revisions. | AC-I1/I2 awal, shell AC-U1/U2; route/data Trackster tidak berubah. |
| I1 Jatah | Monthly events+reconciliation, two quotas, cash confirmation+revision, Beranda/Wizard/Rencana awal. | AC-B1–B4 dan state NEEDS_INPUT benar, fixtures→DB→browser. |
| I2 Profil/portofolio | Goals/profiles/knowledge, opening/movements/ledger/reservations, correction/replay. | AC-R1–R4, AC-L1–L4, AC-A4 dan tenant tests. |
| I3 Engine/catalog | Manual catalog bersumber, eligibility, scoring, allocation/stress/unit/fee, snapshot, Pasar/detail/rekomendasi. | AC-A1–A3/AC-S1–S4/AC-D1–D3/AC-E2; tanpa source nyata hasil tetap riset/withheld. |
| I4 Review/AI | Monthly review/diff, penjelasan/fallback/quota, arus UI lengkap, sumber/status/riwayat. | AC-AI1/AI2/AC-E1, seluruh AC-U1/U2 dan regresi Trackster. |
| I5 Pilot owner | Pilih account awal/origin deployment dan catalog/kanal nyata; review jawaban risiko/biaya/data, manual purchase/reconciliation scenario. | AC-D4, V1–V7 yang memerlukan pilot, seluruh acceptance dan bukti berhasil. |
| I6 Release bertahap | Domain/hosting O9, resources/backup/migration/rollback, feature enable yang teruji; global/crypto menyusul sesuai M7. | Deployment disetujui tersendiri, backup/migration/regression sehat; nominal tiap capability hanya dibuka setelah source/access gate. |

PRD ini mengizinkan pembangunan lokal berdasarkan metode yang disepakati. Tidak memberi izin push/merge yang memicu auto-deploy, DNS, migrasi produksi atau biaya provider. Ikuti aturan operasional repo pada tahap release; jangan menyamakan persetujuan metode dengan persetujuan tindakan produksi.

Rencana rollback: feature disable menutup Invest, menjaga frontend/backend Trackster dan data lama; data Invest disimpan untuk audit. Migrasi additive harus kompatibel dengan versi backend sebelumnya; tidak menghapus tabel/history untuk rollback aplikasi. Kuota/cron Invest dibatasi agar layanan bersama tetap sehat.

## 13. Definition of Done dan handoff

**Spesifikasi selesai:** D12 tercatat, M1–M7 approved baseline, PRD memetakan seluruh layar/kontrak/acceptance/fase, link dan status dokumen konsisten. Ini status pekerjaan dokumentasi sekarang.

**App selesai:** I0–I5 dan acceptance terkait benar-benar lulus, user dapat menjalankan alur nyata di browser, source/cost/access pilot terverifikasi, serta regresi Trackster bersih. Deployment I6 punya izin dan bukti tersendiri. Pada saat PRD ditulis, tidak ada fase implementasi yang diberi tanda selesai.

Handoff pembangunan terkini mengikuti [06-Implementation.md](06-Implementation.md), lalu membaca [decision log](00-Decisions.md), [metode](04-Methodology.md), [hasil riset](05-Validation-Results.md), serta source desain v3 aktif. Re-check branch/working tree dan versi kode yang bisa berubah. Pertahankan pilihan metode yang sudah disetujui; validasi hasil, jangan mengunci ulang contoh persentase atau menebak source yang belum terverifikasi.
