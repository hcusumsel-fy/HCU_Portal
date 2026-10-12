# HCU-Portal V9.05.2 — TANPA PIN KHUSUS ASET & LOADING SERAGAM

## Fungsi yang diubah

- Master Aset, Pajak & Asuransi, Pinjam Pakai langsung memakai Fy_Database Live, tanpa mode Arsip ataupun tombol Sinkronkan.
- Tidak ada input PIN khusus aset dan `HCU_ASSET_V904_ACCESS_PIN` tidak dibaca oleh aplikasi V9.05.2.
- Otorisasi akses aset tetap memakai sesi LOGIN PORTAL dari API `/api/auth` (cookie HttpOnly), bukan akses internet bebas. URL dan API_TOKEN Fy_Database tetap hanya ada di Vercel dan GAS.
- Saat membuka masing-masing dari tiga menu aset, LOADING sama dengan Pegawai/Procurement/Keuangan: panel progress 4 tahap, logo JR berputar, timer `Sync to Fy_Database for :` (detik/menit) dan status baca.
- Simpan/edit/transaksi tetap melalui Fy_Database, dengan proses simpan bertahap, konfirmasi berhasil setelah pembacaan ulang, dan pesan gagal saat API bermasalah.
- Pengembalian aset lama tersedia di Master Aset dan Pinjam Pakai → Pengembalian Aset Migrasi. Transaksi Pinjam Pakai baru memiliki tombol Kembalikan masing-masing.

## Pilih paket sesuai versi yang aktif

**Jika sudah memasang V9.05.1 dan login portal server telah normal**: upload **hanya `portal.html`** dari `HCU_Portal_V9_05_2_PATCH_PORTAL_SAJA.zip`; tidak perlu ubah Vercel atau API.

**Jika masih memakai V9.05 dan masih diminta PIN**: gunakan `HCU_Portal_V9_05_2_PATCH_DARI_V9_05_6_FILE.zip` (6 file):

1. `index.html` (GANTI)
2. `portal.html` (GANTI)
3. `assets/fy_assets_v904.js` (GANTI)
4. `api/assets.js` (GANTI)
5. `api/auth.js` (TAMBAH)
6. `lib/hcu-portal-auth.js` (TAMBAH)

**PENTING**: Sebelum upload enam file, atur Vercel Environment Variables pada Production:

- `HCU_PORTAL_LOGIN_USER`: nama akun pengelola (misalnya `admin.hcu`).
- `HCU_PORTAL_LOGIN_PASSWORD`: kata sandi kuat minimal 12 karakter.
- `HCU_PORTAL_SESSION_SECRET`: kunci acak minimal 32 karakter.

Pastikan variabel lama yang sudah berfungsi **tetap**: `HCU_DATABASE_APPS_SCRIPT_URL`, `HCU_DATABASE_API_TOKEN`, `HCU_ASSET_V904_WRITES_ENABLED=true` jika fitur edit memang telah diuji. **Jangan taruh URL/token/PASSWORD di HTML atau GitHub.** Tidak perlu ubah `Code.gs` dan jangan ulang migrasi data.

Variabel `HCU_ASSET_V904_ACCESS_PIN` sudah tidak diperlukan untuk versi ini. Sebaiknya **biarkan dulu tersimpan** sampai deployment V9.05.2 dipastikan normal, agar rollback versi sebelumnya tetap memungkinkan; hapus nanti jika tidak membutuhkan rollback.

## Pengujian pasca-deploy

1. Backup commit GitHub dan Google Sheets produksi terlebih dahulu.
2. Setelah Vercel Ready, logout, login dengan akun portal baru jika baru memasang 6-file patch.
3. Buka Master Aset: tidak boleh muncul dialog kode akses. Loading menunjukkan 4 tahap dan logo JR + timer, lalu data Master Aset Live tampil (angka mengikuti kondisi database terkini).
4. Buka Pajak & Asuransi dan Pinjam Pakai: loading sama, tidak muncul PIN. Jika error, ada pesan Coba Lagi, bukan data arsip.
5. Lakukan satu pembaruan nonkritis yang benar-benar diperlukan. Saat Simpan: progres → sukses, form tutup, tampilan diperbarui otomatis. Jika timeout, cek Fy_Database dulu sebelum mengulang.
6. Validasi Dashboard, Pegawai, Procurement, Keuangan, dan Pusat Notifikasi tetap normal.

**Akses**: Satu akun login pengelola untuk versi ini; bila membutuhkan akun per pegawai/role, diperlukan autentikasi multiuser terpisah. Jika otorisasi server belum disiapkan, sistem **tidak** akan memperbolehkan akses Aset secara anonim.
