-- Satu penanda panduan per akun; tidak memuat data santri maupun peran.
create table public.panduan_pengguna (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 ditampilkan_pada timestamptz not null default now()
);
alter table public.panduan_pengguna enable row level security;
revoke all on public.panduan_pengguna from public, anon, authenticated;
grant select on public.panduan_pengguna to authenticated;
grant insert(profile_id) on public.panduan_pengguna to authenticated;
grant all on public.panduan_pengguna to service_role;
create policy panduan_baca_sendiri on public.panduan_pengguna for select to authenticated
using ((select auth.uid()) = profile_id);
create policy panduan_tandai_sendiri on public.panduan_pengguna for insert to authenticated
with check ((select auth.uid()) = profile_id);
notify pgrst, 'reload schema';
