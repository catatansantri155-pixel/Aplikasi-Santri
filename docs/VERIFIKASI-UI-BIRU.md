# Verifikasi UI Biru (Revisi 3 Nov 2026 malam)

Revisi mengikuti arahan user pada tangkapan layar beranda admin:
palet aplikasi diganti dari hijau kop menjadi **biru gradasi ke
putih ala UNPIX Mobile**, teks merek di bagian atas dihapus,
ringkasan di beranda dihapus, slot "Menu" di navigasi bawah diganti
"Grafik" dengan halaman grafik baru, dan tombol keluar dipusatkan
di halaman Akun. Diterapkan di seluruh halaman lewat token &
kelas bersama di `apps/web/src/app/globals.css`.

## Cakupan perubahan per poin

### 1. Warna biru di seluruh aplikasi

Pemetaan nilai (nama variabel & kelas CSS **dipertahankan**, yang
berubah nilainya — jadi seluruh halaman ikut berubah tanpa
menyentuh markup):

| Token / tempat | Lama (hijau) | Baru (biru) |
| --- | --- | --- |
| `--hijau-kop` (primer) | `#006b4f` | `#1565c0` |
| `--hijau-gelap` | `#0b4d36` | `#0d47a1` |
| `--hijau-logo` (aksen terang) | `#1e6b00` | `#42a5f5` |
| `--biru-terang` (baru) | — | `#42a5f5` |
| Gradasi pita/header/banner/hero | gelap → kop → `#0a7a5c` | `#0d47a1` → `#1565c0` → `#42a5f5` |
| Latar halaman (body) | `#f2f7f3` → `#eaf3ec` | `#eaf4fe` → `#ffffff` |
| `--hijau-muda` (tint) | `#e6f2ec` | `#e3f0fa` |
| `.ikon-lingkaran--hijau` | bg `#e2f1e8`, teks `#0b6b4a` | bg `#e3f0fa`, teks `#1565c0` |
| `--teks` | `#12211a` | `#132433` |
| `--teks-redup` | `#52625b` | `#52677a` (abu-biru) |
| `--garis` | `#e3eae4` | `#dde8f2` |
| Bayangan (semua `rgba(11,77,54,…)` / `rgba(0,107,79,…)`) | hijau | `rgba(13,71,161,…)` / `rgba(21,101,192,…)` |
| Sidebar (ujung gradasi) | `#073626` | `#082a5e` |
| Lingkaran tengah nav bawah | gradien hijau | gradien `#42a5f5` → `#1565c0` |
| `themeColor` (layout) | `#006b4f` | `#1565c0` |
| Garis putus-putus dekoratif (`#bfd4c6` di globals, hifzh/gaya.ts, catatan) | hijau muda | `#b8d2ec` / `#bcd3ea` (biru muda) |

Yang **sengaja tidak berubah**: emas `#f0b000` sebagai aksen kecil
(penanda slot aktif, cincin fokus, lencana hasil M) dan warna
**semantik** status/hasil — Hadir & Lancar hijau, Sakit kuning,
Izin biru, Alpa & Ulang merah, skala hasil hifzh M→G — karena itu
kode makna, bukan warna merek. Dua tempat yang dulu memakai
`var(--hijau-gelap)` di atas latar hijau semantik (`.lencana--l`,
`.pesan-sukses`) kini memakai hijau tua semantik `#0e6b3c` agar
tetap selaras dengan latarnya.

Kontras Anti Slop dijaga: `--teks-redup #52677a` ≈ 5,8:1 di atas
putih dan ≈ 5,0:1 di atas latar `#eaf4fe` (dihitung dari luminansi
relatif) — tetap ≥ 4,5:1. Cincin fokus tetap garis biru gelap
(kontras tinggi) + halo emas.

### 2. Header bersih berisi identitas pengguna

- `Kerangka.tsx`: teks "Aplikasi Santri" / "Ponpes Minhajus
  Sunnah · Marhalah Wustha" **dihapus** dari header mobile dan
  blok merek sidebar **dihapus**. Judul dokumen (tab browser)
  disederhanakan menjadi "Aplikasi Santri".
- Header mobile kini hanya berisi blok identitas dari
  `InfoPengguna` varian kepala: avatar inisial + **nama (tebal)**
  + label peran (kecil) — menaut ke `/akun`. Selama sesi diperiksa
  header kosong sesaat (pola anti-kedip yang sama seperti
  sebelumnya); tanpa sesi tampil tombol "Masuk".
