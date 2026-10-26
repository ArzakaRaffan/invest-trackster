# 00 — Keputusan Invest

[Panduan utama](README.md) · [Riset](01-Investment-Research.md) · [Data dan integrasi](02-Data-and-Integration.md) · [Produk dan validasi](03-Product-and-Validation.md) · [Metode v0.1](04-Methodology.md) · [Hasil pengujian](05-Validation-Results.md) · [PRD](PRD.md)

Dicatat pada **2026-10-13** dari rencana handoff pengguna. Tanggal ini adalah tanggal pencatatan, bukan tanggal persetujuan awal yang tidak tersedia.

`LOCKED` = keputusan eksplisit pengguna dalam handoff atau percakapan lanjutan; `PROPOSED` = usulan yang belum disetujui; `OPEN` = belum final. Hanya persetujuan Arzaka yang dapat mengubah usulan/pertanyaan menjadi LOCKED. Fakta kode dan temuan literatur tidak dapat mengunci keputusan produk.

## A. LOCKED — konteks pengguna

| ID | Keputusan | Sumber dan konsekuensi |
| --- | --- | --- |
| D1 | Invest adalah website terpisah, dengan akun dan backend Trackster bersama; versi pertama untuk Arzaka. | Rencana handoff. Domain, hosting, struktur aplikasi, serta pembatasan akses awal belum ditentukan. |
| D2 | Dasar anggaran adalah **jatah 20% dari rencana 50/30/20 Trackster**. | Rencana handoff. Bukan 20% saldo bank, bukan 30% dari sisa forecast `/income/allocation`. Periode dan dua basis jatah disepakati pada D10–D11; rincian M1 sekarang disetujui melalui D12. |
| D3 | Hasil berupa pembagian nominal dan shortlist sesuai risiko serta tujuan. | Rencana handoff. Profil, alokasi/gate dan ranking v0.1 mengikuti D12. |
| D4 | Fokus investasi jangka panjang dengan evaluasi pasar berkala. | Rencana handoff. Review v0.1 mengikuti M2/M3/M7 pada D12. |
| D5 | Pemindaian luas mencakup Indonesia, global, dan crypto secara bertahap. | Rencana handoff. Tidak berarti ketiga pasar siap sekaligus pada versi pertama; urutannya O6. |
| D6 | Sumber gratis diutamakan; data manual bersumber diperbolehkan. | Rencana handoff. Gratis tidak membuktikan hak redistribusi; pemilihan sumber O7. |
| D7 | Portofolio dimasukkan manual. | Rencana handoff. Tidak ada otorisasi untuk menghubungkan broker, membaca akun investasi, atau melakukan transaksi otomatis. |
| D8 | Perhitungan dan penilaian mengikuti aturan eksplisit; AI membantu menjelaskan dan membandingkan. | Rencana handoff. AI tidak menetapkan nominal, skor, atau bukti pasar baru di luar input terverifikasi. |
| D9 | UI/UX Invest harus sama persis dengan sistem desain Trackster karena keduanya satu keluarga produk. | Instruksi langsung Arzaka, 2026-10-13. Gunakan desain v3 aktif dan komponen/pola interaksinya; rincian sumber dan verifikasi di [produk dan validasi](03-Product-and-Validation.md). |
| D10 | Periode utama jatah dan pengalaman Invest **bulanan**. Bentuk produk tidak bergantung pada pola pemasukan mingguan Arzaka. | Instruksi langsung Arzaka, 2026-10-13. Jadwal pemasukan tetap dapat mingguan, bulanan, atau tidak tetap. Dua basis jatah mengikuti D11; pemetaan forecast mengikuti M1/D12. |
| D11 | Tampilkan dua angka terpisah: **rencana jatah = 20% forecast pemasukan bulanan** dan **jatah aktual = 20% pemasukan yang sudah diterima bulan itu**. | Usulan diterima Arzaka pada 2026-10-13. Keduanya adalah dua pandangan jatah yang sama dan tidak dijumlahkan menjadi anggaran tambahan. Skenario, klasifikasi dan rekonsiliasi mengikuti M1/D12. |

