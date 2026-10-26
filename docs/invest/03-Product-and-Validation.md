# 03 — Produk dan Validasi Invest

[Panduan utama](README.md) · [Keputusan](00-Decisions.md) · [Riset investasi](01-Investment-Research.md) · [Data dan integrasi](02-Data-and-Integration.md) · [Metode konkret](04-Methodology.md) · [Hasil validasi](05-Validation-Results.md)

**Tanggal rancangan: 2026-10-13. Status: metode disetujui melalui D12; pelaksanaan mengikuti [PRD](PRD.md).** D1–D12 berlaku. Implementasi I0/I1 dan inti I2 tersedia lokal pada 2026-10-26 ([bukti](06-Implementation.md)); dokumen ini mempertahankan konteks rancangan dan agenda riset, sementara kontrak/acceptance final pembangunan ada di PRD.

## Tujuan dan batas versi awal

Arzaka dapat melihat jatah 20%, menentukan tujuan dan profil risiko, memasukkan portofolio manual, lalu memeriksa pembagian nominal serta shortlist dengan alasan dan sumber yang dapat ditelusuri. Evaluasi berkala meninjau kesesuaian investasi jangka panjang terhadap perubahan tujuan, portofolio, dan data pasar.

Jatah dan ringkasan utama mengikuti **bulan** (D10). Tampilkan **rencana jatah = 20% forecast pemasukan bulanan** serta **jatah aktual = 20% pemasukan yang sudah diterima bulan itu**, secara terpisah sesuai D11. Keduanya tidak dijumlahkan. Cadence pemasukan tetap dapat mingguan, bulanan, atau tidak tetap. Batas/pemetaan bulan, skenario, klasifikasi, pembulatan dan rekonsiliasi memakai M1 yang disetujui pada D12; jatah aktual bukan pernyataan bahwa kas bebas sebesar itu tersedia.

Handoff hanya menetapkan keluaran rekomendasi dan input portofolio manual. Tidak ada implementasi transaksi broker, custody, sinkronisasi holdings, atau penulisan otomatis saldo bank pada rancangan awal ini. Indonesia, global, dan crypto tetap target cakupan bertahap; isi versi pertama ditetapkan lewat O6.

## Rancangan alur dan layar

### UI/UX bersama — LOCKED (D9)

Arzaka menetapkan pada 2026-10-13 bahwa UI/UX Invest harus sama persis dengan Trackster. Sumber aktif yang diperiksa pada tanggal tersebut adalah [handoff Trackster v3](../Rework%20Design%20Trackster/README.md), [template desain](../Rework%20Design%20Trackster/Trackster%20v3%20App.dc.html), [prototipe standalone](../Rework%20Design%20Trackster/Trackster%20v3%20App%20%28standalone%29.html), serta [logic.tsx](../../apps/frontend/src/components/v3/logic.tsx), [komponen v3](../../apps/frontend/src/components/v3/V3Tree.tsx), dan [CSS v3](../../apps/frontend/src/components/v3/v3.css). Folder `design_system/` adalah arsip desain lama menurut konteks proyek; implementasi menggunakan sumber v3 aktif beserta perbaikan yang sudah masuk.

Gunakan nilai persis dari sumber aktif untuk warna/tema, tipografi Bricolage Grotesque dan DM Mono, spacing/density, bentuk kartu, ikon, maskot, navigasi desktop/mobile, form, modal, toast, animasi, serta pola interaksi. Dukung tema terang/gelap, bahasa ID/EN, dan reduced motion sesuai Trackster. Konten Invest mengikuti kebutuhan investasinya dengan komponen dan pola yang sama. Jangan menebak token dari ringkasan README jika nilainya berbeda dengan template/kode aktif.

Acceptance visual wajib: bandingkan layar Invest dengan komponen/pola Trackster yang dipakai pada desktop 1280px+ dan mobile 390px, termasuk tema, density, keadaan loading/kosong/error, serta interaksi. Catat selisih dan perbaiki sebelum menyatakan UI sesuai D9. Pemeriksaan sesi ini baru membaca sumber desain/kode; belum ada UI Invest atau pengujian visualnya.

Tabel berikut adalah konteks rancangan UX awal. Baseline bulan/metode telah disepakati pada D10–D12; UI/UX mengikuti D9. Route, states, kontrak dan acceptance pelaksanaan mengikuti PRD. Alur belum diuji pada app Invest nyata; pilot V1/V5/V7 tetap diperlukan.

