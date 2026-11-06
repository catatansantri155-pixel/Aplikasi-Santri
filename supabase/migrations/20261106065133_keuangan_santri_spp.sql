-- Keuangan tahap 1: tagihan, pembayaran manual, dan verifikasi. Tidak memindahkan uang.
create table private.spp_penerbitan (
 kunci uuid primary key, pelaku_id uuid references public.profiles(id) on delete set null,
 muatan jsonb not null, hasil jsonb, waktu timestamptz not null default now()
);
alter table private.spp_penerbitan enable row level security;
revoke all on private.spp_penerbitan from public,anon,authenticated;
create table public.tagihan_santri (
 id uuid primary key default gen_random_uuid(), batch_id uuid not null references private.spp_penerbitan(kunci),
 santri_id uuid not null references public.santri(id), judul text not null check(length(btrim(judul)) between 3 and 160),
 jenis text not null check(jenis in ('spp','daftar_ulang','seragam','kegiatan','lainnya')),
 periode date not null check(extract(day from periode)=1 and periode between '1900-01-01' and '2200-12-01'),
 nominal bigint not null check(nominal between 1 and 1000000000),
 jatuh_tempo date not null check(jatuh_tempo between '1900-01-01' and '2200-12-31'),
 catatan text not null default '' check(length(catatan)<=2000),
 status text not null default 'aktif' check(status in ('aktif','dibatalkan')),
 revisi integer not null default 1 check(revisi>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(batch_id,santri_id)
);
create unique index spp_periode_unik on public.tagihan_santri(santri_id,periode) where jenis='spp' and status='aktif';
create index tagihan_santri_tanggal on public.tagihan_santri(santri_id,jatuh_tempo desc);
create index tagihan_batch on public.tagihan_santri(batch_id);
create table public.pembayaran_santri (
 id uuid primary key default gen_random_uuid(), kunci uuid not null unique,
 tagihan_id uuid not null references public.tagihan_santri(id),
 nominal bigint not null check(nominal between 1 and 1000000000), tanggal_bayar date not null check(tanggal_bayar between '1900-01-01' and '2200-12-31'),
 metode text not null check(metode in ('transfer','tunai')), pengirim text not null check(length(btrim(pengirim)) between 3 and 120),
 bukti_path text, catatan text not null default '' check(length(catatan)<=2000),
 status text not null check(status in ('menunggu','diterima','ditolak','dibatalkan')),
 pengaju_id uuid references public.profiles(id) on delete set null, pengaju_nama text not null,
 pemeriksa_id uuid references public.profiles(id) on delete set null, pemeriksa_nama text,
 diperiksa_pada timestamptz, catatan_verifikasi text not null default '', created_at timestamptz not null default now()
);
create index pembayaran_tagihan on public.pembayaran_santri(tagihan_id,created_at);
create index pembayaran_pengaju on public.pembayaran_santri(pengaju_id);
create index pembayaran_pemeriksa on public.pembayaran_santri(pemeriksa_id);
create table public.keuangan_log (
 id bigint generated always as identity primary key, tagihan_id uuid not null references public.tagihan_santri(id),
 pembayaran_id uuid references public.pembayaran_santri(id), pelaku_id uuid references public.profiles(id) on delete set null,
 pelaku_nama text not null, aksi text not null, catatan text not null, revisi integer not null, waktu timestamptz not null default now()
);
create index keuangan_log_tagihan on public.keuangan_log(tagihan_id,id);
create index keuangan_log_pembayaran on public.keuangan_log(pembayaran_id);
create index keuangan_log_pelaku on public.keuangan_log(pelaku_id);
create table public.notifikasi_keuangan (
 id uuid primary key default gen_random_uuid(),tagihan_id uuid not null references public.tagihan_santri(id),pengguna_id uuid not null references public.profiles(id) on delete cascade,
 revisi integer not null,judul text not null,created_at timestamptz not null default now(),dibaca_pada timestamptz,unique(tagihan_id,pengguna_id,revisi)
);
create index notifikasi_keuangan_pengguna on public.notifikasi_keuangan(pengguna_id,created_at desc);
alter table public.tagihan_santri enable row level security;
alter table public.pembayaran_santri enable row level security;
alter table public.keuangan_log enable row level security;
alter table public.notifikasi_keuangan enable row level security;
revoke all on public.tagihan_santri,public.pembayaran_santri,public.keuangan_log,public.notifikasi_keuangan from public,anon,authenticated;
grant select on public.tagihan_santri,public.pembayaran_santri,public.keuangan_log,public.notifikasi_keuangan to authenticated;
grant all on public.tagihan_santri,public.pembayaran_santri,public.keuangan_log,public.notifikasi_keuangan,private.spp_penerbitan to service_role;
grant usage,select on sequence public.keuangan_log_id_seq to service_role;

create function private.admin_keuangan() returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and exists(select 1 from public.profiles p where p.id=auth.uid() and p.peran::text='admin');$$;
create function private.wali_keuangan(p_anak uuid) returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and exists(select 1 from public.profiles p join public.wali_santri w on w.profile_id=p.id where p.id=auth.uid() and p.peran::text='wali' and w.santri_id=p_anak);$$;
create function private.lihat_tagihan(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and exists(select 1 from public.tagihan_santri t where t.id=p_id and(private.admin_keuangan() or private.wali_keuangan(t.santri_id)));$$;
revoke all on function private.admin_keuangan(),private.wali_keuangan(uuid),private.lihat_tagihan(uuid) from public,anon;
grant execute on function private.admin_keuangan(),private.wali_keuangan(uuid),private.lihat_tagihan(uuid) to authenticated;
create policy tagihan_baca on public.tagihan_santri for select to authenticated using(private.lihat_tagihan(id));
create policy pembayaran_baca on public.pembayaran_santri for select to authenticated using(private.lihat_tagihan(tagihan_id));
create policy keuangan_log_baca on public.keuangan_log for select to authenticated using(private.lihat_tagihan(tagihan_id));
create policy keuangan_notifikasi_baca on public.notifikasi_keuangan for select to authenticated using(pengguna_id=(select auth.uid()) and private.lihat_tagihan(tagihan_id));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)values('keuangan-bukti','keuangan-bukti',false,409600,array['image/webp']);
create policy keuangan_bukti_tambah on storage.objects for insert to authenticated with check(bucket_id='keuangan-bukti' and(storage.foldername(name))[1]=(select auth.uid())::text and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.peran::text in ('admin','wali')));
create policy keuangan_bukti_baca on storage.objects for select to authenticated using(bucket_id='keuangan-bukti' and((storage.foldername(name))[1]=(select auth.uid())::text or exists(select 1 from public.pembayaran_santri p where p.bukti_path=name)));
create policy keuangan_bukti_hapus on storage.objects for delete to authenticated using(bucket_id='keuangan-bukti' and(storage.foldername(name))[1]=(select auth.uid())::text and not exists(select 1 from public.pembayaran_santri p where p.bukti_path=name));

