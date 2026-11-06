-- Uji integrasi hosted; membutuhkan admin, wali tertaut, dan kelas.
-- Semua fixture serta simulasi peran bersifat transaksional dan di-ROLLBACK.
begin;
select set_config('test.admin',(select id::text from profiles where peran='admin'limit 1),true);
select set_config('test.wali',(select w.profile_id::text from wali_santri w join profiles p on p.id=w.profile_id where p.peran='wali'limit 1),true);
select set_config('test.anak',(select santri_id::text from wali_santri where profile_id=current_setting('test.wali')::uuid limit 1),true);
select set_config('test.kelas',(select kelas_id::text from public.santri where id=current_setting('test.anak')::uuid),true);
select set_config('test.anak',gen_random_uuid()::text,true);
insert into public.santri(id,nama,nama_ayah_wali,kelas_id,status_aktif)values(current_setting('test.anak')::uuid,'__qa_layanan__','Wali uji sementara',current_setting('test.kelas')::uuid,true);
insert into public.wali_santri(profile_id,santri_id)values(current_setting('test.wali')::uuid,current_setting('test.anak')::uuid);
select set_config('test.asing',gen_random_uuid()::text,true);
insert into santri(id,nama,nama_ayah_wali,kelas_id,status_aktif)select current_setting('test.asing')::uuid,'Santri asing','Wali uji sementara',kelas_id,true from santri where id=current_setting('test.anak')::uuid;
select set_config('test.data',jsonb_build_object('kunci',gen_random_uuid(),'santri_ids',jsonb_build_array(current_setting('test.anak'),current_setting('test.asing')),'judul','SPP __qa_layanan__','jenis','spp','periode',date_trunc('month',now())::date,'nominal',100000,'jatuh_tempo',current_date-1,'catatan','Hubungi admin pondok')::text,true);
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
set local role authenticated;
do $$declare r jsonb;begin
 begin perform public.terbitkan_tagihan(current_setting('test.data')::jsonb||jsonb_build_object('kunci',gen_random_uuid(),'santri_ids',jsonb_build_array(gen_random_uuid())));raise exception 'Santri tidak tersedia lolos';exception when sqlstate '22023'then null;end;
 r=public.terbitkan_tagihan(current_setting('test.data')::jsonb);if(r->>'dibuat')::int<>2 then raise exception 'Batch tidak menerbitkan dua tagihan';end if;
 if public.terbitkan_tagihan(current_setting('test.data')::jsonb)<>r then raise exception 'Retry tidak idempoten';end if;
 if(select count(*)from tagihan_santri where santri_id in(current_setting('test.anak')::uuid,current_setting('test.asing')::uuid))<>2 then raise exception 'Retry menggandakan tagihan';end if;
 r=public.terbitkan_tagihan(current_setting('test.data')::jsonb||jsonb_build_object('kunci',gen_random_uuid()));if(r->>'dibuat')::int<>0 or(r->>'dilewati')::int<>2 then raise exception 'SPP duplikat tidak dilewati';end if;
 begin perform public.terbitkan_tagihan(current_setting('test.data')::jsonb||'{"nominal":100001}'::jsonb);raise exception 'Kunci batch berubah lolos';exception when sqlstate '22023'then null;end;
 begin perform public.terbitkan_tagihan(current_setting('test.data')::jsonb||jsonb_build_object('kunci',gen_random_uuid(),'nominal','123.5'));raise exception 'Pecahan rupiah lolos';exception when sqlstate '22023' or invalid_text_representation then null;end;
end $$;
select set_config('test.tagihan',(select id::text from tagihan_santri where santri_id=current_setting('test.anak')::uuid),true);
select set_config('test.rahasia',(select id::text from tagihan_santri where santri_id=current_setting('test.asing')::uuid),true);
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.wali'),true);
set local role authenticated;
select set_config('test.bukti',current_setting('test.wali')||'/'||gen_random_uuid()::text||'.webp',true);
insert into storage.objects(bucket_id,name)values('keuangan-bukti',current_setting('test.bukti'));
select set_config('test.bayar',jsonb_build_object('kunci',gen_random_uuid(),'nominal',40000,'tanggal_bayar',current_date,'metode','transfer','pengirim','Wali Santri','bukti_path',current_setting('test.bukti'),'catatan','Cicilan pertama')::text,true);
do $$declare d jsonb;begin
 if(select count(*)from ringkasan_tagihan where santri_id=current_setting('test.anak')::uuid)<>1 then raise exception 'Tagihan anak asing bocor';end if;
 if public.detail_tagihan(current_setting('test.rahasia')::uuid)is not null then raise exception 'Detail asing bocor';end if;
 begin perform public.terbitkan_tagihan(current_setting('test.data')::jsonb);raise exception 'Wali menerbitkan tagihan';exception when insufficient_privilege then null;end;
 begin perform public.kirim_pembayaran(current_setting('test.tagihan')::uuid,1,current_setting('test.bayar')::jsonb||'{"bukti_path":null}'::jsonb);raise exception 'Tanpa bukti lolos';exception when sqlstate '22023'then null;end;
 begin perform public.kirim_pembayaran(current_setting('test.tagihan')::uuid,null,current_setting('test.bayar')::jsonb);raise exception 'Revisi null lolos';exception when serialization_failure then null;end;
 begin perform public.kirim_pembayaran(current_setting('test.rahasia')::uuid,1,current_setting('test.bayar')::jsonb);raise exception 'Bayar anak asing lolos';exception when insufficient_privilege then null;end;