| Layar | Masukan / tindakan | Hasil dan bukti yang terlihat | Saat informasi belum cukup |
| --- | --- | --- | --- |
| Masuk | Login melalui akun Trackster bersama; akses awal untuk Arzaka menurut O9. | Identitas pengguna dan keadaan sesi yang valid. | Sesi habis diarahkan masuk kembali; pengujian lintas origin wajib sebelum rilis. |
| Ringkasan jatah | Pilih bulan sesuai D10; lihat rencana jatah dari forecast dan jatah aktual dari pemasukan diterima sesuai D11. | Dua nominal terpisah beserta dasar hitung 20%, bulan, skenario/status sumber, versi dan waktu pembaruan; pemakaian jatah menurut O8. | Tampilkan basis mana yang belum lengkap; forecast hilang tidak dijadikan nol atau digantikan aktual secara diam-diam. Jangan tampilkan nominal rekomendasi final dari basis ambigu. |
| Tujuan dan profil | Tujuan, tanggal/horizon, kebutuhan pencairan, kemampuan menanggung kerugian, reaksi pada penurunan, pengalaman dan batas instrumen. | Profil sementara, alasan klasifikasi, konflik jawaban, dan waktu evaluasi; ambang O10. | Minta melengkapi data yang diperlukan; jangan memilih profil agresif dari satu jawaban. |
| Portofolio manual | Tambah/edit instrumen dan unit/nilai beserta tanggal, mata uang, serta kontribusi yang diketahui. | Komposisi dan kualitas valuasi; harga pokok yang tidak diketahui ditandai. | Nilai manual dipisahkan dari valuasi pasar; hindari menghitung keuntungan tanpa basis yang cukup. |
| Pemindaian pasar | Lihat/filter cakupan berdasarkan kelas, wilayah, akses, tujuan dan data. | Universe yang dipindai, tanggal snapshot, sumber, kandidat lolos/tidak lolos dan alasan. | Tampilkan pasar belum tercakup dan instrumen yang belum dapat dinilai; ukuran shortlist boleh lebih kecil dari target. |
| Pembagian dan shortlist | Jalankan evaluasi aturan setelah input cukup. | Nominal per kelompok/instrumen, cadangan/sisa, alasan kecocokan, biaya/minimum, ranking dan versi metode. | Batasi hasil pada bagian yang valid; jangan memaksakan pembelian di bawah minimum atau tanpa biaya diketahui. |
| Detail dan perbandingan | Buka instrumen atau bandingkan kandidat; minta AI menjelaskan. | Risiko, horizon, biaya, observasi historis dengan periodenya, sumber dan batas bukti; narasi berdasar hasil aturan. | AI menyebut data kurang dan tidak mengisi angka. Perhitungan tetap tersedia jika AI gagal. |
| Evaluasi berkala | Tinjau perubahan profil, kontribusi, holdings dan pasar; catat keputusan manual. | Perubahan dibanding snapshot sebelumnya, deviasi komposisi, alasan usulan, dan tanggal evaluasi berikutnya jika O5 sudah ditetapkan. | Jangan menganggap usulan telah dibeli; portofolio dan pemakaian jatah berubah setelah pencatatan manual yang sesuai aturan O8. |

## Metode rekomendasi v0.1 — baseline yang disetujui

**APPROVED melalui D12**, 2026-10-13. [04-Methodology.md](04-Methodology.md) menjadi sumber tunggal parameter; [PRD](PRD.md) memuat pelaksanaan. [05-Validation-Results.md](05-Validation-Results.md) membedakan bukti penelitian dan gate pilot/produksi.

