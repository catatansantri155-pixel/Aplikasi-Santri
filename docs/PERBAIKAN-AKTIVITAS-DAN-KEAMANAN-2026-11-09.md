# Rincian aktivitas, loading dan kelanjutan audit — 9 November 2026

## Hasil tahap ini

**Keseluruhan belum PASS produksi penuh.** Perbaikan kode, dependensi dan matriks hak tulis database dapat diverifikasi; pengiriman email nyata, MFA admin, konfigurasi Auth dan pemulihan backup produksi belum terbukti.

### Penyebab galat rincian aktivitas

Respons `statistik_beranda` berisi lima angka dan objek `anak`. State beranda sebelumnya menyimpan respons tersebut utuh, sementara `RincianAktivitas` memeriksa seluruh `Object.values` sebagai angka. Objek `anak` membuat data valid dinyatakan gagal. Log API statistik di server berstatus 200; galat ini berasal dari validasi UI.

Perbaikan dilakukan pada dua lapis: state statistik hanya menyimpan lima angka yang dipakai grafik; grafik memeriksa lima kolom tersebut secara eksplisit. Regresi menguji respons dengan metadata anak untuk tampilan staf dan wali, serta tetap menolak NaN/data tidak valid.

### UI dan loading

- Rute detail informasi, keuangan dan perizinan mendapatkan skeleton tersendiri; fallback loading induk tetap meliputi seluruh rute lain.
- Loading akses awal, pemeriksaan tautan sandi, kompresi lampiran/banner/bukti bayar dan rincian aktivitas menggunakan indikator bersama. Skeleton dan putaran menghormati preferensi pengurangan gerak.
- Tautan kembali ke informasi pondok, kelola informasi dan retry detail/aktivitas memakai tombol tema yang konsisten. Tombol kembali/kelola mendapat ikon.

### Dependensi dan lint

- OpenNext Cloudflare 1.20.16, glob 14.0.4 dan minimatch 11.0.5. Glob/minimatch dipatok melalui overrides karena dependensi transitif alat build masih meminta versi lama. Perubahan mayor transitif diperiksa melalui build Cloudflare lengkap.
- Dependensi langsung dipatok ke versi aktual lockfile, termasuk Next 16.4.5, React 19.3.1 dan Supabase JS 2.118.0. `npm ci` memverifikasi instalasi dari lockfile.
- `next lint` yang sudah tidak didukung diganti ESLint 10.14.0 + TypeScript ESLint 8.72.1 dengan konfigurasi flat. Aturan correctness/recommended aktif; peringatan any/unused bersifat warning untuk kode warisan, bukan klaim lint ketat penuh.
- `npm audit`: 0 kerentanan termasuk dev/build, pada saat pengujian ini. Ini bukan jaminan tanpa kerentanan yang belum dipublikasikan.

### Pengamanan server dan lima peran

Policy INSERT/UPDATE/DELETE Hifzh dan Diniyyah diperketat secara RESTRICTIVE sesuai peran modul, tanpa menghilangkan pembatasan pemilik sebelumnya. Pengisian kehadiran juga dibatasi jenis sesi pengajar. Catatan/olahraga tetap dapat digunakan semua staf sesuai rancangan akses aplikasi.

Migrasi: `20261109022431_penguatan_peran_modul`.

`supabase/tests/matriks_lima_peran.sql` menguji admin, pengajar Hifzh, pengajar Diniyyah, musyrif dan wali pada hak tulis akademik di server asli, dalam transaksi ROLLBACK tanpa pengiriman email. Ini bukan pengganti E2E browser untuk kelima akun.

### Konfirmasi email lintas perangkat

Rute `/konfirmasi-email` dan API POST `/api/auth/konfirmasi` disiapkan untuk template TokenHash. Verifikasi baru dilakukan setelah pengguna menekan konfirmasi, sehingga membuka halaman saja tidak menghabiskan token oleh pemindai tautan email. TokenHash diverifikasi server, tujuan redirect ditetapkan server, origin/ukuran/tipe permintaan diperiksa, respons sukses no-store. Jalur pemulihan dapat dibuka sebelum pemasangan PWA. Callback PKCE lama tetap didukung dan kini menolak permintaan tanpa code.

