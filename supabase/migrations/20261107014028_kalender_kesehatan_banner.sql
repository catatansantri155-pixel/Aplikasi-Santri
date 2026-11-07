create table public.kalender_pondok(
 id uuid primary key default gen_random_uuid(),kunci uuid not null unique,judul text not null check(length(btrim(judul))between 3 and 160),
 deskripsi text not null default ''check(length(deskripsi)<=4000),lokasi text not null default ''check(length(lokasi)<=200),
 mulai timestamptz not null,selesai timestamptz not null check(selesai>mulai),
 jenis text not null check(jenis in('akademik','kegiatan','libur','kunjungan','lainnya')),
 kelas_id uuid references public.kelas(id),pembuat_id uuid references public.profiles(id)on delete set null,
 revisi integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),dihapus_pada timestamptz
);
create index kalender_waktu on public.kalender_pondok(mulai,selesai);
create index kalender_kelas on public.kalender_pondok(kelas_id);
create index kalender_pembuat on public.kalender_pondok(pembuat_id);
create table public.kesehatan_santri(
 id uuid primary key default gen_random_uuid(),kunci uuid not null unique,santri_id uuid not null references public.santri(id),
 tanggal date not null,keluhan text not null check(length(btrim(keluhan))between 5 and 2000),
 tindakan text not null default ''check(length(tindakan)<=2000),rujukan text not null default ''check(length(rujukan)<=300),
 status text not null check(status in('dipantau','dirujuk','pulih')),pembuat_id uuid references public.profiles(id)on delete set null,
 petugas_nama text not null,revisi integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),dihapus_pada timestamptz
);
create index kesehatan_santri_tanggal on public.kesehatan_santri(santri_id,tanggal desc);
create index kesehatan_pembuat on public.kesehatan_santri(pembuat_id);
create table public.kesehatan_riwayat(
 id bigint generated always as identity primary key,catatan_id uuid not null references public.kesehatan_santri(id),pelaku_id uuid references public.profiles(id)on delete set null,
 pelaku_nama text not null,aksi text not null,status text not null,revisi integer not null,waktu timestamptz not null default now()
);
create index kesehatan_riwayat_catatan on public.kesehatan_riwayat(catatan_id,id);
create index kesehatan_riwayat_pelaku on public.kesehatan_riwayat(pelaku_id);
create table public.banner_pondok(
 id uuid primary key default gen_random_uuid(),kunci uuid not null unique,judul text not null check(length(btrim(judul))between 3 and 160),
 bawaan integer check(bawaan between 1 and 7),gambar_path text,urutan integer not null default 0 check(urutan between 0 and 999),tayang boolean not null default true,
 pembuat_id uuid references public.profiles(id)on delete set null,revisi integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),dihapus_pada timestamptz,
 check((bawaan is not null)<>(gambar_path is not null))
);
create index banner_pembuat on public.banner_pondok(pembuat_id);
insert into public.banner_pondok(kunci,judul,bawaan,urutan)select gen_random_uuid(),x.judul,x.n,x.n from(values(1,'Ruang belajar'),(2,'Ruang mengaji'),(3,'Persiapan belajar'),(4,'Catatan belajar'),(5,'Perlengkapan olahraga'),(6,'Lingkungan pondok'),(7,'Langkah kebaikan'))x(n,judul);
alter table public.informasi_pondok add column dihapus_pada timestamptz;
create or replace function private.informasi_untuk_saya(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.informasi_pondok i join public.profiles p on p.id=auth.uid()
 where i.id=p_id and i.dihapus_pada is null and i.status='terbit' and (i.berakhir_pada is null or i.berakhir_pada>now()) and (
  i.sasaran='semua' or (i.sasaran='peran' and i.sasaran_peran=p.peran::text)
  or (i.sasaran='pengguna' and i.sasaran_id=p.id)
  or (p.peran::text='wali' and i.sasaran in ('kelas','santri') and exists(
    select 1 from public.wali_santri w join public.santri s on s.id=w.santri_id
    where w.profile_id=p.id and ((i.sasaran='santri' and i.sasaran_id=s.id) or(i.sasaran='kelas' and i.sasaran_id=s.kelas_id))
  ))
 ));
$$;

