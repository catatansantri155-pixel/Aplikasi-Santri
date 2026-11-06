-- Kartu bertema dan lampiran poster; isi lama tetap utuh.
alter table public.informasi_pondok
  add column tema text not null default 'hijau' check (tema in ('hijau','emas','biru')),
  add column gambar_path text check (gambar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$');
alter table public.informasi_pondok drop constraint informasi_pondok_isi_check;
alter table public.informasi_pondok add constraint informasi_pondok_isi_check
  check (char_length(btrim(isi)) <= 12000 and (char_length(btrim(isi)) >= 10 or gambar_path is not null));
grant insert (tema,gambar_path), update (tema,gambar_path) on public.informasi_pondok to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('informasi-pondok','informasi-pondok',false,5242880,array['image/jpeg','image/png','image/webp']);

create policy informasi_gambar_baca on storage.objects for select to authenticated using (
 bucket_id='informasi-pondok' and (
   (select public.apakah_admin()) or exists (
     select 1 from public.informasi_pondok i where i.gambar_path=name and i.status='terbit'
   )
 )
);
create policy informasi_gambar_unggah_admin on storage.objects for insert to authenticated with check (
 bucket_id='informasi-pondok' and (select public.apakah_admin())
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
);
-- Hanya berkas gagal simpan/belum dipakai yang boleh dibersihkan klien.
create policy informasi_gambar_bersihkan_admin on storage.objects for delete to authenticated using (
 bucket_id='informasi-pondok' and (select public.apakah_admin())
 and not exists (select 1 from public.informasi_pondok i where i.gambar_path=name)
);

-- Tolak jalur gambar fiktif supaya informasi tanpa isi selalu memiliki poster nyata.
create function public.validasi_gambar_informasi() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.gambar_path is not null and not exists (
  select 1 from storage.objects o where o.bucket_id='informasi-pondok' and o.name=new.gambar_path
 ) then raise exception 'Gambar belum tersedia. Unggah gambar terlebih dahulu.' using errcode='23514'; end if;
 return new;
end;
$$;
revoke all on function public.validasi_gambar_informasi() from public,anon,authenticated;
create trigger informasi_validasi_gambar before insert or update of gambar_path on public.informasi_pondok
for each row execute function public.validasi_gambar_informasi();
