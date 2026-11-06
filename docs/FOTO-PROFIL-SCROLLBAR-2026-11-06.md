# Scrollbar dan foto profil pribadi

Scrollbar WebKit/Chromium/Safari memakai lebar 6 px, track/corner transparan, thumb membulat yang menyesuaikan tema terang/gelap, dan tidak menampilkan tombol panah bawaan. Firefox memakai scrollbar-width thin dan warna transparan bertema. Warna thumb lebih jelas saat hover. Perilaku scroll dan navigasi keyboard dipertahankan. `profil-scroll.css` diimpor setelah stylesheet lain. Tampilan scrollbar dapat mengikuti pembatasan sistem/peramban pengguna.

Halaman Akun memiliki bagian Foto profil: pilih JPG/PNG/WebP maksimal 10 MB, pratinjau, informasi ukuran, Simpan foto, Batal, serta Hapus foto jika ada foto tersimpan. Pengolahan terjadi di browser sebelum upload: crop tengah persegi, sisi maksimal 384 px (gambar kecil tidak diperbesar), konversi WebP, kualitas 0.82 sampai 0.4 hingga ukuran <=100 KiB. Bila tidak dapat mencapai batas, foto ditolak. Bitmap dan URL pratinjau dibersihkan. Canvas menulis piksel hasil baru, tanpa mengirim file asli atau metadata EXIF asal.

## Penyimpanan dan akses

Tidak menambah tabel atau kolom foto/base64 pada database aplikasi. File ada di bucket private Supabase Storage `foto-profil`; metadata objek Storage tetap dibutuhkan oleh layanan. Hanya satu jalur yang diizinkan per akun: `{auth.uid()}/avatar.webp`. Upload memakai upsert agar foto baru menggantikan file lama; tidak membuat riwayat file yang terus menumpuk. Maksimum berkas server 102400 byte, hanya MIME image/webp. Kartu profil Akun dan identitas sidebar memakai AvatarProfil, dengan inisial jika belum ada foto atau foto gagal dimuat. Avatar santri di daftar tetap memakai inisial.

Migration `supabase/migrations/20261106030615_foto_profil_pribadi.sql` sudah diterapkan ke proyek aplikasi. SELECT/INSERT/UPDATE/DELETE dibatasi pemilik yang memiliki profil aplikasi; UPDATE menggunakan USING dan WITH CHECK. Admin juga tidak mendapat akses foto akun lain. Tidak ada service role di browser atau perubahan peran pengguna.

Signed URL hanya dibuat setelah RLS, berlaku satu jam dan diperbarui avatar setiap 45 menit. `cacheControl:0` dan `cacheNonce` mencegah foto pengganti memakai cache lama. URL bertanda tangan dapat dibagikan oleh pemilik dan diakses penerima selama masih berlaku, sehingga URL tidak disimpan di localStorage/database. Pergantian/hapus foto mengirim event internal untuk memperbarui avatar yang sedang tampil.

Dokumentasi: [Private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Cache invalidation dan cacheNonce](https://supabase.com/docs/guides/storage/cdn/smart-cdn).

## Validasi

- `npm run typecheck`, `npm run build:cf`.
- `node scripts/verifikasi-foto.cjs`: tipe/batas sumber, crop dan ukuran tanpa upscale, jalur tetap, avatar fallback dan kontrol editor; kontrak pipeline kompresi diuji dengan mock bitmap/canvas untuk memastikan output terlalu besar diulang, koordinat target benar, batas 100 KiB, dan bitmap ditutup. Ini bukan pengukuran kualitas codec WebP asli di browser.
- Regresi verifikasi-ui, verifikasi-akses, verifikasi-pondok, verifikasi-dashboard lulus.
- `supabase/tests/foto_profil_rls.sql`: metadata fixture dalam transaksi; pemilik INSERT/SELECT/UPDATE, upload dan pemindahan lintas akun ditolak, nama file kedua ditolak, akun admin tidak dapat SELECT/UPDATE foto pemilik lain, anon tidak dapat SELECT; rollback seluruh fixture. Pembatas MIME/ukuran bucket diperiksa dari konfigurasi. DELETE policy ditinjau; unggah/hapus berkas lewat Storage API browser belum diuji.
- Advisor tidak melaporkan temuan terkait bucket/policy baru. Peringatan fungsi/auth lama tetap di luar cakupan: [database linter](https://supabase.com/docs/guides/database/database-linter), [password Auth](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Frontend memerlukan merge dan deploy Workers. Pemeriksaan visual scrollbar pada Windows/Firefox serta unggah foto nyata di browser perlu dilakukan sesudah deploy; lingkungan browser pratinjau sebelumnya tidak dapat mengakses server lokal. Tidak ada foto pengguna nyata yang diunggah selama pengujian ini.
