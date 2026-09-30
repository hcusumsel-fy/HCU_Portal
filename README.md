# HCU SUMSEL Operations Portal V7 — Vercel Ready

Versi ini memperbarui data pegawai dari `Data Pegawai(1).xlsx` dan menggunakan kolom `Loket_Kerja` untuk titik pada peta.

## Isi
- Dashboard + deck MKJ (>3 dan <3 tahun) untuk pegawai PT aktif Job Grade J/K/L.
- Data Pegawai lengkap (69 record; 58 aktif), form detail seluruh kolom spreadsheet.
- Peta Sumatera Selatan dengan pin berdasarkan 32 nilai unik `Loket_Kerja`.
- Grid pegawai: MKJG, CSS, Status CSS, Assessment, Jalur Karir, Status.
- Inventaris + Pinjam Pakai dengan form update kondisi/status (localStorage prototype).
- Kendaraan menggunakan Data Ranmor Sumsel.xlsx.
- Pajak & Asuransi dengan countdown dinamis dari tanggal masa berlaku.
- Keuangan tetap placeholder sampai dataset keuangan dimasukkan.

## Deploy ke Vercel
1. Upload seluruh isi folder ini ke root repository GitHub.
2. Di Vercel pilih **New Project** lalu import repository.
3. Framework preset: **Other**.
4. Root Directory: `./`.
5. Build Command / Output Directory: kosongkan.
6. Deploy.

## Penting — Data Internal
Versi ini masih prototype statis dan memuat data pegawai di frontend agar form detail dapat bekerja. `robots.txt` dan header noindex hanya mencegah pengindeksan; keduanya **bukan autentikasi**. Jangan gunakan URL publik untuk produksi yang memuat data personal. Tahap production sebaiknya memindahkan data ke Google Sheets/API yang terproteksi dan menambahkan autentikasi server-side.

## Peta
- Base map: OpenStreetMap (internet diperlukan).
- Batas kabupaten/kota: GeoJSON publik yang dipanggil saat halaman dibuka.
- Titik `Loket_Kerja` memakai koordinat representatif kota/kabupaten untuk visualisasi dashboard, bukan untuk navigasi presisi.
