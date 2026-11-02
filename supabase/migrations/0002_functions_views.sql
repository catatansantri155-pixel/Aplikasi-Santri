-- =====================================================================
-- 0002_functions_views.sql — Fungsi hitung resmi Buku Hafalan + view
--
-- Aturan resmi (ABU_SABIQ_1.pdf & ABU_SABIQ_2.pdf):
--   Konversi kesalahan BERTAHAP: 3 RG = 1 KK, lalu 3 KK = 1 KB.
--   Nilai setoran: BR/TS -> L hanya bila RG=KK=KB semua 0.
--                  LM/BC -> L bila KB hasil konversi <= 3.
--                  (BC tidak disebut di PDF; sementara disamakan LM,
--                   menunggu konfirmasi user.)
--   Hasil tes semester per juz dari KB hasil konversi:
--                  0=M, 1-2=BS, 3-4=B, 5-7=C, 8-10=K, >=11=G.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- kb_konversi(rg, kk, kb) -> KB total setelah konversi bertahap.
-- Pembagian integer Postgres membuang sisa (floor untuk nilai >= 0):
--   kk_total = kk + rg/3 ; kb_total = kb + kk_total/3
-- Contoh Buku Hafalan yang sudah teruji di prototipe: RG 27 -> KB 3.
-- ---------------------------------------------------------------------
create or replace function public.kb_konversi(p_rg integer, p_kk integer, p_kb integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_kb, 0) + ((coalesce(p_kk, 0) + (coalesce(p_rg, 0) / 3)) / 3);
$$;
comment on function public.kb_konversi(integer, integer, integer) is
  'KB hasil konversi bertahap dari RG/KK/KB mentah: kk_total = kk + rg/3, kb_total = kb + kk_total/3 (pembagian integer).';

