# Menu bergambar dan dashboard analitik

Beranda mengikuti referensi pengguna: kartu persegi simetris tiga kolom, delapan menu (dua kartu terakhir berada di tengah), tanpa chevron. Gambar 3D asli dari versi sebelumnya diekstrak dari data URI yang sudah ada menjadi WebP lokal, tanpa menggambar ulang. Hero menggunakan gambar ruang mengaji tanpa orang yang dilampirkan pengguna; format WebP transparan, 141.562 byte. Tombol akun kanan atas di beranda dan kerangka dihapus; akses akun tetap di navigasi bawah dan sidebar PC. Navigasi bawah hanya menampilkan label pada tujuan yang aktif, dengan aria-label pada seluruh tautan.

Ringkasan Hari Ini berupa satu panel mint dengan dua angka dan pemisah tipis. Tidak ada nama menu atau jumlah statistik yang dibuat-buat.

## Susunan layar

| Bagian | Mobile | Tablet | PC |
| --- | --- | --- | --- |
| Beranda | Hero di atas, menu 3 kolom | Menu tetap 3 kolom, ukuran dibatasi | Hero di kiri, menu dan ringkasan di kanan; menu 4 kolom pada layar >=1440px |
| Navigasi | Bilah bawah, ikon saja kecuali aktif | Bilah bawah sampai breakpoint sidebar | Sidebar dan akun pada bagian bawah sidebar |
| Metrik analitik | 2 x 2 | 4 kolom | 4 kolom |
| Enam grafik | Satu kolom | Dua kolom | Kisi 12 kolom: tren 8 + komposisi 4; nilai 7 + olahraga 5 |

## Enam analitik di Laporan

1. Catatan hadir per pekan: batang teal, jumlah 8 periode terakhir.
2. Komposisi kehadiran: donat dan legenda status, mengikuti semester terpilih.
3. Setoran hifzh: garis dengan area ringan.
4. Hasil setoran: donat Lancar/Ulang.
5. Nilai diniyyah: batang horizontal per mapel.
6. Olahraga: batang emas per bulan.

Empat kartu metrik di atas menggunakan agregat data yang sama. Tidak ada persentase pertumbuhan atau perbandingan periode rekaan. Data tabel dapat dibuka pada grafik tren dan nilai. Kondisi memuat, kosong, satu periode, dan gagal dipertahankan. Tombol coba lagi dan filter semester tetap berfungsi.

Seluruh logika pemuatan, agregasi, dan pemilihan semester pada KontenGrafik dipertahankan; hanya presentasi dipisah menjadi PanelAnalitik dan GrafikAnalitik. Tidak ada perubahan skema, kebijakan akses, API data, maupun login. Batas cakupan sumber data sebelumnya tetap berlaku.

## Validasi

- `npm run typecheck` lulus.
- `npm run build:cf` lulus: build Next.js dan bundel OpenNext Cloudflare.
- `node scripts/verifikasi-ui.cjs` lulus: lima peran, pencarian modul berizin, ketersediaan delapan aset gambar, enam panel, nilai KPI fixture, filter semester, rasio donat, nilai nol, keadaan memuat/gagal/satu periode.
- Perbandingan AST TypeScript memastikan logika pemuatan/agregasi/filter di KontenGrafik sama dengan versi sebelumnya.
- Transparansi hero diverifikasi (RGBA, alfa 0–255), `git diff --check` bersih.

Pemeriksaan visual interaktif pada perangkat dan sesi produksi belum dilakukan. Server lokal berhasil start dengan hostname eksplisit, tetapi pengujian HTTP lintas sesi di lingkungan kerja tidak dapat terhubung; ini tidak dihitung sebagai verifikasi yang lulus. Tidak ada deployment produksi dalam perubahan ini.