| D12 | **Metode `invest-method-v0.1` M1–M7 disetujui sebagai dasar PRD.** | Arzaka menjawab "iya saya setuju" pada 2026-10-13 setelah ditanya persetujuan metode sebagai dasar PRD. Parameter menjadi baseline pelaksanaan; bukan klaim optimalitas, validasi psikometri atau kesiapan produksi. |

## B. Status usulan terdahulu

P1/P2/P3/P4/P6/P7 sekarang LOCKED melalui D12. P5 merupakan rancangan implementasi yang menjaga hak pakai dan isolasi; tidak menghalangi PRD dan dapat ditunda jika cache bersama tidak diperlukan.

| ID | Status dan isi | Batas / bukti |
| --- | --- | --- |
| P1 | LOCKED: dua jatah, pemakaian dan kesiapan dana menurut M1. | Jatah aktual bukan kas bebas otomatis; V7. |
| P2 | LOCKED: gate sebelum ranking menurut M4/M5. | Skor tinggi tidak mengompensasi gate gagal; V3–V5. |
| P3 | LOCKED: template/stress M3 dengan pembanding 1/N dan equity-only. | Baseline produk, bukan bobot terbukti optimal; V1/V2. |
| P4 | LOCKED: kontribusi baru dan review M3/M7. | Tidak ada jual/order otomatis; V2/V7. |
| P5 | Rancangan implementasi: cache pasar yang boleh dibagi; data/hasil personal scoped user. | Hak pakai/isolasi wajib; cache bersama dapat ditunda. |
| P6 | LOCKED: data kurang dan fallback menurut M4/M6. | Unknown tidak dikarang AI; V4/V6. |
| P7 | LOCKED: paket M1–M7 sebagai dasar PRD. | Persetujuan D12; bukti penelitian dan gate pilot/produksi tetap berbeda. |

## C. Penyelesaian pertanyaan dan gate lanjutan

**O1–O8/O10 RESOLVED pada tingkat metode melalui D12.** Nama provider/kanal, catalog nyata dan bukti pilot adalah gate implementasi/release di PRD. **O9 tetap OPEN untuk deployment**, tidak menghalangi pembangunan lokal. Persetujuan metode tidak memberi izin mengubah DNS atau menerbitkan app produksi.

| ID | Isi yang disepakati / hal yang tersisa | Dampak |
| --- | --- | --- |
| O1 | RESOLVED: M1 bulan kalender WIB, actual receivedAt, forecast payday; bukan minggu ×4. | Jatah bulanan |
| O2 | RESOLVED: M1 expected utama, CONFIRMED actual, IRREGULAR actual saja, exclude INTERNAL/PENDING, Decimal half-up, completion/koreksi. | Perhitungan nominal |
| O3 | RESOLVED: M2/M3 kelas=min(T,C,H), template/stress/absolute loss, crypto default 0%. | Profil dan alokasi |
| O4 | RESOLVED: M4–M6 gate, skor 30/20/20/15/15, peer group, tie-break, top-3 alternatif. | Ranking |
| O5 | RESOLVED: M2/M3/M7 profil 12 bulan/perubahan, evaluasi bulanan/deviasi ≥5 pp, tanpa order otomatis. | Review/pembaruan |
| O6 | RESOLVED pada metode M7: Indonesia manual lebih dulu; nominal global/crypto setelah gate. Kanal nyata diverifikasi saat catalog diisi. | Gate catalog/data |
| O7 | RESOLVED pada metode M4/M7: hak/histori/freshness gate. Provider produksi diverifikasi saat integrasi; Yahoo eksploratif tidak dipilih otomatis. | Gate sumber dan hak pakai |
| O8 | RESOLVED: M1/M6 actual+kas bebas, ledger biaya/ID/koreksi, tanpa carry-over/leftover otomatis, arus investasi terpisah. | Rekonsiliasi |
| O9 | OPEN: domain/hosting, konfigurasi login lintas origin dan akses v1 pada deployment. Website/akun/backend bersama tetap D1; konfigurasi lokal dapat dibuat sekarang. | Release/deployment |
| O10 | RESOLVED pada metode M2/M4: pertanyaan/skoring/caps/gate. Validasi V1–V7 yang memerlukan pilot tetap release gate. | Pilot profil/metode |

