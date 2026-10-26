# Invest — frontend Trackster

Implementasi lokal tahap I0/I1 dan inti I2 dari [PRD](../../docs/invest/PRD.md). Beranda/Rencana menampilkan jatah bulanan aktual dan forecast, konfirmasi kas bebas, serta rekonsiliasi receipt. Wizard `/setup` menyimpan tujuan/profil/knowledge; Portofolio menyimpan kepemilikan awal, valuasi, pergerakan, dan koreksi. Rencana menampilkan T/C/H serta jatah setelah pemakaian. Catalog, ranking, create/settle reservasi, dan AI belum diaktifkan.

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

Sidebar **Tanya Track** membuka assistant Trackster. Invest belum mengaktifkan AI rekomendasi. Preferensi tema/bahasa/density disimpan pada origin Invest; tidak diasumsikan tersinkron lintas domain.

## Verifikasi

`npm run typecheck` dan `npm run build` memeriksa Invest. Backend: `npm run check -- invest`, `npm run check -- csrf`, `npm run tenancy-audit`. Build backend ulang sekarang tetap lengkap karena cache TypeScript berada di dalam `dist/` yang dibersihkan Nest.

Tes DB/API: buat database PostgreSQL **kosong** bernama `invest_test_<suffix>` di loopback, migrasikan dengan CLI Prisma, lalu set `INVEST_TEST_DATABASE_URL` ke database tersebut dan jalankan `node scripts/invest-e2e.mjs --serve` dari `apps/backend`. Harness menolak database non-loopback/nama lain serta database berisi akun; menjalankan modul Auth/Invest asli tanpa cron dan provider. Fixture `invest_test_a` / password `synthetic-invest-only` hanya untuk server uji lokal. Jangan memakai password fixture untuk akun nyata.

Dengan API sintetis di port4000 serta frontend Trackster/Invest di port3000/3001, jalankan `node scripts/browser-check.mjs`, lalu `node scripts/portfolio-browser-check.mjs` dari folder ini. Playwright harus tersedia sebagai tool lokal; `PLAYWRIGHT_MODULE` boleh menunjuk instalasi yang sudah ada dan `PLAYWRIGHT_CHROMIUM_PATH` ke binary browser yang cocok. Tidak menambah dependency runtime. Bukti gambar masuk `.artifacts/` (diabaikan Git).

Hasil dan batas acceptance terbaru: [06-Implementation.md](../../docs/invest/06-Implementation.md). Tidak ada konfigurasi DNS, container produksi, atau pipeline deployment Invest pada tahap ini.
