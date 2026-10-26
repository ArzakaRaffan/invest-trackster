# Invest — frontend Trackster

Implementasi lokal tahap I0/I1 serta inti I2/I3 dari [PRD](../../docs/invest/PRD.md). Beranda/Rencana menampilkan jatah bulanan aktual dan forecast, konfirmasi kas bebas, serta rekonsiliasi receipt. Wizard `/setup` menyimpan tujuan/profil/knowledge; Portofolio menyimpan kepemilikan awal, valuasi, pergerakan, dan koreksi. Rencana menampilkan T/C/H serta jatah setelah pemakaian. Pasar/Sumber memuat catatan bersumber dan akses privat. Rencana dapat menghitung alokasi, stress dan ranking; `/app/reviews/:id` menyimpan hasil, alternatif, bukti, reservasi dan realisasi. Katalog nyata awal masih riset sehingga tidak menghasilkan nominal pembelian. Detail/filter/perbandingan dan review berkala deterministik sudah aktif. Penjelasan aturan bersumber tersedia; bantuan AI terbatas default off dan masih membutuhkan uji model nyata.

## Menjalankan lokal

Gunakan database development yang terpisah. [CAUTION](../../CAUTION.md) berlaku: cap heap, build satu per satu, lalu hentikan proses uji setelah selesai.

1. Install dependency masing-masing app: `npm ci` di `apps/backend`, `apps/frontend`, dan `apps/invest`. Source v3 bersama tetap berada di frontend Trackster.
2. Pada environment **backend lokal**, set `DATABASE_URL` ke database development, `JWT_SECRET`, `FRONTEND_URL=http://localhost:3000`, `INVEST_FRONTEND_URL=http://localhost:3001`, `INVEST_ENABLED=true`, dan `INVEST_USER_IDS` berisi ID akun lokal yang dipilih secara eksplisit. Kosong atau flag selain `true` berarti akses ditolak. Bentuk cookie tidak berubah.
3. Dari `apps/backend`, jalankan `npx prisma generate`, `npx prisma migrate deploy` ke **database lokal tersebut**, lalu `$env:NODE_OPTIONS='--max-old-space-size=1536'; npm run build`. Jalankan backend hasil build melalui `npm start`.
4. Di `apps/invest`, salin `.env.example` ke `.env.local` bila perlu menyesuaikan origin API/Trackster. Jalankan `npm run dev`, lalu buka `http://localhost:3001` dan masuk dengan akun Trackster lokal.

Jatah aktual memakai `Income.status=CONFIRMED` menurut `receivedAt` dalam bulan kalender WIB. Stream tanpa payday atau receipt ambigu membuat forecast belum tersedia; jatah aktual tetap terlihat. Kas bebas tidak disamakan dengan saldo rekening. Konfirmasi kas menjadi basi ketika sumber keuangan, tujuan/kebutuhan dana, atau catatan mundur berubah. Pembelian dan simpanan mengurangi kas/jatah; hasil jual/dividen masuk kas tujuan terpisah. Pemakaian ulang memilih referensi alokasi lama, sehingga jatah tidak dipotong lagi. Semua angka yang siap ditampilkan berasal dari API, tanpa fixture produksi.

## Sumber UI bersama

- Warna dan density: `../frontend/src/components/v3/tokens.ts`, diimpor oleh kedua app.
- Sidebar, lima slot navigasi mobile, judul, dan login: generated views v3 yang sama melalui alias `@trackster`.
- CSS/pseudo states dan maskot: sumber v3 yang sama; `/track-mascot.js` menyajikan asset asli melalui route server, termasuk pada output tracing build.
- Transport API: `../frontend/src/lib/api.ts`; cookie httpOnly, SWR, dan perilaku sesi habis sama.
- `src/app/invest.css` hanya mengatur konten domain Invest. Geometri struk/angka utama mengikuti hero v3. Tidak ada Tailwind preflight.

Sidebar **Tanya Track** membuka assistant Trackster. Bantuan penjelasan Invest ada di detail evaluasi dan tidak menghitung rekomendasi; aktif hanya melalui konfigurasi backend eksplisit setelah acceptance model nyata. Preferensi tema/bahasa/density disimpan pada origin Invest; tidak diasumsikan tersinkron lintas domain.

## Verifikasi

`npm run typecheck` dan `npm run build` memeriksa Invest. Backend: `npm run check -- invest`, `npm run check -- csrf`, `npm run tenancy-audit`. Build backend ulang sekarang tetap lengkap karena cache TypeScript berada di dalam `dist/` yang dibersihkan Nest.

Tes DB/API: buat database PostgreSQL **kosong** bernama `invest_test_<suffix>` di loopback, migrasikan dengan CLI Prisma, lalu set `INVEST_TEST_DATABASE_URL` ke database tersebut dan jalankan `node scripts/invest-e2e.mjs --serve` dari `apps/backend`. Harness menolak database non-loopback/nama lain serta database berisi akun; menjalankan modul Auth/Invest asli tanpa cron dan provider. Fixture `invest_test_a` / password `synthetic-invest-only` hanya untuk server uji lokal. Jangan memakai password fixture untuk akun nyata.

