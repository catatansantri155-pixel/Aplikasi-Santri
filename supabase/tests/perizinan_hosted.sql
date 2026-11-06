-- Uji integrasi hosted; membutuhkan admin, wali tertaut, dan kelas.
-- Semua fixture serta simulasi peran bersifat transaksional dan di-ROLLBACK.
begin;
select set_config('test.admin',(select id::text from public.profiles where peran='admin' limit 1),true);
select set_config('test.wali',(select w.profile_id::text from public.wali_santri w join public.profiles p on p.id=w.profile_id where p.peran='wali' limit 1),true);
select set_config('test.anak',(select santri_id::text from public.wali_santri where profile_id=current_setting('test.wali')::uuid limit 1),true);
select set_config('test.kelas',(select kelas_id::text from public.santri where id=current_setting('test.anak')::uuid),true);
select set_config('test.kelas',(select kelas_id::text from public.santri where id=current_setting('test.anak')::uuid),true);
select set_config('test.anak',gen_random_uuid()::text,true);
insert into public.santri(id,nama,nama_ayah_wali,kelas_id,status_aktif)values(current_setting('test.anak')::uuid,'__qa_layanan__','Wali uji sementara',current_setting('test.kelas')::uuid,true);
insert into public.wali_santri(profile_id,santri_id)values(current_setting('test.wali')::uuid,current_setting('test.anak')::uuid);
select set_config('test.asing',gen_random_uuid()::text,true);
insert into public.santri(id,nama,nama_ayah_wali,kelas_id,status_aktif)values(current_setting('test.asing')::uuid,'__uji_izin_asing__','Wali uji sementara',current_setting('test.kelas')::uuid,true);
select set_config('test.payload',jsonb_build_object('kunci',gen_random_uuid(),'santri_id',current_setting('test.anak'),'jenis','pulang','alasan','Acara keluarga sementara','tujuan','Rumah orang tua','rencana_keluar',now()+interval '1 hour','rencana_kembali',now()+interval '1 day','penjemput','Ayah Santri','hubungan','Ayah','kontak','081234567890')::text,true);
select set_config('request.jwt.claim.sub',current_setting('test.wali'),true);
set local role authenticated;
select set_config('test.lampiran',current_setting('test.wali')||'/'||gen_random_uuid()::text||'.webp',true);
insert into storage.objects(bucket_id,name)values('perizinan-lampiran',current_setting('test.lampiran'));
select set_config('test.payload',(current_setting('test.payload')::jsonb||jsonb_build_object('lampiran_path',current_setting('test.lampiran')))::text,true);
select set_config('test.izin',public.simpan_perizinan(current_setting('test.payload')::jsonb)::text,true);
do $$declare d jsonb;begin
 -- Supabase requires Storage API for DELETE; exercised only in the isolated harness.

 begin insert into storage.objects(bucket_id,name)values('perizinan-lampiran',gen_random_uuid()::text||'/'||gen_random_uuid()::text||'.webp');raise exception 'Upload folder asing lolos';exception when insufficient_privilege then null;end;
 begin perform public.simpan_perizinan(current_setting('test.payload')::jsonb||'{"tujuan":"Alamat diganti"}'::jsonb);raise exception 'Retry berbeda lolos';exception when sqlstate '22023' then null;end;
 if public.simpan_perizinan(current_setting('test.payload')::jsonb)<>current_setting('test.izin')::uuid then raise exception 'Retry menggandakan izin';end if;
 begin perform public.simpan_perizinan(current_setting('test.payload')::jsonb||jsonb_build_object('kunci',gen_random_uuid()));raise exception 'Jadwal bertabrakan lolos';exception when sqlstate '22023' then null;end;
 begin perform public.simpan_perizinan(current_setting('test.payload')::jsonb||jsonb_build_object('santri_id',current_setting('test.asing'),'kunci',gen_random_uuid()));raise exception 'Anak asing lolos';exception when insufficient_privilege then null;end;
 begin perform public.simpan_perizinan(current_setting('test.payload')::jsonb,current_setting('test.izin')::uuid,null);raise exception 'Revisi null lolos';exception when serialization_failure then null;end;
 begin perform public.aksi_perizinan(current_setting('test.izin')::uuid,1,'setujui');raise exception 'Wali menyetujui sendiri';exception when insufficient_privilege then null;end;
 begin update public.perizinan_santri set status='disetujui';raise exception 'Direct write lolos';exception when insufficient_privilege then null;end;
 begin delete from public.perizinan_log;raise exception 'Audit terhapus';exception when insufficient_privilege then null;end;
 d=public.detail_perizinan(current_setting('test.izin')::uuid);if d->>'status'<>'menunggu' or jsonb_array_length(d->'log')<>1 then raise exception 'Detail/log salah';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