create function private.admin_pondok()returns boolean language sql stable security definer set search_path=''as $$select auth.uid()is not null and exists(select 1 from public.profiles p where p.id=auth.uid()and p.peran::text='admin');$$;
create function private.petugas_kesehatan()returns boolean language sql stable security definer set search_path=''as $$select auth.uid()is not null and exists(select 1 from public.profiles p where p.id=auth.uid()and p.peran::text in('admin','musyrif'));$$;
create function private.lihat_kalender(p_id uuid)returns boolean language sql stable security definer set search_path=''as $$
 select auth.uid()is not null and exists(select 1 from public.kalender_pondok k join public.profiles p on p.id=auth.uid()where k.id=p_id and(private.admin_pondok()or(k.dihapus_pada is null and(k.kelas_id is null or p.peran::text<>'wali'or exists(select 1 from public.wali_santri w join public.santri s on s.id=w.santri_id where w.profile_id=p.id and s.kelas_id=k.kelas_id)))));
$$;
create function private.lihat_kesehatan(p_id uuid)returns boolean language sql stable security definer set search_path=''as $$
 select auth.uid()is not null and exists(select 1 from public.kesehatan_santri k where k.id=p_id and(private.petugas_kesehatan()or(k.dihapus_pada is null and exists(select 1 from public.wali_santri w join public.profiles p on p.id=w.profile_id where p.id=auth.uid()and p.peran::text='wali'and w.santri_id=k.santri_id))));
$$;
revoke all on function private.admin_pondok(),private.petugas_kesehatan(),private.lihat_kalender(uuid),private.lihat_kesehatan(uuid)from public,anon;
grant execute on function private.admin_pondok(),private.petugas_kesehatan(),private.lihat_kalender(uuid),private.lihat_kesehatan(uuid)to authenticated;
alter table public.kalender_pondok enable row level security;alter table public.kesehatan_santri enable row level security;alter table public.kesehatan_riwayat enable row level security;alter table public.banner_pondok enable row level security;
revoke all on public.kalender_pondok,public.kesehatan_santri,public.kesehatan_riwayat,public.banner_pondok from public,anon,authenticated;
grant select on public.kalender_pondok,public.kesehatan_santri,public.kesehatan_riwayat,public.banner_pondok to authenticated;
grant all on public.kalender_pondok,public.kesehatan_santri,public.kesehatan_riwayat,public.banner_pondok to service_role;grant usage,select on sequence public.kesehatan_riwayat_id_seq to service_role;
create policy kalender_baca on public.kalender_pondok for select to authenticated using(private.lihat_kalender(id));
create policy kesehatan_baca on public.kesehatan_santri for select to authenticated using(private.lihat_kesehatan(id));
create policy kesehatan_riwayat_baca on public.kesehatan_riwayat for select to authenticated using(private.lihat_kesehatan(catatan_id));
create policy banner_baca on public.banner_pondok for select to authenticated using(private.admin_pondok()or(dihapus_pada is null and tayang and exists(select 1 from public.profiles p where p.id=(select auth.uid()))));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)values('banner-pondok','banner-pondok',false,409600,array['image/webp']);
create policy banner_unggah on storage.objects for insert to authenticated with check(bucket_id='banner-pondok'and private.admin_pondok()and(storage.foldername(name))[1]=(select auth.uid())::text and name~'^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$');
create policy banner_lihat on storage.objects for select to authenticated using(bucket_id='banner-pondok'and(private.admin_pondok()or exists(select 1 from public.banner_pondok b where b.gambar_path=name)));
create policy banner_bersih on storage.objects for delete to authenticated using(bucket_id='banner-pondok'and private.admin_pondok()and(storage.foldername(name))[1]=(select auth.uid())::text and not exists(select 1 from public.banner_pondok b where b.gambar_path=name));
create function private.riwayat_kesehatan()returns trigger language plpgsql security definer set search_path=''as $$
declare v_nama text;begin select p.nama into v_nama from public.profiles p where p.id=auth.uid();
 insert into public.kesehatan_riwayat(catatan_id,pelaku_id,pelaku_nama,aksi,status,revisi)values(new.id,auth.uid(),coalesce(v_nama,'Sistem'),case when tg_op='INSERT'then 'Catatan dibuat'when old.dihapus_pada is null and new.dihapus_pada is not null then 'Catatan diarsipkan'when old.dihapus_pada is not null and new.dihapus_pada is null then 'Catatan dipulihkan'else 'Catatan diperbarui'end,new.status,new.revisi);return new;end $$;
revoke all on function private.riwayat_kesehatan()from public,anon,authenticated;
create trigger kesehatan_jejak after insert or update on public.kesehatan_santri for each row execute function private.riwayat_kesehatan();

