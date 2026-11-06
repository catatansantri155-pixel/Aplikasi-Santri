revoke all on function public.tandai_informasi(uuid,boolean) from public,anon,authenticated;
revoke all on function private.tandai_informasi(uuid,boolean) from public,anon,authenticated;
create function private.tandai_informasi_versi(p_id uuid,p_revisi integer,p_konfirmasi boolean) returns void language plpgsql security definer set search_path='' as $$
declare i public.informasi_pondok;begin
 if auth.uid() is null or not private.informasi_untuk_saya(p_id) then raise exception 'Informasi tidak tersedia untuk akun ini' using errcode='42501';end if;
 select * into i from public.informasi_pondok where id=p_id for share;
 -- Pemeriksaan ulang setelah lock: publikasi/audiens mungkin berubah saat menunggu.
 if not private.informasi_untuk_saya(p_id) then raise exception 'Informasi sudah tidak tersedia' using errcode='42501';end if;
 if p_revisi is null or p_revisi<>i.revisi then raise exception 'Informasi telah berubah. Muat ulang sebelum menandai atau mengonfirmasi.' using errcode='40001';end if;
 if p_konfirmasi and not i.wajib_konfirmasi then raise exception 'Informasi tidak meminta konfirmasi' using errcode='22023';end if;
 insert into public.informasi_bacaan(informasi_id,pengguna_id,revisi,dibaca_pada,dikonfirmasi_pada)
 values(i.id,auth.uid(),i.revisi,now(),case when p_konfirmasi then now() end)
 on conflict(informasi_id,pengguna_id) do update set
 revisi=excluded.revisi,
 dibaca_pada=case when informasi_bacaan.revisi=excluded.revisi then informasi_bacaan.dibaca_pada else excluded.dibaca_pada end,
 dikonfirmasi_pada=case when p_konfirmasi then coalesce(case when informasi_bacaan.revisi=excluded.revisi then informasi_bacaan.dikonfirmasi_pada end,now()) when informasi_bacaan.revisi=excluded.revisi then informasi_bacaan.dikonfirmasi_pada else null end
 where excluded.revisi>=informasi_bacaan.revisi;
end $$;
revoke all on function private.tandai_informasi_versi(uuid,integer,boolean) from public,anon,authenticated;
grant execute on function private.tandai_informasi_versi(uuid,integer,boolean) to authenticated;
create function public.tandai_informasi_versi(p_id uuid,p_revisi integer,p_konfirmasi boolean default false) returns void language sql security invoker set search_path='' as $$select private.tandai_informasi_versi(p_id,p_revisi,p_konfirmasi);$$;
revoke all on function public.tandai_informasi_versi(uuid,integer,boolean) from public,anon,authenticated;
grant execute on function public.tandai_informasi_versi(uuid,integer,boolean) to authenticated;
