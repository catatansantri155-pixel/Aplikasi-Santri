-- =====================================================================
-- 0001_schema.sql — Skema dasar Aplikasi Monitoring Santri
-- Ponpes Minhajus Sunnah Magelang · Marhalah Wustha
--
-- Isi: enum + 15 tabel (14 tabel rancangan + olahraga_kehadiran).
-- Prasyarat: proyek Supabase (skema auth bawaan Supabase harus ada,
-- karena profiles.id menunjuk auth.users).
-- RLS BELUM diaktifkan di file ini; diaktifkan serentak di 0003_rls.sql
-- (sesuai urutan migrasi 0001 -> 0004 di docs/ARSITEKTUR.md).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- ENUM
-- ---------------------------------------------------------------------

-- Peran pengguna aplikasi (satu akun = satu peran).
create type public.peran as enum (
  'admin', 'pengajar_hifzh', 'pengajar_diniyyah', 'musyrif', 'wali'
);

-- Jenis setoran Buku Hafalan (ABU_SABIQ_1.pdf):
-- BC = membaca sebelum menghafal tugas berikutnya
-- BR = menambah hafalan baru
-- TS = tes hafalan baru (sudah sempurna satu surat)
-- LM = hafalan lama
create type public.jenis_setoran as enum ('BC', 'BR', 'TS', 'LM');

-- Status kehadiran per santri per sesi.
create type public.status_kehadiran as enum ('hadir', 'sakit', 'izin', 'alpa');

-- Jenis semester.
create type public.semester_jenis as enum ('gasal', 'genap');

-- Kategori catatan keseharian musyrif.
create type public.kategori_catatan as enum (
  'akhlaq', 'adab', 'ibadah_shalat', 'lainnya'
);

-- Jenis sesi pembelajaran (dipakai jadwal_sesi & kehadiran).
create type public.sesi_jenis as enum ('hifzh', 'diniyyah', 'olahraga');

-- ---------------------------------------------------------------------
-- FUNGSI BANTU UMUM
-- ---------------------------------------------------------------------

-- Menjaga kolom updated_at tetap mutakhir pada setiap UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1) profiles — akun pengguna, menempel ke Supabase Auth
-- ---------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  peran      public.peran not null,
  nama       text not null check (char_length(trim(nama)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is
  'Akun pengguna aplikasi. id = id Supabase Auth (auth.users). peran menentukan hak akses RLS.';
comment on column public.profiles.peran is
  'admin / pengajar_hifzh / pengajar_diniyyah / musyrif / wali.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2) kelas — hanya tingkat 1, 2, 3 (Marhalah Wustha)
-- ---------------------------------------------------------------------
create table public.kelas (
  id      uuid primary key default gen_random_uuid(),
  tingkat smallint not null unique check (tingkat in (1, 2, 3)),
  nama    text not null
);
comment on table public.kelas is
  'Kelas santri. tingkat unik: 1, 2, atau 3.';

-- ---------------------------------------------------------------------
-- 3) santri — data induk santri per kelas
-- ---------------------------------------------------------------------
create table public.santri (
  id            uuid primary key default gen_random_uuid(),
  nama          text not null check (char_length(trim(nama)) > 0),
  nama_ayah_wali text not null check (char_length(trim(nama_ayah_wali)) > 0),
  kelas_id      uuid not null references public.kelas (id),
  nis           text unique,
  status_aktif  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.santri is
  'Data santri, dikelompokkan per kelas. nama_ayah_wali sesuai rancangan user.';
comment on column public.santri.nis is
  'Nomor induk santri (opsional, unik bila diisi).';

create trigger santri_set_updated_at
  before update on public.santri
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4) wali_santri — tautan akun wali <-> santri (dasar aturan RLS wali)
-- ---------------------------------------------------------------------
create table public.wali_santri (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  santri_id  uuid not null references public.santri (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, santri_id)
);
comment on table public.wali_santri is
  'Tautan akun wali ke anaknya. Wali HANYA bisa melihat santri yang tertaut di sini.';

-- ---------------------------------------------------------------------
-- 5) semester — gasal / genap per tahun ajaran
-- ---------------------------------------------------------------------
create table public.semester (
  id             uuid primary key default gen_random_uuid(),
  nama           text not null,
  jenis          public.semester_jenis not null,
  tahun_ajaran   text not null,
  tanggal_mulai  date not null,
  tanggal_selesai date not null,
  check (tanggal_selesai >= tanggal_mulai),
  unique (tahun_ajaran, jenis)
);
comment on table public.semester is
  'Semester gasal/genap beserta rentang tanggalnya; dipakai rekap semesteran dan ujian.';