Suite `verifikasi-email-server.cjs` menguji origin, format, target redirect, expiry/replay dengan layanan Auth mock. **Template hosted/SMTP belum diubah, email nyata belum dikirim atau diuji.**

### Pemulihan cadangan

Harness PostgreSQL lokal menguji dump fisik database berisi fixture sintetis, memulihkannya ke engine baru, lalu membandingkan checksum data dan menjalankan ulang RLS/matriks lima peran. Tidak memakai atau menimpa database produksi.

**Belum membuktikan backup produksi:** identitas/login Auth, file asli Storage, PITR, masa retensi backup dan pemulihan ke proyek terpisah masih memerlukan akses operasional. Metadata Storage dalam database bukan cadangan file gambar.

## Aktivasi operasional yang masih diperlukan

Akses konektor yang tersedia tidak menyediakan perubahan konfigurasi Auth/SMTP, unduhan backup/PITR, atau perangkat Android/iPhone fisik. Jangan mengubah internal schema Auth melalui SQL untuk menggantikan konfigurasi layanan.

1. Supabase → Authentication → pengaturan keamanan sandi: minimum 10 karakter, perlindungan sandi bocor aktif; periksa ketersediaan pada paket proyek. Verifikasi email-change/password-change security dan rate limits. Advisor saat pemeriksaan masih menyebut leaked-password protection disabled.
2. Aktifkan MFA pada akun pengelola Supabase/GitHub. Untuk MFA pengguna aplikasi, admin belum memiliki faktor terverifikasi; alur enrollment/challenge aplikasi harus disiapkan dan diuji sebelum diwajibkan agar admin tidak terkunci. Tahap ini belum mengklaim MFA aktif.
3. Authentication → URL Configuration: Site URL `https://aplikasi-santri.catatansantri155.workers.dev`; allowlist redirect produksi hanya tujuan yang digunakan (`/auth/callback` dan `/atur-sandi`), tanpa wildcard luas. Periksa domain email pengirim dan SMTP produksi.
4. Template Confirm signup: tautkan ke `{{ .SiteURL }}/konfirmasi-email?token_hash={{ .TokenHash }}&type=email`. Template Reset password: gunakan `type=recovery`. Teks email menjelaskan tindakan, masa berlaku dan agar tidak membagikan tautan/kode. Uji ke kotak masuk yang dikuasai pemilik, pada browser/perangkat berbeda, token kedaluwarsa dan token yang dipakai ulang. Jangan menempelkan token/sandi ke issue/log.
5. Buat akun uji aktif untuk kelima peran, dengan santri sintetis. Jalankan login/logout, refresh/expired session, batas anak wali, setoran/ujian, kehadiran/revisi, perizinan, bukti bayar/verifikasi, kesehatan/kalender, informasi/banner/foto dan penolakan URL/API tanpa izin.
6. Uji Chrome Android, Safari iOS dan browser PC: instal/buka PWA, keyboard/form, unggah foto, loading, koneksi terputus/retry, dark mode, teks besar dan pembaruan service worker. Emulasi ukuran layar tidak menggantikan perangkat fisik.
7. Pilih backup produksi yang diketahui waktunya. Pulihkan ke proyek/database uji terpisah (jangan overwrite produksi), dengan persetujuan biaya bila layanan menagih. Cocokkan jumlah/checksum tabel penting, FK, fungsi/RLS, login, gambar asli Storage dan transaksi sampel. Catat RPO/RTO serta bukti pemulihan dan jadwal retensi.

## Perintah verifikasi

Di `apps/web`: `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build:cf`, `npm audit`, `node scripts/verifikasi-dashboard.cjs`, `node scripts/verifikasi-email-server.cjs`, `node scripts/verifikasi-perbaikan-audit.cjs` dan suite fitur lain.

Di root repo: `PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node supabase/tests/perbaikan-audit-local.mjs` (PGlite 0.5.15). SQL matriks lima peran dijalankan operator berizin dan selalu ROLLBACK.