Dengan API sintetis di port4000 serta frontend Trackster/Invest di port3000/3001, jalankan `node scripts/browser-check.mjs`, lalu `node scripts/portfolio-browser-check.mjs`, dan `node scripts/market-browser-check.mjs` dari folder ini. Pemeriksaan visual read-only setelah fixture tersebut: `node scripts/review-visual-check.mjs`. Untuk tes bantuan penjelasan, tambahkan `--serve-ai` pada harness `--serve` atau `--serve-existing`; hanya provider HTTP sintetis loopback yang dijalankan. Set `INVEST_TEST_PROVIDER_URL` ke alamat fixture yang dicetak harness lalu jalankan `node scripts/explanation-browser-check.mjs` setelah market browser check. Tidak memakai provider eksternal. Playwright harus tersedia sebagai tool lokal; `PLAYWRIGHT_MODULE` boleh menunjuk instalasi yang sudah ada dan `PLAYWRIGHT_CHROMIUM_PATH` ke binary browser yang cocok. Tidak menambah dependency runtime. Bukti gambar masuk `.artifacts/` (diabaikan Git).

Hasil dan batas acceptance terbaru: [06-Implementation.md](../../docs/invest/06-Implementation.md). Tidak ada konfigurasi DNS, container produksi, atau pipeline deployment Invest pada tahap ini.

## Kurasi catalog dan evaluasi I3

Lihat [riset dan batas sumber](../../docs/invest/08-Catalog-Research.md). ADMIN yang diizinkan masuk Invest dapat membuka **Sumber → Kelola catatan** untuk meninjau JSON metadata, ID kanal dan versi. Kontrak lengkap adalah [DTO](../backend/src/modules/invest/invest-market.dto.ts); angka uang/unit/rate berupa string desimal (`0.01` berarti1%). Nilai unknown tidak diisi0. Form mempertahankan isian saat validasi gagal atau konflik revision.

`POST /invest/catalog/instruments` menerima `instrumentId`, `expectedVersion`, `facts`, `expectedRevision`, `idempotencyKey`. PATCH pada ID memperbarui metadata; POST `/:id/observations` menyimpan quote dengan versi baru. Setiap versi mencatat actor secara privat. Sumber wajib HTTPS tanpa kredensial, tanggal observasi/pengambilan dengan zona waktu, bagian dokumen dan bukti hak pakai. API menolak quote/histori tanpa izin simpan/tampil/analisis. Informasi source bersama tidak boleh berisi akses akun atau keuangan pribadi.

Member memeriksa status kanal, pemahaman dan persetujuan lock sendiri; review terikat versi catalog. Mapping holding ke instrumen ada pada Pasar. `POST /invest/evaluations` memakai bulan, goal, PLAN/ACTUAL, `peers` dan `selections` opsional (maksimal satu kandidat per kelas). Pilihan di luar shortlist layak tidak menembus gate. Pengubahan kandidat membuat snapshot baru. Nominal PLAN tidak dapat dicadangkan.

Reservasi mengambil seluruh kontribusi hasil server, berlaku maksimal24jam, dan dapat dibatalkan. Settlement mencatat pembelian di kanal luar serta kas tujuan yang benar-benar sudah dipisahkan; tidak melakukan transaksi broker atau debit bank. Sumber/input basi memerlukan evaluasi ulang; pembelian yang terlanjur terjadi tetap dicatat melalui portofolio manual dengan alasan. Belum ada adapter harga/cron. `INVEST_GLOBAL_ENABLED` dan `INVEST_CRYPTO_ENABLED` defaultfalse; mengaktifkannya tidak menghapus syarat data, lisensi, akses, pemahaman atau batas profil.

## Detail pasar dan review

Pasar menyediakan pencarian nama/issuer/kanal, filter kelas/wilayah/gate/akses privat, detail `/app/market/:id` dan perbandingan `/app/market/compare?ids=a,b`. Pilih2–3 instrumen dalam peer yang sama. Unknown tidak menjadi0; ranking tetap hanya berasal dari evaluasi dengan nominal/horizon tertentu.

`GET /invest/reviews` menyediakan10 review aktual per halaman; `evaluationId` memilih satu baseline, `cursor` membaca halaman berikutnya. POST `/invest/reviews/:id/acknowledge` menerima `reviewKey`, `confirmed=true`, `note`, `expectedRevision` dan `idempotencyKey`. Review key berasal dari respons server. Acknowledgment terikat keadaan yang ditampilkan; tidak membuka snapshot basi dan tidak mencatat uang. Audit menggunakan `InvestChange` yang sudah ada, tanpa migrasi baru.

Review membaca keadaan kini saat request; UI melakukan refresh30detik. Belum ada cron/notifikasi/AI. Deviasi membandingkan pot yang sudah tercatat dengan target arsip yang masih sesuai profil/goal/metode. Sumber berubah, profil memerlukan review atau valuasi kurang tetap terlihat setelah acknowledgment; perubahan berikutnya memerlukan peninjauan lagi. Lihat [riset review](../../docs/invest/09-Review-Research.md) dan [bukti implementasi](../../docs/invest/06-Implementation.md).
