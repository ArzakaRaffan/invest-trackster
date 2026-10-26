# Review berkala dan perbandingan instrumen

**Diperiksa 2026-10-26.** Kelanjutan I3 dan bagian review I4, dengan metode D12 tetap berlaku. Peninjauan tidak mengotorisasi transaksi atau membuka gate data.

| Jenis / sumber | Temuan dan konteks | Batas bukti | Dampak produk |
| --- | --- | --- | --- |
| LITERATUR — [SEC/Investor.gov, Beginners’ Guide to Asset Allocation, Diversification, and Rebalancing](https://www.investor.gov/additional-resources/general-resources/publications-research/info-sheets/beginners-guide-asset), bagian Changing Your Asset Allocation dan Rebalancing101 | Panduan edukasi menempatkan perubahan horizon, toleransi dan tujuan sebagai alasan meninjau alokasi; rebalancing perlu mempertimbangkan biaya transaksi dan konsekuensi pajak. | Konteks edukasi umum AS, bukan riset kalibrasi Arzaka atau peraturan pajak Indonesia. Tidak membuktikan ambang5 pp maupun review bulanan sebagai pilihan optimal. Tidak ada data return produk baru dari halaman ini. | Review memisahkan perubahan input, sumber dan komposisi pot. Tidak membuat order, mengubah target, atau mengeksekusi penjualan secara otomatis. |
| KEPUTUSAN — [M3/M7](04-Methodology.md), disetujui melalui D12 | Deviasi≥5 poin persentase dan perubahan bulan/input memicu peninjauan. | Hipotesis produk yang disetujui, belum kalibrasi investasi optimal. | Batas diperiksa dengan Decimal sebelum pembulatan tampilan; pergantian bulan mengikuti WIB. |
| KODE — [invest-review.ts](../../apps/backend/src/modules/invest/invest-review.ts) | Deviasi memakai holdings tervaluasi dan kas tujuan yang sudah tercatat; target berasal dari snapshot aktual yang masih cocok dengan versi profil/goal/metode. | Bukan perhitungan return atau atribusi kinerja. Angka histori metadata belum berupa audit seri otomatis. | B tidak dimasukkan ke denominator sebelum benar-benar menjadi kepemilikan/kas tujuan. Valuasi/FX hilang atau basi menahan rasio; pot kosong tidak menghasilkan persentase karangan. |
| PERCOBAAN — [review check](../../apps/backend/src/modules/invest/invest-review.check.ts) dan [API](../../apps/backend/scripts/invest-review-e2e.mjs) | Fixture menguji batas tepat5 pp, rollover WIB, unknown versus0, versi sumber, isolasi dan acknowledgment yang tidak mengubah uang. | Seluruh input sintetis. Tidak ada transaksi/API broker, profil nyata, lisensi pasar tambahan atau evaluasi LLM. | Hasil memberi bukti konsistensi implementasi, bukan keberhasilan metode investasi. Hasil runtime tercatat di [06-Implementation.md](06-Implementation.md). |

## Kontrak review yang diterapkan

1. Review membaca evaluasi ACTUAL milik pengguna dan keadaan kini. PLAN tetap arsip simulasi dan tidak menjadi baseline review aktual.
2. Perubahan jatah, profil/tujuan/metode, nilai holdings/kas, kelayakan sumber/akses dan bulan dicatat terpisah. Target lama tidak dipakai untuk menyimpulkan deviasi jika profil atau tujuan berubah. Target harus diperoleh melalui evaluasi baru.
3. Satu acknowledgment terikat hash bulan, versi input dan hasil pemeriksaan. Waktu pengambilan semata tidak membuat acknowledgment basi setiap detik; pergantian bulan, sumber/input atau gate umur data dapat membatalkannya.
4. POST acknowledge memeriksa revision dan reviewKey dalam transaksi Serializable. Retry key/body yang sama mengembalikan hasil asli; key berbeda untuk keadaan sama tetap memakai satu audit. Keadaan berbeda menyimpan audit baru, tanpa menimpa yang lama.
5. Acknowledgment hanya menulis audit Invest dan receipt idempotensi. Tidak mengubah target, profil, cash confirmation, ledger, reservation, evaluasi, Income atau BankBalance. Hasil basi tetap perlu evaluasi ulang sebelum reservasi.
6. Review dihitung saat halaman/API dibaca dan dipolling UI setiap30detik. Tidak ada cron, notifikasi eksternal, penjualan otomatis, atau klaim pemantauan ketika aplikasi tidak dibuka.

## Detail dan perbandingan

Filter kelas, wilayah, pencarian nama/issuer/kanal, gate, akses privat dan peer dijalankan sebelum pagination. Akses yang sudah berbeda versi/lebih dari90hari ditandai STALE. Batas1000 record tersimpan kini menolak penambahan di luar kapasitas; tidak menerima catatan yang kemudian tidak terlihat dalam catalog.

Perbandingan menerima2–3 ID unik dengan jenis, kelas, eksposur, mata uang dan tenor yang sama. Validasi dilakukan kembali di server. Tampilan memuat ketentuan, biaya, harga/kurs/asOf, cakupan histori dan bukti risiko. Biaya/quote/histori unknown tetap unknown. Halaman perbandingan tidak menciptakan skor baru karena ranking bergantung nominal/horizon evaluasi; sumber dan gate tetap dapat diperiksa di detail instrumen.

Riset berikutnya: isi histori/biaya/akses produk nyata dan uji kalibrasi profil, alokasi serta shortlist; lanjutkan narasi AI dengan validator/fallback dan pengujian model nyata. Katalog awal tetap research-only sampai AC-D4 terpenuhi. Review ini belum meluluskan seluruh I4/pilot/release.