1. **M1 — Jatah:** bulan kalender WIB, actual CONFIRMED menurut tanggal penerimaan, expected dari event pembayaran bulanan, dua jatah 20% terpisah, Decimal half-up. Forecast hanya rencana.
2. **M1 — Kesiapan dana:** dana order dibatasi sisa jatah aktual dan kas bebas terkonfirmasi, dengan ledger biaya/pemakaian/koreksi; tanpa carry-over/leftover otomatis.
3. **M2 — Profil:** kemauan T, kemampuan C dan horizon H terpisah; kelas=min(T,C,H), dengan data wajib, batas kemampuan rugi rupiah, knowledge gate dan peninjauan konflik.
4. **M3 — Alokasi:** template per kelas disesuaikan oleh stress dan kemampuan rugi; kontribusi ke defisit holdings, crypto default 0%, review tanpa jual otomatis.
5. **M4/M5 — Shortlist:** eligibility gate kemudian skor biaya/diversifikasi/data/likuiditas/akses 30/20/20/15/15 dalam peer group; ranking deterministik, maksimal tiga alternatif.
6. **M6 — Nominal:** unit/lot/minimum dan all-in fee dibatasi dana kelompok; satu kandidat inti per kelompok, maksimum tiga order non-kas, residu tetap kas.
7. **M6/M7 — Bukti/operasi:** snapshot sumber/versi/coverage, narasi AI dari hasil engine, fallback, pembaruan serta cakupan bertahap.

Return historis dapat menjadi observasi, tetapi ranking tidak boleh menamakan return tersebut keuntungan yang akan diperoleh. Kualitas bukti berbeda dari risiko aset: data sangat lengkap tidak membuat aset menjadi rendah risiko. Skor lintas kelas aset tidak dibandingkan langsung sebelum normalisasi dan tujuan pembanding disepakati.

## Contoh sintetis — hanya aritmetika

Angka berikut adalah contoh aritmetika awal, bukan data Arzaka atau template metode v0.1. Bobot kelompok A/B hanya fixture untuk penjumlahan; template/stress v0.1 serta hasil pengujiannya ada di dokumen metode dan validasi, dengan status baseline yang disetujui dan batas bukti penelitian yang tetap berlaku.

| Input/hasil simulasi | Nilai | Batas contoh |
| --- | --- | --- |
| Forecast pemasukan hipotetis satu bulan / rencana jatah | Rp1.500.000 / Rp300.000 | Contoh aritmetika D11; expected utama sesuai M1; angka ini fixture sintetis. |
| Pemasukan hipotetis yang sudah diterima bulan itu / jatah aktual | Rp1.000.000 / Rp200.000 | Dua pandangan jatah yang sama; Rp300.000 dan Rp200.000 tidak dijumlahkan. Contoh berikut memakai jatah aktual untuk aritmetika, bukan menetapkan basis rekomendasi final atau kesiapan kas. |
| Kelompok A / B, bobot uji 60% / 40% | Rp120.000 / Rp80.000 | Label abstrak untuk memeriksa penjumlahan, bukan kelas aset atau portofolio yang direkomendasikan. |
| Kontribusi yang sudah memakai jatah / biaya contoh | Rp50.000 / Rp10.000 | Untuk menguji satu kandidat kebijakan yang menghitung biaya di dalam jatah. Kebijakan final tetap O8. |
| Sisa pada kandidat kebijakan itu | Rp140.000 | `200.000 - 50.000 - 10.000`; hasil ini tidak berarti seluruhnya kas tersedia. |

Uji tambahan perlu memeriksa jatah kecil, bobot kosong/tidak berjumlah 100%, tujuan majemuk, revisi pemasukan, biaya melebihi nominal, lot tak terjangkau, dan holdings yang belum diperbarui. Jika dana ditahan karena minimum, jumlah pembelian + biaya + cadangan/sisa harus tetap sama dengan dana tersedia yang disepakati untuk dialokasikan.

## Agenda riset dan pengujian

Riset awal V1–V7 kini sudah dikerjakan pada tingkat yang dapat dilakukan tanpa app/input pribadi: literatur, metode, fixture serta eksplorasi histori. Status rinci dan hasilnya ada di [05-Validation-Results.md](05-Validation-Results.md). Tabel berikut tetap menjadi protokol penelitian/pilot lengkap, bukan klaim seluruh validasi lulus. Metode sudah disetujui Arzaka pada D12; pengujian yang memerlukan catalog nyata, model AI atau runtime app tetap acceptance gate implementasi.

