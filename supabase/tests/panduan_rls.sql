-- Operator only: every change is rolled back, including first-view markers.
begin;
select set_config('qa.admin',(select id::text from public.profiles where peran='admin' limit 1),true);
select set_config('qa.wali',(select id::text from public.profiles where peran='wali' limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('qa.admin'),true);
set local role authenticated;
insert into public.panduan_pengguna(profile_id)values(auth.uid());
do $$begin
 if not exists(select 1 from public.panduan_pengguna where profile_id=auth.uid() and ditampilkan_pada=now())then raise exception 'Penanda sendiri tidak tersimpan';end if;
 begin insert into public.panduan_pengguna(profile_id)values(auth.uid());raise exception 'Panduan berulang';exception when unique_violation then null;end;
 begin insert into public.panduan_pengguna(profile_id)values(current_setting('qa.wali')::uuid);raise exception 'Menandai akun lain lolos';exception when insufficient_privilege then null;end;
 begin update public.panduan_pengguna set ditampilkan_pada=now();raise exception 'Update penanda lolos';exception when insufficient_privilege then null;end;
 begin delete from public.panduan_pengguna;raise exception 'Delete penanda lolos';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('qa.wali'),true);
set local role authenticated;
do $$begin if exists(select 1 from public.panduan_pengguna where profile_id=current_setting('qa.admin')::uuid)then raise exception 'Penanda akun lain terbaca';end if;end$$;
insert into public.panduan_pengguna(profile_id)values(auth.uid());
reset role;
set local role anon;
do $$begin begin perform 1 from public.panduan_pengguna;raise exception 'Anon membaca penanda';exception when insufficient_privilege then null;end;end$$;
reset role;
rollback;
select 'Lulus: panduan per akun, batas INSERT, larangan ubah/hapus, anonim ditolak; semua penanda uji dibatalkan.' hasil;
