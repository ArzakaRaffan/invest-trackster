# Invest Trackster

Website investasi dengan akun, backend, dan sistem desain v3 Trackster bersama. Invest memakai jatah **20% bulanan** dari rencana 50/30/20: jatah aktual dari pemasukan yang sudah diterima dan rencana jatah dari forecast ditampilkan terpisah.

**Status 26 Oktober 2026:** fondasi, anggaran bulanan, tujuan/profil risiko, dan portofolio manual tersedia untuk dijalankan lokal. Catalog pasar, alokasi, ranking, evaluasi rekomendasi, aktivasi reservasi, dan AI masih tahap berikutnya. Status serta bukti pengujian ada di [catatan implementasi](docs/invest/06-Implementation.md); ini belum merupakan rilis produksi lengkap.

## Isi repository

| Lokasi | Isi |
| --- | --- |
| [apps/invest](apps/invest/README.md) | Frontend Invest: beranda, rencana, setup tujuan/profil, dan portofolio |
| [apps/backend](apps/backend) | API NestJS, autentikasi bersama, modul Invest, schema dan migrasi Prisma |
| [apps/frontend](apps/frontend) | Frontend Trackster serta komponen, token, font, dan transport API yang dipakai Invest |
| [docs/invest](docs/invest/README.md) | Keputusan, riset, metode, validasi, PRD, dan kemajuan implementasi |
| [design_system](design_system) | Referensi sistem desain Trackster |

Source Trackster yang menjadi dependensi ikut disertakan agar clone ini dapat dibangun sendiri. UI Invest menggunakan komponen v3 yang sama secara langsung. Dokumentasi umum Trackster disimpan di [TRACKSTER_README.md](TRACKSTER_README.md); asal snapshot dan batas konfigurasi deployment dijelaskan di [catatan repository](docs/invest/07-Repository.md).

## Menjalankan lokal

Gunakan Node.js 24, npm, serta PostgreSQL development yang terpisah. Jalankan instalasi dan build secara bergantian sesuai [CAUTION.md](CAUTION.md).

1. Jalankan `npm ci` di masing-masing folder `apps/backend`, `apps/frontend`, dan `apps/invest`.
2. Konfigurasikan backend lokal dengan `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL=http://localhost:3000`, dan `INVEST_FRONTEND_URL=http://localhost:3001`. Template environment di root hanya berisi contoh; salin nilai yang diperlukan ke environment lokal dan ganti placeholder.
3. Dari `apps/backend`, jalankan `npx prisma generate`, lalu `npx prisma migrate deploy` pada database development tersebut. Build dengan cap heap: `$env:NODE_OPTIONS='--max-old-space-size=1536'; npm run build` pada PowerShell, atau `NODE_OPTIONS=--max-old-space-size=1536 npm run build` pada shell POSIX.
4. Gunakan akun Trackster lokal. Untuk database baru, tentukan `ADMIN_USERNAME` dan `ADMIN_PASSWORD` lokal yang unik, jalankan `npx prisma db seed` dari `apps/backend`, lalu lihat ID akun dengan `npm run user -- list`. Aktifkan `INVEST_ENABLED=true` dan isi `INVEST_USER_IDS` dengan ID akun yang diperbolehkan, lalu jalankan backend melalui `npm start`. Akses Invest ditolak secara default jika konfigurasi ini belum lengkap.
5. Di `apps/invest`, salin `.env.example` menjadi `.env.local` bila perlu menyesuaikan URL, lalu jalankan `npm run dev`. Buka `http://localhost:3001`. Frontend Trackster dapat dijalankan terpisah pada port3000 untuk alur yang kembali ke Trackster.

Petunjuk akun, fixture sintetis, pengujian API/browser, dan perilaku fitur tersedia di [README frontend Invest](apps/invest/README.md). Environment nyata, database, data keuangan pribadi, cache, dan dependency terpasang tidak disimpan dalam Git.

## Verifikasi dan kelanjutan

- Backend: `npm run build` dengan cap heap, `npm run check -- invest`, dan `npm run tenancy-audit` dari `apps/backend`.
- UI bersama: `npx tsc --noEmit` dari `apps/frontend`.
- Invest: `npm run typecheck` dan `npm run build` dari `apps/invest`.
- Tes API memakai database kosong sintetis; instruksi dan batas pengujiannya ada di [catatan implementasi](docs/invest/06-Implementation.md).

Mulai pengembangan berikutnya dari [PRD](docs/invest/PRD.md), [keputusan pengguna](docs/invest/00-Decisions.md), dan [metode yang disetujui](docs/invest/04-Methodology.md). Tahap berikutnya adalah catalog, eligibility, alokasi/stress, ranking, dan snapshot evaluasi I3, termasuk reservasi yang bergantung pada hasil evaluasi server.

Workflow deployment warisan dibatasi ke repository `ArzakaRaffan/trackster`; job build/publish image dan deploy tidak berjalan dari repo Invest ini. Compose, Nginx, dan domain Trackster yang disertakan masih konfigurasi produk asal. Deployment Invest memerlukan konfigurasi tersendiri.
