create table public.perizinan_santri (
 id uuid primary key default gen_random_uuid(),
 kunci uuid not null unique,
 santri_id uuid not null references public.santri(id),
 pengaju_id uuid references public.profiles(id) on delete set null,
 pengaju_nama text not null,
 jenis text not null check(jenis in ('pulang','keluar','berobat')),
 alasan text not null check(char_length(btrim(alasan)) between 5 and 2000),
 tujuan text not null check(char_length(btrim(tujuan)) between 3 and 300),
 rencana_keluar timestamptz not null,
 rencana_kembali timestamptz not null,
 penjemput text not null check(char_length(btrim(penjemput)) between 3 and 120),
 hubungan text not null check(char_length(btrim(hubungan)) between 2 and 80),
 kontak text not null check(kontak ~ '^[+0-9 ()-]+$' and char_length(kontak)<=24 and char_length(regexp_replace(kontak,'[^0-9]','','g')) between 8 and 15),
 lampiran_path text,
 status text not null default 'menunggu' check(status in ('menunggu','perlu_perbaikan','disetujui','ditolak','dibatalkan','sedang_izin','sudah_kembali')),
 keluar_pada timestamptz,
 kembali_pada timestamptz,
 catatan_petugas text not null default '' check(char_length(catatan_petugas)<=2000),
 revisi integer not null default 1 check(revisi>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(rencana_kembali>rencana_keluar),
 check((status in ('sedang_izin','sudah_kembali'))=(keluar_pada is not null)),
 check((status='sudah_kembali')=(kembali_pada is not null)),
 check(kembali_pada is null or kembali_pada>=keluar_pada)
);
create index perizinan_santri_tanggal on public.perizinan_santri(santri_id,rencana_keluar,rencana_kembali);
create index perizinan_status on public.perizinan_santri(status,updated_at desc);
create index perizinan_pengaju on public.perizinan_santri(pengaju_id);
create table public.perizinan_log (
 id bigint generated always as identity primary key,
 izin_id uuid not null references public.perizinan_santri(id) on delete cascade,
 pelaku_id uuid references public.profiles(id) on delete set null,
 pelaku_nama text not null,
 aksi text not null,
 status_dari text,
 status_ke text not null,
 catatan text not null default '',
 revisi integer not null,
 waktu timestamptz not null default now()
);
create index perizinan_log_izin on public.perizinan_log(izin_id,id);
create index perizinan_log_pelaku on public.perizinan_log(pelaku_id);
create table public.notifikasi_perizinan (
 id uuid primary key default gen_random_uuid(),
 izin_id uuid not null references public.perizinan_santri(id) on delete cascade,
 pengguna_id uuid not null references public.profiles(id) on delete cascade,
 revisi integer not null,
 judul text not null,
 created_at timestamptz not null default now(),
 dibaca_pada timestamptz,
 unique(izin_id,pengguna_id,revisi)
);
create index notifikasi_izin_pengguna on public.notifikasi_perizinan(pengguna_id,created_at desc);
alter table public.perizinan_santri enable row level security;
alter table public.perizinan_log enable row level security;
alter table public.notifikasi_perizinan enable row level security;
revoke all on public.perizinan_santri,public.perizinan_log,public.notifikasi_perizinan from anon,authenticated;
grant select on public.perizinan_santri,public.perizinan_log,public.notifikasi_perizinan to authenticated;
grant all on public.perizinan_santri,public.perizinan_log,public.notifikasi_perizinan to service_role;
grant usage,select on sequence public.perizinan_log_id_seq to service_role;

create function private.petugas_izin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and peran::text in ('admin','musyrif'));
$$;
create function private.wali_anak_izin(p_anak uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.wali_santri w join public.profiles p on p.id=w.profile_id where p.id=auth.uid() and p.peran::text='wali' and w.santri_id=p_anak);
$$;
create function private.boleh_lihat_izin(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.perizinan_santri i where i.id=p_id and (private.petugas_izin() or private.wali_anak_izin(i.santri_id)));
$$;
revoke all on function private.petugas_izin(),private.wali_anak_izin(uuid),private.boleh_lihat_izin(uuid) from public,anon,authenticated;
grant execute on function private.petugas_izin(),private.wali_anak_izin(uuid),private.boleh_lihat_izin(uuid) to authenticated;
create policy perizinan_baca on public.perizinan_santri for select to authenticated using(private.boleh_lihat_izin(id));
create policy perizinan_log_baca on public.perizinan_log for select to authenticated using(private.boleh_lihat_izin(izin_id));
create policy notifikasi_izin_baca on public.notifikasi_perizinan for select to authenticated using(pengguna_id=(select auth.uid()) and private.boleh_lihat_izin(izin_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('perizinan-lampiran','perizinan-lampiran',false,409600,array['image/webp']);
create policy izin_lampiran_baca on storage.objects for select to authenticated using(bucket_id='perizinan-lampiran' and (
 (storage.foldername(name))[1]=(select auth.uid())::text or exists(select 1 from public.perizinan_santri i where i.lampiran_path=name)
));
create policy izin_lampiran_tambah on storage.objects for insert to authenticated with check(bucket_id='perizinan-lampiran' and (storage.foldername(name))[1]=(select auth.uid())::text and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.peran::text='wali'));
create policy izin_lampiran_bersihkan on storage.objects for delete to authenticated using(bucket_id='perizinan-lampiran' and (storage.foldername(name))[1]=(select auth.uid())::text and not exists(select 1 from public.perizinan_santri i where i.lampiran_path=name));

create function private.kirim_notifikasi_izin() returns trigger language plpgsql security definer set search_path='' as $$
declare v_nama text;label text;begin
 select s.nama into v_nama from public.santri s where s.id=new.santri_id;
 label=case new.status when 'menunggu' then 'Pengajuan izin menunggu pemeriksaan' when 'perlu_perbaikan' then 'Pengajuan izin perlu diperbaiki' when 'disetujui' then 'Izin disetujui' when 'ditolak' then 'Izin ditolak' when 'dibatalkan' then 'Izin dibatalkan' when 'sedang_izin' then 'Keberangkatan santri dicatat' when 'sudah_kembali' then 'Santri sudah kembali' end;
 insert into public.notifikasi_perizinan(izin_id,pengguna_id,revisi,judul)
 select new.id,p.id,new.revisi,label||' · '||v_nama from public.profiles p
 where p.id<>auth.uid() and (p.peran::text in ('admin','musyrif') or (new.status<>'menunggu' and p.peran::text='wali' and exists(select 1 from public.wali_santri w where w.profile_id=p.id and w.santri_id=new.santri_id)))
 on conflict(izin_id,pengguna_id,revisi) do nothing;
 return new;
end $$;
revoke all on function private.kirim_notifikasi_izin() from public,anon,authenticated;
create trigger perizinan_notifikasi after insert or update on public.perizinan_santri for each row execute function private.kirim_notifikasi_izin();

create function private.simpan_perizinan(p_data jsonb,p_id uuid,p_revisi integer) returns uuid language plpgsql security definer set search_path='' as $$
declare i public.perizinan_santri;anak uuid;v_kunci uuid;mulai timestamptz;akhir timestamptz;lampiran text;nama text;lama text;aksi text;begin
 if auth.uid() is null then raise exception 'Sesi diperlukan' using errcode='42501';end if;
 anak=(p_data->>'santri_id')::uuid;v_kunci=(p_data->>'kunci')::uuid;mulai=(p_data->>'rencana_keluar')::timestamptz;akhir=(p_data->>'rencana_kembali')::timestamptz;lampiran=nullif(p_data->>'lampiran_path','');
 if not private.wali_anak_izin(anak) then raise exception 'Anda hanya dapat mengajukan izin untuk anak yang tertaut' using errcode='42501';end if;
 perform 1 from public.santri where id=anak and status_aktif for update;if not found then raise exception 'Santri tidak aktif atau tidak tersedia' using errcode='22023';end if;
 select p.nama into nama from public.profiles p where p.id=auth.uid();
 if p_id is null then
  select * into i from public.perizinan_santri where perizinan_santri.kunci=v_kunci;
  if found then
   if i.pengaju_id<>auth.uid() then raise exception 'Kunci pengajuan tidak tersedia' using errcode='42501';end if;
   if row(i.santri_id,i.jenis,i.alasan,i.tujuan,i.rencana_keluar,i.rencana_kembali,i.penjemput,i.hubungan,i.kontak,i.lampiran_path) is distinct from row(anak,p_data->>'jenis',btrim(p_data->>'alasan'),btrim(p_data->>'tujuan'),mulai,akhir,btrim(p_data->>'penjemput'),btrim(p_data->>'hubungan'),btrim(p_data->>'kontak'),lampiran) then raise exception 'Pengajuan sudah tersimpan. Muat ulang, lalu gunakan Ubah pengajuan.' using errcode='22023';end if;
   return i.id;
  end if;
 else
  select * into i from public.perizinan_santri where id=p_id for update;
  if not found or i.pengaju_id is distinct from auth.uid() or i.santri_id<>anak then raise exception 'Pengajuan ini tidak dapat Anda ubah' using errcode='42501';end if;
  if p_revisi is null or i.revisi<>p_revisi then raise exception 'Pengajuan telah berubah. Muat ulang.' using errcode='40001';end if;
  if i.status not in ('menunggu','perlu_perbaikan') then raise exception 'Pengajuan sudah diproses dan tidak dapat diubah' using errcode='22023';end if;
 end if;
 if mulai is null or akhir is null or mulai<now()-interval '15 minutes' or akhir<=mulai then raise exception 'Isi rencana keluar dan kembali yang valid; waktu keluar belum boleh lewat' using errcode='22023';end if;
 if lampiran is not null and (lampiran !~ ('^'||auth.uid()::text||'/[0-9a-f-]{36}\.webp$') or not exists(select 1 from storage.objects o where o.bucket_id='perizinan-lampiran' and o.name=lampiran)) then raise exception 'Lampiran tidak valid atau belum terunggah' using errcode='22023';end if;
 if exists(select 1 from public.perizinan_santri x where x.santri_id=anak and x.id is distinct from p_id and x.status in ('menunggu','perlu_perbaikan','disetujui','sedang_izin') and (x.status='sedang_izin' or (x.rencana_keluar<akhir and x.rencana_kembali>mulai))) then raise exception 'Ada pengajuan aktif pada waktu yang bertabrakan atau santri belum kembali.' using errcode='22023';end if;
 if p_id is null then
  insert into public.perizinan_santri(kunci,santri_id,pengaju_id,pengaju_nama,jenis,alasan,tujuan,rencana_keluar,rencana_kembali,penjemput,hubungan,kontak,lampiran_path)
  values(v_kunci,anak,auth.uid(),nama,p_data->>'jenis',btrim(p_data->>'alasan'),btrim(p_data->>'tujuan'),mulai,akhir,btrim(p_data->>'penjemput'),btrim(p_data->>'hubungan'),btrim(p_data->>'kontak'),lampiran) returning * into i;
  lama=null;aksi='ajukan';
 else
  lama=i.status;aksi='ajukan_ulang';
  update public.perizinan_santri set jenis=p_data->>'jenis',alasan=btrim(p_data->>'alasan'),tujuan=btrim(p_data->>'tujuan'),rencana_keluar=mulai,rencana_kembali=akhir,penjemput=btrim(p_data->>'penjemput'),hubungan=btrim(p_data->>'hubungan'),kontak=btrim(p_data->>'kontak'),lampiran_path=lampiran,status='menunggu',catatan_petugas='',revisi=revisi+1,updated_at=now() where id=p_id returning * into i;
 end if;
 insert into public.perizinan_log(izin_id,pelaku_id,pelaku_nama,aksi,status_dari,status_ke,catatan,revisi) values(i.id,auth.uid(),nama,aksi,lama,i.status,'Pengajuan disampaikan kepada pondok.',i.revisi);
 return i.id;
end $$;
revoke all on function private.simpan_perizinan(jsonb,uuid,integer) from public,anon,authenticated;
grant execute on function private.simpan_perizinan(jsonb,uuid,integer) to authenticated;
create function public.simpan_perizinan(p_data jsonb,p_id uuid default null,p_revisi integer default 0) returns uuid language sql security invoker set search_path='' as $$select private.simpan_perizinan(p_data,p_id,p_revisi);$$;
revoke all on function public.simpan_perizinan(jsonb,uuid,integer) from public,anon,authenticated;
grant execute on function public.simpan_perizinan(jsonb,uuid,integer) to authenticated;

create function private.aksi_perizinan(p_id uuid,p_revisi integer,p_aksi text,p_catatan text) returns void language plpgsql security definer set search_path='' as $$
declare i public.perizinan_santri;baru text;nama text;catatan text=btrim(coalesce(p_catatan,''));petugas boolean;begin
 if not private.boleh_lihat_izin(p_id) then raise exception 'Pengajuan tidak tersedia untuk akun ini' using errcode='42501';end if;
 select * into i from public.perizinan_santri where id=p_id for update;
 if not private.boleh_lihat_izin(p_id) then raise exception 'Akses pengajuan telah berubah' using errcode='42501';end if;
 if p_revisi is null or i.revisi<>p_revisi then raise exception 'Pengajuan sudah diperbarui. Muat ulang sebelum melanjutkan.' using errcode='40001';end if;
 petugas=private.petugas_izin();
 if length(catatan)>2000 then raise exception 'Catatan maksimal 2.000 karakter' using errcode='22023';end if;
 if p_aksi in ('tolak','perbaiki','batalkan') and length(catatan)<5 then raise exception 'Tuliskan alasan minimal 5 karakter' using errcode='22023';end if;
 if p_aksi='batalkan' then
  if not petugas and i.pengaju_id is distinct from auth.uid() then raise exception 'Hanya pengaju atau petugas yang dapat membatalkan' using errcode='42501';end if;
  if i.status not in ('menunggu','perlu_perbaikan','disetujui') then raise exception 'Izin ini tidak dapat dibatalkan' using errcode='22023';end if;baru='dibatalkan';
 else
  if not petugas then raise exception 'Tindakan ini khusus Admin Utama atau Musyrif' using errcode='42501';end if;
  if p_aksi in ('setujui','tolak','perbaiki') and i.status='menunggu' then
   if p_aksi='setujui' and i.rencana_kembali<=now() then raise exception 'Jadwal sudah berakhir. Minta wali memperbaiki jadwal.' using errcode='22023';end if;
   baru=case p_aksi when 'setujui' then 'disetujui' when 'tolak' then 'ditolak' else 'perlu_perbaikan' end;
  elsif p_aksi='keluar' and i.status='disetujui' and i.rencana_kembali>now() then baru='sedang_izin';
  elsif p_aksi='kembali' and i.status='sedang_izin' then baru='sudah_kembali';
  else raise exception 'Urutan tindakan tidak sesuai status izin saat ini' using errcode='22023';end if;
 end if;
 select p.nama into nama from public.profiles p where p.id=auth.uid();
 update public.perizinan_santri set status=baru,catatan_petugas=catatan,keluar_pada=case when baru='sedang_izin' then now() else keluar_pada end,kembali_pada=case when baru='sudah_kembali' then now() else kembali_pada end,revisi=revisi+1,updated_at=now() where id=p_id;
 insert into public.perizinan_log(izin_id,pelaku_id,pelaku_nama,aksi,status_dari,status_ke,catatan,revisi)values(i.id,auth.uid(),nama,p_aksi,i.status,baru,catatan,i.revisi+1);
end $$;
revoke all on function private.aksi_perizinan(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function private.aksi_perizinan(uuid,integer,text,text) to authenticated;
create function public.aksi_perizinan(p_id uuid,p_revisi integer,p_aksi text,p_catatan text default '') returns void language sql security invoker set search_path='' as $$select private.aksi_perizinan(p_id,p_revisi,p_aksi,p_catatan);$$;
revoke all on function public.aksi_perizinan(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.aksi_perizinan(uuid,integer,text,text) to authenticated;

create function public.daftar_perizinan(p_status text default 'semua',p_mulai date default null,p_selesai date default null,p_halaman integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$
 with v as(select i.id,i.santri_id,s.nama santri_nama,k.nama kelas_nama,i.jenis,i.rencana_keluar,i.rencana_kembali,i.keluar_pada,i.kembali_pada,i.status,i.pengaju_nama,i.updated_at,i.revisi,(i.status='sedang_izin' and i.rencana_kembali<now()) terlambat
 from public.perizinan_santri i join public.santri s on s.id=i.santri_id join public.kelas k on k.id=s.kelas_id
 where (p_mulai is null or i.rencana_keluar>=p_mulai::timestamp at time zone 'Asia/Jakarta') and(p_selesai is null or i.rencana_keluar<(p_selesai+1)::timestamp at time zone 'Asia/Jakarta')),
 f as(select * from v where p_status='semua' or status=p_status or(p_status='terlambat' and terlambat)),
 h as(select * from f order by updated_at desc,id desc limit 20 offset greatest(0,least(p_halaman,100000))*20)
 select jsonb_build_object('jumlah',(select count(*) from f),'ringkasan',jsonb_build_object('menunggu',(select count(*) from v where status='menunggu'),'disetujui',(select count(*) from v where status='disetujui'),'sedang_izin',(select count(*) from v where status='sedang_izin'),'terlambat',(select count(*) from v where terlambat)), 'data',coalesce((select jsonb_agg(to_jsonb(h)order by updated_at desc,id desc) from h),'[]'::jsonb));
$$;
revoke all on function public.daftar_perizinan(text,date,date,integer) from public,anon,authenticated;
grant execute on function public.daftar_perizinan(text,date,date,integer) to authenticated;
create function public.detail_perizinan(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select to_jsonb(i)||jsonb_build_object('santri_nama',s.nama,'kelas_nama',k.nama,'terlambat',i.status='sedang_izin' and i.rencana_kembali<now(),'log',coalesce((select jsonb_agg(to_jsonb(l)order by l.id) from public.perizinan_log l where l.izin_id=i.id),'[]'::jsonb))
 from public.perizinan_santri i join public.santri s on s.id=i.santri_id join public.kelas k on k.id=s.kelas_id where i.id=p_id;
$$;
revoke all on function public.detail_perizinan(uuid) from public,anon,authenticated;
grant execute on function public.detail_perizinan(uuid) to authenticated;

create function private.baca_notifikasi_izin(p_id uuid,p_revisi integer) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.boleh_lihat_izin(p_id) then raise exception 'Pengajuan tidak tersedia' using errcode='42501';end if;
 if p_revisi is null or p_revisi>(select revisi from public.perizinan_santri where id=p_id) then raise exception 'Versi pengajuan tidak valid' using errcode='22023';end if;
 update public.notifikasi_perizinan set dibaca_pada=coalesce(dibaca_pada,now()) where izin_id=p_id and pengguna_id=auth.uid() and revisi<=p_revisi;
end $$;
revoke all on function private.baca_notifikasi_izin(uuid,integer) from public,anon,authenticated;
grant execute on function private.baca_notifikasi_izin(uuid,integer) to authenticated;
create function public.baca_notifikasi_izin(p_id uuid,p_revisi integer) returns void language sql security invoker set search_path='' as $$select private.baca_notifikasi_izin(p_id,p_revisi);$$;
revoke all on function public.baca_notifikasi_izin(uuid,integer) from public,anon,authenticated;
grant execute on function public.baca_notifikasi_izin(uuid,integer) to authenticated;
create function private.baca_semua_izin(p_sebelum timestamptz) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sesi diperlukan' using errcode='42501';end if;
 update public.notifikasi_perizinan set dibaca_pada=coalesce(dibaca_pada,now()) where pengguna_id=auth.uid() and created_at<=least(coalesce(p_sebelum,now()),now()) and private.boleh_lihat_izin(izin_id);
end $$;
revoke all on function private.baca_semua_izin(timestamptz) from public,anon,authenticated;
grant execute on function private.baca_semua_izin(timestamptz) to authenticated;
create or replace function public.baca_semua_informasi(p_sebelum timestamptz default now()) returns void language sql security invoker set search_path='' as $$select private.baca_semua_informasi(p_sebelum);select private.baca_semua_izin(p_sebelum);$$;
create or replace function public.jumlah_notifikasi_belum_dibaca() returns bigint language sql stable security invoker set search_path='' as $$
 select (select count(*) from public.informasi_pondok i where private.informasi_untuk_saya(i.id) and not exists(select 1 from public.informasi_bacaan b where b.informasi_id=i.id and b.pengguna_id=auth.uid() and b.revisi=i.revisi))+(select count(*) from public.notifikasi_perizinan where dibaca_pada is null);
$$;
create or replace function public.daftar_notifikasi(p_belum boolean default false,p_halaman integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$
 with v as(
 select i.id,i.id tujuan_id,'informasi'::text sumber,i.judul,i.kategori,i.tanggal,i.updated_at,i.disematkan,i.wajib_konfirmasi,i.revisi,case when b.revisi=i.revisi then b.dibaca_pada end dibaca_pada,case when b.revisi=i.revisi then b.dikonfirmasi_pada end dikonfirmasi_pada from public.informasi_pondok i left join public.informasi_bacaan b on b.informasi_id=i.id and b.pengguna_id=auth.uid() where private.informasi_untuk_saya(i.id)
 union all
 select n.id,n.izin_id,'perizinan',n.judul,'Perizinan Santri',(n.created_at at time zone 'Asia/Jakarta')::date,n.created_at,false,false,n.revisi,n.dibaca_pada,null::timestamptz from public.notifikasi_perizinan n
 ),f as(select * from v where not p_belum or dibaca_pada is null),h as(select * from f order by disematkan desc,updated_at desc,id desc limit 20 offset greatest(0,least(coalesce(p_halaman,0),100000))*20)
 select jsonb_build_object('jumlah',(select count(*) from f),'belum',(select count(*) from v where dibaca_pada is null),'data',coalesce((select jsonb_agg(to_jsonb(h)order by disematkan desc,updated_at desc,id desc) from h),'[]'::jsonb));
$$;

revoke all on function public.baca_semua_informasi(timestamptz),public.jumlah_notifikasi_belum_dibaca(),public.daftar_notifikasi(boolean,integer) from public,anon;
grant execute on function public.baca_semua_informasi(timestamptz),public.jumlah_notifikasi_belum_dibaca(),public.daftar_notifikasi(boolean,integer) to authenticated;
