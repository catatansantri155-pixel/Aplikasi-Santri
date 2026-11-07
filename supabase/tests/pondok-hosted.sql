-- Run only as an authorized database operator. Every fixture is rolled back.
begin;
select set_config('qa.admin',(select id::text from profiles where peran='admin' limit 1),true);
select set_config('qa.wali',(select id::text from profiles where peran='wali' limit 1),true);
select set_config('qa.anak',gen_random_uuid()::text,true);
select set_config('qa.asing',gen_random_uuid()::text,true);
insert into santri(id,nama,nama_ayah_wali,kelas_id) values
(current_setting('qa.anak')::uuid,'__qa_pondok_anak__','QA',(select id from kelas where tingkat=1)),
(current_setting('qa.asing')::uuid,'__qa_pondok_asing__','QA',(select id from kelas where tingkat=2));
insert into wali_santri(profile_id,santri_id) values(current_setting('qa.wali')::uuid,current_setting('qa.anak')::uuid);
select set_config('request.jwt.claim.sub',current_setting('qa.admin'),true);
set local role authenticated;
select set_config('qa.data',jsonb_build_object('kunci',gen_random_uuid(),'judul','__qa_pondok_agenda__','mulai',now(),'selesai',now()+interval '1 hour','jenis','kegiatan','kelas_id',(select kelas_id from santri where id=current_setting('qa.anak')::uuid))::text,true);
select set_config('qa.agenda',public.simpan_kalender(current_setting('qa.data')::jsonb)::text,true);
select set_config('qa.agenda_asing',public.simpan_kalender(current_setting('qa.data')::jsonb||jsonb_build_object('kunci',gen_random_uuid(),'kelas_id',(select kelas_id from santri where id=current_setting('qa.asing')::uuid)))::text,true);
select set_config('qa.health',jsonb_build_object('kunci',gen_random_uuid(),'santri_id',current_setting('qa.anak'),'tanggal',(now()at time zone 'Asia/Jakarta')::date,'keluhan','Keluhan uji sementara','tindakan','Pemeriksaan dicatat petugas','status','dipantau')::text,true);
select set_config('qa.sehat',public.simpan_kesehatan(current_setting('qa.health')::jsonb)::text,true);
select set_config('qa.sehat_asing',public.simpan_kesehatan(current_setting('qa.health')::jsonb||jsonb_build_object('kunci',gen_random_uuid(),'santri_id',current_setting('qa.asing')))::text,true);
do $$begin
 if public.simpan_kalender(current_setting('qa.data')::jsonb)<>current_setting('qa.agenda')::uuid or public.simpan_kesehatan(current_setting('qa.health')::jsonb)<>current_setting('qa.sehat')::uuid then raise exception 'Retry menghasilkan duplikat';end if;
 begin perform public.simpan_kalender(current_setting('qa.data')::jsonb,current_setting('qa.agenda')::uuid,null);raise exception 'Revisi null lolos';exception when serialization_failure then null;end;
 begin perform public.simpan_kesehatan(current_setting('qa.health')::jsonb||jsonb_build_object('kunci',gen_random_uuid(),'tanggal',current_date+2));raise exception 'Tanggal kesehatan masa depan lolos';exception when sqlstate '22023'then null;end;
