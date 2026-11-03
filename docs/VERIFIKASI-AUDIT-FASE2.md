# Verifikasi Audit Fase 2 — Navigasi Per Peran & Laporan

Tanggal: 3 Nov 2026 (di atas commit Fase 1 `29bb611`).
Keputusan acuan: user 3 Nov 2026 21:03 — IKUTI usulan audit
(dokumen `Audit-UI-3Nov-Komplit.md`): navigasi bawah per peran
dengan Menu kembali dan akun staf lewat avatar; Rekap & Grafik
dilebur menjadi satu pintu Laporan.

## Cakupan perubahan

### 1. Navigasi bawah per peran (`src/components/NavBawah.tsx`, ditulis ulang susunannya)

| Peran | Slot 1 | Slot 2 | Slot 3 (tengah) | Slot 4 | Slot 5 |
|---|---|---|---|---|---|
| Admin | Beranda | Santri | **Kehadiran** → /kehadiran (menonjol) | Laporan → /laporan | Menu → /menu |
| Pengajar Hifzh | Beranda | Santri | **Setoran** → /hifzh (menonjol) | Kehadiran | Menu |
| Pengajar Diniyyah | Beranda | Santri | **Nilai** → /diniyyah (menonjol) | Kehadiran | Menu |
| Musyrif | Beranda | Santri | **Catatan** → /catatan (menonjol) | Olahraga → /olahraga | Menu |
| Wali | Beranda | Anak Saya | Perkembangan → /laporan | Akun → /akun | — (4 slot datar) |

- Wali: EMPAT slot datar, tanpa lingkaran menonjol. "Anak Saya":
  tepat 1 anak → `/santri/<id anak>` (dari `ambilDaftarSantri`,
  RLS hanya meloloskan anaknya sendiri); >1 anak → `/santri`;
  selama memuat/0 anak/gagal → `/santri`. "Akun" hanya ada di nav
  bawah wali; staf menjangkau /akun lewat avatar header (tidak
  berubah dari Fase 1).
- Profil belum termuat/tidak ada sesi: pola lama dipertahankan —
  geometri staf 5 slot, hanya Beranda & Santri menjadi tautan,
  tiga slot lain hampa.
- Mode contoh: susunan admin.
- Ikon garis yang ada: Setoran = `hifzh`, Nilai = `diniyyah`,
  Laporan = `rekap`, Menu = `menu`, Catatan = `pena`.
- Sidebar (`TAUTAN_NAV` di NavTautan.tsx): entri Rekap & Grafik
  diganti satu entri "Laporan" → /laporan (ikon `rekap`, modul
  `laporan`); entri lain tidak berubah.

### 2. Akses & metadata

- `src/lib/akses.ts`: kunci modul baru `"laporan"` = semua peran
  yang masuk (termasuk wali, sebagai "Perkembangan"). Kunci
  `"rekap"` & `"grafik"` PERTAHANKAN sebagai alias warisan dengan
  hak akses yang sama seperti sebelumnya, agar tidak ada rujukan
  lama yang rusak; `modulDariPath` memetakan `/laporan` →
  `"laporan"` (pemetaan `/rekap` & `/grafik` tetap).
