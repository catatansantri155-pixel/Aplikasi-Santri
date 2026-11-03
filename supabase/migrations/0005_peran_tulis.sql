-- =====================================================================
-- 0005_peran_tulis.sql — Pengetatan hak TULIS per peran (defense in depth)
--
-- 0003 memberi hak isi ke semua staf (apakah_staff). File ini mengetatkan
-- policy INSERT modul inti agar sesuai pembagian tugas resmi:
--   * Setoran & ujian HIFZH      : admin + pengajar_hifzh
--   * Nilai DINIIYYAH (harian & ujian) : admin + pengajar_diniyyah
--   * KEHADIRAN per sesi         : admin (semua sesi),
--                                  pengajar_hifzh hanya sesi hifzh,
--                                  pengajar_diniyyah hanya sesi diniyyah
-- Yang TIDAK diubah (disengaja, sesuai rancangan):
--   * Catatan musyrif: semua staf boleh menulis (semua pengajar + musyrif
--     memang bertugas mencatat keseharian santri).
--   * Olahraga: staf (belum ada pembagian peran khusus dari pondok).
--   * Policy baca & ubah/hapus milik-sendiri/admin: tetap seperti 0003.
-- =====================================================================

begin;

-- ---------------- hifzh_setoran ----------------
drop policy if exists setoran_tambah_staff on public.hifzh_setoran;
create policy setoran_tambah_peran on public.hifzh_setoran
  for insert to authenticated
  with check (
    public.peran_saya() in ('admin', 'pengajar_hifzh')
    and penyimak_id = auth.uid()
  );

-- ---------------- hifzh_ujian ----------------
drop policy if exists ujian_hifzh_tambah_staff on public.hifzh_ujian;
create policy ujian_hifzh_tambah_peran on public.hifzh_ujian
  for insert to authenticated
  with check (
    public.peran_saya() in ('admin', 'pengajar_hifzh')
    and penguji_id = auth.uid()
  );

-- ---------------- diniyyah_nilai_harian ----------------
drop policy if exists nilai_harian_tambah_staff on public.diniyyah_nilai_harian;
create policy nilai_harian_tambah_peran on public.diniyyah_nilai_harian
  for insert to authenticated
  with check (
    public.peran_saya() in ('admin', 'pengajar_diniyyah')
    and pengisi_id = auth.uid()
  );

-- ---------------- diniyyah_ujian ----------------
drop policy if exists ujian_diniyyah_tambah_staff on public.diniyyah_ujian;
create policy ujian_diniyyah_tambah_peran on public.diniyyah_ujian
  for insert to authenticated
  with check (
    public.peran_saya() in ('admin', 'pengajar_diniyyah')
    and pengisi_id = auth.uid()
  );

-- ---------------- kehadiran (per jenis sesi) ----------------
drop policy if exists kehadiran_tambah_staff on public.kehadiran;
create policy kehadiran_tambah_peran on public.kehadiran
  for insert to authenticated
  with check (
    pengisi_id = auth.uid()
    and (
      public.apakah_admin()
      or (public.peran_saya() = 'pengajar_hifzh'     and sesi_jenis = 'hifzh')
      or (public.peran_saya() = 'pengajar_diniyyah' and sesi_jenis = 'diniyyah')
    )
  );

commit;
