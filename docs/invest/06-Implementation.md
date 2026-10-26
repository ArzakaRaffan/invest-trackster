# 06 — Implementasi Invest

[PRD](PRD.md) · [Keputusan](00-Decisions.md) · [Metode](04-Methodology.md) · [Menjalankan lokal](../../apps/invest/README.md)

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
