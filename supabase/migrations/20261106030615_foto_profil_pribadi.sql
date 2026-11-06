-- Satu objek WebP per akun; berkas di Storage, tidak ada kolom/base64 baru pada profiles.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('foto-profil','foto-profil',false,102400,array['image/webp']);

create policy foto_profil_baca_sendiri on storage.objects for select to authenticated using (
 bucket_id='foto-profil' and name=(select auth.uid())::text||'/avatar.webp'
 and exists (select 1 from public.profiles p where p.id=(select auth.uid()))
);
create policy foto_profil_unggah_sendiri on storage.objects for insert to authenticated with check (
 bucket_id='foto-profil' and name=(select auth.uid())::text||'/avatar.webp'
 and exists (select 1 from public.profiles p where p.id=(select auth.uid()))
);
create policy foto_profil_ganti_sendiri on storage.objects for update to authenticated using (
 bucket_id='foto-profil' and name=(select auth.uid())::text||'/avatar.webp'
 and exists (select 1 from public.profiles p where p.id=(select auth.uid()))
) with check (
 bucket_id='foto-profil' and name=(select auth.uid())::text||'/avatar.webp'
 and exists (select 1 from public.profiles p where p.id=(select auth.uid()))
);
create policy foto_profil_hapus_sendiri on storage.objects for delete to authenticated using (
 bucket_id='foto-profil' and name=(select auth.uid())::text||'/avatar.webp'
 and exists (select 1 from public.profiles p where p.id=(select auth.uid()))
);
