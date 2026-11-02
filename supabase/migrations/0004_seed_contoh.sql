-- =====================================================================
-- 0004_seed_contoh.sql - DATA CONTOH (FIKSI) UNTUK LINGKUNGAN UJI
--
-- PERINGATAN: seluruh nama santri di file ini FIKTIF (memakai pola
-- "Fulan", nama samaran umum) - BUKAN data santri asli.
-- File ini HANYA untuk lingkungan pengembangan/uji.
-- JANGAN jalankan di proyek Supabase produksi.
--
-- Yang benar-benar diisi: kelas, semester contoh, jadwal sesi contoh,
-- dan santri contoh (tabel-tabel ini tidak bergantung pada akun login).
--
-- Yang SENGAJA DIKOMENTARI (tidak dijalankan): profiles, wali_santri,
-- dan semua data isian (kehadiran, setoran, ujian, nilai, catatan,
-- olahraga). Alasannya: profiles.id WAJIB menunjuk baris nyata di
-- auth.users (akun Supabase Auth) - tidak bisa dibuat dari SQL biasa.
-- Setelah akun uji dibuat lewat Supabase Auth (Tahap 3), salin id-nya
-- ke contoh berkomentar di bagian bawah file ini, lalu buka komentarnya
-- bila ingin data isian contoh ikut terisi.
--
-- Semua insert memakai id tetap + ON CONFLICT DO NOTHING agar file ini
-- aman dijalankan ulang (idempoten).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- KELAS: 1, 2, 3
-- ---------------------------------------------------------------------
insert into public.kelas (id, tingkat, nama) values
  ('a0000000-0000-4000-8000-000000000001', 1, 'Kelas 1'),
  ('a0000000-0000-4000-8000-000000000002', 2, 'Kelas 2'),
  ('a0000000-0000-4000-8000-000000000003', 3, 'Kelas 3')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- SEMESTER CONTOH: gasal 2026/2027.
-- Tanggal di bawah ini CONTOH SEMATA; tanggal resmi semester menunggu
-- konfirmasi user (lihat docs/TAHAPAN.md).
-- ---------------------------------------------------------------------
insert into public.semester (id, nama, jenis, tahun_ajaran, tanggal_mulai, tanggal_selesai) values
  ('b0000000-0000-4000-8000-000000000001', 'Semester Gasal 2026/2027 (CONTOH)', 'gasal', '2026/2027', '2026-07-13', '2026-12-18')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- JADWAL SESI CONTOH
-- hari: 1 = Senin, 2 = Selasa, 3 = Rabu, 4 = Kamis, 5 = Jumat,
--       6 = Sabtu, 7 = Ahad.
-- mapel diniyyah dikosongkan: daftar mapel resmi menunggu PDF jadwal
-- diniyyah dari user.
-- ---------------------------------------------------------------------
insert into public.jadwal_sesi (id, jenis, hari, jam_label, mapel) values
  ('c0000000-0000-4000-8000-000000000001', 'hifzh',    1, 'Ba''da Subuh', null),
  ('c0000000-0000-4000-8000-000000000002', 'diniyyah', 1, '10.30-11.30', null),
  ('c0000000-0000-4000-8000-000000000003', 'diniyyah', 1, 'Ba''da Zhuhur', null),
  ('c0000000-0000-4000-8000-000000000004', 'diniyyah', 1, 'Ba''da Ashr', null),
  ('c0000000-0000-4000-8000-000000000005', 'diniyyah', 1, 'Ba''da Maghrib', null),
  ('c0000000-0000-4000-8000-000000000006', 'olahraga', 7, 'Ahad Pagi', null),
  ('c0000000-0000-4000-8000-000000000007', 'olahraga', 4, 'Kamis Pagi', null)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- SANTRI CONTOH (FIKSI - pola nama samaran "Fulan")
-- 2 contoh per kelas. nis pun contoh.
-- ---------------------------------------------------------------------
insert into public.santri (id, nama, nama_ayah_wali, kelas_id, nis, status_aktif) values
  ('d0000000-0000-4000-8000-000000000001', 'Fulan Alif (Contoh)',    'Fulan Ayah Alif (Contoh)',    'a0000000-0000-4000-8000-000000000001', 'CONTOH-001', true),
  ('d0000000-0000-4000-8000-000000000002', 'Fulan Bima (Contoh)',    'Fulan Ayah Bima (Contoh)',    'a0000000-0000-4000-8000-000000000001', 'CONTOH-002', true),
  ('d0000000-0000-4000-8000-000000000003', 'Fulan Candra (Contoh)',  'Fulan Ayah Candra (Contoh)',  'a0000000-0000-4000-8000-000000000002', 'CONTOH-003', true),
  ('d0000000-0000-4000-8000-000000000004', 'Fulan Danu (Contoh)',    'Fulan Ayah Danu (Contoh)',    'a0000000-0000-4000-8000-000000000002', 'CONTOH-004', true),
  ('d0000000-0000-4000-8000-000000000005', 'Fulan Eko (Contoh)',     'Fulan Ayah Eko (Contoh)',     'a0000000-0000-4000-8000-000000000003', 'CONTOH-005', true),
  ('d0000000-0000-4000-8000-000000000006', 'Fulan Fajar (Contoh)',   'Fulan Ayah Fajar (Contoh)',   'a0000000-0000-4000-8000-000000000003', 'CONTOH-006', true)