end$$;
select public.simpan_kesehatan(current_setting('qa.health')::jsonb||'{"status":"pulih"}'::jsonb,current_setting('qa.sehat')::uuid,1);
insert into informasi_pondok(judul,isi,status) values('__qa_pondok_info__','Pengumuman uji yang dibatalkan.','terbit');
select set_config('qa.info',(select id::text from informasi_pondok where judul='__qa_pondok_info__'),true);
select public.arsip_pondok('informasi',current_setting('qa.info')::uuid,1,false);
select public.arsip_pondok('informasi',current_setting('qa.info')::uuid,2,true);
do $$begin if(select status from informasi_pondok where id=current_setting('qa.info')::uuid)<>'draf' then raise exception 'Informasi pulih bukan draf';end if;end$$;
select set_config('qa.path',current_setting('qa.admin')||'/'||gen_random_uuid()::text||'.webp',true);
insert into storage.objects(bucket_id,name)values('banner-pondok',current_setting('qa.path'));
select set_config('qa.banner',public.simpan_banner(jsonb_build_object('kunci',gen_random_uuid(),'judul','__qa_pondok_banner__','gambar_path',current_setting('qa.path'),'urutan',8,'tayang',true))::text,true);
reset role;
select set_config('request.jwt.claim.sub',current_setting('qa.wali'),true);
set local role authenticated;
do $$begin
 if not exists(select 1 from kesehatan_santri where id=current_setting('qa.sehat')::uuid)or exists(select 1 from kesehatan_santri where id=current_setting('qa.sehat_asing')::uuid)then raise exception 'Kesehatan anak lain bocor';end if;
 if not exists(select 1 from kalender_pondok where id=current_setting('qa.agenda')::uuid)or exists(select 1 from kalender_pondok where id=current_setting('qa.agenda_asing')::uuid)then raise exception 'Agenda kelas lain bocor';end if;
 if(select count(*)from kesehatan_riwayat where catatan_id=current_setting('qa.sehat')::uuid)<>2 then raise exception 'Audit kesehatan salah';end if;
 if(public.daftar_kesehatan(null,null,'semua','Keluhan uji sementara',false,0)->>'jumlah')::integer<>1 then raise exception 'RPC daftar kesehatan bocor';end if;
 if exists(select 1 from informasi_pondok where id=current_setting('qa.info')::uuid)then raise exception 'Draf informasi bocor';end if;
 if not exists(select 1 from storage.objects where name=current_setting('qa.path'))then raise exception 'Banner aktif tidak terbaca';end if;
 begin perform public.simpan_kesehatan(current_setting('qa.health')::jsonb);raise exception 'Wali menulis kesehatan';exception when insufficient_privilege then null;end;
 begin perform public.simpan_kalender(current_setting('qa.data')::jsonb);raise exception 'Wali menulis agenda';exception when insufficient_privilege then null;end;
 begin perform public.simpan_banner('{}'::jsonb);raise exception 'Wali menulis banner';exception when insufficient_privilege then null;end;
 begin perform public.arsip_pondok('informasi',current_setting('qa.info')::uuid,3,false);raise exception 'Wali mengarsip informasi';exception when insufficient_privilege then null;end;
 begin update kesehatan_santri set status='pulih';raise exception 'Direct write lolos';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('qa.admin'),true);
set local role authenticated;
select public.arsip_pondok('kesehatan',current_setting('qa.sehat')::uuid,2,false);
select public.arsip_pondok('kalender',current_setting('qa.agenda')::uuid,1,false);
select public.arsip_pondok('banner',current_setting('qa.banner')::uuid,1,false);
reset role;
select set_config('request.jwt.claim.sub',current_setting('qa.wali'),true);
set local role authenticated;
do $$begin
 if exists(select 1 from kesehatan_santri where id=current_setting('qa.sehat')::uuid)or exists(select 1 from kesehatan_riwayat where catatan_id=current_setting('qa.sehat')::uuid)or exists(select 1 from kalender_pondok where id=current_setting('qa.agenda')::uuid)or exists(select 1 from banner_pondok where id=current_setting('qa.banner')::uuid)or exists(select 1 from storage.objects where name=current_setting('qa.path'))then raise exception 'Arsip bocor';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('qa.admin'),true);
set local role authenticated;
select public.arsip_pondok('banner',current_setting('qa.banner')::uuid,2,true);
do $$begin if(select tayang from banner_pondok where id=current_setting('qa.banner')::uuid)then raise exception 'Pemulihan banner langsung tayang';end if;end$$;
-- Exercise the musyrif role on the existing operator identity only within this rollback.
reset role;
update profiles set peran='musyrif' where id=current_setting('qa.admin')::uuid;
set local role authenticated;
do $$begin
 perform public.simpan_kesehatan(current_setting('qa.health')::jsonb||jsonb_build_object('kunci',gen_random_uuid()));
 begin perform public.simpan_kalender(current_setting('qa.data')::jsonb);raise exception 'Musyrif mengelola agenda';exception when insufficient_privilege then null;end;
 begin perform public.arsip_pondok('kesehatan',current_setting('qa.sehat')::uuid,3,true);raise exception 'Musyrif memulihkan kesehatan';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
select jsonb_build_object('hasil','LULUS; semua fixture dibatalkan','sisa_santri_uji',(select count(*)from santri where nama like '__qa_pondok_%'),'sisa_agenda_uji',(select count(*)from kalender_pondok where judul='__qa_pondok_agenda__'),'sisa_banner_uji',(select count(*)from banner_pondok where judul='__qa_pondok_banner__'),'admin',(select count(*)from profiles where peran='admin')) pemeriksaan;