- `src/lib/modul.ts` (`DAFTAR_MODUL`): entri Rekap & Grafik
  digabung menjadi satu entri "Laporan" (href /laporan, modul
  `laporan`, ikon garis `rekap`, keterangan "Ringkasan visual dan
  rincian tabel kehadiran, hifzh, diniyyah, dan olahraga."). Ikon
  gambar 3D: `IKON_MODUL_GAMBAR.laporan` dialiaskan ke gambar
  `rekap` di `src/lib/ikon-modul.ts`, jadi Fast Menu menampilkan
  gambar yang sama dengan bekas Rekap.

### 3. Halaman /laporan (`src/app/laporan/page.tsx`)

- Dua tab: "Ringkasan visual" dan "Rincian tabel", pola `.tab-pil`
  yang sama dengan tab detail santri (diperluas di globals.css
  agar menerima tautan `<a>` selain `<button>`).
- Mekanisme tab: komponen SERVER membaca query lewat prop
  `searchParams`; tab berpindah lewat tautan ber-query
  (`/laporan` dan `/laporan?tab=tabel`). URL selalu mencerminkan
  tab aktif — refresh/tombol kembali mempertahankan tab. Mekanisme
  ini dipilih menggantikan `useSearchParams` di komponen klien
  karena cara itu membuat isi tab gugur dari HTML statis (hanya
  fallback Suspense yang ter-render di server); dengan prop
  server, label tab dan judul konten benar-benar ada di HTML.
  Tab aktif membawa `aria-selected` + `aria-current="page"`,
  panel memakai `role="tabpanel"`.
- Visual = komponen bersama baru `src/components/KontenGrafik.tsx`
  (isi bekas halaman /grafik: 6 grafik + filter semester Fase 1,
  tanpa gerbang & judul halaman sendiri).
- Tabel = komponen bersama baru `src/components/KontenRekap.tsx`
  (isi bekas halaman /rekap: rekap pekanan, semesteran, ringkasan
  per kelas, grafik hifzh tabel; judul halaman dipindah ke
  /laporan).
- Gerbang: `PenjagaModul modul="laporan"`.
- Pengalihan warisan (redirect server `next/navigation`):
  `/grafik` → `/laporan`; `/rekap` → `/laporan?tab=tabel`.

### 4. Yang sengaja tidak disentuh

Perubahan Fase 1 (isi-kosong Hadir, penjaga perubahan belum
tersimpan, tanpa pilih-otomatis, kontras status, login tanpa
kerangka, filter semester grafik) tidak diubah. Tanpa gulir
horizontal; target sentuh tab & slot tetap ≥44px
(`--tinggi-sentuh` pada `.tab-pil`, pola `.nav-slot` lama).

## Hasil uji

- `npm run typecheck` — lulus (tsc tanpa galat).
- `npm run build` (env Supabase asli) — lulus; rute `/laporan`
  muncul sebagai ƒ (dinamis, karena membaca searchParams),
  `/grafik` & `/rekap` tetap terdaftar sebagai halaman pengalihan.
- `npx opennextjs-cloudflare build` — lulus ("OpenNext build
  complete").
- Mode contoh lokal (env Supabase dikosongkan, `next start`):
  - `/` → 200. SSR nav bawah persis susunan admin:
    label berurutan **Beranda, Santri, Kehadiran, Laporan, Menu**,
    slot tengah memakai kelas `nav-slot--tengah`; label "Grafik"
    dan "Akun" TIDAK ada lagi di nav bawah. Sidebar memuat entri
    "Laporan". Fast Menu beranda memuat entri Laporan → /laporan;
    tautan /rekap & /grafik lama tidak ada.
  - `/laporan` → 200. HTML memuat KEDUA label tab ("Ringkasan
    visual" & "Rincian tabel"), `aria-selected="true"` pada tab
    visual, panel visual berisi judul-judul grafik KontenGrafik
    ("Kehadiran per pekan", dst.) dan TIDAK memuat konten tabel.
  - `/laporan?tab=tabel` → 200. `aria-selected="true"` berpindah
    ke tab tabel, panel tabel aktif (keadaan awal KontenRekap
    "Memuat rekap…" — tabel terisi setelah data contoh dimuat di
    klien, sama seperti perilaku bekas /rekap).
  - `/grafik` → 307 ke `/laporan`; `/rekap` → 307 ke
    `/laporan?tab=tabel`.
  - `/menu` → 200; kisi hanya memuat satu entri Laporan untuk
    bekas Rekap/Grafik.

## Batas jujur

- Nav bawah per peran NON-admin (pengajar hifzh, pengajar
  diniyyah, musyrif, wali) terverifikasi dari KODE (tabel susunan
  `slotUntukStaf`/`slotUntukWali` di NavBawah.tsx) dan SSR parsial
  mode contoh (= admin) — BUKAN dari klik live dengan login
  masing-masing peran di produksi. Logika pemeriksaan sesi &
  pengambilan profil sama persis dengan NavTautan/NavBawah lama
  yang sudah teruji live; yang berubah hanya tabel susunannya.
- Khusus wali: resolusi href "Anak Saya" (1 anak vs >1 anak)
  berjalan di klien setelah profil + daftar santri termuat; belum
  diuji live dengan akun wali berisi 2 anak.
- Tab Laporan terverifikasi pada mode contoh lokal; di mode
  Supabase, PenjagaModul menahan render isi sampai profil termuat
  (perilaku sama dengan semua halaman modul lain).
