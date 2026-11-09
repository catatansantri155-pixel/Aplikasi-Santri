# Perbaikan audit dan akses awal — 9 November 2026

**Keputusan keseluruhan: BELUM PASS untuk peluncuran produksi.** Perbaikan teknis tahap ini diuji, tetapi bukti operasional berikut belum lengkap. Dokumen ini memperbarui audit 7 November, bukan sertifikasi keamanan menyeluruh.

## Perubahan yang diterapkan

- Gerbang pemasangan sebelum login dipadatkan menjadi komposisi dua kolom pada PC dan satu kolom ringkas pada ponsel. CTA Pasang sekarang tetap tersedia; petunjuk manual dipindahkan ke dialog. Tidak ada tombol melewati kewajiban membuka aplikasi terpasang. Ukuran layar ekstrem/zoom aksesibilitas tetap boleh menggulir agar isi tidak terpotong.
- Tombol pilih/simpan/hapus foto dan lihat gambar utuh memakai ikon, jarak, tinggi minimum 44px, bentuk dan status sibuk yang konsisten. Tombol pemilih berkas bawaan juga ditata.
- A01: ujian Hifzh memilih semester secara eksplisit; baca dibatasi semester, simpan mengirim semester_id, pembaruan memakai ID asli server dan tidak mengganti penguji pertama. Pilihan anak/semester terkunci selama penyimpanan.
- A02: pemicu kehadiran sekarang berjalan pada semua UPDATE. Identitas anak, sesi, tanggal, jadwal, pengisi, ID dan waktu pembuatan tidak dapat dipindah. Status tetap lewat revisi admin berlog; policy pemilik dibatasi peran pengajar sesuai sesi.
- A03: kegagalan baca Hifzh produksi menampilkan galat, tidak lagi menggantinya dengan data fiktif.
- A04, sebagian: profil wali dibuat/dilengkapi oleh server dari akun terverifikasi; metadata peran pengguna diabaikan dan localStorage bukan prasyarat. Akun staf yang dibuat admin memiliki penanda server tersendiri. Konfirmasi email lintas perangkat/PWA belum diuji.
- A05: statistik beranda menggunakan COUNT server dengan RLS, bukan potongan daftar terbaru. Daftar santri dan rekap mengambil halaman bertahap, termasuk ketika batas REST server lebih kecil daripada ukuran permintaan. Tanggal hari ini mengikuti WIB.
- A06: konfigurasi header CSP, anti-frame, nosniff, referrer, HSTS dan pembatasan permissions ditambahkan. CSP masih memakai unsafe-inline untuk bootstrap Next; bukan jaminan bebas XSS.
- A07, sebagian: validasi sandi baru/pendaftaran UI minimal 10 karakter. Ini tidak menggantikan kebijakan Auth server. Hak eksekusi helper lama untuk anonim dicabut dan search_path pemicu dikunci.

Migrasi server: `20261109014956_perbaikan_audit_produksi`.

## Bukti pengujian

- Build OpenNext/Cloudflare berhasil; TypeScript lulus.
- Sepuluh suite regresi UI/fitur: akses, dashboard, foto, kalender/kesehatan, keuangan, notifikasi, panduan/PWA, perizinan, informasi pondok dan UI. Snapshot yang menuntut logika daftar tetap identik dengan versi lama dibatasi pada alur login/pemulihan yang tidak berubah; perubahan profil diuji melalui regresi dan SQL.
- Suite tambahan `apps/web/scripts/verifikasi-perbaikan-audit.cjs`: 1.207 baris dengan batas server 73, semester eksplisit, ID server, kegagalan baca produksi, profil tanpa localStorage dan statistik server.
- `supabase/tests/perbaikan-audit-local.mjs`: seluruh migrasi asli (tanpa seed contoh) dijalankan pada PostgreSQL lokal PGlite lalu diuji.
- `supabase/tests/perbaikan_audit_rls.sql`: lulus pada server terhubung dalam transaksi ROLLBACK. Menguji mutasi identitas/status, log revisi, dua semester, 150 setoran dan 91 kehadiran anak, isolasi wali, provisioning idempoten, konfirmasi email dan metadata peran palsu. Tidak mengirim email; tidak menyimpan data uji. Pemeriksaan pascates: sisa santri fixture = 0.
- `npm audit --omit=dev`: 0 kerentanan. Audit seluruh dependensi masih 4 high dan 1 moderate pada alat build/dev; belum ditutup.
- Advisor keamanan server: peringatan search_path dan eksekusi anonim helper lama hilang; masih 5 helper SECURITY DEFINER yang sengaja dibutuhkan pengguna berizin/policy, serta leaked-password protection disabled.

## Belum selesai / syarat sebelum PASS keseluruhan

1. Konfirmasi email dan reset sandi dari email nyata, termasuk membuka pada browser/perangkat/PWA berbeda; periksa template Auth, redirect allowlist, SMTP produksi dan pembatasan pengiriman. Provisioning SQL lulus tidak membuktikan pengiriman email.
2. Aktifkan/verifikasi perlindungan sandi bocor dan kebijakan sandi server; verifikasi pengamanan/MFA akun admin. UI minimal 10 karakter bukan perlindungan server.
3. Selesaikan 4 high/1 moderate dependensi build/dev dengan pembaruan kompatibel dan build ulang. Script lint lama (`next lint`) masih harus diganti untuk Next 16.
4. Optimasi performance advisor/index/policy lanjutan sesuai A10 belum diaudit ulang seluruhnya.
5. Uji browser terautentikasi end-to-end untuk setiap peran (pengajar Hifzh, Diniyyah, musyrif, wali, admin), unggah foto/poster dan transaksi fitur menggunakan akun uji yang masih aktif. Tidak menyatakan PASS dari tes mock atau SQL saja.
6. Buktikan backup dan pemulihan database/Storage, pemantauan galat serta alur pemasangan pada Android/iOS nyata. Ini belum dapat dibuktikan dari kode dan rollback test.

Data produksi tidak dihapus. Perbaikan ini membatasi mutasi kehadiran yang sebelumnya tidak diaudit; koreksi identitas/tanggal yang salah memerlukan prosedur koreksi admin yang terkontrol, bukan UPDATE bebas.
