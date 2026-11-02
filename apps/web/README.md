# Aplikasi Santri — Web (Next.js)

Frontend aplikasi monitoring santri **Ponpes Minhajus Sunnah Magelang, Marhalah Wustha**
(hifzh, diniyyah, musyrif). Mobile-first, pola tampilan mengikuti Maktabah Al-'Ilmiyyah
terbaru; palet warna mengikuti kop surat pondok: hijau `#006B4F`–`#1E6B00`,
aksen emas `#F0B000`, aksen biru buku seperlunya.

## Status

**Tahap scaffold (Tahap 1, Jalur B).** Semua halaman masih placeholder dengan
penanda DATA CONTOH / TAHAP SCAFFOLD. Login asli (Supabase Auth) dan data asli
baru disambungkan pada tahap berikutnya — lihat `../../docs/TAHAPAN.md`.

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
