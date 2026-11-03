# Verifikasi — Paket Auth, Sambutan & Mode Pantauan Admin (4 Nov 2026)

Dasar: keputusan user 4 Nov 2026 — (1) wali daftar sendiri, admin menautkan;
(2) staf dibuatkan admin; (3) Admin Utama memantau & mengoreksi, bukan mengisi
dari nol; (4) halaman sambutan terpisah di depan (1 sambutan + 4 slide);
(5) paket auth: lupa sandi + ubah sandi ditambah, sign up hanya wali.

Status: SELESAI dibangun & terverifikasi LOKAL. Belum push, belum deploy,
migrasi 0006 BELUM dijalankan ke produksi (lihat "Aktivasi produksi" di bawah).

## A. Halaman sambutan `/sambutan`
- `src/app/sambutan/page.tsx` (baru): komponen klien 5 slide — (1) Sambutan
  dengan ilustrasi login yang sudah ada + nama pondok; (2) Hafalan (ikon hifzh);
  (3) Diniyyah & kehadiran; (4) Catatan & olahraga; (5) Wali (ikon santri) —
  slide terakhir hanya tombol "Masuk". Kendali: indikator titik (tombol 44px),
  "Lewati", "Berikutnya". Selesai/lewati/masuk menyetel localStorage
  `santri.sambutan.selesai` = "1" (konstanta di `src/lib/sesi.ts`) lalu ke /login.
- Gerbang di `src/app/login/page.tsx`: mode Supabase, tanpa sesi aktif, penanda
  belum ada → `router.replace("/sambutan")`. Sesi aktif tidak pernah dialihkan;
  /sambutan selalu bisa dibuka langsung. Mode contoh tidak memakai gerbang ini
  (doktrin mode contoh: perilaku tidak berubah; halamannya tetap dapat dibuka).
- Login kini memuat tautan "Lihat perkenalan" → /sambutan.
- CSS `.sambutan-*` di `globals.css`: mobile satu kolom; ≥1024px dua kolom
  (visual kiri, teks + kendali kanan). Tanpa gulir horizontal.
- Kerangka: /sambutan masuk daftar PATH_TANPA_KERANGKA di `Kerangka.tsx`.

## B. Sign up wali `/daftar`
- `src/app/daftar/page.tsx` (baru): nama, surel, sandi + konfirmasi (ikon mata
  via komponen bersama baru `src/components/KolomSandi.tsx`), teks penjelasan
  bahwa data anak muncul setelah admin menautkan.
- `supabase.auth.signUp` dengan `emailRedirectTo` ke
  `/auth/callback?next=/login`.
  - Sesi langsung ada → sisipkan profiles (peran 'wali') saat itu juga, pesan
    sukses + tombol ke beranda tampil di halaman daftar. (Penyimpangan kecil
    dari rancangan awal "arahkan /login dengan pesan sukses": /login dengan
    sesi + profil aktif langsung meneruskan ke beranda, jadi pesan di /login
    tidak akan terbaca; pesan ditampilkan di /daftar sebelum pengguna lanjut.)
  - Tanpa sesi (konfirmasi surel) → penanda localStorage `santri.daftarWali`
    {nama, email} + pesan periksa surel; halaman login melengkapi profil lewat
    `cobaLengkapiProfilWaliTertunda()` di `lib/sesi.ts` setelah masuk berhasil
    dan profil belum ditemukan — diterapkan di DUA titik (pemeriksaan saat
    halaman login dibuka dengan sesi yatim, dan tepat setelah kirim formulir),
    sebelum keadaan "profil belum disiapkan" dinyatakan. Peran yang dibuat
    jalur ini selalu 'wali'; jalur peran lain tidak disentuh.
- `src/app/auth/callback/route.ts` (baru): `exchangeCodeForSession`, tujuan
  `next` hanya diterima bila path lokal (diawali "/", bukan "//").
