HCU SUMSEL OPERATIONS PORTAL V7.89 FULL STABLE
================================================
Isi paket untuk repository HCU_Portal:
- index.html
- portal.html
- assets/jr-symbol-transparent.png
- api/employee.js
- api/lhu.js
- api/procurement.js

Perbaikan V7.89:
1. Loader Fy_Database memakai asset logo yang benar-benar disertakan dalam paket.
2. Sinkronisasi Dashboard Pegawai + Procurement + Keuangan berjalan paralel.
3. Timeout pengaman 18 detik per modul agar halaman tidak berhenti blank selamanya.
4. Bila salah satu database lambat/gagal, halaman tetap dirender menggunakan data yang sudah tersedia.
5. Timer loader berjalan realtime dan reset setiap proses sinkronisasi baru.

Vercel Environment Variables tetap memakai konfigurasi yang sudah ada:
- HCU_LHU_API_TOKEN atau HCU_DATABASE_API_TOKEN
- HCU_LHU_APPS_SCRIPT_URL atau HCU_DATABASE_APPS_SCRIPT_URL (opsional jika memakai default URL pada proxy)

AppsScript_HCU_SUMSEL_Current.gs.txt disertakan hanya sebagai referensi backend. Tidak perlu deploy ulang untuk perubahan loader ini.
