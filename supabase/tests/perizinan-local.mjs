// Isolated PostgreSQL harness. Supabase Auth/Storage are minimal stubs; no live server calls.
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
import fs from "node:fs";
const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls; create schema auth; create schema storage; create schema private;grant usage on schema public,auth,storage,private to authenticated;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.profiles(id uuid primary key,nama text,peran text);
create table public.kelas(id uuid primary key,nama text);
create table public.santri(id uuid primary key,nama text,kelas_id uuid,status_aktif boolean);
create table public.wali_santri(profile_id uuid,santri_id uuid);
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
create table public.informasi_pondok(id uuid,judul text,kategori text,tanggal date,updated_at timestamptz,disematkan boolean,wajib_konfirmasi boolean,revisi int);
create table public.informasi_bacaan(informasi_id uuid,pengguna_id uuid,revisi int,dibaca_pada timestamptz,dikonfirmasi_pada timestamptz);
create function private.informasi_untuk_saya(uuid) returns boolean language sql as $$select false$$;
create function private.baca_semua_informasi(timestamptz) returns void language sql as $$select$$;
grant select on public.profiles,public.kelas,public.santri,public.wali_santri,public.informasi_pondok,public.informasi_bacaan to authenticated;
grant all on storage.objects to authenticated;
`);
await db.exec(
  fs.readFileSync(
    new URL(
      "../migrations/20261106075006_perizinan_santri.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
await db.exec(
  `insert into profiles values('11111111-1111-4111-8111-111111111111','Admin','admin'),('22222222-2222-4222-8222-222222222222','Wali','wali');insert into kelas values('33333333-3333-4333-8333-333333333333','Kelas 1');insert into santri values('44444444-4444-4444-8444-444444444444','Santri','33333333-3333-4333-8333-333333333333',true);insert into wali_santri values('22222222-2222-4222-8222-222222222222','44444444-4444-4444-8444-444444444444');`,
);
console.log("Migration compiled on isolated PostgreSQL (PGlite)");
try {
  await db.exec(
    fs.readFileSync(new URL("./perizinan_rls.sql", import.meta.url), "utf8"),
  );
} catch (e) {
  console.error({
    message: e.message,
    detail: e.detail,
    where: e.where,
    code: e.code,
  });
  process.exit(1);
}
console.log("RLS/workflow tests passed; rolled back");
await db.close();