- Sidebar desktop: blok identitas yang sama kini di **paling
  atas** sidebar (menggantikan merek), tetap tautan ke `/akun`
  dengan chevron.
- Ornamen geometris (pola bintang segi delapan) **dihapus total**:
  `.banner::before/::after` dan `.login-hero::before/::after`
  dihapus dari CSS — pita sapaan beranda, banner halaman lain, dan
  hero login kini gradien biru bersih.
- Halaman login **tetap** menampilkan judul "Aplikasi Santri"
  (pengguna belum masuk) dengan hero biru baru tanpa ornamen dan
  ilustrasi yang sama. Catatan: subjudul hero login masih
  "Ponpes Minhajus Sunnah Magelang · Marhalah Wustha" — dibiarkan
  karena instruksi revisi untuk login hanya mempertahankan judul
  + biru + tanpa ornamen; teks itu bukan header aplikasi.

### 3. Beranda dirampingkan

Beranda mode Supabase kini hanya: pita sapaan (avatar, nama,
peran, tanggal Masehi + Hijriah — tanpa ornamen) + lembar berisi
kisi Fast Menu. Yang dihapus:

- paragraf `RINGKASAN_PERAN` di bawah sapaan,
- ketiga kartu ringkasan (Santri/Anak terdaftar, Sesi olahraga,
  Semester berjalan) beserta state & pemanggilan datanya
  (`ambilDaftarSesi`, `ambilSemesterAdmin` tidak lagi dibaca
  beranda).

Mode contoh: kartu peran tetap ada tetapi kini ikon + label saja
(paragraf ringkasan peran tidak ditampilkan di beranda pada mode
apa pun); penjelasan hak akses lengkap tetap ada di halaman Akun.
Bagian "Tampilan Wali (contoh)" tidak berubah.

### 4. Slot Grafik + halaman /grafik baru

- `NavBawah`: slot ke-4 kini **Grafik** (ikon garis grafik batang
  baru `"grafik"` di `Ikon.tsx`, href `/grafik`, status aktif di
  `/grafik`). Slot lain tidak berubah (Beranda, Santri, tengah
  menonjol per peran, Akun). Halaman `/menu` **tetap ada** dan
  tetap bisa dibuka; tautan Grafik juga ditambahkan ke sidebar
  desktop (`NavTautan`, setelah Rekap).
- `lib/akses.ts`: kunci modul `"grafik"` ditambahkan untuk
  **semua peran yang login**; `modulDariPath("/grafik")` terpetakan;
  halaman dibungkus `PenjagaModul modul="grafik"`.

Enam grafik (semua dari fungsi data yang sudah ada; tidak ada data
yang dikarang; keadaan kosong = pesan "Belum ada data."):

| # | Gaya | Isi | Sumber data & agregasi |
| --- | --- | --- | --- |
| a | Batang vertikal polos (biru `#1565c0`, ujung atas siku) | Jumlah Hadir per pekan, 8 pekan terakhir | `ambilRekapPekanan()` — `jumlahHadir` dijumlah lintas santri per `pekanMulai` |
| b | Donat SVG (`stroke-dasharray`, total sesi di tengah) + legenda persen | Komposisi status semester H/S/I/A | `ambilRekapSemester()` — H/S/I/A dijumlah lintas santri & semester |
| c | Garis/area SVG (polyline + area isi tembus) | Progres jumlah setoran hifzh per pekan, 8 pekan terakhir | `ambilAgregatGrafikHifzh()` — agregat `mingguan`, `jumlahSetoran` dijumlah lintas jenis (BC/BR/TS/LM) per `periodeMulai` |
| d | Batang horizontal (skala 0–100, nilai di kanan) | Rata-rata nilai diniyyah per mapel | Per santri dari `ambilDaftarSantri()`: `ambilNilaiHarianSantri()` + `ambilNilaiUjianSantri()` → `hitungRingkasanMapel()` (rumus sementara yang sama dengan modul Diniyyah) → `rataGabungan` dirata-rata lintas santri per mapel |
| e | Batang bertumpuk proporsi (satu batang L vs U + persen) | Hasil setoran Lancar vs Ulang | Agregat hifzh yang sama dengan (c): `jumlahL` & `jumlahU` dijumlah |
| f | Batang vertikal gaya kedua (gradien `#42a5f5`→`#1565c0`, ujung atas membulat penuh) | Jumlah sesi olahraga per bulan, 6 bulan terakhir | `ambilDaftarSesi()` — sesi dikelompokkan per bulan dari `tanggal` |