create function private.simpan_kalender(p_data jsonb,p_id uuid,p_revisi integer)returns uuid language plpgsql security definer set search_path=''as $$
declare k public.kalender_pondok;v_key uuid=(p_data->>'kunci')::uuid;v_mulai timestamptz=(p_data->>'mulai')::timestamptz;v_akhir timestamptz=(p_data->>'selesai')::timestamptz;v_kelas uuid=nullif(p_data->>'kelas_id','')::uuid;begin
 if not private.admin_pondok()then raise exception 'Agenda hanya dapat dikelola Admin Utama'using errcode='42501';end if;
 if v_mulai is null or v_akhir is null or v_akhir<=v_mulai or v_mulai<'1900-01-01'::timestamptz or v_akhir>='2201-01-01'::timestamptz then raise exception 'Rentang waktu agenda tidak valid'using errcode='22023';end if;
 if p_id is null then
  select * into k from public.kalender_pondok where kunci=v_key for update;
  if found then
   if k.pembuat_id is distinct from auth.uid()or row(k.judul,k.deskripsi,k.lokasi,k.mulai,k.selesai,k.jenis,k.kelas_id)is distinct from row(btrim(p_data->>'judul'),btrim(coalesce(p_data->>'deskripsi','')),btrim(coalesce(p_data->>'lokasi','')),v_mulai,v_akhir,p_data->>'jenis',v_kelas)then raise exception 'Agenda sudah tersimpan dengan data berbeda. Muat ulang.'using errcode='22023';end if;return k.id;
  end if;
  insert into public.kalender_pondok(kunci,judul,deskripsi,lokasi,mulai,selesai,jenis,kelas_id,pembuat_id)values(v_key,btrim(p_data->>'judul'),btrim(coalesce(p_data->>'deskripsi','')),btrim(coalesce(p_data->>'lokasi','')),v_mulai,v_akhir,p_data->>'jenis',v_kelas,auth.uid())returning id into p_id;
 else
  select * into k from public.kalender_pondok where id=p_id for update;
  if not found or k.dihapus_pada is not null then raise exception 'Agenda tidak tersedia'using errcode='22023';end if;
  if p_revisi is null or k.revisi<>p_revisi then raise exception 'Agenda berubah. Muat ulang.'using errcode='40001';end if;
  update public.kalender_pondok set judul=btrim(p_data->>'judul'),deskripsi=btrim(coalesce(p_data->>'deskripsi','')),lokasi=btrim(coalesce(p_data->>'lokasi','')),mulai=v_mulai,selesai=v_akhir,jenis=p_data->>'jenis',kelas_id=v_kelas,revisi=revisi+1,updated_at=now()where id=p_id;
 end if;return p_id;end $$;
create function public.simpan_kalender(p_data jsonb,p_id uuid default null,p_revisi integer default 0)returns uuid language sql security invoker set search_path=''as $$select private.simpan_kalender(p_data,p_id,p_revisi);$$;
revoke all on function private.simpan_kalender(jsonb,uuid,integer),public.simpan_kalender(jsonb,uuid,integer)from public,anon;grant execute on function private.simpan_kalender(jsonb,uuid,integer),public.simpan_kalender(jsonb,uuid,integer)to authenticated;

create function private.simpan_kesehatan(p_data jsonb,p_id uuid,p_revisi integer)returns uuid language plpgsql security definer set search_path=''as $$
declare k public.kesehatan_santri;v_key uuid=(p_data->>'kunci')::uuid;v_anak uuid=(p_data->>'santri_id')::uuid;v_tanggal date=(p_data->>'tanggal')::date;v_nama text;begin
 if not private.petugas_kesehatan()then raise exception 'Catatan kesehatan hanya diisi admin atau musyrif'using errcode='42501';end if;
 if v_anak is null or v_tanggal is null or v_tanggal<'1900-01-01'::date or v_tanggal>(now()at time zone 'Asia/Jakarta')::date then raise exception 'Tanggal kesehatan tidak boleh di masa depan'using errcode='22023';end if;
 select nama into v_nama from public.profiles where id=auth.uid();
 if p_id is null then
  select * into k from public.kesehatan_santri where kunci=v_key for update;
  if found then
   if k.pembuat_id is distinct from auth.uid()or row(k.santri_id,k.tanggal,k.keluhan,k.tindakan,k.rujukan,k.status)is distinct from row(v_anak,v_tanggal,btrim(p_data->>'keluhan'),btrim(coalesce(p_data->>'tindakan','')),btrim(coalesce(p_data->>'rujukan','')),p_data->>'status')then raise exception 'Catatan sudah tersimpan dengan data berbeda. Muat ulang.'using errcode='22023';end if;return k.id;
  end if;
  if not exists(select 1 from public.santri s where s.id=v_anak and s.status_aktif)then raise exception 'Pilih santri aktif'using errcode='22023';end if;
  insert into public.kesehatan_santri(kunci,santri_id,tanggal,keluhan,tindakan,rujukan,status,pembuat_id,petugas_nama)values(v_key,v_anak,v_tanggal,btrim(p_data->>'keluhan'),btrim(coalesce(p_data->>'tindakan','')),btrim(coalesce(p_data->>'rujukan','')),p_data->>'status',auth.uid(),v_nama)returning id into p_id;
 else
  select * into k from public.kesehatan_santri where id=p_id for update;
  if not found or k.dihapus_pada is not null or k.santri_id<>v_anak then raise exception 'Catatan tidak tersedia atau santri berubah'using errcode='22023';end if;
  if p_revisi is null or k.revisi<>p_revisi then raise exception 'Catatan berubah. Muat ulang.'using errcode='40001';end if;
  update public.kesehatan_santri set tanggal=v_tanggal,keluhan=btrim(p_data->>'keluhan'),tindakan=btrim(coalesce(p_data->>'tindakan','')),rujukan=btrim(coalesce(p_data->>'rujukan','')),status=p_data->>'status',petugas_nama=v_nama,revisi=revisi+1,updated_at=now()where id=p_id;
 end if;return p_id;end $$;
