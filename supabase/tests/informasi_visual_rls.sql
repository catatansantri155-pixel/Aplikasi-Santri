begin;
select set_config('test.admin_id',(select id::text from public.profiles where peran='admin' order by created_at limit 1),true);
select set_config('test.wali_id',(select id::text from public.profiles where peran='wali' order by created_at limit 1),true);
select set_config('test.gambar_draf',current_setting('test.admin_id')||'/'||gen_random_uuid()::text||'.png',true);
select set_config('test.gambar_terbit',current_setting('test.admin_id')||'/'||gen_random_uuid()::text||'.webp',true);
select set_config('test.gambar_lepas',current_setting('test.admin_id')||'/'||gen_random_uuid()::text||'.jpg',true);
select set_config('request.jwt.claim.sub',current_setting('test.admin_id'),true);
set local role authenticated;
-- Metadata fixture hanya di transaksi ini; tidak ada berkas/objek uji permanen.
insert into storage.objects(bucket_id,name) values
 ('informasi-pondok',current_setting('test.gambar_draf')),
 ('informasi-pondok',current_setting('test.gambar_terbit')),
 ('informasi-pondok',current_setting('test.gambar_lepas'));
insert into public.informasi_pondok(judul,isi,status,gambar_path,tema) values
 ('__uji_visual_draf__','','draf',current_setting('test.gambar_draf'),'emas'),
 ('__uji_visual_terbit__','','terbit',current_setting('test.gambar_terbit'),'biru');
do $$ declare n int; begin
 select count(*) into n from storage.objects where name in (current_setting('test.gambar_draf'),current_setting('test.gambar_terbit'));
 if n<>2 then raise exception 'Admin tidak dapat membaca kedua gambar';end if;
 begin
  insert into public.informasi_pondok(judul,isi,gambar_path) values ('__uji_visual_palsu__','',current_setting('test.admin_id')||'/'||gen_random_uuid()::text||'.png');
  raise exception 'Gambar fiktif lolos';
 exception when check_violation then null;end;
 -- Jangan hapus metadata Storage secara SQL: operasi hapus diuji via definisi policy dan Storage API.
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.wali_id'),true);
set local role authenticated;
do $$ declare n int;begin
 select count(*) into n from storage.objects where name=current_setting('test.gambar_draf');
 if n<>0 then raise exception 'Wali dapat membaca gambar draf';end if;
 select count(*) into n from storage.objects where name=current_setting('test.gambar_terbit');
 if n<>1 then raise exception 'Wali tidak dapat membaca gambar terbitan';end if;
 begin
  insert into storage.objects(bucket_id,name) values ('informasi-pondok',current_setting('test.wali_id')||'/'||gen_random_uuid()::text||'.png');
  raise exception 'Wali dapat mengunggah';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ declare n int;begin
 select count(*) into n from storage.objects where bucket_id='informasi-pondok';
 if n<>0 then raise exception 'Anon dapat membaca gambar';end if;
end $$;
reset role;
rollback;
select json_build_object('uji','Poster tanpa isi; admin unggah/baca; wali hanya baca gambar terbit; unggah wali dan baca anon ditolak; jalur fiktif ditolak; rollback seluruh fixture','sisa',(select count(*) from public.informasi_pondok where judul like '__uji_visual_%')) as hasil;