set local role authenticated;
do $$begin
 if not exists(select 1 from public.notifikasi_perizinan where izin_id=current_setting('test.izin')::uuid and dibaca_pada is null)then raise exception 'Notifikasi admin tidak masuk';end if;
 perform public.aksi_perizinan(current_setting('test.izin')::uuid,1,'perbaiki','Perjelas alamat rumah');
 begin perform public.aksi_perizinan(current_setting('test.izin')::uuid,1,'setujui');raise exception 'Versi usang lolos';exception when serialization_failure then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.wali'),true);
set local role authenticated;
do $$begin
 if not exists(select 1 from public.notifikasi_perizinan where revisi=2 and pengguna_id=auth.uid()) then raise exception 'Notifikasi wali tidak masuk';end if;
 perform public.simpan_perizinan(current_setting('test.payload')::jsonb,current_setting('test.izin')::uuid,2);
end $$;
reset role;
-- Peran staf disimulasikan pada fixture yang sama, lalu dipulihkan oleh rollback.
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
update public.profiles set peran='musyrif' where id=current_setting('test.admin')::uuid;
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
set local role authenticated;
do $$begin
 if not exists(select 1 from storage.objects where name=current_setting('test.lampiran'))then raise exception 'Petugas tidak dapat membaca lampiran';end if;
 perform public.aksi_perizinan(current_setting('test.izin')::uuid,3,'setujui');
 begin perform public.aksi_perizinan(current_setting('test.izin')::uuid,4,'kembali');raise exception 'Kembali sebelum keluar lolos';exception when sqlstate '22023' then null;end;
 perform public.aksi_perizinan(current_setting('test.izin')::uuid,4,'keluar');
 begin perform public.aksi_perizinan(current_setting('test.izin')::uuid,5,'batalkan','Batal setelah keluar');raise exception 'Pembatalan setelah keluar lolos';exception when sqlstate '22023' then null;end;
 if(public.detail_perizinan(current_setting('test.izin')::uuid)->>'keluar_pada')is null then raise exception 'Waktu keluar tidak dicatat';end if;
end $$;
reset role;
-- Penanda terlambat berasal dari jadwal, bukan status palsu.
update public.perizinan_santri set rencana_keluar=now()-interval '2 days',rencana_kembali=now()-interval '1 day' where id=current_setting('test.izin')::uuid;
select set_config('request.jwt.claim.sub',current_setting('test.wali'),true);
set local role authenticated;
do $$declare n int;begin
 if not(public.detail_perizinan(current_setting('test.izin')::uuid)->>'terlambat')::boolean then raise exception 'Terlambat tidak dihitung';end if;
 if(public.daftar_perizinan('terlambat')->>'jumlah')::int<1 then raise exception 'Filter terlambat salah';end if;
 perform public.baca_notifikasi_izin(current_setting('test.izin')::uuid,2);
 if not exists(select 1 from public.notifikasi_perizinan where revisi>2 and dibaca_pada is null)then raise exception 'Versi belum dilihat ikut terbaca';end if;
 n=public.jumlah_notifikasi_belum_dibaca();if n<1 then raise exception 'Global unread tidak menghitung izin';end if;
 if not exists(select 1 from jsonb_array_elements(public.daftar_notifikasi()->'data') x where x->>'sumber'='perizinan' and x->>'tujuan_id'=current_setting('test.izin'))then raise exception 'Rute notifikasi izin hilang';end if;
 perform public.baca_semua_informasi(now());if exists(select 1 from public.notifikasi_perizinan where dibaca_pada is null)then raise exception 'Tandai semua gagal';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
set local role authenticated;
select public.aksi_perizinan(current_setting('test.izin')::uuid,5,'kembali','Santri telah tiba');
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$begin if public.detail_perizinan(current_setting('test.izin')::uuid)is not null then raise exception 'Akun asing membaca izin';end if;end $$;
reset role;
rollback;

select 'perizinan hosted rollback checks passed' as hasil;
