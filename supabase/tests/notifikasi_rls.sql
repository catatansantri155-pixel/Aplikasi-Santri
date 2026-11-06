begin;
select set_config('test.admin',(select id::text from public.profiles where peran='admin' limit 1),true);
select set_config('test.wali',(select w.profile_id::text from public.wali_santri w join public.profiles p on p.id=w.profile_id where p.peran='wali' limit 1),true);
select set_config('test.anak',(select santri_id::text from public.wali_santri where profile_id=current_setting('test.wali')::uuid limit 1),true);
select set_config('test.kelas',(select kelas_id::text from public.santri where id=current_setting('test.anak')::uuid),true);
select set_config('test.staf',current_setting('test.admin'),true);
select set_config('test.asing',gen_random_uuid()::text,true);
insert into public.santri(id,nama,nama_ayah_wali,kelas_id,status_aktif) values(current_setting('test.asing')::uuid,'Santri __uji_notif__','Wali __uji_notif__',current_setting('test.kelas')::uuid,false);
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
set local role authenticated;
insert into public.informasi_pondok(judul,isi,status,sasaran,sasaran_peran,sasaran_id,wajib_konfirmasi,berakhir_pada) values
 ('__uji_notif_semua__','Isi pengumuman uji sementara.','terbit','semua',null,null,true,null),
 ('__uji_notif_peran__','Isi pengumuman uji sementara.','terbit','peran','wali',null,false,null),
 ('__uji_notif_kelas__','Isi pengumuman uji sementara.','terbit','kelas',null,current_setting('test.kelas')::uuid,false,null),
 ('__uji_notif_anak__','Isi pengumuman uji sementara.','terbit','santri',null,current_setting('test.anak')::uuid,false,null),
 ('__uji_notif_asing__','Isi pengumuman uji sementara.','terbit','santri',null,current_setting('test.asing')::uuid,false,null),
 ('__uji_notif_pribadi__','Isi pengumuman uji sementara.','terbit','pengguna',null,current_setting('test.staf')::uuid,false,null),
 ('__uji_notif_expired__','Isi pengumuman uji sementara.','terbit','semua',null,null,false,now()-interval '1 minute'),
 ('__uji_notif_draf__','Isi pengumuman uji sementara.','draf','semua',null,null,false,null);
select set_config('test.info',(select id::text from public.informasi_pondok where judul='__uji_notif_semua__'),true);
select set_config('test.pribadi',(select id::text from public.informasi_pondok where judul='__uji_notif_pribadi__'),true);
do $$begin
 if(select count(*) from public.informasi_pondok where judul like '__uji_notif_%')<>8 then raise exception 'Admin tidak dapat mengelola seluruh informasi';end if;
 begin insert into public.informasi_pondok(judul,isi,sasaran,sasaran_id)values('__uji_notif_invalid__','Isi pengumuman uji sementara.','pengguna',gen_random_uuid());raise exception 'Target fiktif lolos';exception when check_violation then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.wali'),true);
set local role authenticated;
do $$declare n int;j bigint;begin
 select count(*) into n from public.informasi_pondok where judul like '__uji_notif_%';if n<>4 then raise exception 'Penyaringan wali salah: %',n;end if;
 if public.detail_informasi(current_setting('test.pribadi')::uuid) is not null then raise exception 'Detail lintas penerima bocor';end if;
 j=public.jumlah_notifikasi_belum_dibaca();
 perform public.tandai_informasi_versi(current_setting('test.info')::uuid,1,false);
 if public.jumlah_notifikasi_belum_dibaca()<>j-1 then raise exception 'Unread tidak turun tepat satu';end if;
 if(select dikonfirmasi_pada from public.informasi_bacaan where informasi_id=current_setting('test.info')::uuid) is not null then raise exception 'Baca dianggap konfirmasi';end if;
 perform public.tandai_informasi_versi(current_setting('test.info')::uuid,1,true);
 if(select dikonfirmasi_pada from public.informasi_bacaan where informasi_id=current_setting('test.info')::uuid) is null then raise exception 'Konfirmasi gagal';end if;
 begin perform public.tandai_informasi_versi(current_setting('test.pribadi')::uuid,1,false);raise exception 'Bisa menandai informasi akun lain';exception when insufficient_privilege then null;end;
 begin insert into public.informasi_bacaan(informasi_id,pengguna_id,revisi)values(current_setting('test.info')::uuid,current_setting('test.staf')::uuid,1);raise exception 'Bisa memalsukan pembacaan pengguna lain';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
set local role authenticated;
update public.informasi_pondok set disematkan=true where id=current_setting('test.info')::uuid;
do $$begin if(select revisi from public.informasi_pondok where id=current_setting('test.info')::uuid)<>1 then raise exception 'Pin mereset revisi';end if;end $$;
update public.informasi_pondok set isi='Isi pengumuman uji diperbarui untuk dibaca kembali.' where id=current_setting('test.info')::uuid;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.wali'),true);
set local role authenticated;
do $$declare d jsonb;begin
 d=public.detail_informasi(current_setting('test.info')::uuid);
 if(d->>'revisi')::int<>2 or d->>'dibaca_pada' is not null or d->>'dikonfirmasi_pada' is not null then raise exception 'Versi baru memakai bukti lama';end if;
 begin perform public.tandai_informasi_versi(current_setting('test.info')::uuid,1,true);raise exception 'Konfirmasi versi lama diterima';exception when serialization_failure then null;end;
 perform public.baca_semua_informasi(now());
 if public.jumlah_notifikasi_belum_dibaca()<>0 then raise exception 'Tandai semua gagal';end if;
 d=public.detail_informasi(current_setting('test.info')::uuid);if d->>'dikonfirmasi_pada' is not null then raise exception 'Tandai semua mengonfirmasi';end if;
 if(jsonb_array_length(public.daftar_notifikasi(true,0)->'data'))<>0 then raise exception 'Filter belum dibaca salah';end if;
end $$;
reset role;
-- Gunakan akun kedua dalam transaksi saja; rollback mengembalikan peran admin.
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
update public.profiles set peran='pengajar_hifzh' where id=current_setting('test.staf')::uuid;
select set_config('request.jwt.claim.sub',current_setting('test.staf'),true);
set local role authenticated;
do $$begin
 if(select count(*) from public.informasi_pondok where judul like '__uji_notif_%')<>2 then raise exception 'Staf membaca informasi khusus wali';end if;
 if(select count(*) from public.informasi_bacaan where pengguna_id=current_setting('test.wali')::uuid)<>0 then raise exception 'Bukti baca wali bocor ke staf';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$begin begin perform public.daftar_notifikasi(false,0);raise exception 'Anon mengakses RPC';exception when insufficient_privilege then null;end;end $$;
reset role;
rollback;
select json_build_object('uji','Audiens semua/peran/kelas/santri/pengguna; draf dan kedaluwarsa; RLS detail dan bukti baca; unread akurat; pin tanpa reset; revisi dan konfirmasi; baca semua tanpa konfirmasi; anon ditolak; seluruh fixture rollback','sisa_uji',(select count(*) from public.informasi_pondok where judul like '__uji_notif_%')) as hasil;
