-- =====================================================================
-- 0003_rls.sql — Row Level Security untuk SEMUA tabel
--
-- Aturan keras aplikasi ini:
--   * Staf (admin, pengajar_hifzh, pengajar_diniyyah, musyrif) membaca
--     data SEMUA santri.
--   * Wali HANYA membaca santri yang tertaut di wali_santri beserta data
--     turunannya; wali tidak menulis apa pun (hanya-lihat).
--   * Isi data (kehadiran/setoran/ujian/nilai/catatan) hanya oleh staf,
--     dan kolom pengisi selalu = pengguna yang login (auth.uid()).
--   * Status kehadiran TIDAK bisa diubah langsung dari tabel: hanya
--     lewat prosedur revisi_kehadiran() oleh admin, yang selalu
--     menulis kehadiran_log_revisi.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- FUNGSI BANTU (security definer agar tidak memicu RLS berulang pada
-- tabel profiles saat dipakai di dalam policy)
-- ---------------------------------------------------------------------
create or replace function public.peran_saya()
returns public.peran
language sql
stable
security definer
set search_path = ''
as $$
  select p.peran from public.profiles p where p.id = auth.uid();
$$;
comment on function public.peran_saya() is
  'Peran pengguna yang sedang login, dibaca dari profiles berdasarkan auth.uid().';

create or replace function public.apakah_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.peran_saya() = 'admin', false);
$$;

create or replace function public.apakah_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.peran_saya() in ('admin', 'pengajar_hifzh', 'pengajar_diniyyah', 'musyrif'),
    false
  );
$$;
comment on function public.apakah_staff() is
  'true bila pengguna login adalah admin/pengajar/musyrif (bukan wali).';

-- Apakah pengguna login boleh melihat santri tertentu?
-- Staf: semua santri. Wali: hanya yang tertaut di wali_santri.
create or replace function public.boleh_lihat_santri(p_santri_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.apakah_staff()
      or exists (
        select 1 from public.wali_santri ws
        where ws.profile_id = auth.uid() and ws.santri_id = p_santri_id
      );
$$;
comment on function public.boleh_lihat_santri(uuid) is
  'Gerbang baca per santri: staf selalu true; wali true hanya untuk anaknya yang tertaut di wali_santri.';

-- ---------------------------------------------------------------------
-- AKTIFKAN RLS DI SEMUA TABEL (15 tabel — tanpa kecuali)
-- ---------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.kelas                 enable row level security;
alter table public.santri                enable row level security;
alter table public.wali_santri           enable row level security;
alter table public.semester              enable row level security;
alter table public.jadwal_sesi           enable row level security;
alter table public.kehadiran             enable row level security;
alter table public.kehadiran_log_revisi  enable row level security;
alter table public.hifzh_setoran         enable row level security;
alter table public.hifzh_ujian           enable row level security;
alter table public.diniyyah_nilai_harian enable row level security;
alter table public.diniyyah_ujian        enable row level security;
alter table public.olahraga_sesi         enable row level security;
alter table public.olahraga_kehadiran    enable row level security;
alter table public.catatan_musyrif       enable row level security;

-- ---------------------------------------------------------------------
-- HAK AKSES TABEL untuk peran login (RLS tetap yang membatasi baris).
-- anon dicabut total: aplikasi ini wajib login untuk semua data.
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.rekap_kehadiran_pekanan,
                public.rekap_kehadiran_semester,
                public.grafik_hifzh_mingguan,
                public.grafik_hifzh_bulanan to authenticated;
grant execute on function public.peran_saya(),
                 public.apakah_admin(),
                 public.apakah_staff(),
                 public.boleh_lihat_santri(uuid),
                 public.kb_konversi(integer, integer, integer),
                 public.nilai_setoran(public.jenis_setoran, integer, integer, integer),
                 public.hasil_ujian(integer, integer, integer) to authenticated;

-- =====================================================================
-- POLICY PER TABEL
-- =====================================================================

-- ---------------- profiles ----------------
-- Baca: profil sendiri, atau staf membaca semua.
create policy profiles_baca on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.apakah_staff());
-- Buat akun: hanya admin (akun juga harus dibuat di Supabase Auth dulu).
create policy profiles_tambah_admin on public.profiles
  for insert to authenticated
  with check (public.apakah_admin());
