# Perizinan Santri — tahap 2

## Letak dan tampilan

- Pintu masuk hanya **Lainnya → Perizinan Santri**. Daftar delapan Menu Utama beranda tidak ditambah.
- Lainnya memakai tombol gambar bulat, empat kolom pada mobile dan delapan pada PC, dengan bagian Fitur tambahan dan Modul pondok.
- Fitur berikutnya didaftarkan melalui `apps/web/src/lib/fitur-tambahan.ts`, terpisah dari `DAFTAR_MODUL` beranda.
- Empat aset baru: `apps/web/public/images/fitur/{perizinan,informasi,notifikasi,akun}.webp`, 384 px, transparan. Tidak ada orang pada aset baru. Ikon modul lama dipertahankan.

## Alur

1. Wali memilih anak aktif yang saat ini tertaut, jenis pulang/keluar/berobat, alasan, tujuan, waktu keluar/kembali WIB, penjemput, hubungan, dan kontak.
2. Lampiran gambar opsional. Gambar diperkecil utuh maksimal sisi 1600 px dan 400 KiB WebP; sumber JPG/PNG/WebP maksimal 10 MiB. Tidak mendukung PDF pada tahap ini.
3. Admin Utama atau musyrif menyetujui, meminta perbaikan, atau menolak. Alasan wajib minimal lima karakter untuk penolakan, perbaikan, dan pembatalan.
4. Pengaju dapat mengubah pengajuan miliknya saat menunggu/perlu perbaikan. Setelah dikirim ulang, kembali menunggu pemeriksaan.
5. Persetujuan berbeda dari keberangkatan. Petugas mencatat keberangkatan dan kemudian kepulangan aktual menggunakan waktu server. Kehadiran tidak berubah otomatis.
6. Pembatalan oleh pengaju atau petugas hanya sebelum berangkat. Setelah berangkat, catat kepulangan.
7. Izin sedang berjalan yang melewati jadwal kembali ditandai terlambat, bukan dipindah ke status buatan. Muat ulang untuk memperbarui data dan indikator waktu.

Daftar menyediakan filter status, tanggal/bulan/tahun berdasarkan rencana keluar dalam WIB, pagination 20 pengajuan, serta ringkasan menurut periode. Riwayat menampilkan pelaku, status, catatan, dan waktu. Tidak ada data contoh izin yang menyerupai transaksi asli.

## Akses dan konsistensi

- Wali: baca izin anak yang saat ini tertaut; ajukan untuk anak aktif; ubah/batalkan pengajuan sendiri sesuai status.
- Admin/musyrif: baca dan memproses seluruh izin. Kedua pengajar ditolak oleh gerbang halaman dan RLS.
- Mutasi hanya RPC; tabel dan log tidak dapat ditulis langsung oleh authenticated. Fungsi definer berada pada private, search_path kosong, PUBLIC/anon dicabut.
- Kunci idempoten mencegah kirim ulang menjadi duplikat; retry dengan payload berbeda ditolak. Revisi wajib mencegah keputusan atas data lama.
- Baris santri dikunci saat mengajukan untuk menserialkan pemeriksaan jadwal bertabrakan. Izin yang masih di luar memblokir pengajuan baru hingga kepulangan dicatat.
- Lampiran dalam bucket privat `perizinan-lampiran`. Pemilik mengunggah ke folder UID sendiri; petugas/wali lain hanya membaca lampiran pengajuan yang berhak dilihat. Tautan bertanda tangan berumur lima menit; bisa dibuka ulang setelah kedaluwarsa.
- Lampiran yang sudah dirujuk tidak dapat dihapus klien. Upload ditahan pada retry setelah respons simpan tidak pasti. Berkas tidak terpakai dapat tersisa jika pengguna menutup formulir/unggahan berhasil tetapi pengajuan gagal; pembersihan berjadwal belum dibuat. File lama tidak dihapus otomatis untuk menjaga audit.
- Notifikasi terintegrasi dengan lonceng yang ada: pengajuan baru/ulang ke petugas, perubahan status ke wali tertaut dan petugas lain, pelaku dikecualikan. Bukan email/WhatsApp/push. Membaca detail menandai hanya revisi yang dimuat; tandai semua mencakup kedua sumber. Pengumuman lama tetap memiliki konfirmasi baca terpisah.