| ID | Penelitian / sumber awal | Metode dan bukti yang dibutuhkan | Keterbatasan yang harus dinyatakan | Keputusan / produk terdampak |
| --- | --- | --- | --- | --- |
| V1 | **Kalibrasi profil risiko**; R1/R9, jawaban sintetis dan kemudian input pengguna yang diberikan secara privat. | Bedakan kemauan dengan kemampuan rugi dan kebutuhan kas; uji konflik, stabilitas jawaban ulang, perubahan horizon, serta alasan klasifikasi. Output: pertanyaan, mapping dan kasus yang tidak dapat diklasifikasi. | Satu pengguna tidak memvalidasi profil untuk populasi umum; self-report berubah; ambang baseline perlu dievaluasi pada pilot. | O3/O10; profil dan kecocokan rekomendasi. |
| V2 | **Pengujian alokasi**; R2/R5/R6/R8, dataset dari provider yang lolos V4. | Tetapkan pembanding sederhana dan aturan sebelum melihat hasil; uji skenario kontribusi, penurunan bersamaan, FX, biaya dan minimum; pisahkan periode pengembangan/evaluasi. Ukur downside, konsentrasi, stabilitas, turnover serta biaya. | Histori tidak menjamin masa depan; sampel pendek tidak cukup untuk menyatakan strategi unggul. Tidak memilih bobot berdasarkan satu periode terbaik. | O3/O5; bobot dan evaluasi berkala. |
| V3 | **Biaya dan minimum pembelian**; R6/R10, prospektus/memorandum serta tarif kanal yang dipilih. | Buat tabel per instrumen/kanal bertanggal: minimum/lot, beli-jual, FX, pengelolaan/kustodian, pajak, pencairan; uji nominal kecil dan sisa pembulatan. Output: contoh order layak dan alasan tidak layak. | Biaya dan ketentuan historis bisa berubah; pajak perlu verifikasi sumber sesuai produk. Hindari biaya pengelolaan dihitung ganda dari NAB. | O6/O7/O8; nominal dan kelayakan shortlist. |
| V4 | **Kualitas data historis**; S1–S8 dan dokumentasi provider. | Audit identitas, rentang, gap/null, mata uang, raw/adjusted, distribusi/split, kalender, revisi serta timestamp; bandingkan sampel dengan sumber resmi kedua. Output: laporan kualitas dan coverage, hak pakai, serta ketentuan kelulusan. | Probe HTTP tidak membuktikan histori valid. Universe yang hanya memuat aset bertahan bisa bias; histori Demo crypto terbatas. | O4/O7; indikator risiko dan perilaku data kurang. |
| V5 | **Evaluasi shortlist**; R1/R6/R8/R9, universe dan metode dari V2–V4. | Review kesesuaian tujuan/risiko/akses; uji stabilitas ranking saat input wajar berubah, overlap holdings, data kurang, tie, dan cakupan parsial. Output: kandidat lolos/tidak lolos beserta sumber dan alasan yang bisa diperiksa. | Daftar yang tampak masuk akal bukan bukti return unggul. Preferensi satu user membatasi generalisasi. | O4/O6/O10; shortlist, perbandingan, dan ukuran daftar. |
| V6 | **Konsistensi AI**; D8, snapshot hasil aturan dan bahan sumber yang diizinkan. | Ulangi penjelasan untuk input/ruleset yang sama; uji instruksi menyesatkan dalam data, sumber kosong, angka konflik, timeout dan kuota. Cocokkan seluruh angka/ID/sumber terhadap hasil deterministik. Output: laporan mismatch dan pola fallback. | Narasi bisa bervariasi; kesamaan kalimat bukan syarat. Konsistensi angka tidak membuktikan seluruh interpretasi benar. | O7/O10; penjelasan, bukti, dan fallback AI. |
| V7 | **Rekonsiliasi jatah dan portofolio**; K1–K5, fixture sintetis dan aturan O1/O2/O8. | Uji forecast vs aktual, pemasukan bulanan/irregular, status PENDING/INTERNAL, edit/hapus income, transfer, pembelian dicatat dua tempat, biaya, jual/dividen, carry-over, dan input manual ulang. Output: ledger contoh serta aturan koreksi yang menolak penggunaan jatah dua kali. | Nilai holdings naik tidak menambah jatah pemasukan. Entry manual tanpa provenance dapat ambigu; jangan menyatakan saldo bank terverifikasi tanpa rekonsiliasi runtime. | O1/O2/O8; ringkasan, nominal, pemakaian dan portofolio. |

Tambahan verifikasi integrasi sebelum implementasi siap rilis: pengguna lain tidak dapat melihat data privat, sesi dicabut berlaku di kedua website, origin yang tidak diizinkan ditolak, serta operasi Invest tidak mengubah saldo/budget Trackster tanpa aturan yang disepakati. Gunakan data sintetis dan ikuti konvensi pengujian repository saat kode benar-benar dibuat.

