# Aplikasi Santri — Web (Next.js)

Frontend aplikasi monitoring santri **Ponpes Minhajus Sunnah Magelang, Marhalah Wustha**
(hifzh, diniyyah, musyrif). Mobile-first, pola tampilan mengikuti Maktabah Al-'Ilmiyyah
terbaru; palet warna mengikuti kop surat pondok: hijau `#006B4F`–`#1E6B00`,
aksen emas `#F0B000`, aksen biru buku seperlunya.

## Status

**Tahap 3 (akun & deploy), persiapan Cloudflare selesai.** Modul inti Tahap 2
sudah jadi; proyek Supabase asli sudah dibuat dan migrasinya terverifikasi;
adapter deploy Cloudflare (OpenNext) sudah terpasang dan build-nya teruji lokal.
Yang tersisa: deploy pertama ke akun Cloudflare dan pengisian env di dashboard
— lihat `../../docs/TAHAPAN.md`. Lapisan data membaca Supabase asli bila env
terisi; bila env kosong/gagal dijangkau, halaman jatuh ke data CONTOH yang
tertanda jelas (bukan data asli).

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
