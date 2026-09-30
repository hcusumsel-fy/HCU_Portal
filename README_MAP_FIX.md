# Map Fix V7.1

Perbaikan peta:
- Leaflet CSS integrity hash diperbaiki sesuai distribusi resmi Leaflet 1.9.4.
- Ditambah fallback CDN jsDelivr jika unpkg gagal dimuat.
- Map sekarang langsung menampilkan titik `Loket_Kerja` sebelum GeoJSON selesai dimuat.
- Jika GeoJSON batas kabupaten/kota gagal, map dan pin tetap tampil.
- Timeout layer GeoJSON 15 detik agar tidak terlihat loading tanpa akhir.
- `invalidateSize()` dipanggil setelah halaman Pegawai dirender dinamis.

Untuk Vercel: upload seluruh isi folder ke root repository lalu deploy ulang.