Semua fungsi sumber menghormati RLS (view rekap memakai
security_invoker): staf melihat agregat semua santri; wali hanya
agregat anaknya sendiri, dan bila kosong tampil "Belum ada data."
Kegagalan membaca diniyyah/olahraga hanya mengosongkan grafiknya
masing-masing; kegagalan rekap menampilkan `KartuGalat` dengan
tombol "Coba lagi". Mode contoh menandai halaman dengan penanda
"DATA CONTOH · FIKSI" seperti halaman Rekap.

### 5. Tombol keluar hanya di /akun

`InfoPengguna` tidak lagi merender tombol keluar di varian kepala
maupun samping (fungsi keluar & impor klien Supabase untuk itu
dihapus dari komponen ini). Keluar hanya dari tombol "Keluar" di
halaman Akun (`keluarDariSesi` di `lib/sesi.ts`, tidak berubah).
Blok identitas di kepala & sidebar menaut ke `/akun`.

### Aturan tetap yang dijaga

Tanpa gulir horizontal (tidak ada perubahan pola tabel/bungkus);
target sentuh ≥ 44px (blok identitas kepala `min-height: 44px`);
skip link & cincin fokus tidak berubah; logika login, RLS, dan
lapisan data tidak diubah selain penambahan kunci akses "grafik";
`DAFTAR_MODUL` & ikon gambar Fast Menu tidak diubah.

## Hasil uji (3 Nov 2026 malam, lokal)

- `npm run typecheck` — **lulus**.
- `npm run build` — **lulus** (15 rute, termasuk `○ /grafik`).
- `npx opennextjs-cloudflare build` — **lulus** ("OpenNext build
  complete", worker tersimpan).
- Mode contoh lokal (`next start`, env Supabase dikosongkan
  sementara): `/`, `/grafik`, `/menu`, `/akun`, `/login` — semua
  **200**.
- SSR beranda (mode contoh **dan** mode Supabase dari build
  produksi lokal):
  - teks "Melihat semua data" — **0** kemunculan;
  - "Santri terdaftar", "Sesi olahraga", "Semester berjalan" —
    **0** (kartu ringkasan hilang);
  - "Ponpes Minhajus" — **0** di seluruh HTML beranda (judul
    dokumen sudah disederhanakan) dan elemen `<header class=
    "kepala">` hanya berisi blok identitas / tombol Masuk;
  - navigasi bawah SSR: tepat 5 slot, slot ke-4 `href="/grafik"`
    berlabel **Grafik** (label "Menu" tidak ada lagi di nav
    bawah; `/menu` tetap 200 saat dibuka langsung).
- CSS terbangun (build contoh): memuat `1565c0`, `0d47a1`,
  `42a5f5`, `eaf4fe`; **tidak** memuat `006b4f`, `0b4d36`, maupun
  pola ornamen bintang (`rotate(45` — 0).
- Bahan grafik mode contoh terverifikasi ada di gudang contoh:
  kehadiran 30 baris (2 pekan, total semester 30 sesi), setoran
  hifzh contoh 5 baris (2 pekan, L & U), nilai diniyyah contoh
  untuk 3 santri, sesi olahraga contoh di 2 bulan — keenam grafik
  terisi pada mode contoh.

## Batas jujur

- Grafik dirender di sisi klien setelah data termuat; SSR hanya
  memuat judul + keadaan "Memuat grafik…". Isi grafik dengan
  **data asli produksi belum dilihat** (perlu login peran asli) —
  yang teruji: struktur halaman, keadaan memuat, agregasi dari
  data contoh (fungsi data yang sama persis dengan halaman Rekap
  yang sudah live), dan keadaan kosong dari jalur kode.
- Tampilan visual akhir (header biru di HP asli, proporsi donat &
  garis pada lebar ±390px) belum diverifikasi pada perangkat
  nyata dari sesi ini; pemeriksaan lebar mengikuti pola statis
  yang sama dengan revisi sebelumnya (komponen memakai flex
  `min-width: 0` dan label membungkus, tanpa lebar tetap > wadah).
- Subjudul hero login masih menyebut nama pondok (lihat poin 2) —
  bila user ingin dibersihkan juga, tinggal menghapus satu baris
  di `src/app/login/page.tsx`.
