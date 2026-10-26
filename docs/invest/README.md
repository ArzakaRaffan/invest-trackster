# Invest Trackster — Dokumentasi Riset

> **Status 2026-10-26:** pembangunan sudah dimulai. Frontend mandiri, anggaran bulanan, tujuan/profil, dan portofolio manual tersedia lokal; [rincian implementasi dan bukti](06-Implementation.md). Metode v0.1 tetap D12. Inti I3 (catalog, alokasi/stress/ranking, pilihan alternatif, snapshot dan reserve→settle) tersedia lokal. Data nyata belum layak nominal; detail/filter catalog, I4 dan gate pilot/release masih terbuka.
> **Pemilik keputusan:** Arzaka. Status keputusan terpusat di [00-Decisions.md](00-Decisions.md).

Invest membantu Arzaka membagi jatah **20% dari rencana 50/30/20 Trackster** menjadi nominal dan shortlist investasi sesuai risiko serta tujuan. Invest direncanakan sebagai website terpisah dengan akun dan backend Trackster bersama. Fokusnya investasi jangka panjang dan evaluasi pasar berkala; cakupan pemindaian berkembang bertahap ke Indonesia, global, dan crypto.

**Periode utama bulanan (D10), dengan dua angka terpisah (D11): rencana jatah dari 20% forecast bulanan dan jatah aktual dari 20% pemasukan yang sudah diterima bulan itu.** Pemasukan bisa mingguan, bulanan, atau tidak tetap. Dua angka tersebut tidak dijumlahkan. Aturan mengikuti M1 dan implementasi I1; ledger manual I2 sudah mengurangi jatah dan kas tanpa menulis saldo bank.

Sumber gratis diutamakan, dengan input data pasar manual yang menyertakan sumber sebagai jalur yang diperbolehkan. Portofolio dimasukkan manual. Perhitungan serta penilaian memakai aturan eksplisit; AI membantu menjelaskan dan membandingkan hasil.

**UI/UX wajib sama persis dengan sistem desain Trackster v3** sesuai instruksi Arzaka (D9). Referensi aktif dan kebutuhan pemeriksaan visual tercatat di [03-Product-and-Validation.md](03-Product-and-Validation.md). Source UI bersama dan petunjuk lokal ada di [apps/invest](../../apps/invest/README.md).

## Urutan baca dan peta dokumen

**Untuk melanjutkan:** baca [06-Implementation.md](06-Implementation.md) → [PRD.md](PRD.md) → [00-Decisions.md](00-Decisions.md) → [04-Methodology.md](04-Methodology.md). Lanjutkan dari [riset catalog I3](08-Catalog-Research.md): kelengkapan data/kanal nyata, detail/filter catalog, review/AI I4 dan pilot. Dokumen penelitian menyediakan bukti dan batas pengujian, bukan alasan meminta persetujuan metode ulang.

1. Baca dokumen ini untuk batas pekerjaan dan status.
2. Baca [00-Decisions.md](00-Decisions.md) sebelum menetapkan perilaku produk.
3. Baca [01-Investment-Research.md](01-Investment-Research.md) untuk dasar ekonomi, investasi, dan kekuatan bukti.
4. Baca [02-Data-and-Integration.md](02-Data-and-Integration.md) untuk sumber pasar, percobaan akses, dan fakta kode.
5. Baca [03-Product-and-Validation.md](03-Product-and-Validation.md) untuk rancangan pengalaman, metode sementara, dan agenda pengujian.
6. Baca [04-Methodology.md](04-Methodology.md) untuk paket metode konkret yang diusulkan.
7. Baca [05-Validation-Results.md](05-Validation-Results.md) untuk hasil penelitian dan batas pengujian. Persetujuan metode tidak berarti gate pilot/runtime sudah lulus.

| File | Fungsi | Status |
| --- | --- | --- |
| [00-Decisions.md](00-Decisions.md) | Keputusan pengguna, usulan, pertanyaan terbuka, alasan perubahan | Baseline dari rencana handoff pengguna |
| [01-Investment-Research.md](01-Investment-Research.md) | Kajian bersumber beserta keterbatasan dan dampak produk | 20 temuan literatur dengan konteks dan batas bukti |
| [02-Data-and-Integration.md](02-Data-and-Integration.md) | Kandidat data, uji akses, lisensi, integrasi Trackster | Audit kode lokal dan empat probe publik selesai |
| [03-Product-and-Validation.md](03-Product-and-Validation.md) | Konteks alur, acceptance dan agenda riset | Pelaksanaan mengikuti PRD |
| [04-Methodology.md](04-Methodology.md) | Aturan jatah, profil, alokasi, kelayakan, ranking, order/AI dan operasi | APPROVED melalui D12, baseline pembangunan |
| [05-Validation-Results.md](05-Validation-Results.md) | Hasil assertion, stress, histori USD dan status V1–V7 | 47.596 assertion lulus; histori eksploratif 2019–2025, bukan validasi produk Indonesia |
| [PRD.md](PRD.md) | Layar, aturan, kontrak data/API, acceptance criteria, tahapan dan kompatibilitas | Baseline pembangunan yang sudah disetujui |
| [06-Implementation.md](06-Implementation.md) | Perubahan kode, bukti runtime, batas fitur dan kelanjutan | I0/I1 + inti I2/I3 lokal; data nyata, sisa UI catalog dan I4–I6 belum selesai |
| [07-Repository.md](07-Repository.md) | Asal snapshot, cakupan source, dan batas pipeline deployment | Repository Invest terpisah sesuai permintaan Arzaka |
| [08-Catalog-Research.md](08-Catalog-Research.md) | Pemeriksaan sumber primer produk/kanal, batas bukti dan penerapannya | Tiga catatan Indonesia masih riset, tanpa quote/histori karangan |

