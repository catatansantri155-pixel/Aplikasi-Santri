-- =====================================================================
-- 0006_daftar_wali.sql — Pendaftaran mandiri khusus WALI
--
-- Keputusan user 4 Nov 2026: wali MENDAFTAR SENDIRI (sign up di
-- halaman /daftar aplikasi); staf dibuatkan admin. Setelah sign up,
-- klien menyisipkan baris profiles MILIK SENDIRI dengan peran 'wali'
-- (langsung saat sesi ada, atau saat masuk pertama setelah konfirmasi
-- surel — lihat lib/sesi.ts cobaLengkapiProfilWaliTertunda).
--
-- 0003 hanya mengizinkan INSERT profiles oleh admin
-- (profiles_tambah_admin). File ini MENAMBAH satu kebijakan insert
-- yang sempit: pengguna terautentikasi boleh menyisipkan profil
-- dengan id = auth.uid() miliknya DAN peran tepat 'wali'. Kebijakan
-- permissive di Postgres bersifat OR, jadi hak admin tidak berubah
-- dan tidak ada jalan membuat profil berperan lain dari jalur ini.
--
-- PENJAGAAN PERAN pada UPDATE — SUDAH AMAN sejak 0003, tidak diubah:
-- kebijakan profiles_ubah memang mengizinkan pengguna mengubah baris
-- profilnya sendiri, TETAPI pemicu profiles_jaga_peran_trg (fungsi
-- public.profiles_jaga_peran di 0003_rls.sql) menolak setiap
-- perubahan kolom peran oleh non-admin. Jadi wali TIDAK bisa
-- menaikkan perannya sendiri; yang bisa ia ubah hanya kolom lain
-- (nama) pada barisnya sendiri.
--
-- CARA MENJALANKAN (manual, oleh pemilik — JANGAN otomatis):
-- Supabase Dashboard → proyek aplikasi-santri → SQL Editor → tempel
-- seluruh isi file ini → Run. Setelah itu alur /daftar aktif penuh.
-- =====================================================================

begin;

create policy profiles_tambah_wali_sendiri on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and peran = 'wali');
comment on policy profiles_tambah_wali_sendiri on public.profiles is
  'Pendaftaran mandiri wali (0006): pengguna hanya bisa menyisipkan profil milik sendiri dan hanya berperan wali.';

commit;
