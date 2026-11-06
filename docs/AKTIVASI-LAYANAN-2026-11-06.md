# Perbaikan UI dan aktivasi layanan — 6 November 2026

## Masalah dan hasil

Screenshot pengguna memperlihatkan tombol/input dengan gaya bawaan browser, filter tidak seragam, judul besar dan ruang kosong berlebihan. Penyebabnya: beberapa tombol hanya menggunakan kelas varian tanpa kelas dasar `tombol`, sedangkan input baru berada di luar selector formulir lama.

Perbaikan:

- `KopLayanan` menyatukan tombol kembali, ilustrasi, judul dan aksi utama. Judul lebih ringkas; aksi sejajar di PC dan penuh pada mobile.
- Tombol utama/sekunder kini menyertakan kelas dasar. `layanan.css` menata seluruh kontrol dalam Perizinan/SPP, termasuk tombol tanpa varian, file input, tanggal, select, textarea, fokus keyboard, serta keadaan disabled.
- Tinggi kontrol dan target sentuh minimal 44 px; input 16 px agar tidak memicu zoom otomatis mobile. Hanya berlaku di kedua modul, tidak mengubah formulir lama.
- Filter mobile dua kolom untuk status/periode, pencarian selebar panel. Pada PC tersusun horizontal. Tombol muat ulang menjadi ikon dengan label aksesibel pada toolbar.
- Ringkasan izin lebih padat, SPP tetap dua kolom pada mobile agar nominal terbaca. Mode gelap mengikuti token tema. Tidak mengubah aturan akses atau menambah fitur ke Menu Utama.

## Aktivasi database

Pengguna mengizinkan aktivasi server secara eksplisit pada permintaan perbaikan ini. Dua migration fitur dan satu kebijakan penolakan batch berhasil diterapkan ke proyek Supabase yang dipakai aplikasi:

| Versi hosted | Migration |
| --- | --- |
| 20261106075006 | perizinan_santri |
| 20261106075024 | keuangan_santri_spp |
| 20261106075907 | spp_batch_tolak_akses_langsung |

Berkas lokal diubah namanya agar sama dengan versi hosted, tanpa mengubah SQL fitur. Kebijakan private batch menolak akses klien langsung secara eksplisit; RPC tetap bekerja dengan hak pemilik dan pemeriksaan admin.

## Verifikasi

Build Cloudflare dan pemeriksaan TypeScript lulus. Delapan suite regresi aplikasi, uji komponen header/label/escaping, serta harness database lokal diperiksa. Uji hosted disimpan di `supabase/tests/{perizinan,keuangan}_hosted.sql` dan dijalankan dalam transaksi rollback.

Hosted memverifikasi pengajuan izin anak tertaut, penolakan anak asing, bentrok jadwal, versi null/usang, perbaikan/persetujuan, musyrif, pencatatan keluar dan kembali, serta notifikasi per revisi. SPP memverifikasi batch, SPP duplikat, bukti wajib, cicilan, saldo sebelum/sesudah verifikasi, pembayaran tunai, penarikan, koreksi, pelunasan, pembatalan/penerbitan ulang, view invoker, penolakan anon/musyrif dan notifikasi gabungan. Sesudah rollback: tidak ada fixture, tagihan atau pengajuan uji yang tersisa; admin tetap berperan admin.

Dua batas pengujian hosted ditangani secara eksplisit: Supabase melarang DELETE langsung pada metadata Storage, sehingga operasi tersebut hanya diuji dalam harness lokal; perubahan peran fixture dilakukan sebagai admin dan dibatalkan, mengikuti trigger penjaga peran asli. Tidak melemahkan trigger/policy untuk menjalankan pengujian.

Browser pemeriksaan berada pada sesi keluar/login; tidak memiliki kredensial akun admin/wali yang masih berlaku. Jadi pengujian UI privat melalui login, unggah byte gambar via Storage API, dan penggunaan perangkat mobile fisik belum diklaim selesai. Pengujian hosted di atas memakai role authenticated dan UID akun di dalam transaksi, tanpa membuat sesi/token baru.

## Catatan advisori

Advisori dibandingkan sebelum/sesudah aktivasi. Fungsi definer baru berada di private, seluruh tabel fitur memakai RLS, dan view memakai security_invoker. Temuan INFO tabel batch tanpa policy ditangani dengan kebijakan penolakan eksplisit. Peringatan lama tetap ada di luar perubahan ini: search_path `public.set_updated_at`, tujuh fungsi definer lama di public, dan perlindungan sandi bocor belum aktif. Rujukan perbaikan:

- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Publikasi frontend menggunakan integrasi GitHub → Workers Builds aplikasi yang sudah ada. Tidak memakai akun preview sementara atau mengganti konfigurasi Worker.
