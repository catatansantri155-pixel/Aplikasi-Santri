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

## Verifikasi LIVE 4 Nov 2026, 05:38–05:41 WIB (pasca-deploy 77e799db + migrasi 0006)
- Migrasi 0006 TERJALAN & terverifikasi di Supabase: kebijakan profiles memuat profiles_tambah_wali_sendiri (INSERT). Login dasbor Supabase via "Continue with GitHub" (LAST USED) — tidak ada tombol Google di halaman sign-in.
- Rute baru live: /sambutan, /daftar, /lupa-sandi, /atur-sandi semua 200; CSS live memuat kelas sambutan.
- Item 1 Sambutan: LULUS — 5 slide persis rancangan ("Selamat datang di Aplikasi Santri", "Hafalan tercatat rapi", "Diniyyah & kehadiran jelas", "Catatan & olahraga terpantau", "Wali hanya melihat data anaknya"), titik indikator, Lewati/Berikutnya, slide terakhir hanya "Masuk". Gerbang login→sambutan ikut terbukti (akses /login awal dialihkan ke /sambutan, Lewati diklik untuk lanjut).
- Item 2 Daftar wali: GAGAL pada email uji — "Alamat surel tidak valid." Diagnosis induk via API Auth langsung: (a) signUp PUBLIK Supabase memvalidasi surel lebih ketat daripada pembuatan akun via panel admin; domain uji fiktif @catatansantri.id ditolak (akun uji lama lolos karena dibuat admin). (b) Alamat format asli (gmail) LOLOS validasi dan memicu pengiriman surel konfirmasi → konfirmasi surel produksi AKTIF, dan jalur kode berjalan sampai pengiriman. (c) Pengiriman surel bawaan Supabase kena 429 over_email_send_rate_limit akibat rangkaian percobaan uji — batas kirim bawaan sangat kecil; CATATAN PRODUKSI: sebelum rilis ramai, pertimbangkan SMTP khusus dan/atau mematikan konfirmasi surel (gerbang tautan admin adalah pengaman utama data). Rantai penuh (klik konfirmasi → masuk pertama → profil wali otomatis → tampilan kosong sebelum ditautkan) BELUM terbukti; menunggu keputusan user soal konfirmasi surel.
- Item 3 Lupa sandi: LULUS tampilan (judul, teks, kolom Email, tombol "Kirim tautan"; tombol tidak diklik).
- Item 4 Login: LULUS — tautan "Lupa kata sandi?", "Lihat perkenalan", "Daftar di sini" tampil.
- Item 5 Regresi pengajar hifzh: LULUS — /hifzh formulir setoran tampil penuh untuk peran pemilik (mode pantauan hanya admin).
- Mode pantauan admin & tab Akun admin: belum diuji live (memerlukan login Admin Utama asli — kata sandi hanya dipegang user; logika teruji lokal + mode contoh).

## Rantai penuh daftar wali — TUNTAS 4 Nov 2026, 05:49–05:52 WIB
- Keputusan user: konfirmasi surel DIMATIKAN di Supabase (Authentication → Email: "Confirm email" dari aktif → nonaktif, tersimpan; pengaturan lain tidak diubah).
- Daftar wali uji (uji.daftar@catatansantri.com, "Wali Uji Daftar") di /daftar: pesan "Pendaftaran berhasil. Akun Anda sudah aktif sebagai wali." — sesi langsung aktif, profil wali otomatis terbentuk, beranda normal peran wali.
- Sebelum ditautkan: /santri menampilkan "Belum ada anak tertaut" + "Menampilkan 0 santri." (gerbang RLS terbukti di UI).
- Penautan disimulasikan via SQL (wali_santri kolom FK wali = profile_id): 1 baris tertaut ke Santri Uji A, hitungan verifikasi = 1.
- Sesudah ditautkan: wali melihat Santri Uji A (Kelas 1, NIS S-1001) dan detailnya (ringkasan kehadiran Hadir 1, riwayat 3 Nov Hifzh Hadir).
- Akun uji.daftar@catatansantri.com masuk kolam data uji produksi (menunggu keputusan hapus/keep bersama data uji lain).

## Aktivasi kunci layanan & uji tab Akun — TUNTAS 4 Nov 2026, 06:07–06:13 WIB
- User memasang SUPABASE_SERVICE_ROLE_KEY di Cloudflare (panduan terpisah di goal files).
- Route /api/admin/buat-akun live: tanpa token → 401; token peran pengajar → 403 "Hanya Admin Utama yang dapat membuat akun." (kunci terbaca, gerbang peran benar; bukan lagi 501).
- Temuan penjaga peran: update peran langsung dari SQL Editor DITOLAK pemicu profiles_jaga_peran (apakah_admin() berbasis auth.uid()); jalur sah yang dipakai: set_config klaim sesi Admin Utama dalam satu transaksi.
- Bukti pembuatan akun: peran uji.hifzh dinaikkan sementara → admin, route membuat akun uji.buatakun@catatansantri.com ("Ust. Uji Buat Akun", musyrif) → HTTP 201 + kata sandi sementara dari server; akun baru langsung bisa masuk (token terbit); baris profiles terverifikasi di SQL.
- Penutup: peran uji.hifzh DITURUNKAN kembali ke pengajar_hifzh dan terverifikasi; tidak ada peran uji yang tertinggal sebagai admin.
- Sisa celah jujur: tampilan visual tab Akun & mode pantauan dengan login Admin Utama asli belum dilihat (kata sandi admin hanya dipegang user); jalur servernya sudah terbukti.
