import fs from "node:fs";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;grant usage on schema public,auth,storage to authenticated;
 create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb);alter table storage.objects enable row level security;
 create function storage.foldername(text)returns text[]language sql immutable as $$select string_to_array($1,'/')$$;
 grant all on storage.objects to authenticated;`);
  const dir = new URL("../migrations/", import.meta.url);
  const files = fs
    .readdirSync(dir)
    .filter((x) => x.endsWith(".sql") && !x.startsWith("0004_"))
    .sort();
  for (const file of files)
    await db.exec(fs.readFileSync(new URL(file, dir), "utf8"));
  await db.exec(`insert into auth.users(id,email_confirmed_at)values('11111111-1111-4111-8111-111111111111',now()),('22222222-2222-4222-8222-222222222222',now());
 insert into profiles(id,nama,peran)values('11111111-1111-4111-8111-111111111111','Admin','admin'),('22222222-2222-4222-8222-222222222222','Wali','wali');insert into kelas(tingkat,nama)values(1,'Kelas 1'),(2,'Kelas 2');`);
  await db.exec(
    fs.readFileSync(
      new URL("./perbaikan_audit_rls.sql", import.meta.url),
      "utf8",
    ),
  );
  console.log(
    "PASS: migrasi asli, identitas kehadiran terkunci, profil terverifikasi idempoten, dua semester, hitungan > batas lama dan RLS wali.",
  );
} catch (e) {
  console.error({
    message: e.message,
    code: e.code,
    detail: e.detail,
    where: e.where,
  });
  process.exitCode = 1;
} finally {
  await db.close();
}
