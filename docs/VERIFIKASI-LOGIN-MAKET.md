# Verifikasi Restyle Login Mengikuti Maket User (4 Nov 2026)

Permintaan user: halaman login dibuat SATU halaman mengikuti maket yang
dikirim — logo buku dalam kotak bersudut dengan bingkai emas, ilustrasi
diganti tumpukan buku (bukan santri), label kolom berikon, tombol Masuk
LEBIH SEMPIT di tengah (bukan selebar kartu). Dua penyesuaian yang
sudah dilaporkan ke user dan dipertahankan: (1) teks nama pondok tetap
"Ponpes Minhajus Sunnah Magelang · Marhalah Wustha" (keputusan user
3 Nov 2026), BUKAN "Mahad Al-Wasitha" versi maket; (2) kolom tetap
"Alamat surel" karena masuk memakai email, bukan nama pengguna.
Ilustrasi baru (tumpukan buku) disiapkan terpisah di
`src/lib/ilustrasi-login.ts` dan TIDAK diubah dalam pekerjaan ini;
halaman sambutan ikut memakai ilustrasi yang sama (disengaja).

## Perubahan per poin

1. **Logo hero** (`.logo-login--hero` di globals.css): lingkaran
   translucent lama diganti kotak 76×76px, radius 20px (±26%),
   `border: 3px solid var(--emas)` (#f0b000, token yang sudah ada —
   jadi warna #d9a821 dari brief tidak dipakai), latar gradien biru
   (biru-terang → hijau-kop → hijau-gelap; nama token lama memang
   "hijau" tetapi nilainya biru UNPIX), ikon buku `hifzh` 38px putih.
2. **Susunan hero**: logo → judul "Aplikasi Santri" → sapaan →
   baris pondok (teks persis keputusan user) → elemen baru
   `.login-aksen` (garis emas 56×4px, membulat, di tengah, dekoratif
   `aria-hidden`) → ilustrasi.
3. **Ilustrasi**: atribut width/height 1200/670 (sudah sesuai),
   alt diganti "Ilustrasi tumpukan buku dan lentera". CSS
   `.login-ilustrasi`: radius 20px, `object-fit: cover`,
   `max-height: 170px` agar tampil sebagai spanduk dan halaman tetap
   satu layar.
4. **Label berikon + placeholder**: label surel didahului ikon
   `akun` 16px, label sandi didahului ikon BARU `gembok` 16px
   (ditambahkan ke Ikon.tsx mengikuti pola garis stroke 1.8 yang
   sama: badan gembok + lengkung + lubang kunci). Pembungkus
   `.label-ikon` (inline-flex, gap 6px). Placeholder baru: surel
   "Masukkan alamat surel", sandi "Masukkan kata sandi". Ikon mata
   tampil/sembunyi tidak berubah.
5. **Tombol Masuk sempit**: kelas `tombol-penuh` diganti
   `.tombol-masuk` — `justify-self: center; width: min(260px, 72%)`
   di dalam grid formulir; tinggi tetap `.tombol-besar` 52px.
   Ditambah ikon `masuk` 20px (sudah ada di Ikon.tsx) di kiri teks
   saat tidak memproses; keadaan "Memproses…" dan disabled tetap.
6. **Teks bawah kartu**: kalimat bantuan menjadi "Pengguna dan kata
   sandi memakai akun yang diberikan oleh tim kepesantrenan." diikuti
   tautan "Lupa kata sandi?" (/lupa-sandi) dan "Lihat perkenalan"
   (/sambutan) pada baris yang sama; garis pemisah `.login-pemisah`;
   lalu "Wali santri belum mempunyai akun? Daftar di sini untuk
   mendapatkan akses." dengan tautan pada "Daftar di sini" (/daftar).
   PenandaTahap mode contoh dan pesan profil-belum-disiapkan tidak
   berubah.
7. **Satu halaman**: padding `.login-bungkus` 18/40 → 10/24,
   `.login-hero` 24/22 → 18/18, margin judul 14 → 10px,
   `.login-lembar` 18/20 → 16/18. Media query tambahan
   `@media (max-height: 700px)`: hero lebih rapat, logo 64px,
   ilustrasi max-height 118px — target sentuh kolom/tombol tetap
   ≥48px.

Logika login tidak disentuh sama sekali (handler kirim, gerbang
sambutan, pelengkapan profil wali tertunda, keadaan profil belum
disiapkan, pemetaan pesan galat) — perubahan di page.tsx hanya JSX
presentasi, className, placeholder, alt, dan komentar.

## Berkas berubah
- `apps/web/src/app/login/page.tsx` — presentasi saja.
- `apps/web/src/app/globals.css` — kelas login + kelas baru
  (`.login-aksen`, `.label-ikon`, `.tombol-masuk`, `.login-pemisah`)
  + media query layar pendek.
- `apps/web/src/components/Ikon.tsx` — ikon baru `gembok`.
- `docs/VERIFIKASI-LOGIN-MAKET.md` — dokumen ini.

## Hasil uji
- `npm run typecheck` — lulus bersih.
- `npm run build` (env asli) — lulus.
- `npm run build:cf` (OpenNext) — lulus ("OpenNext build complete").
- Uji asap mode contoh (build tanpa env, `next start`): GET /login
  → HTTP 200; HTML memuat kalimat bantuan baru, kedua placeholder
  ("Masukkan alamat surel", "Masukkan kata sandi"), tautan "Daftar
  di sini", alt ilustrasi baru, dan penanda MODE CONTOH.

## Verifikasi live (4 Nov 2026, 08:23–08:24 WIB)

Push main b17321f2 TERBUKTI LIVE: HTML /login memuat "Masukkan alamat
surel" dan "tim kepesantrenan"; chunk CSS baru
`_next/static/chunks/3j3sjfo003l-o.css` memuat `tombol-masuk` dan
`login-aksen` (chunk lama `2tz17w3rd2-4i.css` sudah tidak dipakai).
Pemeriksaan visual tanpa login, tanpa mengisi/mengirim formulir,
mengonfirmasi 6/6 item maket: (1) logo buku dalam kotak berbingkai
emas, (2) garis aksen emas di bawah baris nama pondok, (3) ilustrasi
tumpukan buku sebagai spanduk, (4) label kolom berikon + placeholder,
(5) tombol Masuk sempit di tengah kartu, (6) kalimat bantuan "tim
kepesantrenan" + tautan Lupa kata sandi / Lihat perkenalan /
Daftar di sini. Detail di goal hidden_files
`cek-deploy-login-maket-2026-11-04.md`. Status tugas maket: SELESAI.

## Penyimpangan dari brief
- Bingkai emas memakai token `--emas` (#f0b000) yang sudah ada,
  sesuai instruksi brief ("ikuti warna emas yang sudah ada"), bukan
  #d9a821.
- Ikon label surel dipilih `akun` (orang dalam lingkaran) karena
  Ikon.tsx tidak mempunyai ikon surat; `santri` dinilai kurang pas
  untuk label akun masuk.
- `max-height` ilustrasi 170px diterapkan di semua lebar (bukan
  hanya layar kecil) karena kolom login memang maksimal 430px di
  semua perangkat; efek visualnya sama seperti batas layar kecil
  pada brief.