-- Ubah: profil sendiri atau admin. Perubahan kolom peran dijaga pemicu
-- profiles_jaga_peran di bawah (hanya admin yang boleh mengganti peran).
create policy profiles_ubah on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.apakah_admin())
  with check (id = auth.uid() or public.apakah_admin());
create policy profiles_hapus_admin on public.profiles
  for delete to authenticated
  using (public.apakah_admin());

-- Penjaga kolom peran: tanpa ini, pengguna bisa menaikkan perannya
-- sendiri lewat policy ubah profil sendiri.
create or replace function public.profiles_jaga_peran()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.peran is distinct from old.peran and not public.apakah_admin() then
    raise exception 'Hanya admin yang boleh mengubah peran pengguna.';
  end if;
  return new;
end;
$$;
create trigger profiles_jaga_peran_trg
  before update of peran on public.profiles
  for each row execute function public.profiles_jaga_peran();

-- ---------------- kelas ----------------
create policy kelas_baca on public.kelas
  for select to authenticated
  using (auth.uid() is not null);
create policy kelas_tulis_admin on public.kelas
  for all to authenticated
  using (public.apakah_admin())
  with check (public.apakah_admin());

-- ---------------- semester ----------------
create policy semester_baca on public.semester
  for select to authenticated
  using (auth.uid() is not null);
create policy semester_tulis_admin on public.semester
  for all to authenticated
  using (public.apakah_admin())
  with check (public.apakah_admin());

-- ---------------- jadwal_sesi ----------------
create policy jadwal_baca on public.jadwal_sesi
  for select to authenticated
  using (auth.uid() is not null);
create policy jadwal_tulis_admin on public.jadwal_sesi
  for all to authenticated
  using (public.apakah_admin())
  with check (public.apakah_admin());

-- ---------------- santri ----------------
-- Baca: staf semua; wali hanya baris dirinya tertaut.
create policy santri_baca on public.santri
  for select to authenticated
  using (public.boleh_lihat_santri(id));
-- Kelola data santri: hanya admin (sesuai rancangan: ADMIN yang
-- mengelola santri/kelas/pengguna).
create policy santri_tulis_admin on public.santri
  for all to authenticated
  using (public.apakah_admin())
  with check (public.apakah_admin());

-- ---------------- wali_santri ----------------
create policy wali_santri_baca on public.wali_santri
  for select to authenticated
  using (public.apakah_staff() or profile_id = auth.uid());
create policy wali_santri_tulis_admin on public.wali_santri
  for all to authenticated
  using (public.apakah_admin())
  with check (public.apakah_admin());

-- ---------------- kehadiran ----------------
create policy kehadiran_baca on public.kehadiran
  for select to authenticated
  using (public.boleh_lihat_santri(santri_id));
-- Isi: hanya staf, dan pengisi harus dirinya sendiri.
create policy kehadiran_tambah_staff on public.kehadiran
  for insert to authenticated
  with check (public.apakah_staff() and pengisi_id = auth.uid());
-- Ubah baris (jadwal/catatan sesi) oleh pengisi atau admin.
-- Perubahan kolom STATUS ditolak pemicu kehadiran_jaga_status di bawah
-- kecuali lewat prosedur revisi_kehadiran().
create policy kehadiran_ubah on public.kehadiran
  for update to authenticated
  using (public.apakah_admin() or pengisi_id = auth.uid())
  with check (public.apakah_admin() or pengisi_id = auth.uid());
create policy kehadiran_hapus_admin on public.kehadiran
  for delete to authenticated
  using (public.apakah_admin());

-- Penjaga status kehadiran: status hanya berubah bila bendera sesi
-- 'app.sedang_revisi' menyala — bendera itu hanya dinyalakan di dalam
-- prosedur revisi_kehadiran() (security definer, khusus admin).
create or replace function public.kehadiran_jaga_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('app.sedang_revisi', true), '') <> 'on' then
    raise exception 'Status kehadiran hanya boleh direvisi admin lewat prosedur revisi_kehadiran().';
  end if;
  return new;
end;
$$;
create trigger kehadiran_jaga_status_trg
  before update of status on public.kehadiran
  for each row execute function public.kehadiran_jaga_status();