-- ---------------------------------------------------------------------
-- nilai_setoran(jenis, rg, kk, kb) -> 'L' (Lancar) / 'U' (Ulang)
-- ---------------------------------------------------------------------
create or replace function public.nilai_setoran(
  p_jenis public.jenis_setoran, p_rg integer, p_kk integer, p_kb integer
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_jenis in ('BR', 'TS') then
      case when coalesce(p_rg, 0) = 0 and coalesce(p_kk, 0) = 0 and coalesce(p_kb, 0) = 0
           then 'L' else 'U' end
    else -- LM dan BC (BC sementara mengikuti LM, menunggu konfirmasi user)
      case when public.kb_konversi(p_rg, p_kk, p_kb) <= 3
           then 'L' else 'U' end
  end;
$$;
comment on function public.nilai_setoran(public.jenis_setoran, integer, integer, integer) is
  'Nilai setoran Buku Hafalan: BR/TS L hanya bila semua kesalahan 0; LM/BC L bila KB konversi <= 3; selain itu U.';

-- ---------------------------------------------------------------------
-- hasil_ujian(rg, kk, kb) -> 'M'/'BS'/'B'/'C'/'K'/'G' per juz
-- ---------------------------------------------------------------------
create or replace function public.hasil_ujian(p_rg integer, p_kk integer, p_kb integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when public.kb_konversi(p_rg, p_kk, p_kb) = 0 then 'M'
    when public.kb_konversi(p_rg, p_kk, p_kb) <= 2 then 'BS'
    when public.kb_konversi(p_rg, p_kk, p_kb) <= 4 then 'B'
    when public.kb_konversi(p_rg, p_kk, p_kb) <= 7 then 'C'
    when public.kb_konversi(p_rg, p_kk, p_kb) <= 10 then 'K'
    else 'G'
  end;
$$;
comment on function public.hasil_ujian(integer, integer, integer) is
  'Hasil tes semester hifzh per juz dari KB konversi: 0=M (Mutqin), 1-2=BS (Baik Sekali), 3-4=B (Baik), 5-7=C (Cukup), 8-10=K (Kurang), >=11=G (Goncang).';

-- ---------------------------------------------------------------------
-- Pemicu pengisi otomatis nilai_huruf & hasil.
-- Berjalan hanya bila kolom sumber (jenis/rg/kk/kb) berubah, sehingga
-- koreksi manual pada kolom nilai_huruf/hasil saja tetap dimungkinkan
-- (pengesahan penyimak/penguji), dan tercatat lewat updated_at.
-- ---------------------------------------------------------------------
create or replace function public.hifzh_setoran_isi_nilai()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.nilai_huruf = public.nilai_setoran(new.jenis, new.rg, new.kk, new.kb);
  return new;
end;
$$;

create trigger hifzh_setoran_isi_nilai_trg
  before insert or update of jenis, rg, kk, kb on public.hifzh_setoran
  for each row execute function public.hifzh_setoran_isi_nilai();

create or replace function public.hifzh_ujian_isi_hasil()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.hasil = public.hasil_ujian(new.rg, new.kk, new.kb);
  return new;
end;
$$;

create trigger hifzh_ujian_isi_hasil_trg
  before insert or update of rg, kk, kb on public.hifzh_ujian
  for each row execute function public.hifzh_ujian_isi_hasil();

-- =====================================================================
-- VIEW AGREGAT
-- Semua view memakai security_invoker = true (Postgres 15+) agar RLS
-- tabel sumber berlaku mengikuti PENGGUNA YANG MEMBACA: staf melihat
-- semua baris, wali hanya agregat anaknya sendiri.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Rekap kehadiran PEKANAN: per santri per pekan (pekan ISO, mulai Senin)
-- ---------------------------------------------------------------------
create or replace view public.rekap_kehadiran_pekanan
with (security_invoker = true) as
select
  k.santri_id,
  s.nama as santri_nama,
  s.kelas_id,
  date_trunc('week', k.tanggal)::date as pekan_mulai,
  count(*) filter (where k.status = 'hadir') as jumlah_hadir,
  count(*) filter (where k.status = 'sakit') as jumlah_sakit,
  count(*) filter (where k.status = 'izin')  as jumlah_izin,
  count(*) filter (where k.status = 'alpa')  as jumlah_alpa,
  count(*) as total_sesi
from public.kehadiran k
join public.santri s on s.id = k.santri_id
group by k.santri_id, s.nama, s.kelas_id, date_trunc('week', k.tanggal);
comment on view public.rekap_kehadiran_pekanan is
  'Jumlah Hadir/Sakit/Izin/Alpa per santri per pekan (pekan_mulai = hari Senin pekan tsb).';

-- ---------------------------------------------------------------------
-- Rekap kehadiran SEMESTERAN: per santri per semester.
-- Baris kehadiran masuk ke semester yang rentang tanggalnya memuat
-- tanggal kehadiran tsb.
-- ---------------------------------------------------------------------
create or replace view public.rekap_kehadiran_semester
with (security_invoker = true) as
select
  sm.id as semester_id,
  sm.nama as semester_nama,
  sm.jenis as semester_jenis,
  k.santri_id,
  s.nama as santri_nama,
  s.kelas_id,
  count(*) filter (where k.status = 'hadir') as jumlah_hadir,
  count(*) filter (where k.status = 'sakit') as jumlah_sakit,
  count(*) filter (where k.status = 'izin')  as jumlah_izin,
  count(*) filter (where k.status = 'alpa')  as jumlah_alpa,
  count(*) as total_sesi
from public.kehadiran k
join public.santri s on s.id = k.santri_id
join public.semester sm on k.tanggal between sm.tanggal_mulai and sm.tanggal_selesai
group by sm.id, sm.nama, sm.jenis, k.santri_id, s.nama, s.kelas_id;
comment on view public.rekap_kehadiran_semester is
  'Jumlah Hadir/Sakit/Izin/Alpa per santri per semester, berdasarkan tanggal kehadiran yang jatuh di rentang tanggal semester.';

-- ---------------------------------------------------------------------
-- Grafik hifzh MINGGUAN: per santri, per pekan, per jenis setoran —
-- jumlah setoran, total halaman, dan hitungan L/U (bahan grafik
-- bertumpuk per jenis + proporsi L vs U).
-- ---------------------------------------------------------------------
create or replace view public.grafik_hifzh_mingguan
with (security_invoker = true) as
select
  h.santri_id,
  s.nama as santri_nama,
  s.kelas_id,
  date_trunc('week', h.tanggal_masehi)::date as pekan_mulai,
  h.jenis,
  count(*) as jumlah_setoran,
  coalesce(sum(h.halaman), 0) as total_halaman,
  count(*) filter (where h.nilai_huruf = 'L') as jumlah_l,
  count(*) filter (where h.nilai_huruf = 'U') as jumlah_u
from public.hifzh_setoran h
join public.santri s on s.id = h.santri_id
group by h.santri_id, s.nama, s.kelas_id, date_trunc('week', h.tanggal_masehi), h.jenis;
comment on view public.grafik_hifzh_mingguan is
  'Agregat setoran hifzh per santri per pekan per jenis (BC/BR/TS/LM): jumlah setoran, total halaman, jumlah L dan U.';

-- ---------------------------------------------------------------------
-- Grafik hifzh BULANAN: pola yang sama, per bulan kalender.
-- ---------------------------------------------------------------------
create or replace view public.grafik_hifzh_bulanan
with (security_invoker = true) as
select
  h.santri_id,
  s.nama as santri_nama,
  s.kelas_id,
  date_trunc('month', h.tanggal_masehi)::date as bulan_mulai,
  h.jenis,
  count(*) as jumlah_setoran,
  coalesce(sum(h.halaman), 0) as total_halaman,
  count(*) filter (where h.nilai_huruf = 'L') as jumlah_l,
  count(*) filter (where h.nilai_huruf = 'U') as jumlah_u
from public.hifzh_setoran h
join public.santri s on s.id = h.santri_id
group by h.santri_id, s.nama, s.kelas_id, date_trunc('month', h.tanggal_masehi), h.jenis;
comment on view public.grafik_hifzh_bulanan is
  'Agregat setoran hifzh per santri per bulan per jenis (BC/BR/TS/LM): jumlah setoran, total halaman, jumlah L dan U.';

commit;