- Migrasi `supabase/migrations/0006_daftar_wali.sql` (baru, BELUM dijalankan):
  kebijakan INSERT profiles `profiles_tambah_wali_sendiri` (id = auth.uid()
  dan peran = 'wali'). Penjagaan UPDATE sudah aman sejak 0003 — pemicu
  `profiles_jaga_peran_trg` menolak perubahan kolom peran oleh non-admin —
  didokumentasikan di dalam berkas migrasi.

## C. Lupa sandi & atur sandi
- `src/app/lupa-sandi/page.tsx` (baru): `resetPasswordForEmail` dengan
  redirectTo origin + `/auth/callback?next=/atur-sandi`; pesan sukses generik
  yang tidak membocorkan status pendaftaran surel.
- `src/app/atur-sandi/page.tsx` (baru): tanpa sesi pemulihan → pesan tautan
  tidak valid/kedaluwarsa + tautan ke /lupa-sandi; dengan sesi → formulir
  sandi baru + konfirmasi + ikon mata → `updateUser({password})` → sukses →
  tombol "Masuk ke beranda".
- Tautan "Lupa kata sandi?" ditambahkan di halaman login.

## D. Ubah sandi di `/akun`
- Bagian "Ubah kata sandi" di `src/app/akun/page.tsx`: sandi baru + konfirmasi
  + ikon mata (KolomSandi), `updateUser`, pesan memakai `.pesan-sukses` /
  `.pesan-galat` yang sudah ada. Berlaku semua peran yang masuk. Mode contoh
  tidak menampilkan bagian ini (tidak ada sesi asli).

## E. Mode pantauan admin
- Helper baru di `src/lib/akses.ts`: `PETA_INPUT_MODUL`, `bolehInput(peran,
  modul)`, `pesanModePantauan(pemilik)`. Admin tidak termasuk pemilik input di
  modul mana pun; catatan singkat tampil di tempat formulir disembunyikan.
- Kehadiran: formulir massal disembunyikan untuk admin (semua baris baca-saja
  termasuk "Belum diisi", bilah aksi hilang), daftar sesi + formulir REVISI
  admin tetap tampil.
- Hifzh: tab Riwayat tampil; FormSetoran & BagianUjian diganti catatan
  pantauan untuk admin.
- Diniyyah: tab Ringkasan + pemilih santri/mapel tampil; formulir Harian &
  Ujian diganti catatan pantauan untuk admin (peran dibaca via
  `ambilProfilLogin`).
- Catatan: formulir "Tulis catatan" diganti catatan pantauan untuk admin;
  "Riwayat catatan" tetap tampil.
- Olahraga: formulir "Buat sesi" diganti catatan pantauan; penandaan kehadiran
  menjadi lencana baca-saja dan bilah simpan hilang untuk admin; daftar sesi
  tetap tampil.
- Batasan sadar: mode pantauan hanya berlaku pada MODE SUPABASE dengan peran
  admin terkonfirmasi; mode contoh tidak berubah (sejalan doktrin peta akses),
  dan perilaku semua peran lain tidak diubah sama sekali. PenjagaModul tidak
  diubah.
- Di database, RLS 0005 masih mengizinkan INSERT oleh admin — mode pantauan
  ini gerbang tampilan (sama seperti seluruh peta akses); mengetatkan RLS
  adalah keputusan terpisah bila user menginginkan.

## F. Pembuatan akun staf oleh admin
- Route server `src/app/api/admin/buat-akun/route.ts` (baru): Bearer token →
  verifikasi `auth.getUser` (klien anon) → peran pemanggil dari profiles via
  klien layanan wajib 'admin' (selain itu 403) → buat kata sandi sementara
  kuat di server (acak kriptografis, 18 karakter) → `admin.createUser`
  (email_confirm: true) → sisipkan profiles; gagal sisip → akun auth dihapus
  (rollback). Sukses 201 `{email, kataSandiSementara}`. Peran yang diterima
  hanya pengajar_hifzh | pengajar_diniyyah | musyrif | wali.
