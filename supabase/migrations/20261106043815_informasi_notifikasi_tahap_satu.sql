create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;

alter table public.informasi_pondok
 add column sasaran text not null default 'semua' check(sasaran in ('semua','peran','kelas','santri','pengguna')),
 add column sasaran_peran text check(sasaran_peran in ('admin','pengajar_hifzh','pengajar_diniyyah','musyrif','wali')),
 add column sasaran_id uuid,
 add column disematkan boolean not null default false,
 add column berakhir_pada timestamptz,
 add column wajib_konfirmasi boolean not null default false,
 add column revisi integer not null default 1 check(revisi>0),
 add constraint informasi_sasaran_konsisten check(
  (sasaran='semua' and sasaran_peran is null and sasaran_id is null) or
  (sasaran='peran' and sasaran_peran is not null and sasaran_id is null) or
  (sasaran in ('kelas','santri','pengguna') and sasaran_id is not null and sasaran_peran is null)
 );
grant insert(sasaran,sasaran_peran,sasaran_id,disematkan,berakhir_pada,wajib_konfirmasi),
 update(sasaran,sasaran_peran,sasaran_id,disematkan,berakhir_pada,wajib_konfirmasi)
 on public.informasi_pondok to authenticated;

create function private.validasi_info_sasaran() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.sasaran='kelas' and not exists(select 1 from public.kelas where id=new.sasaran_id) then raise exception 'Kelas tujuan tidak ditemukan' using errcode='23514';end if;
 if new.sasaran='santri' and not exists(select 1 from public.santri where id=new.sasaran_id) then raise exception 'Santri tujuan tidak ditemukan' using errcode='23514';end if;
 if new.sasaran='pengguna' and not exists(select 1 from public.profiles where id=new.sasaran_id) then raise exception 'Akun tujuan tidak ditemukan' using errcode='23514';end if;
 if tg_op='UPDATE' and row(new.judul,new.isi,new.kategori,new.status,new.tanggal,new.tema,new.gambar_path,new.sasaran,new.sasaran_peran,new.sasaran_id,new.berakhir_pada,new.wajib_konfirmasi)
 is distinct from row(old.judul,old.isi,old.kategori,old.status,old.tanggal,old.tema,old.gambar_path,old.sasaran,old.sasaran_peran,old.sasaran_id,old.berakhir_pada,old.wajib_konfirmasi) then new.revisi=old.revisi+1;end if;
 return new;
end $$;
revoke all on function private.validasi_info_sasaran() from public,anon,authenticated;
create trigger informasi_validasi_sasaran before insert or update on public.informasi_pondok for each row execute function private.validasi_info_sasaran();

-- Lookup internal agar pemeriksaan audiens tidak mengulang RLS informasi.
-- Hanya auth.uid() yang sedang masuk; tidak menerima id pengguna dari klien.
create function private.informasi_untuk_saya(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.informasi_pondok i join public.profiles p on p.id=auth.uid()
 where i.id=p_id and i.status='terbit' and (i.berakhir_pada is null or i.berakhir_pada>now()) and (
  i.sasaran='semua' or (i.sasaran='peran' and i.sasaran_peran=p.peran::text)
  or (i.sasaran='pengguna' and i.sasaran_id=p.id)
  or (p.peran::text='wali' and i.sasaran in ('kelas','santri') and exists(
    select 1 from public.wali_santri w join public.santri s on s.id=w.santri_id
    where w.profile_id=p.id and ((i.sasaran='santri' and i.sasaran_id=s.id) or(i.sasaran='kelas' and i.sasaran_id=s.kelas_id))
  ))
 ));
$$;
revoke all on function private.informasi_untuk_saya(uuid) from public,anon,authenticated;
grant execute on function private.informasi_untuk_saya(uuid) to authenticated;
alter policy informasi_baca on public.informasi_pondok using ((select public.apakah_admin()) or private.informasi_untuk_saya(id));

create table public.informasi_bacaan (
 informasi_id uuid not null references public.informasi_pondok(id) on delete cascade,
 pengguna_id uuid not null references public.profiles(id) on delete cascade,
 revisi integer not null check(revisi>0),
 dibaca_pada timestamptz not null default now(),
 dikonfirmasi_pada timestamptz,
 primary key(informasi_id,pengguna_id)
);
alter table public.informasi_bacaan enable row level security;
revoke all on public.informasi_bacaan from anon,authenticated;
grant select on public.informasi_bacaan to authenticated;
grant all on public.informasi_bacaan to service_role;
create policy informasi_bacaan_baca on public.informasi_bacaan for select to authenticated using (
 (select public.apakah_admin()) or (pengguna_id=(select auth.uid()) and private.informasi_untuk_saya(informasi_id))
);
create index informasi_bacaan_pengguna on public.informasi_bacaan(pengguna_id,informasi_id,revisi);
create index informasi_urut_semat on public.informasi_pondok(disematkan desc,tanggal desc,created_at desc);

