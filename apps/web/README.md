# Aplikasi Santri — Web (Next.js)

Frontend aplikasi monitoring santri **Ponpes Minhajus Sunnah Magelang, Marhalah Wustha**
(hifzh, diniyyah, musyrif). Mobile-first, pola tampilan mengikuti Maktabah Al-'Ilmiyyah
terbaru; palet warna mengikuti kop surat pondok: hijau `#006B4F`–`#1E6B00`,
aksen emas `#F0B000`, aksen biru buku seperlunya.

## Status

**Tahap 3 (akun & deploy) selesai; berikutnya Tahap 4 (uji peran).** Modul
inti Tahap 2 sudah jadi; proyek Supabase asli dibuat dan migrasinya
terverifikasi; aplikasi live di Cloudflare Workers dengan env Supabase asli.
Login ASLI sudah tersambung: `/login` memakai Supabase Auth
(`signInWithPassword`), kerangka menampilkan nama + peran pengguna yang
login (dari tabel `profiles`) dan tombol Keluar, halaman selain `/login`
diarahkan ke `/login` bila tidak ada sesi, dan identitas pengisi/paraf/
pelapor diambil dari profil login. GERBANG FITUR PER PERAN di level
tampilan juga sudah diterapkan dari peta terpusat `src/lib/akses.ts`:
menu navigasi, kartu modul beranda, dan isi tiap halaman modul disaring
menurut peran profil login (Kehadiran: admin + kedua pengajar; Hifzh:
admin + pengajar hifzh; Diniyyah: admin + pengajar diniyyah; Catatan,
Rekap & Olahraga: admin + kedua pengajar + musyrif; Beranda & Santri:
semua peran; revisi kehadiran tetap khusus admin). Peran yang membuka URL modul
terlarang menerima pesan penolakan dan form/isinya tidak dirender.
Gerbang ini hanya tampilan — penegakan sesungguhnya tetap RLS Supabase.
Lapisan data membaca Supabase asli bila env terisi; bila env kosong,
aplikasi berjalan dalam mode CONTOH yang tertanda jelas (bukan data
asli) dengan perilaku contoh seperti semula (semua menu tampil).
Halaman Diniyyah memiliki form input nilai harian (per santri, tanggal,
mapel; upsert) dan form input nilai ujian dengan pemilih semester yang
mengambil data semester apa adanya; bila database belum memiliki baris
semester, halaman menampilkan pesan bahwa semester harus dibuat oleh
admin terlebih dahulu dan nilai ujian tidak dapat disimpan (semester
tidak dikarang di klien). Daftar mapel diniyyah masih daftar contoh
menunggu PDF jadwal, dan rata-rata masih rumus sementara.
Halaman Olahraga (`/olahraga`, khusus staf) mengelola sesi olahraga —
satu sesi per tanggal; jadwal rutin Ahad & Kamis pagi, tanggal lain
tetap boleh — beserta kehadiran per santri (H/S/I/A, upsert per sesi +
santri). Belum ada isian nilai olahraga: halaman hanya mencatat sesi &
kehadiran karena format penilaian olahraga belum diputuskan user.

## Sistem desain

Tampilan mengikuti Panduan Desain aplikasi (token & kelas bersama di
`src/app/globals.css`): huruf Plus Jakarta Sans (Google Fonts, cadangan
font sistem), warna kop pondok (hijau #006B4F/#0B4D36, emas #F0B000,
biru #1D6FB8), kartu putih radius 20–24px, banner gradien hijau kop
berornamen geometris (tanpa foto manusia), chip/tab/segmen pill, dan
lencana status berwarna. Ikon adalah komponen SVG bersama
(`src/components/Ikon.tsx`); identitas pengguna & santri memakai
lingkaran inisial (`src/components/AvatarInisial.tsx`). Mengubah token
cukup di `globals.css` — halaman memakai kelas bersama (.banner,
.baris-daftar, .lencana--*, .pil-status--*, .segmen, .tab-pil, .chip,
.bilah, .bilah-aksi) agar konsisten.

## Deploy ke Cloudflare (OpenNext -> Workers)

Adapter yang dipakai: **OpenNext** (`@opennextjs/cloudflare`), target
**Cloudflare Workers**. Adapter lama `@cloudflare/next-on-pages` sudah
deprecated oleh Cloudflare dan peer-dependency-nya hanya mengizinkan
Next <= 15.5.2, sedangkan aplikasi ini memakai Next 16.4.3; OpenNext 1.20.x
mendukung Next >= 16.4.1. Konfigurasi ada di `open-next.config.ts` dan
`wrangler.jsonc` (nama worker `aplikasi-santri`, output `.open-next/`).

Perintah (dari folder ini):

```bash
npm run build:cf   # next build + adaptasi OpenNext -> .open-next/worker.js + aset
npm run preview    # build + pratinjau lokal persis runtime Workers (Wrangler)
npm run deploy     # build + deploy ke akun Cloudflare (butuh `npx wrangler login` lebih dulu)
```

Environment variable yang WAJIB diisi di dashboard Cloudflare
(Workers & Pages -> worker `aplikasi-santri` -> Settings -> Variables and Secrets),
untuk Production (dan Preview bila dipakai):

- `NEXT_PUBLIC_SUPABASE_URL` — URL proyek Supabase aplikasi-santri
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — kunci publishable/anon proyek yang sama

Kedua nilai ini kunci publik klien (akses data tetap dikunci RLS Supabase),
tetap hanya diisi lewat dashboard/env lokal `.env.local`, tidak pernah di Git.
Untuk pratinjau lokal `wrangler dev`, salin nilainya ke berkas `.dev.vars`
(sudah diabaikan Git pola lokal; jangan commit).

Bila memakai integrasi Git di dashboard Cloudflare: root directory
`apps/web`, build command `npx opennextjs-cloudflare build`, deploy command
`npx opennextjs-cloudflare deploy`.

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local   # lalu isi nilai Supabase bila sudah ada
npm run dev                  # http://localhost:3000
```

## Struktur

- `src/app/` — rute App Router: dashboard (`/`), `login/`, `santri/`, `santri/[id]/`,
  `kehadiran/`, `hifzh/`, `diniyyah/`, `catatan/`, `rekap/`
- `src/components/` — kerangka tampilan (header, navigasi bawah HP, sidebar tablet/PC)
- `src/lib/supabase/` — klien Supabase pola `@supabase/ssr` (browser & server)
- `src/lib/peran.ts` — konstanta peran pengguna dan labelnya
- `src/lib/akses.ts` — peta akses modul per peran (satu-satunya sumber gerbang tampilan: navigasi, kartu beranda, penjaga halaman)