-- Dipanggil hanya oleh mutasi tervalidasi; tidak diberi EXECUTE ke klien.
create function private.rekam_keuangan(p_id uuid,p_aksi text,p_catatan text,p_bayar uuid default null,p_naik boolean default true) returns void language plpgsql security definer set search_path='' as $$
declare v public.tagihan_santri;v_nama text;v_anak text;begin
 if auth.uid() is null then raise exception 'Sesi diperlukan' using errcode='42501';end if;
 if p_naik then update public.tagihan_santri set revisi=revisi+1,updated_at=now() where id=p_id returning * into v;else select * into v from public.tagihan_santri where id=p_id;end if;
 select p.nama into v_nama from public.profiles p where p.id=auth.uid();select s.nama into v_anak from public.santri s where s.id=v.santri_id;
 insert into public.keuangan_log(tagihan_id,pembayaran_id,pelaku_id,pelaku_nama,aksi,catatan,revisi)values(p_id,p_bayar,auth.uid(),v_nama,p_aksi,p_catatan,v.revisi);
 insert into public.notifikasi_keuangan(tagihan_id,pengguna_id,revisi,judul)
 select v.id,p.id,v.revisi,p_aksi||' · '||v_anak||' · '||v.judul from public.profiles p where p.id<>auth.uid() and(p.peran::text='admin' or(p.peran::text='wali' and exists(select 1 from public.wali_santri w where w.profile_id=p.id and w.santri_id=v.santri_id)))on conflict do nothing;