-- ---------------------------------------------------------------------
-- 6) jadwal_sesi — slot jadwal hifzh / diniyyah / olahraga
-- ---------------------------------------------------------------------
create table public.jadwal_sesi (
  id        uuid primary key default gen_random_uuid(),
  jenis     public.sesi_jenis not null,
  hari      smallint not null check (hari between 1 and 7),
  jam_label text not null,
  mapel     text
);
comment on table public.jadwal_sesi is
  'Slot jadwal. hari memakai konvensi ISO: 1 = Senin ... 7 = Ahad. jam_label teks bebas, mis. "10.30-11.30" atau "Ba''da Zhuhur". mapel boleh kosong (khususnya diniyyah, menunggu PDF jadwal resmi).';

-- ---------------------------------------------------------------------
-- 7) kehadiran — per santri, per tanggal, per sesi
-- ---------------------------------------------------------------------
create table public.kehadiran (
  id          uuid primary key default gen_random_uuid(),
  santri_id   uuid not null references public.santri (id) on delete cascade,
  tanggal     date not null,
  sesi_jenis  public.sesi_jenis not null,
  jadwal_id   uuid references public.jadwal_sesi (id) on delete set null,
  status      public.status_kehadiran not null,
  pengisi_id  uuid not null references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Satu santri hanya boleh punya satu baris per tanggal+sesi+jadwal.
  -- NULLS NOT DISTINCT (Postgres 15+, sesuai versi Supabase) agar
  -- jadwal_id NULL pun ikut dianggap sama.
  unique nulls not distinct (santri_id, tanggal, sesi_jenis, jadwal_id)
);
comment on table public.kehadiran is
  'Kehadiran santri pada jam hifzh dan diniyyah. Diisi penyimak/pengajar sesi. Status hanya boleh diubah lewat prosedur revisi_kehadiran() oleh admin (lihat 0003).';

create trigger kehadiran_set_updated_at
  before update on public.kehadiran
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 8) kehadiran_log_revisi — jejak revisi status oleh ADMIN
-- ---------------------------------------------------------------------
create table public.kehadiran_log_revisi (
  id           uuid primary key default gen_random_uuid(),
  kehadiran_id uuid not null references public.kehadiran (id) on delete cascade,
  diubah_oleh  uuid not null references public.profiles (id),
  status_lama  public.status_kehadiran not null,
  status_baru  public.status_kehadiran not null,
  alasan       text not null check (char_length(trim(alasan)) > 0),
  waktu        timestamptz not null default now()
);
comment on table public.kehadiran_log_revisi is
  'Log wajib setiap revisi status kehadiran oleh ADMIN utama. Hanya ditulis oleh prosedur revisi_kehadiran(), tidak bisa diisi langsung.';