create function private.tandai_informasi(p_id uuid,p_konfirmasi boolean) returns void language plpgsql security definer set search_path='' as $$
declare i public.informasi_pondok;begin
 if auth.uid() is null or not private.informasi_untuk_saya(p_id) then raise exception 'Informasi tidak tersedia untuk akun ini' using errcode='42501';end if;
 select * into i from public.informasi_pondok where id=p_id for share;
 -- Pemeriksaan ulang setelah lock: publikasi/audiens mungkin berubah saat menunggu.
 if not private.informasi_untuk_saya(p_id) then raise exception 'Informasi sudah tidak tersedia' using errcode='42501';end if;
 if p_konfirmasi and not i.wajib_konfirmasi then raise exception 'Informasi tidak meminta konfirmasi' using errcode='22023';end if;
 insert into public.informasi_bacaan(informasi_id,pengguna_id,revisi,dibaca_pada,dikonfirmasi_pada)
 values(i.id,auth.uid(),i.revisi,now(),case when p_konfirmasi then now() end)
 on conflict(informasi_id,pengguna_id) do update set
 revisi=excluded.revisi,
 dibaca_pada=case when informasi_bacaan.revisi=excluded.revisi then informasi_bacaan.dibaca_pada else excluded.dibaca_pada end,
 dikonfirmasi_pada=case when p_konfirmasi then coalesce(case when informasi_bacaan.revisi=excluded.revisi then informasi_bacaan.dikonfirmasi_pada end,now()) when informasi_bacaan.revisi=excluded.revisi then informasi_bacaan.dikonfirmasi_pada else null end
 where excluded.revisi>=informasi_bacaan.revisi;
end $$;
revoke all on function private.tandai_informasi(uuid,boolean) from public,anon,authenticated;
grant execute on function private.tandai_informasi(uuid,boolean) to authenticated;
create function public.tandai_informasi(p_id uuid,p_konfirmasi boolean default false) returns void language sql security invoker set search_path='' as $$select private.tandai_informasi(p_id,p_konfirmasi);$$;
revoke all on function public.tandai_informasi(uuid,boolean) from public,anon,authenticated;
grant execute on function public.tandai_informasi(uuid,boolean) to authenticated;

create function public.jumlah_notifikasi_belum_dibaca() returns bigint language sql stable security invoker set search_path='' as $$
 select count(*) from public.informasi_pondok i where private.informasi_untuk_saya(i.id)
 and not exists(select 1 from public.informasi_bacaan b where b.informasi_id=i.id and b.pengguna_id=auth.uid() and b.revisi=i.revisi);
$$;
revoke all on function public.jumlah_notifikasi_belum_dibaca() from public,anon,authenticated;
grant execute on function public.jumlah_notifikasi_belum_dibaca() to authenticated;

create function public.daftar_notifikasi(p_belum boolean default false,p_halaman integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$
 with v as (
 select i.id,i.judul,i.kategori,i.tanggal,i.updated_at,i.disematkan,i.wajib_konfirmasi,i.revisi,
 case when b.revisi=i.revisi then b.dibaca_pada end dibaca_pada,
 case when b.revisi=i.revisi then b.dikonfirmasi_pada end dikonfirmasi_pada
 from public.informasi_pondok i left join public.informasi_bacaan b on b.informasi_id=i.id and b.pengguna_id=auth.uid()
 where private.informasi_untuk_saya(i.id)
 ), tersaring as(select * from v where not p_belum or dibaca_pada is null), halaman as(
 select * from tersaring order by disematkan desc,updated_at desc,id desc limit 20 offset greatest(0,least(coalesce(p_halaman,0),100000))*20
 ) select jsonb_build_object('jumlah',(select count(*) from tersaring),'belum',(select count(*) from v where dibaca_pada is null),'data',coalesce((select jsonb_agg(to_jsonb(h) order by disematkan desc,updated_at desc,id desc) from halaman h),'[]'::jsonb));
$$;
revoke all on function public.daftar_notifikasi(boolean,integer) from public,anon,authenticated;
grant execute on function public.daftar_notifikasi(boolean,integer) to authenticated;

create function private.baca_semua_informasi(p_sebelum timestamptz) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sesi diperlukan' using errcode='42501';end if;
 insert into public.informasi_bacaan(informasi_id,pengguna_id,revisi,dibaca_pada)
 select i.id,auth.uid(),i.revisi,now() from public.informasi_pondok i
 where private.informasi_untuk_saya(i.id) and i.updated_at<=least(coalesce(p_sebelum,now()),now())
 on conflict(informasi_id,pengguna_id) do update set revisi=excluded.revisi,
 dibaca_pada=case when informasi_bacaan.revisi=excluded.revisi then informasi_bacaan.dibaca_pada else excluded.dibaca_pada end,
 dikonfirmasi_pada=case when informasi_bacaan.revisi=excluded.revisi then informasi_bacaan.dikonfirmasi_pada else null end
 where excluded.revisi>=informasi_bacaan.revisi;
end $$;
revoke all on function private.baca_semua_informasi(timestamptz) from public,anon,authenticated;
grant execute on function private.baca_semua_informasi(timestamptz) to authenticated;
create function public.baca_semua_informasi(p_sebelum timestamptz default now()) returns void language sql security invoker set search_path='' as $$select private.baca_semua_informasi(p_sebelum);$$;
revoke all on function public.baca_semua_informasi(timestamptz) from public,anon,authenticated;
grant execute on function public.baca_semua_informasi(timestamptz) to authenticated;

create function public.detail_informasi(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select to_jsonb(i)||jsonb_build_object('untuk_saya',private.informasi_untuk_saya(i.id),
 'dibaca_pada',(select b.dibaca_pada from public.informasi_bacaan b where b.informasi_id=i.id and b.pengguna_id=auth.uid() and b.revisi=i.revisi),
 'dikonfirmasi_pada',(select b.dikonfirmasi_pada from public.informasi_bacaan b where b.informasi_id=i.id and b.pengguna_id=auth.uid() and b.revisi=i.revisi))
 from public.informasi_pondok i where i.id=p_id;
$$;
revoke all on function public.detail_informasi(uuid) from public,anon,authenticated;
grant execute on function public.detail_informasi(uuid) to authenticated;