end $$;
revoke all on function private.rekam_keuangan(uuid,text,text,uuid,boolean) from public,anon,authenticated;

create function private.terbitkan_tagihan(p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_key uuid=(p_data->>'kunci')::uuid;v_ids uuid[];v_muatan jsonb;v_batch private.spp_penerbitan;v_id uuid;v_baru uuid;v_jumlah int=0;v_skip int=0;v_nominal bigint;begin
 if not private.admin_keuangan() then raise exception 'Penerbitan tagihan hanya untuk Admin Utama' using errcode='42501';end if;
 select array_agg(distinct x::uuid order by x::uuid)into v_ids from jsonb_array_elements_text(p_data->'santri_ids') x;
 if coalesce(cardinality(v_ids),0) not between 1 and 500 then raise exception 'Pilih 1–500 santri aktif untuk sekali penerbitan' using errcode='22023';end if;
 v_nominal=(p_data->>'nominal')::bigint;
 if (p_data->>'nominal') !~ '^[0-9]+$' or v_nominal not between 1 and 1000000000 then raise exception 'Nominal harus rupiah bulat, maksimal satu miliar' using errcode='22023';end if;
 v_muatan=jsonb_build_object('santri_ids',to_jsonb(v_ids),'judul',btrim(p_data->>'judul'),'jenis',p_data->>'jenis','periode',(p_data->>'periode')::date,'nominal',v_nominal,'jatuh_tempo',(p_data->>'jatuh_tempo')::date,'catatan',btrim(coalesce(p_data->>'catatan','')));
 insert into private.spp_penerbitan(kunci,pelaku_id,muatan)values(v_key,auth.uid(),v_muatan)on conflict do nothing;
 select * into v_batch from private.spp_penerbitan where kunci=v_key for update;
 if v_batch.pelaku_id is distinct from auth.uid() or v_batch.muatan is distinct from v_muatan then raise exception 'Kunci penerbitan sudah dipakai. Muat ulang untuk penerbitan baru.' using errcode='22023';end if;
 if v_batch.hasil is not null then return v_batch.hasil;end if;
 perform 1 from public.santri where id=any(v_ids) and status_aktif order by id for update;
 if(select count(*) from public.santri where id=any(v_ids) and status_aktif)<>cardinality(v_ids)then raise exception 'Ada santri tidak aktif atau tidak tersedia. Muat ulang pilihan.' using errcode='22023';end if;
 foreach v_id in array v_ids loop
  v_baru=null;
  insert into public.tagihan_santri(batch_id,santri_id,judul,jenis,periode,nominal,jatuh_tempo,catatan)
  values(v_key,v_id,v_muatan->>'judul',v_muatan->>'jenis',(v_muatan->>'periode')::date,v_nominal,(v_muatan->>'jatuh_tempo')::date,v_muatan->>'catatan')on conflict do nothing returning id into v_baru;
  if v_baru is null then v_skip=v_skip+1;else v_jumlah=v_jumlah+1;perform private.rekam_keuangan(v_baru,'Tagihan diterbitkan','Tagihan baru diterbitkan.',null,false);end if;
 end loop;
 update private.spp_penerbitan set hasil=jsonb_build_object('dibuat',v_jumlah,'dilewati',v_skip)where kunci=v_key returning * into v_batch;return v_batch.hasil;
end $$;
revoke all on function private.terbitkan_tagihan(jsonb) from public,anon;grant execute on function private.terbitkan_tagihan(jsonb) to authenticated;
create function public.terbitkan_tagihan(p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.terbitkan_tagihan(p_data);$$;
revoke all on function public.terbitkan_tagihan(jsonb) from public,anon;grant execute on function public.terbitkan_tagihan(jsonb) to authenticated;

create function private.kirim_pembayaran(p_id uuid,p_revisi integer,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare t public.tagihan_santri;b public.pembayaran_santri;v_key uuid=(p_data->>'kunci')::uuid;v_nominal bigint;v_tanggal date=(p_data->>'tanggal_bayar')::date;v_bukti text=nullif(p_data->>'bukti_path','');v_nama text;v_admin boolean;v_dipesan bigint;begin
 if not private.lihat_tagihan(p_id)then raise exception 'Tagihan tidak tersedia untuk akun ini' using errcode='42501';end if;
 select * into t from public.tagihan_santri where id=p_id for update;
 if not private.lihat_tagihan(p_id)then raise exception 'Akses tagihan berubah' using errcode='42501';end if;
 v_admin=private.admin_keuangan();v_nominal=(p_data->>'nominal')::bigint;
 if(p_data->>'nominal')!~'^[0-9]+$' or v_nominal not between 1 and 1000000000 then raise exception 'Isi nominal rupiah bulat yang valid' using errcode='22023';end if;
 select * into b from public.pembayaran_santri where kunci=v_key;
 if found then
  if b.pengaju_id is distinct from auth.uid() or row(b.tagihan_id,b.nominal,b.tanggal_bayar,b.metode,b.pengirim,b.bukti_path,b.catatan)is distinct from row(p_id,v_nominal,v_tanggal,p_data->>'metode',btrim(p_data->>'pengirim'),v_bukti,btrim(coalesce(p_data->>'catatan','')))then raise exception 'Pembayaran sudah tersimpan dengan data berbeda. Muat ulang riwayat.' using errcode='22023';end if;return b.id;
 end if;
 if p_revisi is null or p_revisi<>t.revisi then raise exception 'Tagihan berubah. Muat ulang sebelum mengirim pembayaran.' using errcode='40001';end if;
 if t.status<>'aktif' then raise exception 'Tagihan dibatalkan dan tidak menerima pembayaran' using errcode='22023';end if;
 if v_tanggal is null or v_tanggal>(now()at time zone 'Asia/Jakarta')::date then raise exception 'Tanggal pembayaran tidak boleh di masa depan' using errcode='22023';end if;
 if not v_admin and(p_data->>'metode' is distinct from 'transfer' or v_bukti is null)then raise exception 'Wali perlu mengunggah bukti transfer' using errcode='22023';end if;
 if v_bukti is not null and(v_bukti!~('^'||auth.uid()::text||'/[0-9a-f-]{36}\.webp$')or not exists(select 1 from storage.objects o where o.bucket_id='keuangan-bukti' and o.name=v_bukti))then raise exception 'Bukti belum terunggah atau bukan milik Anda' using errcode='22023';end if;
 select coalesce(sum(p.nominal),0)into v_dipesan from public.pembayaran_santri p where p.tagihan_id=p_id and p.status in ('menunggu','diterima');
 if v_nominal>t.nominal-v_dipesan then raise exception 'Nominal melebihi sisa yang dapat diajukan. Pembayaran menunggu verifikasi juga diperhitungkan.' using errcode='22023';end if;
 select p.nama into v_nama from public.profiles p where p.id=auth.uid();
 insert into public.pembayaran_santri(kunci,tagihan_id,nominal,tanggal_bayar,metode,pengirim,bukti_path,catatan,status,pengaju_id,pengaju_nama,pemeriksa_id,pemeriksa_nama,diperiksa_pada)
 values(v_key,p_id,v_nominal,v_tanggal,p_data->>'metode',btrim(p_data->>'pengirim'),v_bukti,btrim(coalesce(p_data->>'catatan','')),case when v_admin then 'diterima' else 'menunggu' end,auth.uid(),v_nama,case when v_admin then auth.uid()end,case when v_admin then v_nama end,case when v_admin then now()end)returning * into b;
 perform private.rekam_keuangan(p_id,case when v_admin then 'Pembayaran dicatat admin' else 'Bukti pembayaran dikirim' end,b.catatan,b.id);return b.id;
end $$;
revoke all on function private.kirim_pembayaran(uuid,integer,jsonb) from public,anon;grant execute on function private.kirim_pembayaran(uuid,integer,jsonb) to authenticated;
create function public.kirim_pembayaran(p_id uuid,p_revisi integer,p_data jsonb)returns uuid language sql security invoker set search_path='' as $$select private.kirim_pembayaran(p_id,p_revisi,p_data);$$;
revoke all on function public.kirim_pembayaran(uuid,integer,jsonb) from public,anon;grant execute on function public.kirim_pembayaran(uuid,integer,jsonb) to authenticated;

create function private.aksi_keuangan(p_id uuid,p_revisi integer,p_aksi text,p_bayar uuid,p_catatan text) returns void language plpgsql security definer set search_path='' as $$
declare t public.tagihan_santri;b public.pembayaran_santri;v_catatan text=btrim(coalesce(p_catatan,''));v_nama text;v_total bigint;v_admin boolean;v_status text;v_label text;begin
 if not private.lihat_tagihan(p_id)then raise exception 'Tagihan tidak tersedia' using errcode='42501';end if;
 select * into t from public.tagihan_santri where id=p_id for update;
 if not private.lihat_tagihan(p_id)then raise exception 'Akses tagihan berubah' using errcode='42501';end if;
 if p_revisi is null or p_revisi<>t.revisi then raise exception 'Data telah berubah. Muat ulang sebelum melanjutkan.' using errcode='40001';end if;
 if length(v_catatan)>2000 or(p_aksi<>'terima' and length(v_catatan)<5)then raise exception 'Tuliskan alasan 5–2.000 karakter' using errcode='22023';end if;
 if t.status<>'aktif'then raise exception 'Tagihan sudah dibatalkan' using errcode='22023';end if;
 v_admin=private.admin_keuangan();select p.nama into v_nama from public.profiles p where p.id=auth.uid();
 if p_aksi='batalkan_tagihan' then
  if not v_admin then raise exception 'Pembatalan tagihan khusus admin' using errcode='42501';end if;
  if exists(select 1 from public.pembayaran_santri p where p.tagihan_id=p_id and p.status in ('menunggu','diterima'))then raise exception 'Selesaikan atau batalkan pembayaran aktif sebelum membatalkan tagihan' using errcode='22023';end if;
  update public.tagihan_santri set status='dibatalkan' where id=p_id;v_label='Tagihan dibatalkan';p_bayar=null;
 else
  select * into b from public.pembayaran_santri where id=p_bayar and tagihan_id=p_id for update;
  if not found then raise exception 'Pembayaran tidak ditemukan' using errcode='22023';end if;
  if p_aksi='tarik' and b.status='menunggu' and(v_admin or b.pengaju_id=auth.uid())then v_status='dibatalkan';v_label='Pengajuan pembayaran ditarik';
  elsif v_admin and p_aksi in('terima','tolak') and b.status='menunggu'then v_status=case when p_aksi='terima'then 'diterima'else 'ditolak'end;v_label=case when p_aksi='terima'then 'Pembayaran diterima'else 'Pembayaran ditolak'end;
   if p_aksi='terima'then select coalesce(sum(p.nominal),0)into v_total from public.pembayaran_santri p where p.tagihan_id=p_id and p.status='diterima';if b.nominal>t.nominal-v_total then raise exception 'Pembayaran melebihi sisa tagihan' using errcode='22023';end if;end if;
  elsif v_admin and p_aksi='koreksi' and b.status='diterima'then v_status='dibatalkan';v_label='Pembayaran dikoreksi / dibatalkan';
  else raise exception 'Tindakan tidak tersedia untuk akun atau status pembayaran ini' using errcode='42501';end if;
  update public.pembayaran_santri set status=v_status,pemeriksa_id=auth.uid(),pemeriksa_nama=v_nama,diperiksa_pada=now(),catatan_verifikasi=v_catatan where id=b.id;
 end if;
 perform private.rekam_keuangan(p_id,v_label,v_catatan,p_bayar);
end $$;
revoke all on function private.aksi_keuangan(uuid,integer,text,uuid,text) from public,anon;grant execute on function private.aksi_keuangan(uuid,integer,text,uuid,text) to authenticated;
create function public.aksi_keuangan(p_id uuid,p_revisi integer,p_aksi text,p_bayar uuid default null,p_catatan text default '')returns void language sql security invoker set search_path='' as $$select private.aksi_keuangan(p_id,p_revisi,p_aksi,p_bayar,p_catatan);$$;
revoke all on function public.aksi_keuangan(uuid,integer,text,uuid,text) from public,anon;grant execute on function public.aksi_keuangan(uuid,integer,text,uuid,text) to authenticated;

create view public.ringkasan_tagihan with(security_invoker=true) as
 select t.*,s.nama santri_nama,k.nama kelas_nama,
 coalesce(p.diterima,0)::bigint terbayar,coalesce(p.menunggu,0)::bigint menunggu,
 case when t.status='dibatalkan'then 0 else t.nominal-coalesce(p.diterima,0)end::bigint sisa,
 case when t.status='dibatalkan'then 'dibatalkan'when coalesce(p.diterima,0)>=t.nominal then 'lunas'when coalesce(p.diterima,0)>0 then 'sebagian'else 'belum_bayar'end status_bayar,
 t.status='aktif'and t.nominal>coalesce(p.diterima,0)and t.jatuh_tempo<(now()at time zone 'Asia/Jakarta')::date terlambat
 from public.tagihan_santri t join public.santri s on s.id=t.santri_id join public.kelas k on k.id=s.kelas_id
 left join lateral(select sum(b.nominal)filter(where b.status='diterima')diterima,sum(b.nominal)filter(where b.status='menunggu')menunggu from public.pembayaran_santri b where b.tagihan_id=t.id)p on true;
revoke all on public.ringkasan_tagihan from public,anon;grant select on public.ringkasan_tagihan to authenticated;
create function public.daftar_tagihan(p_status text default 'semua',p_mulai date default null,p_selesai date default null,p_cari text default '',p_halaman integer default 0)returns jsonb language sql stable security invoker set search_path='' as $$
 with v as(select * from public.ringkasan_tagihan t where(p_mulai is null or jatuh_tempo>=p_mulai)and(p_selesai is null or jatuh_tempo<=p_selesai)and(coalesce(btrim(p_cari),'')=''or strpos(lower(santri_nama||' '||judul||' '||kelas_nama),lower(left(btrim(p_cari),100)))>0)),
 f as(select * from v where p_status='semua'or status_bayar=p_status or(p_status='terlambat'and terlambat)or(p_status='menunggu'and menunggu>0)),
 h as(select * from f order by jatuh_tempo,id limit 20 offset greatest(0,least(coalesce(p_halaman,0),100000))*20)
 select jsonb_build_object('jumlah',(select count(*)from f),'ringkasan',jsonb_build_object('tagihan',(select coalesce(sum(nominal),0)from v where status='aktif'),'terbayar',(select coalesce(sum(terbayar),0)from v where status='aktif'),'sisa',(select coalesce(sum(sisa),0)from v),'menunggu',(select coalesce(sum(menunggu),0)from v)),'data',coalesce((select jsonb_agg(to_jsonb(h)order by jatuh_tempo,id)from h),'[]'::jsonb));
$$;
create function public.detail_tagihan(p_id uuid)returns jsonb language sql stable security invoker set search_path='' as $$select to_jsonb(t)||jsonb_build_object('pembayaran',coalesce((select jsonb_agg(to_jsonb(b)order by b.created_at,b.id)from public.pembayaran_santri b where b.tagihan_id=t.id),'[]'::jsonb),'log',coalesce((select jsonb_agg(to_jsonb(l)order by l.id)from public.keuangan_log l where l.tagihan_id=t.id),'[]'::jsonb))from public.ringkasan_tagihan t where t.id=p_id;$$;
revoke all on function public.daftar_tagihan(text,date,date,text,integer),public.detail_tagihan(uuid) from public,anon;
grant execute on function public.daftar_tagihan(text,date,date,text,integer),public.detail_tagihan(uuid) to authenticated;

create function private.baca_keuangan(p_id uuid,p_revisi integer)returns void language plpgsql security definer set search_path='' as $$begin
 if not private.lihat_tagihan(p_id)then raise exception 'Tagihan tidak tersedia'using errcode='42501';end if;
 if p_revisi is null or p_revisi>(select revisi from public.tagihan_santri where id=p_id)then raise exception 'Versi tagihan tidak valid'using errcode='22023';end if;
 update public.notifikasi_keuangan set dibaca_pada=coalesce(dibaca_pada,now())where pengguna_id=auth.uid()and tagihan_id=p_id and revisi<=p_revisi;
end $$;
revoke all on function private.baca_keuangan(uuid,integer)from public,anon;grant execute on function private.baca_keuangan(uuid,integer)to authenticated;
create function public.baca_keuangan(p_id uuid,p_revisi integer)returns void language sql security invoker set search_path=''as $$select private.baca_keuangan(p_id,p_revisi);$$;
revoke all on function public.baca_keuangan(uuid,integer)from public,anon;grant execute on function public.baca_keuangan(uuid,integer)to authenticated;
create function private.baca_semua_keuangan(p_sebelum timestamptz)returns void language plpgsql security definer set search_path=''as $$begin
 if auth.uid()is null then raise exception 'Sesi diperlukan'using errcode='42501';end if;
 update public.notifikasi_keuangan set dibaca_pada=coalesce(dibaca_pada,now())where pengguna_id=auth.uid()and created_at<=least(coalesce(p_sebelum,now()),now())and private.lihat_tagihan(tagihan_id);
end $$;
revoke all on function private.baca_semua_keuangan(timestamptz)from public,anon;grant execute on function private.baca_semua_keuangan(timestamptz)to authenticated;

create or replace function public.baca_semua_informasi(p_sebelum timestamptz default now()) returns void language sql security invoker set search_path='' as $$select private.baca_semua_informasi(p_sebelum);select private.baca_semua_izin(p_sebelum);select private.baca_semua_keuangan(p_sebelum);$$;
create or replace function public.jumlah_notifikasi_belum_dibaca() returns bigint language sql stable security invoker set search_path='' as $$
 select (select count(*) from public.informasi_pondok i where private.informasi_untuk_saya(i.id) and not exists(select 1 from public.informasi_bacaan b where b.informasi_id=i.id and b.pengguna_id=auth.uid() and b.revisi=i.revisi))+(select count(*) from public.notifikasi_perizinan where dibaca_pada is null)+(select count(*)from public.notifikasi_keuangan where dibaca_pada is null);
$$;
create or replace function public.daftar_notifikasi(p_belum boolean default false,p_halaman integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$
 with v as(
 select i.id,i.id tujuan_id,'informasi'::text sumber,i.judul,i.kategori,i.tanggal,i.updated_at,i.disematkan,i.wajib_konfirmasi,i.revisi,case when b.revisi=i.revisi then b.dibaca_pada end dibaca_pada,case when b.revisi=i.revisi then b.dikonfirmasi_pada end dikonfirmasi_pada from public.informasi_pondok i left join public.informasi_bacaan b on b.informasi_id=i.id and b.pengguna_id=auth.uid() where private.informasi_untuk_saya(i.id)
 union all
 select n.id,n.izin_id,'perizinan',n.judul,'Perizinan Santri',(n.created_at at time zone 'Asia/Jakarta')::date,n.created_at,false,false,n.revisi,n.dibaca_pada,null::timestamptz from public.notifikasi_perizinan n
 union all
 select n.id,n.tagihan_id,'keuangan',n.judul,'Keuangan / SPP',(n.created_at at time zone 'Asia/Jakarta')::date,n.created_at,false,false,n.revisi,n.dibaca_pada,null::timestamptz from public.notifikasi_keuangan n
 ),f as(select * from v where not p_belum or dibaca_pada is null),h as(select * from f order by disematkan desc,updated_at desc,id desc limit 20 offset greatest(0,least(coalesce(p_halaman,0),100000))*20)
 select jsonb_build_object('jumlah',(select count(*) from f),'belum',(select count(*) from v where dibaca_pada is null),'data',coalesce((select jsonb_agg(to_jsonb(h)order by disematkan desc,updated_at desc,id desc) from h),'[]'::jsonb));
$$;

revoke all on function public.baca_semua_informasi(timestamptz),public.jumlah_notifikasi_belum_dibaca(),public.daftar_notifikasi(boolean,integer) from public,anon;
grant execute on function public.baca_semua_informasi(timestamptz),public.jumlah_notifikasi_belum_dibaca(),public.daftar_notifikasi(boolean,integer) to authenticated;