-- ---------------- kehadiran_log_revisi ----------------
-- Baca: staf, atau wali dari santri pada baris kehadiran terkait.
create policy log_revisi_baca on public.kehadiran_log_revisi
  for select to authenticated
  using (
    public.apakah_staff()
    or exists (
      select 1 from public.kehadiran k
      where k.id = kehadiran_log_revisi.kehadiran_id
        and public.boleh_lihat_santri(k.santri_id)
    )
  );
-- TIDAK ADA policy insert/update/delete: log hanya bisa ditulis oleh
-- prosedur revisi_kehadiran() (security definer) — tidak dapat dipalsu
-- atau dihapus dari klien.

-- ---------------------------------------------------------------------
-- PROSEDUR REVISI KEHADIRAN — satu-satunya jalan mengubah status.
-- Khusus admin; alasan wajib; selalu menulis log; mengembalikan log.
-- ---------------------------------------------------------------------
create or replace function public.revisi_kehadiran(
  p_kehadiran_id uuid,
  p_status_baru public.status_kehadiran,
  p_alasan text
)
returns public.kehadiran_log_revisi
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lama public.status_kehadiran;
  v_log public.kehadiran_log_revisi;
begin
  if not public.apakah_admin() then
    raise exception 'Revisi kehadiran hanya boleh dilakukan ADMIN utama.';
  end if;
  if p_alasan is null or char_length(trim(p_alasan)) = 0 then
    raise exception 'Alasan revisi wajib diisi.';
  end if;

  select k.status into v_lama
  from public.kehadiran k
  where k.id = p_kehadiran_id
  for update;
  if not found then
    raise exception 'Baris kehadiran % tidak ditemukan.', p_kehadiran_id;
  end if;
  if v_lama = p_status_baru then
    raise exception 'Status baru sama dengan status lama (%); tidak ada yang direvisi.', v_lama;
  end if;

  -- Nyalakan bendera agar pemicu penjaga status mengizinkan perubahan
  -- ini saja, hanya di dalam transaksi prosedur ini.
  perform set_config('app.sedang_revisi', 'on', true);

  update public.kehadiran
     set status = p_status_baru
   where id = p_kehadiran_id;

  insert into public.kehadiran_log_revisi
    (kehadiran_id, diubah_oleh, status_lama, status_baru, alasan)
  values
    (p_kehadiran_id, auth.uid(), v_lama, p_status_baru, trim(p_alasan))
  returning * into v_log;

  return v_log;
end;
$$;
comment on function public.revisi_kehadiran(uuid, public.status_kehadiran, text) is
  'Revisi status kehadiran oleh ADMIN utama. Menulis kehadiran_log_revisi dan mengembalikan baris log-nya.';
grant execute on function public.revisi_kehadiran(uuid, public.status_kehadiran, text)
  to authenticated;

-- ---------------- hifzh_setoran ----------------
create policy setoran_baca on public.hifzh_setoran
  for select to authenticated
  using (public.boleh_lihat_santri(santri_id));
create policy setoran_tambah_staff on public.hifzh_setoran
  for insert to authenticated
  with check (public.apakah_staff() and penyimak_id = auth.uid());
create policy setoran_ubah on public.hifzh_setoran
  for update to authenticated
  using (public.apakah_admin() or penyimak_id = auth.uid())
  with check (public.apakah_admin() or penyimak_id = auth.uid());
create policy setoran_hapus on public.hifzh_setoran
  for delete to authenticated
  using (public.apakah_admin() or penyimak_id = auth.uid());

-- ---------------- hifzh_ujian ----------------
create policy ujian_hifzh_baca on public.hifzh_ujian
  for select to authenticated
  using (public.boleh_lihat_santri(santri_id));
create policy ujian_hifzh_tambah_staff on public.hifzh_ujian
  for insert to authenticated
  with check (public.apakah_staff() and penguji_id = auth.uid());
create policy ujian_hifzh_ubah on public.hifzh_ujian
  for update to authenticated
  using (public.apakah_admin() or penguji_id = auth.uid())
  with check (public.apakah_admin() or penguji_id = auth.uid());
create policy ujian_hifzh_hapus on public.hifzh_ujian
  for delete to authenticated
  using (public.apakah_admin() or penguji_id = auth.uid());