on conflict do nothing;

-- =====================================================================
-- BAGIAN BERKOMENTAR - JANGAN DIBUKA sebelum ada akun Supabase Auth.
--
-- profiles.id harus sama dengan id akun di auth.users. Langkahnya:
--   1. Buat akun uji di Supabase Auth (dashboard / Admin API) - Tahap 3.
--   2. Ganti teks <UID_ADMIN>, <UID_HIFZH>, <UID_DINIYYAH>,
--      <UID_MUSYRIF>, <UID_WALI> di bawah dengan id akun aslinya.
--   3. Hapus tanda komentar "-- " di awal baris blok yang ingin dipakai.
-- =====================================================================

-- insert into public.profiles (id, peran, nama) values
--   ('<UID_ADMIN>',    'admin',            'Admin Contoh'),
--   ('<UID_HIFZH>',    'pengajar_hifzh',   'Ust. Penyimak Contoh'),
--   ('<UID_DINIYYAH>', 'pengajar_diniyyah','Ust. Diniyyah Contoh'),
--   ('<UID_MUSYRIF>',  'musyrif',          'Musyrif Contoh'),
--   ('<UID_WALI>',     'wali',             'Fulan Ayah Alif (Contoh)')
-- on conflict do nothing;

-- -- Tautan wali contoh -> santri contoh pertama (Kelas 1)
-- insert into public.wali_santri (profile_id, santri_id) values
--   ('<UID_WALI>', 'd0000000-0000-4000-8000-000000000001')
-- on conflict do nothing;

-- -- Kehadiran contoh (pengisi: penyimak hifzh)
-- insert into public.kehadiran (santri_id, tanggal, sesi_jenis, jadwal_id, status, pengisi_id) values
--   ('d0000000-0000-4000-8000-000000000001', '2026-07-13', 'hifzh', 'c0000000-0000-4000-8000-000000000001', 'hadir', '<UID_HIFZH>'),
--   ('d0000000-0000-4000-8000-000000000002', '2026-07-13', 'hifzh', 'c0000000-0000-4000-8000-000000000001', 'izin',  '<UID_HIFZH>')
-- on conflict do nothing;

-- -- Setoran hifzh contoh: BR tanpa kesalahan -> nilai otomatis 'L'
-- insert into public.hifzh_setoran
--   (santri_id, tanggal_masehi, tanggal_hijriah, jenis, halaman, surat, ayat_dari, ayat_sampai, rg, kk, kb, catatan_rincian, penyimak_id, tugas_berikutnya) values
--   ('d0000000-0000-4000-8000-000000000001', '2026-07-13', '28 Muharram 1448 H', 'BR', 12, 'Al-Maidah', 1, 8, 0, 0, 0, null, '<UID_HIFZH>', 'Al-Maidah ayat 9-16');

-- -- Ujian hifzh contoh: juz 1, KB konversi 1 -> hasil otomatis 'BS'
-- insert into public.hifzh_ujian (santri_id, semester_id, juz, halaman, rg, kk, kb, penguji_id) values
--   ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 1, 20, 3, 0, 0, '<UID_HIFZH>')
-- on conflict do nothing;

-- -- Nilai diniyyah contoh
-- insert into public.diniyyah_nilai_harian (santri_id, tanggal, mapel, nilai, pengisi_id) values
--   ('d0000000-0000-4000-8000-000000000001', '2026-07-13', 'Mapel Contoh', 85, '<UID_DINIYYAH>')
-- on conflict do nothing;
-- insert into public.diniyyah_ujian (santri_id, semester_id, mapel, nilai, pengisi_id) values
--   ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Mapel Contoh', 88, '<UID_DINIYYAH>')
-- on conflict do nothing;

-- -- Olahraga + kehadiran olahraga contoh (Ahad 2026-07-19)
-- insert into public.olahraga_sesi (id, tanggal, kegiatan, catatan, pengisi_id) values
--   ('e0000000-0000-4000-8000-000000000001', '2026-07-19', 'Sepak bola mini (Contoh)', null, '<UID_MUSYRIF>')
-- on conflict do nothing;
-- insert into public.olahraga_kehadiran (olahraga_sesi_id, santri_id, status) values
--   ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'hadir')
-- on conflict do nothing;

-- -- Catatan musyrif contoh (pelapor_nama terisi otomatis oleh pemicu)
-- insert into public.catatan_musyrif (santri_id, pelapor_id, pelapor_nama, kategori, isi, tanggal) values
--   ('d0000000-0000-4000-8000-000000000001', '<UID_MUSYRIF>', 'Musyrif Contoh', 'adab', 'Catatan contoh untuk uji tampilan.', '2026-07-13');

commit;