-- ---------------------------------------------------------------------
-- 9) hifzh_setoran — setoran harian Buku Hafalan (8 kolom resmi)
-- ---------------------------------------------------------------------
create table public.hifzh_setoran (
  id               uuid primary key default gen_random_uuid(),
  santri_id        uuid not null references public.santri (id) on delete cascade,
  tanggal_masehi   date not null,
  tanggal_hijriah  text not null,
  jenis            public.jenis_setoran not null,
  halaman          integer not null check (halaman > 0),
  surat            text not null check (char_length(trim(surat)) > 0),
  ayat_dari        integer not null check (ayat_dari > 0),
  ayat_sampai      integer not null check (ayat_sampai >= ayat_dari),
  rg               integer not null default 0 check (rg >= 0),
  kk               integer not null default 0 check (kk >= 0),
  kb               integer not null default 0 check (kb >= 0),
  catatan_rincian  text,
  -- Diisi OTOMATIS oleh pemicu di 0002 dari fungsi nilai_setoran().
  -- Koreksi manual masih mungkin dengan UPDATE khusus pada kolom ini
  -- saja (pemicu hanya berjalan bila jenis/rg/kk/kb berubah).
  nilai_huruf      text check (nilai_huruf in ('L', 'U')),
  penyimak_id      uuid not null references public.profiles (id),
  tugas_berikutnya text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.hifzh_setoran is
  'Setoran hifzh harian sesuai Buku Hafalan: tanggal (Hijriah disimpan teks + Masehi), jenis BC/BR/TS/LM, halaman, surat dan ayat, kesalahan RG/KK/KB beserta rinciannya, nilai L/U, paraf penyimak (= penyimak_id), dan tugas berikutnya.';
comment on column public.hifzh_setoran.catatan_rincian is
  'Rincian kesalahan saat setoran: nomor ayat dan lafazh yang salah (kolom "Catatan Hafalan" di buku).';
comment on column public.hifzh_setoran.nilai_huruf is
  'L = Lancar, U = Ulang. Otomatis dari nilai_setoran(); lihat 0002.';

create trigger hifzh_setoran_set_updated_at
  before update on public.hifzh_setoran
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 10) hifzh_ujian — tes semester hifzh, satu baris per juz
-- ---------------------------------------------------------------------
create table public.hifzh_ujian (
  id          uuid primary key default gen_random_uuid(),
  santri_id   uuid not null references public.santri (id) on delete cascade,
  semester_id uuid not null references public.semester (id),
  juz         integer not null check (juz between 1 and 30),
  halaman     integer not null check (halaman > 0),
  rg          integer not null default 0 check (rg >= 0),
  kk          integer not null default 0 check (kk >= 0),
  kb          integer not null default 0 check (kb >= 0),
  -- Diisi OTOMATIS oleh pemicu di 0002 dari fungsi hasil_ujian().
  hasil       text check (hasil in ('M', 'BS', 'B', 'C', 'K', 'G')),
  penguji_id  uuid not null references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (santri_id, semester_id, juz)
);
comment on table public.hifzh_ujian is
  'Lembar Tes Semester Hifzhul Qur''an: penilaian PER JUZ. hasil M/BS/B/C/K/G otomatis dari hasil_ujian() berdasarkan KB hasil konversi; sekali majelis 2 lembar.';
comment on column public.hifzh_ujian.hasil is
  'M = Mutqin, BS = Baik Sekali, B = Baik, C = Cukup, K = Kurang, G = Goncang.';

create trigger hifzh_ujian_set_updated_at
  before update on public.hifzh_ujian
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 11) diniyyah_nilai_harian — nilai harian per mapel
-- ---------------------------------------------------------------------
create table public.diniyyah_nilai_harian (
  id         uuid primary key default gen_random_uuid(),
  santri_id  uuid not null references public.santri (id) on delete cascade,
  tanggal    date not null,
  mapel      text not null check (char_length(trim(mapel)) > 0),
  nilai      numeric(5, 2) not null check (nilai >= 0 and nilai <= 100),
  pengisi_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (santri_id, tanggal, mapel)
);
comment on table public.diniyyah_nilai_harian is
  'Nilai harian diniyyah per mata pelajaran. Daftar mapel mengikuti jadwal diniyyah (menunggu PDF jadwal resmi dari user).';

create trigger diniyyah_nilai_harian_set_updated_at
  before update on public.diniyyah_nilai_harian
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 12) diniyyah_ujian — nilai ujian semester per mapel
-- ---------------------------------------------------------------------
create table public.diniyyah_ujian (
  id          uuid primary key default gen_random_uuid(),
  santri_id   uuid not null references public.santri (id) on delete cascade,
  semester_id uuid not null references public.semester (id),
  mapel       text not null check (char_length(trim(mapel)) > 0),
  nilai       numeric(5, 2) not null check (nilai >= 0 and nilai <= 100),
  pengisi_id  uuid not null references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (santri_id, semester_id, mapel)
);
comment on table public.diniyyah_ujian is
  'Nilai ujian diniyyah per semester (gasal/genap) per mata pelajaran. Rata-rata gabungan harian+ujian dihitung di aplikasi/view, rumus menunggu konfirmasi user.';