create function public.simpan_kesehatan(p_data jsonb,p_id uuid default null,p_revisi integer default 0)returns uuid language sql security invoker set search_path=''as $$select private.simpan_kesehatan(p_data,p_id,p_revisi);$$;
revoke all on function private.simpan_kesehatan(jsonb,uuid,integer),public.simpan_kesehatan(jsonb,uuid,integer)from public,anon;grant execute on function private.simpan_kesehatan(jsonb,uuid,integer),public.simpan_kesehatan(jsonb,uuid,integer)to authenticated;

create function private.simpan_banner(p_data jsonb,p_id uuid,p_revisi integer)returns uuid language plpgsql security definer set search_path=''as $$
declare b public.banner_pondok;v_key uuid=(p_data->>'kunci')::uuid;v_path text=nullif(p_data->>'gambar_path','');v_bawaan integer=nullif(p_data->>'bawaan','')::integer;begin
 if not private.admin_pondok()then raise exception 'Banner hanya dikelola Admin Utama'using errcode='42501';end if;
 if v_path is not null and(v_path!~('^'||auth.uid()::text||'/[0-9a-f-]{36}\.webp$')or not exists(select 1 from storage.objects o where o.bucket_id='banner-pondok'and o.name=v_path))then
  -- Banner milik admin lain boleh dipertahankan saat mengubah judul/urutan, tidak dipakai pada banner baru.
  if p_id is null or not exists(select 1 from public.banner_pondok x where x.id=p_id and x.gambar_path=v_path)then raise exception 'Gambar banner belum terunggah atau tidak valid'using errcode='22023';end if;
 end if;
 if p_id is null then
  select * into b from public.banner_pondok where kunci=v_key for update;
  if found then
   if b.pembuat_id is distinct from auth.uid()or row(b.judul,b.bawaan,b.gambar_path,b.urutan,b.tayang)is distinct from row(btrim(p_data->>'judul'),v_bawaan,v_path,(p_data->>'urutan')::integer,(p_data->>'tayang')::boolean)then raise exception 'Banner sudah tersimpan. Muat ulang.'using errcode='22023';end if;return b.id;
  end if;
  -- Serialisasi batas jumlah banner untuk seluruh admin.
  perform pg_advisory_xact_lock(72613);
  if(select count(*)from public.banner_pondok where dihapus_pada is null)>=20 then raise exception 'Maksimal 20 banner. Arsipkan yang tidak dipakai terlebih dahulu.'using errcode='22023';end if;
  insert into public.banner_pondok(kunci,judul,bawaan,gambar_path,urutan,tayang,pembuat_id)values(v_key,btrim(p_data->>'judul'),v_bawaan,v_path,(p_data->>'urutan')::integer,(p_data->>'tayang')::boolean,auth.uid())returning id into p_id;
 else
  select * into b from public.banner_pondok where id=p_id for update;
  if not found or b.dihapus_pada is not null then raise exception 'Banner tidak tersedia'using errcode='22023';end if;
  if p_revisi is null or b.revisi<>p_revisi then raise exception 'Banner berubah. Muat ulang.'using errcode='40001';end if;
  update public.banner_pondok set judul=btrim(p_data->>'judul'),bawaan=v_bawaan,gambar_path=v_path,urutan=(p_data->>'urutan')::integer,tayang=(p_data->>'tayang')::boolean,revisi=revisi+1,updated_at=now()where id=p_id;
 end if;return p_id;end $$;
