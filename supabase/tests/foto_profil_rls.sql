begin;
select set_config('test.foto_owner',(select p.id::text from public.profiles p where p.peran='wali' and not exists(select 1 from storage.objects o where o.bucket_id='foto-profil' and o.name=p.id::text||'/avatar.webp') limit 1),true);
select set_config('test.foto_other',(select id::text from public.profiles where peran='admin' and id::text<>current_setting('test.foto_owner') limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('test.foto_owner'),true);
set local role authenticated;
insert into storage.objects(bucket_id,name) values('foto-profil',current_setting('test.foto_owner')||'/avatar.webp');
do $$ declare n int;begin
 select count(*) into n from storage.objects where bucket_id='foto-profil' and name=current_setting('test.foto_owner')||'/avatar.webp';
 if n<>1 then raise exception 'Pemilik tidak dapat membaca';end if;
 update storage.objects set metadata='{"uji_foto":true}'::jsonb where bucket_id='foto-profil' and name=current_setting('test.foto_owner')||'/avatar.webp';
 if not found then raise exception 'Pemilik tidak dapat mengganti';end if;
 begin insert into storage.objects(bucket_id,name) values('foto-profil',current_setting('test.foto_other')||'/avatar.webp');raise exception 'Upload lintas akun lolos';exception when insufficient_privilege then null;end;
 begin insert into storage.objects(bucket_id,name) values('foto-profil',current_setting('test.foto_owner')||'/tambahan.webp');raise exception 'Berkas tambahan lolos';exception when insufficient_privilege then null;end;
 begin update storage.objects set name=current_setting('test.foto_other')||'/avatar.webp' where bucket_id='foto-profil' and name=current_setting('test.foto_owner')||'/avatar.webp';raise exception 'Pemindahan akun lolos';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.foto_other'),true);
set local role authenticated;
do $$ declare n int;begin
 select count(*) into n from storage.objects where bucket_id='foto-profil' and name=current_setting('test.foto_owner')||'/avatar.webp';if n<>0 then raise exception 'Admin membaca foto akun lain';end if;
 update storage.objects set metadata='{}'::jsonb where bucket_id='foto-profil' and name=current_setting('test.foto_owner')||'/avatar.webp';get diagnostics n=row_count;if n<>0 then raise exception 'Admin mengubah foto akun lain';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ declare n int;begin
 select count(*) into n from storage.objects where bucket_id='foto-profil';if n<>0 then raise exception 'Anon dapat membaca foto';end if;
end $$;
reset role;
rollback;
select json_build_object('uji','Pemilik insert/select/update; lintas akun, pemindahan jalur, file tambahan dan anon ditolak; rollback seluruh fixture','bucket',(select json_build_object('private',not public,'batas_byte',file_size_limit,'mime',allowed_mime_types) from storage.buckets where id='foto-profil')) as hasil;
