HCU SUMSEL Operations Portal V8.00
Finance Fast + Accurate Sync

PERUBAHAN UTAMA
- Loader awal Fy_Finance membaca index database + snapshot periode terpilih.
- Initial read Finance tidak memakai artificial timeout 18 detik, sehingga tidak membuat request retry ganda.
- Histori Januari s.d. bulan terpilih dimuat satu kali di background.
- Maksimal 3 periode diproses paralel.
- listLHU dan getLHU per periode memakai shared in-flight promise untuk mencegah request ganda.
- Satu periode hanya dianggap selesai jika seluruh header LHU yang terdaftar berhasil terbaca.
- Jika satu detail LHU gagal, periode tidak dianggap lengkap.
- Grafik Trend/YTD tidak menampilkan data parsial.
- Grafik baru dirender setelah seluruh periode trend yang dibutuhkan selesai dibaca.
- Manual Refresh Trend melakukan sinkronisasi penuh sebelum hasil ditampilkan.
- Seluruh fungsi V7.99 sebelumnya tetap dibawa, termasuk loader database live status, sidebar responsive, login background stretch, Pegawai, Procurement, dan Finance.

STRUKTUR WAJIB DI ROOT GIT
index.html
portal.html
vercel.json
assets/
api/
AppsScript_HCU_SUMSEL_Current.gs.txt

DEPLOY
1. Extract ZIP.
2. Upload SELURUH ISI ZIP langsung ke root repository HCU_Portal.
3. Jangan masukkan file-file tersebut ke subfolder baru.
4. Commit dan push ke branch yang dipakai Vercel.
5. Tunggu deployment berstatus Ready / Current.
6. Buka production domain.
7. Lakukan Ctrl + F5 satu kali.

Apps Script tidak perlu diubah untuk update V8.00 ini.