create function public.simpan_banner(p_data jsonb,p_id uuid default null,p_revisi integer default 0)returns uuid language sql security invoker set search_path=''as $$select private.simpan_banner(p_data,p_id,p_revisi);$$;
revoke all on function private.simpan_banner(jsonb,uuid,integer),public.simpan_banner(jsonb,uuid,integer)from public,anon;grant execute on function private.simpan_banner(jsonb,uuid,integer),public.simpan_banner(jsonb,uuid,integer)to authenticated;

create function private.arsip_pondok(p_modul text,p_id uuid,p_revisi integer,p_pulihkan boolean)returns void language plpgsql security definer set search_path=''as $$
declare v_tabel text;v_data jsonb;begin
 if not private.admin_pondok()then raise exception 'Hapus dan pulihkan hanya untuk Admin Utama'using errcode='42501';end if;
 v_tabel=case p_modul when 'kalender'then 'kalender_pondok'when 'kesehatan'then 'kesehatan_santri'when 'banner'then 'banner_pondok'when 'informasi'then 'informasi_pondok'else null end;
 if v_tabel is null or p_pulihkan is null then raise exception 'Pilihan tidak valid'using errcode='22023';end if;
 execute format('select to_jsonb(t)from public.%I t where id=$1 for update',v_tabel)into v_data using p_id;
 if v_data is null then raise exception 'Data tidak tersedia'using errcode='22023';end if;
 if p_revisi is null or(v_data->>'revisi')::integer<>p_revisi then raise exception 'Data berubah. Muat ulang sebelum melanjutkan.'using errcode='40001';end if;
 if p_pulihkan and(v_data->>'dihapus_pada')is null or not p_pulihkan and(v_data->>'dihapus_pada')is not null then raise exception 'Status arsip sudah berubah. Muat ulang.'using errcode='22023';end if;
 if p_modul='banner'and p_pulihkan then perform pg_advisory_xact_lock(72613);if(select count(*)from public.banner_pondok where dihapus_pada is null)>=20 then raise exception 'Maksimal 20 banner aktif/nonarsip.'using errcode='22023';end if;end if;
 execute format('update public.%I set dihapus_pada=$1,revisi=revisi+1,updated_at=now()%s where id=$2',v_tabel,case p_modul when 'informasi'then ',status=''draf'''when 'banner'then case when p_pulihkan then ',tayang=false'else ''end else ''end)using case when p_pulihkan then null::timestamptz else now()end,p_id;
end $$;
create function public.arsip_pondok(p_modul text,p_id uuid,p_revisi integer,p_pulihkan boolean default false)returns void language sql security invoker set search_path=''as $$select private.arsip_pondok(p_modul,p_id,p_revisi,p_pulihkan);$$;
revoke all on function private.arsip_pondok(text,uuid,integer,boolean),public.arsip_pondok(text,uuid,integer,boolean)from public,anon;grant execute on function private.arsip_pondok(text,uuid,integer,boolean),public.arsip_pondok(text,uuid,integer,boolean)to authenticated;
create function public.daftar_kesehatan(p_mulai date default null,p_selesai date default null,p_status text default 'semua',p_cari text default '',p_arsip boolean default false,p_halaman integer default 0)returns jsonb language sql stable security invoker set search_path=''as $$
 with f as(select k.*,s.nama santri_nama,c.nama kelas_nama from public.kesehatan_santri k join public.santri s on s.id=k.santri_id join public.kelas c on c.id=s.kelas_id where(k.dihapus_pada is not null)=p_arsip and(p_mulai is null or k.tanggal>=p_mulai)and(p_selesai is null or k.tanggal<=p_selesai)and(p_status='semua'or k.status=p_status)and strpos(lower(s.nama||' '||k.keluhan),lower(left(coalesce(p_cari,''),100)))>0),h as(select *from f order by tanggal desc,created_at desc,id limit 20 offset greatest(0,least(coalesce(p_halaman,0),100000))*20)
 select jsonb_build_object('jumlah',(select count(*)from f),'data',coalesce((select jsonb_agg(to_jsonb(h)order by tanggal desc,created_at desc,id)from h),'[]'::jsonb));$$;
revoke all on function public.daftar_kesehatan(date,date,text,text,boolean,integer)from public,anon;grant execute on function public.daftar_kesehatan(date,date,text,text,boolean,integer)to authenticated;
notify pgrst,'reload schema';