## Aktivasi

Database berhasil diaktifkan pada **6 November 2026**, setelah pengguna memberi instruksi eksplisit untuk mengaktifkan server. Migrasi hosted tercatat sebagai `20261106075006_perizinan_santri.sql`; nama berkas lokal telah dicocokkan dengan riwayat server. Tidak perlu menerapkan ulang migrasi yang sudah tercatat.

Uji transaksi rollback pada hosted lulus: pengajuan wali, batas anak tertaut, bentrok jadwal, revisi, persetujuan/perbaikan, hak musyrif, keluar/kembali, audit dan notifikasi. Fixture santri/tautan/lampiran metadata serta simulasi peran dibatalkan; tidak meninggalkan pengajuan palsu. Penghapusan objek Storage melalui SQL tidak dipakai pada hosted karena layanan melindunginya; pengujian API unggah berkas melalui akun browser tetap terpisah.

Perbaikan tampilan bersama terdapat pada `layanan.css` dan `KopLayanan.tsx`; publikasi frontend mengikuti build Cloudflare dari cabang main.

## Pengujian yang tersedia

- `npm run typecheck`, `npm run build:cf`.
- `node scripts/verifikasi-perizinan.cjs` dari apps/web: validasi kontak/waktu WIB/tanggal tidak valid, gerbang peran, pilihan tindakan, penempatan menu, dan rute notifikasi serta escaping teks.
- Script regresi UI/akses/pondok/dashboard/foto/notifikasi yang sudah ada.
- Harness PostgreSQL terisolasi (PGlite 0.5.15; tidak memanggil jaringan/database live):

```sh
npm install --prefix /tmp/santri-pg --no-save @electric-sql/pglite@0.5.15
PGLITE_MODULE=/tmp/santri-pg/node_modules/@electric-sql/pglite/dist/index.js node supabase/tests/perizinan-local.mjs
```

Harness membuat Auth/Storage/metadata informasi minimal dan fixture terpisah, mengompilasi migration, lalu menjalankan `supabase/tests/perizinan_rls.sql` dengan transaksi rollback. Menguji idempotensi, jadwal bertabrakan, anak asing, revisi null/usang, larangan menyetujui sendiri, hak admin/musyrif/pengajar/akun asing, tahap keluar/kembali, lampiran privat dan perlindungan hapus, keterlambatan, riwayat, serta notifikasi per revisi dan tandai semua. Ini bukan pengganti pengujian layanan Supabase Auth/Storage dan konkurensi nyata. Belum ada uji visual browser/perangkat langsung untuk tahap ini.

## Prompt aset

Empat generasi terpisah memakai `/images/menu/catatan.webp` sebagai referensi gaya: satu ikon 3D glossy biru/putih/kuning, bentuk rounded, pencahayaan studio lembut, objek di tengah cakram biru muda sekitar 78% kanvas persegi, area luar benar-benar transparan, terbaca pada 64 px; tanpa tulisan, logo, angka, orang, wajah, watermark, atau kolase.

Subjek perizinan: gerbang biru terbuka, dokumen izin putih dengan centang hijau dan jam kuning kecil. Informasi: megafon biru putih dengan aksen kuning dan lembar pengumuman. Notifikasi: lonceng kuning keemasan dengan titik biru. Akun: roda pengaturan biru dengan perisai putih dan kunci keemasan, tanpa siluet manusia. PNG asli dipertahankan dalam hasil generasi, aset aplikasi dikonversi ke WebP berkualitas 88 dengan alpha.