end $$;
select set_config('test.pembayaran',public.kirim_pembayaran(current_setting('test.tagihan')::uuid,1,current_setting('test.bayar')::jsonb)::text,true);
do $$declare d jsonb;begin
 if public.kirim_pembayaran(current_setting('test.tagihan')::uuid,1,current_setting('test.bayar')::jsonb)<>current_setting('test.pembayaran')::uuid then raise exception 'Retry bayar menggandakan';end if;
 if(public.daftar_tagihan('semua',current_date,current_date,'SPP __qa_layanan__')->>'jumlah')::int<>0 then raise exception 'Filter jatuh tempo gagal';end if;
 if(public.daftar_tagihan('semua',current_date-1,current_date-1,'SPP __qa_layanan__')->'ringkasan'->>'tagihan')::bigint<>100000 then raise exception 'Ringkasan wali bocor';end if;
 d=public.detail_tagihan(current_setting('test.tagihan')::uuid);if(d->>'terbayar')::bigint<>0 or(d->>'sisa')::bigint<>100000 or(d->>'menunggu')::bigint<>40000 then raise exception 'Bukti belum diterima mengurangi saldo';end if;
 begin perform public.kirim_pembayaran(current_setting('test.tagihan')::uuid,2,current_setting('test.bayar')::jsonb||jsonb_build_object('kunci',gen_random_uuid(),'nominal',60001));raise exception 'Pembayaran melebihi cadangan lolos';exception when sqlstate '22023'then null;end;
 begin perform public.aksi_keuangan(current_setting('test.tagihan')::uuid,2,'terima',current_setting('test.pembayaran')::uuid);raise exception 'Wali verifikasi sendiri';exception when insufficient_privilege then null;end;
 begin update pembayaran_santri set status='diterima';raise exception 'Direct mutation lolos';exception when insufficient_privilege then null;end;
 begin delete from keuangan_log;raise exception 'Audit terhapus';exception when insufficient_privilege then null;end;
 -- Storage DELETE is tested locally; hosted Storage API has a protective trigger.
 if not(d->>'terlambat')::boolean then raise exception 'Jatuh tempo tidak dihitung';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
set local role authenticated;
select set_config('test.tunai',public.kirim_pembayaran(current_setting('test.tagihan')::uuid,2,jsonb_build_object('kunci',gen_random_uuid(),'nominal',30000,'tanggal_bayar',current_date,'metode','tunai','pengirim','Ayah Santri','catatan','Diterima tunai'))::text,true);
do $$declare d jsonb;begin
 d=public.detail_tagihan(current_setting('test.tagihan')::uuid);if(d->>'sisa')::bigint<>70000 or(d->>'terbayar')::bigint<>30000 then raise exception 'Pembayaran tunai salah';end if;
 begin perform public.aksi_keuangan(current_setting('test.tagihan')::uuid,2,'terima',current_setting('test.pembayaran')::uuid);raise exception 'Revisi usang lolos';exception when serialization_failure then null;end;
 perform public.aksi_keuangan(current_setting('test.tagihan')::uuid,3,'terima',current_setting('test.pembayaran')::uuid,'Dana masuk rekening');
 d=public.detail_tagihan(current_setting('test.tagihan')::uuid);if(d->>'terbayar')::bigint<>70000 or(d->>'menunggu')::bigint<>0 or d->>'status_bayar'<>'sebagian'then raise exception 'Cicilan/verifikasi salah';end if;
 begin perform public.aksi_keuangan(current_setting('test.tagihan')::uuid,4,'terima',current_setting('test.pembayaran')::uuid);raise exception 'Terima ganda lolos';exception when insufficient_privilege then null;end;
 if not exists(select 1 from storage.objects where name=current_setting('test.bukti'))then raise exception 'Admin tidak melihat bukti';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.wali'),true);
set local role authenticated;
do $$declare v uuid;d jsonb;begin
 v=public.kirim_pembayaran(current_setting('test.tagihan')::uuid,4,current_setting('test.bayar')::jsonb||jsonb_build_object('kunci',gen_random_uuid(),'nominal',10000));
 perform public.aksi_keuangan(current_setting('test.tagihan')::uuid,5,'tarik',v,'Salah bukti transfer');
 d=public.detail_tagihan(current_setting('test.tagihan')::uuid);if(d->>'terbayar')::bigint<>70000 or(d->>'menunggu')::bigint<>0 then raise exception 'Penarikan mengubah saldo diterima';end if;
 perform public.baca_keuangan(current_setting('test.tagihan')::uuid,1);
 if not exists(select 1 from notifikasi_keuangan where dibaca_pada is null and revisi>1)then raise exception 'Revisi belum dibaca ikut terbaca';end if;
 if not exists(select 1 from jsonb_array_elements(public.daftar_notifikasi()->'data')x where x->>'sumber'='keuangan'and x->>'tujuan_id'=current_setting('test.tagihan'))then raise exception 'Notifikasi global tidak menyertakan SPP';end if;
 perform public.baca_semua_informasi(now());if exists(select 1 from notifikasi_keuangan where dibaca_pada is null)then raise exception 'Tandai semua gagal';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
