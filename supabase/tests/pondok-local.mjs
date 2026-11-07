const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
import fs from "node:fs";
const db = new PGlite();
try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create schema private;grant usage on schema public,auth,storage,private to authenticated;
create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table auth.users(id uuid primary key);
create table public.profiles(id uuid primary key references auth.users(id),nama text,peran text);
create table public.kelas(id uuid primary key,tingkat smallint,nama text);
create table public.santri(id uuid primary key,nama text,nama_ayah_wali text,kelas_id uuid references kelas(id),status_aktif boolean);
create table public.wali_santri(profile_id uuid,santri_id uuid);
create function public.apakah_admin()returns boolean language sql stable security definer set search_path=''as $$select exists(select 1 from public.profiles where id=auth.uid()and peran='admin')$$;
create function public.set_updated_at()returns trigger language plpgsql set search_path=''as $$begin new.updated_at=now();return new;end$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
create function storage.foldername(text)returns text[]language sql immutable as $$select string_to_array($1,'/')$$;
grant select on public.profiles,public.kelas,public.santri,public.wali_santri to authenticated;grant all on storage.objects to authenticated;
`);
  for (const file of [
    "20261105090937_informasi_pondok.sql",
    "20261106015852_informasi_visual.sql",
    "20261106043815_informasi_notifikasi_tahap_satu.sql",
    "20261106052107_notifikasi_validasi_revisi.sql",
    "20261106075006_perizinan_santri.sql",
    "20261106075024_keuangan_santri_spp.sql",
    "20261106075907_spp_batch_tolak_akses_langsung.sql",
    "20261107014028_kalender_kesehatan_banner.sql",
    "20261107030604_panduan_pengguna.sql",
  ])
    await db.exec(
      fs.readFileSync(
        new URL("../migrations/" + file, import.meta.url),
        "utf8",
      ),
    );
  await db.exec(`insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),('33333333-3333-4333-8333-333333333333'),('44444444-4444-4444-8444-444444444444');
insert into profiles values('11111111-1111-4111-8111-111111111111','Admin','admin'),('22222222-2222-4222-8222-222222222222','Wali','wali'),('33333333-3333-4333-8333-333333333333','Musyrif','musyrif'),('44444444-4444-4444-8444-444444444444','Pengajar','pengajar_hifzh');
insert into kelas values('55555555-5555-4555-8555-555555555555',1,'Kelas 1'),('66666666-6666-4666-8666-666666666666',2,'Kelas 2');
insert into santri values('77777777-7777-4777-8777-777777777777','Anak Wali','Wali','55555555-5555-4555-8555-555555555555',true),('88888888-8888-4888-8888-888888888888','Anak Lain','Wali Lain','66666666-6666-4666-8666-666666666666',true);
insert into wali_santri values('22222222-2222-4222-8222-222222222222','77777777-7777-4777-8777-777777777777');`);
  await db.exec(
    fs.readFileSync(new URL("./pondok_rls.sql", import.meta.url), "utf8"),
  );
  await db.exec(fs.readFileSync(new URL("./panduan_rls.sql", import.meta.url), "utf8"));
  console.log(
    "Kalender, kesehatan, banner dan arsip informasi: migration, RLS, revisi, riwayat, penyimpanan dan pemulihan serta panduan per akun lulus (rollback).",
  );
} catch (e) {
  console.error({
    message: e.message,
    detail: e.detail,
    where: e.where,
    code: e.code,
  });
  process.exitCode = 1;
} finally {
  await db.close();
}
