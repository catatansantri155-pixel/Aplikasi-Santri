-- Informasi resmi: semua akun membaca terbitan; hanya Admin Utama menulis.
create table public.informasi_pondok (
 id uuid primary key default gen_random_uuid(),
 judul text not null check(char_length(btrim(judul)) between 3 and 150),
 isi text not null check(char_length(btrim(isi)) between 10 and 12000),
 kategori text not null default 'Pengumuman' check(kategori in ('Pengumuman','Kegiatan','Jadwal','Informasi')),
 status text not null default 'draf' check(status in ('draf','terbit')),
 tanggal date not null default current_date check(tanggal between date '1900-01-01' and date '2200-12-31'),
 created_by uuid default auth.uid() references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.informasi_pondok enable row level security;
revoke all on public.informasi_pondok from anon, authenticated;
grant select on public.informasi_pondok to authenticated;
grant insert(judul,isi,kategori,status,tanggal) on public.informasi_pondok to authenticated;
grant update(judul,isi,kategori,status,tanggal) on public.informasi_pondok to authenticated;
grant all on public.informasi_pondok to service_role;
create policy informasi_baca on public.informasi_pondok for select to authenticated
 using (public.apakah_admin() or (status='terbit' and exists(select 1 from public.profiles p where p.id=(select auth.uid()))));
create policy informasi_tambah_admin on public.informasi_pondok for insert to authenticated
 with check (public.apakah_admin() and created_by=(select auth.uid()));
create policy informasi_ubah_admin on public.informasi_pondok for update to authenticated
 using (public.apakah_admin()) with check (public.apakah_admin());
create trigger informasi_set_updated_at before update on public.informasi_pondok
 for each row execute function public.set_updated_at();
create index informasi_status_tanggal_idx on public.informasi_pondok(status,tanggal desc,created_at desc);
comment on table public.informasi_pondok is 'Pengumuman resmi pondok; penulis Admin Utama, pembaca seluruh akun terdaftar.';
