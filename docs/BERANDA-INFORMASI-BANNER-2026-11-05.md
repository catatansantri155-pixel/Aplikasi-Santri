# Beranda, informasi pondok, dan filter periode

## Tampilan dan navigasi

- Menu utama berupa lingkaran, empat kolom. Admin Utama memiliki delapan modul (4 + 4); peran lain tetap mengikuti akses masing-masing, tanpa menu terlarang.
- Tombol Lainnya di atas menu membuka `/lainnya`, pusat modul dan fitur tambahan. Tersedia akses informasi pondok serta akun/pengaturan.
- Banner ditampilkan langsung sebelum Menu Utama; pembungkus berjudul Informasi pondok yang sebelumnya dilipat dihapus.
- Tempat Ringkasan Hari Ini diganti menjadi Informasi Terbaru dari Pondok, dengan halaman `/informasi` untuk daftar lengkap dan pengelolaan.
- Rincian aktivitas ditempatkan setelah seluruh konten beranda, dalam panel paling bawah. Angka aktivitas tidak dihapus.

## Tujuh banner

Tujuh gambar terpisah dibuat melalui generator gambar bawaan, menggunakan ilustrasi 3D tanpa orang, warna emerald/teal/emas, serta teks di dalam gambar. Format produksi WebP, masing-masing 2172 × 724, berada di `apps/web/public/images/banner/motivasi-{1..7}.webp`. Tidak ada tanggal acara, pengumuman resmi, atau kutipan hadis rekaan.

| No | Judul | Teks pendamping |
| --- | --- | --- |
| 1 | Ilmu Tumbuh dengan Adab | Belajar dengan sungguh-sungguh, bersikap dengan santun. |
| 2 | Jaga Hafalan, Setiap Hari | Sedikit demi sedikit, terus diperbaiki. |
| 3 | Disiplin Hadir, Siap Belajar | Datang tepat waktu, siapkan hati dan pikiran. |
| 4 | Catatan Kecil, Perubahan Baik | Kenali kemajuan, perbaiki kebiasaan. |
| 5 | Sehat Badan, Semangat Belajar | Bergerak aktif, istirahat cukup, jaga kebersihan. |
| 6 | Bersama Mendampingi Santri | Pondok dan wali saling mendukung. |
| 7 | Langkah Baik Dimulai Hari Ini | Niatkan kebaikan, mulai dari yang sederhana. |

Prompt bersama: one wide 3:1 premium educational app banner; deep emerald/teal background; polished 3D clay/ceramic objects on the right, exact Indonesian headline and subtitle on the left; high contrast warm-white text; small MONITORING SANTRI eyebrow; no people, faces, hands, fabricated events, dates, watermark, or collage. Objek tiap banner: buku/pena/tanaman; Al-Qur’an/rehal/lampu; papan kehadiran/jam; buku catatan/pena; bola/botol/handuk; miniatur pondok/cincin terhubung; batu pijakan/tanaman/lengkung.

Slider berganti setiap 7 detik. Pergantian berhenti saat dijeda, diarahkan mouse, difokuskan keyboard, tab tidak terlihat, atau preferensi reduced motion aktif. Titik penanda dan navigasi manual tersedia. Gambar tidak dipotong; keterangan berukuran terbaca ditambahkan di mobile, dengan tinggi stabil.

## Informasi resmi dan database

`public.informasi_pondok` sudah dibuat melalui migrasi tambahan. Peran `admin` adalah Admin Utama dalam aplikasi; tidak diperkenalkan peran super admin baru.

- Admin Utama membuat, mengubah, menyimpan draf, menerbitkan, dan menarik kembali terbitan menjadi draf.
- Seluruh akun dengan profil dapat membaca informasi terbit. Draf hanya untuk admin. Pengunjung tanpa login tidak memperoleh akses tabel.
- Konten berupa teks biasa yang dirender React, tanpa HTML bebas.
- Pembatasan ditegakkan melalui RLS, bukan hanya tombol. Hak INSERT/UPDATE terbatas pada kolom isi; penulis/waktu tidak dapat dipalsukan lewat kolom tersebut. Tidak disediakan penghapusan permanen dari klien.
- Migrasi dibuat dengan CLI, kemudian nama file diselaraskan dengan versi yang dikembalikan riwayat migrasi hosted: `supabase/migrations/20261105090937_informasi_pondok.sql`.
- Daftar dipaginasi 20 informasi per halaman; pratinjau beranda tiga informasi terbit.

Uji SQL pada database terhubung berhasil: admin dapat menulis/mengubah/membaca draf; wali, musyrif, dan kedua pengajar hanya membaca terbitan serta ditolak saat menulis/mengubah; anon ditolak. Fixture dan pergantian peran sementara seluruhnya di-rollback; tidak ada baris uji tertinggal. Skrip tersedia di `supabase/tests/informasi_rls.sql` dan harus dijalankan sebagai pemilik database dalam satu transaksi.

Advisor keamanan tidak menandai tabel baru yang kehilangan RLS. Advisor masih melaporkan fungsi lama dengan [search_path yang dapat berubah](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) dan [fungsi SECURITY DEFINER yang dapat dieksekusi anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable). Fungsi lama tersebut tidak diperluas dalam perubahan ini.

## Filter dan validasi

Filter tanggal/bulan/tahun tersedia di Informasi Pondok, Riwayat Catatan, dan Sesi Olahraga. Filter informasi dan catatan diterapkan pada kueri sebelum batas hasil. Catatan menampilkan maksimal 100 hasil terbaru dalam periode terpilih, dinyatakan pada UI. Olahraga difilter dari daftar sesi termuat sebelum paginasi lokal. Filter santri/kategori yang sudah ada tetap dipertahankan. Batas bulan, tahun kabisat, dan tanggal tidak valid ditangani. Respons catatan lama tidak boleh menimpa pilihan periode terbaru.

Lulus: `npm run typecheck`, `node scripts/verifikasi-pondok.cjs`, `node scripts/verifikasi-ui.cjs`, `node scripts/verifikasi-akses.cjs`, dan `npm run build:cf`. Build pertama mengalami cache Turbopack rusak; setelah cache hasil build dibersihkan, build Next.js dan bundel OpenNext Cloudflare berhasil. Tidak ada perubahan versi dependensi.

Pemeriksaan visual interaktif pada perangkat belum dilakukan. Skema database siap; perubahan tampilan belum dideploy. Tidak ada pengumuman resmi atau data santri yang diterbitkan/diubah sebagai isi fitur ini.