set local role authenticated;
select set_config('test.lunas',public.kirim_pembayaran(current_setting('test.tagihan')::uuid,6,jsonb_build_object('kunci',gen_random_uuid(),'nominal',30000,'tanggal_bayar',current_date,'metode','tunai','pengirim','Ayah Santri','catatan','Pelunasan'))::text,true);
do $$declare d jsonb;begin
 d=public.detail_tagihan(current_setting('test.tagihan')::uuid);if d->>'status_bayar'<>'lunas'or(d->>'sisa')::bigint<>0 or(d->>'terlambat')::boolean then raise exception 'Lunas salah';end if;
 begin perform public.aksi_keuangan(current_setting('test.tagihan')::uuid,7,'batalkan_tagihan',null,'Batal sebelum koreksi');raise exception 'Tagihan berbayar dibatalkan';exception when sqlstate '22023'then null;end;
 begin perform public.aksi_keuangan(current_setting('test.tagihan')::uuid,7,'koreksi',current_setting('test.pembayaran')::uuid,'');raise exception 'Koreksi tanpa alasan lolos';exception when sqlstate '22023'then null;end;
 perform public.aksi_keuangan(current_setting('test.tagihan')::uuid,7,'koreksi',current_setting('test.pembayaran')::uuid,'Bukti transfer tidak sah');
 d=public.detail_tagihan(current_setting('test.tagihan')::uuid);if(d->>'sisa')::bigint<>40000 then raise exception 'Koreksi tidak mengembalikan saldo';end if;
 perform public.aksi_keuangan(current_setting('test.tagihan')::uuid,8,'koreksi',current_setting('test.tunai')::uuid,'Salah pencatatan transaksi');
 perform public.aksi_keuangan(current_setting('test.tagihan')::uuid,9,'koreksi',current_setting('test.lunas')::uuid,'Salah pencatatan pelunasan');
 perform public.aksi_keuangan(current_setting('test.tagihan')::uuid,10,'batalkan_tagihan',null,'Tagihan diganti dengan nominal benar');
 d=public.detail_tagihan(current_setting('test.tagihan')::uuid);if d->>'status_bayar'<>'dibatalkan'or(d->>'sisa')::bigint<>0 or jsonb_array_length(d->'pembayaran')<>4 then raise exception 'Pembatalan/audit salah';end if;
 if(public.daftar_tagihan('dibatalkan',null,null,'SPP __qa_layanan__')->>'jumlah')::int<>1 then raise exception 'Filter dibatalkan salah';end if;
 d=public.terbitkan_tagihan(current_setting('test.data')::jsonb||jsonb_build_object('kunci',gen_random_uuid()));if(d->>'dibuat')::int<>1 or(d->>'dilewati')::int<>1 then raise exception 'SPP pengganti tidak dapat diterbitkan';end if;
end $$;
reset role;
update profiles set peran='musyrif'where id=current_setting('test.admin')::uuid;
set local role authenticated;
do $$begin
 if exists(select 1 from ringkasan_tagihan)or exists(select 1 from pembayaran_santri)or exists(select 1 from keuangan_log)or exists(select 1 from notifikasi_keuangan)then raise exception 'Musyrif melihat keuangan';end if;
 if exists(select 1 from storage.objects where bucket_id='keuangan-bukti')then raise exception 'Bukti bocor ke musyrif';end if;
 begin perform public.terbitkan_tagihan(current_setting('test.data')::jsonb);raise exception 'Musyrif terbitkan tagihan';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$begin if public.detail_tagihan(current_setting('test.tagihan')::uuid)is not null then raise exception 'Akun asing membaca tagihan';end if;end $$;
reset role;
do $$begin
 if has_table_privilege('authenticated','public.tagihan_santri','INSERT')or has_table_privilege('authenticated','public.pembayaran_santri','UPDATE')then raise exception 'Direct financial writes granted';end if;
 if has_function_privilege('anon','public.terbitkan_tagihan(jsonb)','EXECUTE')or has_function_privilege('anon','public.detail_tagihan(uuid)','EXECUTE')then raise exception 'Anonymous financial API';end if;
 if has_function_privilege('authenticated','private.rekam_keuangan(uuid,text,text,uuid,boolean)','EXECUTE')then raise exception 'Audit internal exposed';end if;
 if not exists(select 1 from pg_class where oid='public.ringkasan_tagihan'::regclass and 'security_invoker=true'=any(reloptions))then raise exception 'View bypasses RLS';end if;
end $$;
set local role anon;
do $$begin begin perform public.daftar_tagihan();raise exception 'Anon membuka tagihan';exception when insufficient_privilege then null;end;end $$;
reset role;
rollback;

select 'keuangan hosted rollback checks passed' as hasil;
