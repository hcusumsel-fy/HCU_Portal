# HCU SUMSEL Operations Portal — Prototype V1

Prototype antarmuka untuk portal operasional HCU Kanwil Sumatera Selatan.

## Sumber data prototype
- Data Pegawai.xlsx
- Data Ranmor Sumsel.xlsx
- Data Pinjam Asset.xlsx

Data sensitif seperti nomor telepon, email, catatan personal, nilai assessment, dan catatan HR tidak dimasukkan ke bundle frontend prototype ini.

## Modul V1
- Login demo
- Dashboard / HCU Control Center
- Pegawai
- Inventaris
- Pinjam Pakai
- Kendaraan
- Pajak & Asuransi / Action Center
- Keuangan (placeholder integrasi berikutnya)
- Laporan

## Cara menjalankan
Buka `index.html` secara lokal atau deploy folder ini ke Vercel sebagai static site.

## Penting sebelum production
Versi ini adalah prototype frontend. Untuk penggunaan sungguhan, data jangan disimpan di `assets/data.js`. Gunakan arsitektur:

Website Vercel → API serverless → Google Sheets API → Spreadsheet private

Tambahkan autentikasi Google Workspace / role-based access, audit log, validasi server-side, dan jangan pernah mengekspos service-account credentials ke browser.
