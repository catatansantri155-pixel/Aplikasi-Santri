-- Identitas kehadiran tidak boleh dipindahkan diam-diam lewat UPDATE/upsert.
create or replace function public.kehadiran_jaga_status() returns trigger
language plpgsql set search_path='' as $$
begin
 if row(new.id,new.santri_id,new.tanggal,new.sesi_jenis,new.jadwal_id,new.pengisi_id,new.created_at)
 is distinct from row(old.id,old.santri_id,old.tanggal,old.sesi_jenis,old.jadwal_id,old.pengisi_id,old.created_at)
 then raise exception 'Identitas, tanggal, sesi, dan pengisi kehadiran tidak dapat diganti. Hubungi admin untuk koreksi.' using errcode='42501';end if;
 if new.status is distinct from old.status and coalesce(current_setting('app.sedang_revisi',true),'')<>'on'
 then raise exception 'Status kehadiran hanya boleh direvisi admin lewat prosedur revisi_kehadiran().'using errcode='42501';end if;
 return new;
end $$;
drop trigger kehadiran_jaga_status_trg on public.kehadiran;
create trigger kehadiran_jaga_status_trg before update on public.kehadiran for each row execute function public.kehadiran_jaga_status();
drop policy kehadiran_ubah on public.kehadiran;
create policy kehadiran_ubah on public.kehadiran for update to authenticated
using(public.apakah_admin()or(pengisi_id=(select auth.uid())and((public.peran_saya()='pengajar_hifzh'and sesi_jenis='hifzh')or(public.peran_saya()='pengajar_diniyyah'and sesi_jenis='diniyyah'))))
with check(public.apakah_admin()or(pengisi_id=(select auth.uid())and((public.peran_saya()='pengajar_hifzh'and sesi_jenis='hifzh')or(public.peran_saya()='pengajar_diniyyah'and sesi_jenis='diniyyah'))));
alter function public.set_updated_at()set search_path='';
-- Helper lama tetap dibutuhkan policy authenticated, tidak perlu terbuka bagi anonim.
revoke execute on function public.apakah_admin(),public.apakah_staff(),public.boleh_lihat_santri(uuid),public.peran_saya(),public.revisi_kehadiran(uuid,public.status_kehadiran,text)from public,anon;
grant execute on function public.apakah_admin(),public.apakah_staff(),public.boleh_lihat_santri(uuid),public.peran_saya(),public.revisi_kehadiran(uuid,public.status_kehadiran,text)to authenticated;
revoke execute on function public.profiles_jaga_peran(),public.catatan_isi_pelapor()from public,anon,authenticated;

-- Peran staf disiapkan server. Metadata pengguna hanya digunakan sebagai nama tampilan.
create function private.profil_wali_terverifikasi(p_id uuid)returns void language plpgsql security definer set search_path=''as $$
declare u auth.users;begin
 select *into u from auth.users where id=p_id;
 if not found or u.email_confirmed_at is null then raise exception 'Konfirmasikan email sebelum melengkapi profil.'using errcode='42501';end if;
 if coalesce(u.raw_app_meta_data->>'profil_dikelola_admin','false')='true'then return;end if;
 insert into public.profiles(id,nama,peran)values(u.id,coalesce(nullif(left(btrim(u.raw_user_meta_data->>'nama'),120),''),'Wali Santri'),'wali')on conflict(id)do nothing;
end $$;
revoke all on function private.profil_wali_terverifikasi(uuid)from public,anon,authenticated;
create function private.profil_wali_dari_auth()returns trigger language plpgsql security definer set search_path=''as $$begin
 if new.email_confirmed_at is not null then perform private.profil_wali_terverifikasi(new.id);end if;return new;
end $$;
revoke all on function private.profil_wali_dari_auth()from public,anon,authenticated;
create trigger siapkan_profil_wali after update of email_confirmed_at on auth.users for each row execute function private.profil_wali_dari_auth();
create function private.pastikan_profil_wali()returns boolean language plpgsql security definer set search_path=''as $$begin
 if auth.uid()is null then raise exception 'Masuk terlebih dahulu.'using errcode='42501';end if;
 if exists(select 1 from public.profiles where id=auth.uid())then return true;end if;
 perform private.profil_wali_terverifikasi(auth.uid());return exists(select 1 from public.profiles where id=auth.uid());
end $$;
revoke all on function private.pastikan_profil_wali()from public,anon;
grant execute on function private.pastikan_profil_wali()to authenticated;
create function public.pastikan_profil_wali()returns boolean language sql security invoker set search_path=''as $$select private.pastikan_profil_wali();$$;
revoke all on function public.pastikan_profil_wali()from public,anon;grant execute on function public.pastikan_profil_wali()to authenticated;

-- Semua hitungan memakai COUNT di server dengan RLS pemanggil; bukan potongan daftar terbaru.
create function public.statistik_beranda()returns jsonb language plpgsql stable security invoker set search_path=''as $$
declare v_wali boolean;v_hari date=(now()at time zone 'Asia/Jakarta')::date;v_pekan date=date_trunc('week',now()at time zone 'Asia/Jakarta')::date;begin
 select p.peran='wali'into v_wali from public.profiles p where p.id=auth.uid();
 if v_wali is null then raise exception 'Profil belum tersedia.'using errcode='42501';end if;
 return jsonb_build_object(
 'santri',(select count(*)from public.santri where status_aktif),
 'setoran',(select count(*)from public.hifzh_setoran h where(case when v_wali then exists(select 1 from public.santri s where s.id=h.santri_id and s.status_aktif)else h.tanggal_masehi=v_hari end)),
 'kehadiran',(select count(*)from public.kehadiran k where k.sesi_jenis in('hifzh','diniyyah')and(case when v_wali then exists(select 1 from public.santri s where s.id=k.santri_id and s.status_aktif)else k.tanggal=v_hari end)),
 'catatan',(select count(*)from public.catatan_musyrif c where(case when v_wali then exists(select 1 from public.santri s where s.id=c.santri_id and s.status_aktif)else c.tanggal=v_hari end)),
 'olahraga',(case when v_wali then 0 else(select count(*)from public.olahraga_sesi o where o.tanggal>=v_pekan and o.tanggal<v_pekan+7)end),
 'anak',coalesce((select jsonb_object_agg(s.id,jsonb_build_object('kehadiran',(select count(*)from public.kehadiran k where k.santri_id=s.id and k.sesi_jenis in('hifzh','diniyyah')),'setoran',(select count(*)from public.hifzh_setoran h where h.santri_id=s.id)))from public.santri s where s.status_aktif and v_wali),'{}'::jsonb)
 );
end $$;
revoke all on function public.statistik_beranda()from public,anon;grant execute on function public.statistik_beranda()to authenticated;
create index if not exists kehadiran_hari_sesi on public.kehadiran(tanggal,sesi_jenis);
create index if not exists setoran_tanggal on public.hifzh_setoran(tanggal_masehi);
create index if not exists catatan_tanggal on public.catatan_musyrif(tanggal);
notify pgrst,'reload schema';