- Tanpa `SUPABASE_SERVICE_ROLE_KEY` di env server → 501
  `{error:"belum dikonfigurasi"}` (terverifikasi lokal, lihat bawah).
  Kunci layanan hanya dibaca dari env server; tidak ada NEXT_PUBLIC_ dan
  tidak masuk repo.
- UI: tab "Akun" di Panel Admin (`IsiAdmin.tsx` + parsing tab di
  `admin/page.tsx`): formulir nama/surel/peran; respons 501 menampilkan
  "Fitur belum aktif: kunci layanan Supabase belum dipasang di Cloudflare —
  langkah manual pemilik."; sukses menampilkan surel + kata sandi sementara
  SEKALI dengan peringatan penyerahan (tidak disimpan di mana pun). Teks tab
  Wali diperbarui: akun wali kini dari tab Akun atau daftar mandiri.

## Hasil uji lokal
- `npm run typecheck` — LULUS (tanpa galat).
- `npm run build` (env asli) — LULUS; rute baru terdaftar: /sambutan,
  /daftar, /lupa-sandi, /atur-sandi (statis), /auth/callback (dinamis),
  /api/admin/buat-akun (dinamis).
- `npm run build:cf` (OpenNext) — LULUS ("OpenNext build complete").
- Uji asap mode contoh (build tanpa env + `next start`): 16 rute 200 —
  /, /login, /sambutan, /daftar, /lupa-sandi, /atur-sandi, /kehadiran,
  /hifzh, /diniyyah, /catatan, /olahraga, /admin, /akun, /menu, /laporan,
  /santri. Penanda HTML terverifikasi: judul & tombol Lewati/Berikutnya +
  5 titik slide di /sambutan; judul + penjelasan tautan admin + 2 tombol mata
  di /daftar; "Lupa Kata Sandi" di /lupa-sandi; penanda MODE CONTOH di
  /atur-sandi; tiga tautan baru (Lupa kata sandi? / Daftar di sini / Lihat
  perkenalan) di /login; "Buat akun pengguna" di /admin?tab=akun; formulir
  contoh Kehadiran & Olahraga tetap tampil di mode contoh (mode pantauan
  tidak menyentuh mode contoh).
- Route handler terverifikasi: POST /api/admin/buat-akun tanpa kunci layanan
  → HTTP 501 `{"error":"belum dikonfigurasi", ...}`; GET /auth/callback
  ?next=/atur-sandi → 307 ke /atur-sandi; ?next=https://evil.example.com dan
  ?next=//evil.example.com → 307 ke / (open-redirect tertutup).

## Belum bisa dibuktikan lokal (menunggu aktivasi produksi)
- Perilaku konfirmasi surel Supabase produksi (apakah signUp langsung
  memberi sesi atau menuntut konfirmasi) — keduanya sudah ditangani kode.
- Sisipan profil wali terhadap RLS produksi — bergantung migrasi 0006.
- Pembuatan akun staf end-to-end — bergantung SUPABASE_SERVICE_ROLE_KEY.
- Tampilan visual sambutan dua kolom & mode pantauan dengan akun admin asli
  — perlu uji browser pasca-deploy oleh induk.

## Aktivasi produksi (langkah induk/user, di luar lingkup pembangunan ini)
1. Jalankan SQL migrasi `supabase/migrations/0006_daftar_wali.sql` di
   Supabase (SQL Editor proyek aplikasi-santri).
2. Pasang rahasia `SUPABASE_SERVICE_ROLE_KEY` di dasbor Cloudflare:
   Worker `aplikasi-santri` → Settings → Variables and Secrets; nilainya
   dari Supabase → Project Settings → API → service_role. Setelah itu push
   & deploy seperti biasa, lalu uji per peran (wali daftar sendiri → belum
   melihat data → admin menautkan → data anak tampil; admin membuka modul
   dalam mode pantauan; staf dibuatkan admin menerima sandi sementara).
