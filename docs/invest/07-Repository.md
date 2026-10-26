# Repository Invest Trackster

**Tanggal penyiapan:** 2026-10-26. **Otorisasi:** Arzaka meminta seluruh source dimasukkan dan di-push ke [ArzakaRaffan/invest-trackster](https://github.com/ArzakaRaffan/invest-trackster). Repository tujuan terpisah dari [Trackster asal](https://github.com/ArzakaRaffan/trackster).

## Asal dan cakupan

Import merupakan snapshot working tree Trackster pada branch `feat/invest-foundation`, dengan HEAD asal `eae4808c854927cf6e2c2d72a3f545e1e688a419`, **ditambah perubahan lokal Invest yang belum menjadi bagian commit asal tersebut**. Riwayat Git Trackster tidak diimpor; riwayat Invest dimulai dari snapshot ini.

Seluruh source yang tercatat atau tidak diabaikan Git disertakan, termasuk frontend Invest, backend bersama, frontend Trackster, migrasi, pengujian, PRD, penelitian, dan aset sistem desain. Frontend Invest mengimpor UI/transport/config Trackster dan memakai backend/auth/schema bersama, sehingga folder-folernya tetap dipertahankan untuk build mandiri. Import tidak mengubah metode D12 maupun menandai fase I3–I6 selesai.

Yang tidak disertakan: konfigurasi lokal `.claude`, file environment nyata, dependency terpasang, cache/build, screenshot uji lokal, backup/database, serta dokumen pribadi yang sudah diabaikan Git. Template environment tetap tersedia dengan placeholder; nilai identitas/rekening dan kredensial contoh diganti atau dikosongkan. Dokumentasi Trackster awal dipertahankan di [TRACKSTER_README.md](../../TRACKSTER_README.md).

## Batas deployment

Workflow [deploy.yml](../../.github/workflows/deploy.yml) warisan menulis image dan men-deploy infrastruktur Trackster. Kedua job kini hanya boleh berjalan ketika `github.repository == 'ArzakaRaffan/trackster'`; pada repo Invest keduanya dilewati. Ini mencegah push source Invest menulis image Trackster atau menjalankan SSH/migrasi produksi.

File Compose, Nginx, domain, serta petunjuk VPS yang disertakan masih milik Trackster asal. Belum ada pipeline, domain, atau deployment produksi Invest. Keputusan O9 dan gate release tetap mengikuti [PRD](PRD.md). Repo Trackster asal dan konfigurasi remote-nya tidak diubah oleh import ini.

## Melanjutkan pekerjaan

Gunakan repository ini untuk pengembangan Invest berikutnya. Baca [README root](../../README.md) untuk instalasi, [README frontend](../../apps/invest/README.md) untuk uji lokal, dan [06-Implementation.md](06-Implementation.md) untuk fitur yang sudah tersedia serta batas acceptance. Catatan sesi sebelum import yang menyebut belum commit/push adalah riwayat sesi tersebut, bukan pembatasan publikasi yang sekarang sudah diotorisasi pengguna.