## Kandidat acceptance criteria

**Ringkasan acceptance awal; acceptance pelaksanaan final ada di PRD.** Sumbernya D1–D12 dan V1–V7; daftar ini bukan klaim implementasi telah lulus.

- Periode, basis pemasukan, aturan 20%, pembulatan, dan pemakaian jatah dapat ditelusuri; tidak tertukar dengan pembagian leftover lama.
- Input dan ruleset identik menghasilkan nominal/skor/urutan yang identik, termasuk aturan seri yang disepakati.
- Jumlah nominal, biaya yang termasuk anggaran, serta sisa sesuai dana yang dialokasikan; tidak ada penggunaan jatah ganda.
- Kandidat di luar batas risiko/tujuan/akses atau dengan data kritis kurang tidak dipromosikan melalui skor tinggi.
- Hasil menampilkan sumber, asOf, coverage, risiko, biaya/minimum, serta batas bukti; data hilang tidak dianggap nol.
- AI tidak mengubah angka atau menambah fakta pasar tanpa sumber; AI gagal tetap memungkinkan hasil aturan yang valid dibaca.
- Portofolio manual tetap privat per user; input holdings tidak otomatis mengubah BankBalance, Income, atau budget lama.
- Dua jatah bulanan tidak dijumlahkan; order tidak memakai forecast, dan event selesai/receipt yang diulang tidak menggandakan rencana/pemakaian.
- Profil tidak melebihi kemauan, kemampuan, horizon, atau batas kerugian rupiah; data tidak lengkap tidak menghasilkan profil otomatis.
- Persentase stress tidak ditampilkan sebagai kerugian maksimum yang dijamin; hasil nyata dapat melampaui skenario.

Parameter M1–M7 telah disepakati melalui D12 dan diterjemahkan menjadi acceptance criteria PRD; kesamaan UI/UX tetap LOCKED. Pilot/runtime tetap perlu membuktikan kriteria tersebut.

## Gap dan urutan kerja lanjutan

1. Mulai I0 pada PRD; O1–O8/O10 diselesaikan pada metode melalui D12. Jangan meminta persetujuan metode yang sama ulang.
2. Ikuti PRD dan acceptance gate pilot/runtime; source/catalog/kanal serta domain/hosting ditentukan sebelum integrasi terkait dirilis.
3. Implementasikan dan jalankan bagian V1–V7 yang membutuhkan input pengguna, data produk nyata, model AI dan runtime; jangan memindahkan status fixture menjadi klaim produksi.

Urutan ini adalah usulan kerja, bukan tahapan implementasi yang telah disetujui. Gap lain: riset perlindungan/ketentuan produk lokal, akses investor Indonesia ke instrumen global, biaya/pajak spesifik, holdings overlap, kualitas data fundamental, serta strategi menangani instrumen delisting dan histori panjang crypto.

## Gerbang dan isi PRD untuk handoff

Arzaka telah menyetujui metode v0.1 pada D12. [PRD.md](PRD.md) sekarang tersedia dan siap untuk pembangunan lokal. Gate handoff dokumentasi terpenuhi; app, catalog nyata dan pilot/release belum diberi status selesai.

PRD pelaksanaan mencakup:

- Tujuan, pengguna v1, cakupan/non-cakupan, serta alur dan keadaan setiap layar.
- Definisi jatah 20% beserta basis/periode/pembulatan/rekonsiliasi; profil risiko, tujuan, portofolio manual, dan keluaran rekomendasi.
- Aturan alokasi dan ranking yang eksplisit, contoh sintetis, sumber fitur, versi, dan alasan hasil.
- Kebutuhan data/API, hak penggunaan, identitas instrumen, kontrak input/output, pembaruan dan kualitas; perilaku data kurang/gagal.
- Peran AI, input yang diizinkan, bukti yang menyertai hasil, validasi narasi dan fallback.
- Acceptance criteria final, fixture dan pengujian, tahapan implementasi beserta prasyarat, serta batas kompatibilitas auth/scoping/anggaran/saldo Trackster.

Gunakan keputusan pengguna dan hasil riset sebagai referensi PRD. Jika salah satunya berubah, revisi decision log dan spesifikasi bersamaan sebelum handoff implementasi.
