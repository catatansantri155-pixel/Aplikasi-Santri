# Kalender, Kesehatan, dan pengelolaan konten pondok

## Perubahan pengguna

- Beranda menampilkan sedikitnya delapan tombol bundar berizin: admin 10; pengajar Hifzh, pengajar Diniyyah, musyrif, dan wali masing-masing 8. Modul lama dipertahankan. Kalender/Kesehatan ikut diprioritaskan sesuai akses, kemudian dilengkapi Informasi, Notifikasi, Akun, dan Lainnya. Perizinan/SPP tetap di Lainnya.
- Kalender `/kalender`: kisi bulanan, navigasi bulan/tahun, hari ini, pilih hari, daftar agenda, waktu WIB, kategori, lokasi, dan sasaran seluruh pondok/kelas. Admin membuat, menyunting, menghapus ke arsip, serta memulihkan agenda. Wali melihat agenda umum dan kelas anaknya; staf melihat agenda aktif semua kelas.
- Kesehatan `/kesehatan`: kondisi, tanggal, tindakan petugas, rujukan, status dipantau/dirujuk/pulih, dan jejak perubahan. Admin/musyrif mengisi atau memperbarui; hanya admin mengarsipkan/memulihkan. Wali membaca anak yang ditautkan kepadanya; pengajar tidak diberi akses. Ada pencarian, filter periode/status, dan paginasi 20 catatan.
- Banner tetap di bawah Menu Utama, tepat di atas Informasi Terbaru dari Pondok. Admin membuka ikon pensil di banner atau Kelola Banner di Lainnya: unggah/ganti gambar, judul aksesibilitas, urutan, tampil/sembunyi, hapus ke arsip, dan pulihkan. Pengguna biasa tetap melihat gambar dan indikator slide saja.
- Informasi mendapat tombol hapus, tab arsip, serta pulihkan sebagai draf. Pemulihan tidak langsung mengirim atau menayangkan pengumuman. Banner yang dipulihkan juga tersembunyi sampai admin menayangkannya.
- Tampilan menggunakan komponen formulir, tombol, kartu, warna, dan ikon 3D yang sama dengan layanan sebelumnya; daftar dua kolom di PC menjadi satu kolom di mobile.

## Batas dan keamanan

Migrasi server: `supabase/migrations/20261107014028_kalender_kesehatan_banner.sql`.

Empat tabel baru mengaktifkan RLS. Akun aplikasi hanya diberi SELECT pada tabel; mutasi melalui RPC yang memeriksa peran, nilai, dan revisi. Fungsi definer berada di schema private, search_path kosong, dan tidak dapat dieksekusi anonim. Riwayat kesehatan dibuat trigger, bukan masukan klien. Pengulangan simpan dengan kunci sama tidak membuat data ganda; perubahan dengan revisi lama ditolak.

Hapus menggunakan arsip agar kesalahan dapat dipulihkan. Informasi yang diarsipkan disembunyikan juga oleh helper sasaran/notifikasi yang sudah ada. Kalender yang terlalu padat (>500 agenda dalam bulan terpilih) menampilkan galat eksplisit, bukan memotong diam-diam. Maksimal 20 banner nonarsip dengan kunci transaksi untuk mencegah admin bersamaan melampaui batas; daftar kelola menggunakan halaman 20 item termasuk arsip.

Banner unggahan berada pada bucket privat `banner-pondok`, nama path milik admin, MIME WebP, maksimal 400 KiB. Sumber JPG/PNG/WebP maksimal 10 MiB dikompres di browser, sisi terpanjang maksimal 1600 px, tanpa pemotongan. Rasio yang dianjurkan 3:1 (contoh 1500 × 500). Signed URL berlaku satu jam; URL yang sudah diterbitkan dapat tetap berlaku sampai kedaluwarsa setelah banner disembunyikan. File lama/unggahan gagal disimpan tidak dibersihkan otomatis; tidak ada penghapusan objek Storage secara SQL. Tidak ada foto/berkas kesehatan.

## Aset

Tiga ikon WebP transparan 384 × 384 berada di `apps/web/public/images/fitur/`: kalender, kesehatan, lainnya. Dibuat dengan gaya 3D membulat biru-putih-emas, lingkaran biru muda, tanpa manusia, tulisan, atau watermark. Konsep: kalender meja dan jam; perlengkapan kesehatan; susunan tombol layanan tambahan. PNG sumber generasi dipertahankan terpisah; WebP menjadi aset produksi.

## Validasi

- TypeScript dan build OpenNext Cloudflare lulus; route kalender/kesehatan/banner masuk bundle produksi.
- Sembilan suite verifikasi UI, akses, pondok, dashboard, foto, notifikasi, perizinan, keuangan, dan kalender-kesehatan lulus. Suite baru memeriksa semua peran ≥8 tautan unik berizin, tanggal WIB/kabisat, akhir waktu agenda eksklusif, validasi, serta kontrol admin.
- `supabase/tests/pondok-local.mjs` memuat migrasi informasi/notifikasi/perizinan/SPP dan migrasi baru pada PostgreSQL lokal PGlite; `pondok_rls.sql` memeriksa admin, musyrif, pengajar, wali, dan anonim; idempotensi/revisi, arsip/pemulihan, audit, serta Storage RLS lulus.
- `supabase/tests/pondok-hosted.sql` dijalankan pada server di dalam transaksi rollback. Simpan/perbarui, idempotensi, revisi, validasi waktu, penyaringan wali, larangan mutasi langsung, arsip/pemulihan, metadata Storage RLS, dan peran musyrif lulus. Tidak ada sisa santri, agenda, atau banner uji; akun admin tetap admin. Ini bukan pengujian unggah byte melalui browser.
- Advisor keamanan sebelum/sesudah sama: tidak ada peringatan baru dari fitur ini. Peringatan lama (helper definer publik, search_path set_updated_at, dan leaked-password protection) bukan perubahan dalam pekerjaan ini.
- Belum melakukan pengujian browser terautentikasi menggunakan akun pengguna aktif; akun uji lama tidak tersedia lagi. Pengujian otorisasi dilakukan pada database dengan identitas transaksi yang dibatalkan.

Untuk menjalankan ulang verifikasi lokal SQL, sediakan `@electric-sql/pglite` dan jalankan `PGLITE_MODULE=/path/to/pglite/dist/index.js node supabase/tests/pondok-local.mjs`. SQL hosted hanya untuk operator database yang berwenang; jangan menghapus BEGIN/ROLLBACK.