-- ---------------- diniyyah_nilai_harian ----------------
create policy nilai_harian_baca on public.diniyyah_nilai_harian
  for select to authenticated
  using (public.boleh_lihat_santri(santri_id));
create policy nilai_harian_tambah_staff on public.diniyyah_nilai_harian
  for insert to authenticated
  with check (public.apakah_staff() and pengisi_id = auth.uid());
create policy nilai_harian_ubah on public.diniyyah_nilai_harian
  for update to authenticated
  using (public.apakah_admin() or pengisi_id = auth.uid())
  with check (public.apakah_admin() or pengisi_id = auth.uid());
create policy nilai_harian_hapus on public.diniyyah_nilai_harian
  for delete to authenticated
  using (public.apakah_admin() or pengisi_id = auth.uid());

-- ---------------- diniyyah_ujian ----------------
create policy ujian_diniyyah_baca on public.diniyyah_ujian
  for select to authenticated
  using (public.boleh_lihat_santri(santri_id));
create policy ujian_diniyyah_tambah_staff on public.diniyyah_ujian
  for insert to authenticated
  with check (public.apakah_staff() and pengisi_id = auth.uid());
create policy ujian_diniyyah_ubah on public.diniyyah_ujian
  for update to authenticated
  using (public.apakah_admin() or pengisi_id = auth.uid())
  with check (public.apakah_admin() or pengisi_id = auth.uid());
create policy ujian_diniyyah_hapus on public.diniyyah_ujian
  for delete to authenticated
  using (public.apakah_admin() or pengisi_id = auth.uid());

-- ---------------- olahraga_sesi ----------------
create policy olahraga_baca on public.olahraga_sesi
  for select to authenticated
  using (auth.uid() is not null);
create policy olahraga_tambah_staff on public.olahraga_sesi
  for insert to authenticated
  with check (public.apakah_staff() and pengisi_id = auth.uid());
create policy olahraga_ubah on public.olahraga_sesi
  for update to authenticated
  using (public.apakah_admin() or pengisi_id = auth.uid())
  with check (public.apakah_admin() or pengisi_id = auth.uid());
create policy olahraga_hapus_admin on public.olahraga_sesi
  for delete to authenticated
  using (public.apakah_admin());

-- ---------------- olahraga_kehadiran ----------------
create policy olahraga_hadir_baca on public.olahraga_kehadiran
  for select to authenticated
  using (public.boleh_lihat_santri(santri_id));
create policy olahraga_hadir_tulis_staff on public.olahraga_kehadiran
  for all to authenticated
  using (public.apakah_staff())
  with check (public.apakah_staff());

-- ---------------- catatan_musyrif ----------------
create policy catatan_baca on public.catatan_musyrif
  for select to authenticated
  using (public.boleh_lihat_santri(santri_id));
-- Isi: hanya staf, pelapor harus dirinya sendiri (nama pelapor diisi
-- otomatis oleh pemicu di bawah dari akun login — tidak bisa dipalsu).
create policy catatan_tambah_staff on public.catatan_musyrif
  for insert to authenticated
  with check (public.apakah_staff() and pelapor_id = auth.uid());
create policy catatan_ubah on public.catatan_musyrif
  for update to authenticated
  using (public.apakah_admin() or pelapor_id = auth.uid())
  with check (public.apakah_admin() or pelapor_id = auth.uid());
create policy catatan_hapus on public.catatan_musyrif
  for delete to authenticated
  using (public.apakah_admin() or pelapor_id = auth.uid());

-- Pengisi otomatis nama pelapor dari profiles akun login, sebelum
-- baris catatan disimpan (insert maupun bila pelapor diganti admin).
create or replace function public.catatan_isi_pelapor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nama text;
begin
  select p.nama into v_nama from public.profiles p where p.id = new.pelapor_id;
  if v_nama is null then
    raise exception 'Pelapor % tidak memiliki profil.', new.pelapor_id;
  end if;
  new.pelapor_nama = v_nama;
  return new;
end;
$$;
create trigger catatan_isi_pelapor_trg
  before insert or update of pelapor_id on public.catatan_musyrif
  for each row execute function public.catatan_isi_pelapor();

commit;