create trigger diniyyah_ujian_set_updated_at
  before update on public.diniyyah_ujian
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 13) olahraga_sesi — sesi olahraga Ahad & Kamis pagi
-- ---------------------------------------------------------------------
create table public.olahraga_sesi (
  id         uuid primary key default gen_random_uuid(),
  tanggal    date not null unique,
  kegiatan   text not null check (char_length(trim(kegiatan)) > 0),
  catatan    text,
  pengisi_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.olahraga_sesi is
  'Sesi olahraga Ahad pagi dan Kamis pagi: tanggal, jenis kegiatan, catatan. Kehadiran per santrinya dicatat di olahraga_kehadiran.';

create trigger olahraga_sesi_set_updated_at
  before update on public.olahraga_sesi
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 14) olahraga_kehadiran — tabel ke-15 (tambahan di luar 14 rancangan)
-- ALASAN: tabel kehadiran utama khusus untuk jam hifzh & diniyyah
-- (per sesi/jadwal), sedangkan olahraga adalah sesi bersama per tanggal
-- tanpa jadwal per santri. Agar kehadiran olahraga per santri tetap
-- tercatat rapi (dan bisa dilihat wali anaknya), dibuat tabel pendamping
-- ini yang menempel ke olahraga_sesi dan memakai enum status yang sama.
-- ---------------------------------------------------------------------
create table public.olahraga_kehadiran (
  id              uuid primary key default gen_random_uuid(),
  olahraga_sesi_id uuid not null references public.olahraga_sesi (id) on delete cascade,
  santri_id       uuid not null references public.santri (id) on delete cascade,
  status          public.status_kehadiran not null,
  created_at      timestamptz not null default now(),
  unique (olahraga_sesi_id, santri_id)
);
comment on table public.olahraga_kehadiran is
  'Kehadiran per santri pada sesi olahraga. Tabel tambahan (ke-15) agar olahraga punya catatan kehadiran per santri tanpa mencampuri tabel kehadiran jam pelajaran.';

-- ---------------------------------------------------------------------
-- 15) catatan_musyrif — catatan keseharian santri
-- ---------------------------------------------------------------------
create table public.catatan_musyrif (
  id           uuid primary key default gen_random_uuid(),
  santri_id    uuid not null references public.santri (id) on delete cascade,
  pelapor_id   uuid not null references public.profiles (id),
  pelapor_nama text not null check (char_length(trim(pelapor_nama)) > 0),
  kategori     public.kategori_catatan not null,
  isi          text not null check (char_length(trim(isi)) > 0),
  tanggal      date not null default current_date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.catatan_musyrif is
  'Catatan keseharian santri (akhlaq, adab, ibadah shalat, lainnya) oleh musyrif/pengajar. pelapor_id dan pelapor_nama WAJIB; pelapor_nama diisi otomatis dari akun login oleh pemicu di 0003.';

create trigger catatan_musyrif_set_updated_at
  before update on public.catatan_musyrif
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- INDEX (selain yang otomatis dari PK/UNIQUE/FK sebagian)
-- Catatan: Postgres tidak otomatis membuat index untuk kolom FK,
-- jadi index penunjang pola baca utama dibuat eksplisit di sini.
-- ---------------------------------------------------------------------
create index idx_santri_kelas on public.santri (kelas_id);
create index idx_santri_nama on public.santri (nama);
create index idx_wali_santri_santri on public.wali_santri (santri_id);
create index idx_kehadiran_santri_tanggal on public.kehadiran (santri_id, tanggal);
create index idx_kehadiran_tanggal on public.kehadiran (tanggal);
create index idx_kehadiran_log_kehadiran on public.kehadiran_log_revisi (kehadiran_id);
create index idx_hifzh_setoran_santri_tanggal on public.hifzh_setoran (santri_id, tanggal_masehi);
create index idx_hifzh_ujian_santri_semester on public.hifzh_ujian (santri_id, semester_id);
create index idx_diniyyah_harian_santri on public.diniyyah_nilai_harian (santri_id, tanggal);
create index idx_diniyyah_ujian_santri on public.diniyyah_ujian (santri_id, semester_id);
create index idx_olahraga_kehadiran_santri on public.olahraga_kehadiran (santri_id);
create index idx_catatan_santri_tanggal on public.catatan_musyrif (santri_id, tanggal);

commit;