## D. Alasan dan riwayat pencatatan

| Tanggal | Peristiwa | Alasan / bukti | Dampak status |
| --- | --- | --- | --- |
| 2026-10-13 | Baseline D1–D8 ditulis dari handoff. | Mempertahankan intent eksplisit tanpa menyusun ulang percakapan yang tidak tersedia. | D1–D8 LOCKED; O1–O10 OPEN; P1–P6 PROPOSED. |
| 2026-10-13 | Dua alur alokasi lama dibedakan. | K1–K3 di [integrasi](02-Data-and-Integration.md): pos `savings` 50/30/20 berbeda dari `allocation.invest` pembagian leftover. | D2 tetap; O1–O2 dan O8 belum dijawab oleh kode. |
| 2026-10-13 | Provider belum dipilih; PRD ditunda sesuai prasyarat handoff. | Empat probe akses bukan validasi lisensi, strategi, atau operasi berkelanjutan. | O3–O4 dan O7 tetap OPEN; spesifikasi belum siap. |
| 2026-10-13 | Kesamaan UI/UX dengan Trackster ditetapkan sebagai D9. | Instruksi langsung Arzaka; sumber desain v3 dan implementasi aktif dibaca. | D9 LOCKED; keputusan metode investasi tetap OPEN. App Invest belum diimplementasi. |
| 2026-10-13 | Periode utama bulanan ditetapkan sebagai D10. | Arzaka menginginkan bentuk produk yang tidak terikat pemasukan mingguannya. | D10 LOCKED; pilihan mingguan/bulanan pada O1 selesai. Detail pemetaan bulan pada O1 dan basis aktual/forecast pada O2 tetap OPEN. |
| 2026-10-13 | Rencana jatah dan jatah aktual bulanan diterima sebagai D11. | Arzaka menjawab "oke saya terima" atas usulan dua angka: 20% forecast bulanan dan 20% pemasukan yang sudah diterima bulan itu. | D11 LOCKED; pilihan dua basis selesai. O1–O2 tinggal rincian perhitungan; P1 dipersempit ke pemakaian/dana siap yang belum disetujui. |
| 2026-10-13 | Riset/metode M1–M7 diselesaikan untuk bahan PRD. | Permintaan Arzaka: selesaikan profil risiko, alokasi dan ranking dengan riset yang baik. Literatur diperluas, 47.596 assertion dan eksplorasi historis 2019–2025 dijalankan. | P7 PROPOSED; jawaban O1–O8/O10 kini konkret. Tidak ada parameter baru yang dikunci tanpa persetujuan. PRD final belum dibuat. |

| 2026-10-13 | Metode v0.1 disetujui sebagai dasar PRD; PRD pelaksanaan disusun. | Persetujuan eksplisit Arzaka: "iya saya setuju". | D12 LOCKED; O1–O8/O10 RESOLVED pada metode. O9 dan gate data/pilot/release terpisah. Siap pembangunan lokal menurut PRD; app belum diimplementasi. |

Untuk perubahan berikutnya, catat ID, status lama/baru, keputusan pengguna beserta tanggalnya, alasan, bukti, alternatif yang dipertimbangkan, dan dokumen terdampak. Jika usulan berubah sebelum disetujui, perbarui isi usulan dan catat alasan; jangan menaikkan status hanya karena tertulis di rancangan layar.

## Pelaksanaan setelah persetujuan

2026-10-26 (lanjutan): instruksi Arzaka "lanjut yaa" meneruskan pembangunan lokal ke profil/tujuan dan portofolio manual I2. Tidak mengubah parameter M1–M7 atau D1–D12. Create/settle reservasi membutuhkan evaluation ACTUAL I3; tidak dibuka dengan nominal dari klien sebagai jalan pintas. Detail implementasi dan gap ada di [06](06-Implementation.md).

2026-10-26: Arzaka meminta mulai membangun berdasarkan PRD. Implementasi lokal I0/I1 dimulai pada branch `feat/invest-foundation`; [status dan bukti](06-Implementation.md). D1–D12 tidak berubah. Permintaan membangun tidak diperlakukan sebagai persetujuan deployment produksi atau sebagai kelulusan metode investasi.