Artefak yang dapat dijalankan ulang: [method_checks.py](research/method_checks.py) dan [results-v0.1.json](research/results-v0.1.json). Seluruh fixture sintetis; tidak ada input finansial pribadi.

## Batas bukti dan status terkini

Sumber konteks pengguna adalah rencana handoff yang diberikan pada sesi ini. Transkrip percakapan sebelum handoff tidak tersedia; tanggal persetujuan asli, hasil percobaan terdahulu, serta detail preferensi yang tidak tertulis tidak direkonstruksi. Pemeriksaan kelengkapan mengacu pada seluruh poin dalam rencana tersebut.

Fakta teknis diperiksa dari working tree pada 2026-10-13, branch `feat/multi-user-launch`, HEAD `3694740`. Ada perubahan lokal sebelum pekerjaan ini. Snapshot tersebut **bukan bukti keadaan produksi**. Beberapa dokumen konteks lama masih menyebut single-user, sementara kode yang diperiksa sudah memakai `userId`; rincian perbedaan ada di dokumen integrasi.

Literatur, kode, percobaan API, dan asumsi dibedakan dengan label `LITERATUR`, `KODE`, `API`, dan `ASUMSI`. Tanggal pemeriksaan tidak sama dengan tanggal publikasi sumber atau tanggal observasi data. Hasil akses satu kali tidak membuktikan kualitas, kelengkapan, kestabilan, maupun hak distribusi data.

Periode utama **bulanan**, dengan **rencana jatah dan jatah aktual terpisah**. M1–M7 termasuk pemetaan bulan, skenario, pembulatan, profil, bobot/stress dan ranking **disepakati sebagai baseline produk pada D12**. Persetujuan tidak membuktikan optimalitas atau menjadikan contoh sintetis rekomendasi teruji. Tidak ada profil pribadi, saldo, kepemilikan atau kredensial yang disalin ke dokumentasi ini.

## Pekerjaan berikutnya

- Lengkapi catalog nyata serta UI detail/filter I3; lanjutkan review/perubahan pot dan AI I4. Reserve→settle sudah terhubung dengan evaluation ACTUAL tervalidasi. Domain/hosting O9 tetap keputusan deployment tersendiri; tidak menghalangi pembangunan lokal.
- Gunakan [status hasil V1–V7](05-Validation-Results.md) untuk membedakan pemeriksaan penelitian yang selesai dan validasi pilot/produksi yang membutuhkan app, catalog nyata, atau input pengguna.
- Periksa hak penggunaan sumber sesuai deployment yang dipilih; lengkapi metadata instrumen Indonesia dan akses produk global yang benar-benar tersedia untuk pengguna.
- Catat hasil baru dengan sumber, tanggal pemeriksaan, konteks, keterbatasan, dan bagian produk yang terpengaruh. Ubah keputusan hanya dengan bukti persetujuan pengguna.

## Handoff PRD

[PRD.md](PRD.md) **sudah dibuat** setelah Arzaka menyetujui metode v0.1. Spesifikasi siap untuk pembangunan lokal; validasi yang membutuhkan app/catalog/input pengguna tetap acceptance gate pilot/release. PRD tidak memberi izin deployment produksi atau mengubah status hasil riset menjadi lulus produksi.

## Pemeriksaan dokumentasi sesi awal

- [x] Delapan dokumen serta skrip/hasil penelitian tersedia dengan tautan relatif antardokumen dan ke kode sumber.
- [x] D1–D12 tercatat; O1–O8/O10 RESOLVED pada metode. O9 dan gate data/pilot/release tetap terpisah.
- [x] Temuan riset memiliki sumber, tanggal, konteks, keterbatasan, dan dampak produk.
- [x] Fakta kode dipisahkan dari usulan integrasi; hasil probe dipisahkan dari dokumentasi vendor.
- [x] Agenda riset lanjutan dan kriteria handoff PRD tersedia.
- [x] Metode konkret, pengujian sintetis, eksplorasi historis dan keterbatasan V1–V7 terdokumentasi; status persetujuan tetap jujur.
- [x] PRD memuat seluruh kebutuhan handoff, acceptance criteria, tahapan serta batas kompatibilitas Trackster; fase implementasi belum ditandai selesai.
- [x] Contoh sintetis, tanpa kredensial maupun data keuangan pribadi.
- [ ] Rekonsiliasi terhadap transkrip asli jika kelak tersedia; belum diperiksa pada sesi ini.
