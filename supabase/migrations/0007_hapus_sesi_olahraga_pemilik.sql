-- =====================================================================
-- 0007 — Hapus sesi olahraga oleh pemiliknya
--
-- LATAR: fitur "Hapus sesi" di halaman Olahraga (perintah user
-- 4 Nov 2026) memberi aksi hapus kepada Admin Utama DAN staf pemilik
-- sesi (pengisi_id = akun yang login), sejalan dengan policy UPDATE
-- yang sudah ada (olahraga_ubah: admin atau pemilik). Namun policy
-- DELETE dari 0003_rls.sql (olahraga_hapus_admin) hanya mengizinkan
-- admin, sehingga staf pemilik sesi akan ditolak RLS saat menghapus
-- sesinya sendiri.
--
-- Migrasi ini mengganti policy DELETE tersebut: admin ATAU pemilik
-- sesi boleh menghapus. Menghapus sesi ikut menghapus baris
-- kehadirannya (olahraga_kehadiran.olahraga_sesi_id ON DELETE
-- CASCADE di 0001_schema.sql) — perilaku itu disengaja dan disebut
-- di dialog konfirmasi aplikasi.
--
-- CATATAN: berkas ini DISIAPKAN saja dan belum dijalankan ke
-- database produksi; dijalankan terpisah dengan persetujuan user.
-- Tanpa migrasi ini, semua fitur ubah/hapus lain tetap berjalan;
-- hanya hapus sesi olahraga oleh staf non-admin yang tertahan.
-- =====================================================================

drop policy if exists olahraga_hapus_admin on public.olahraga_sesi;

create policy olahraga_hapus on public.olahraga_sesi
  for delete to authenticated
  using (public.apakah_admin() or pengisi_id = auth.uid());
