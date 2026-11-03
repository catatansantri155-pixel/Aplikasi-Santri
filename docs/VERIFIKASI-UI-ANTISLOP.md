# Verifikasi UI — Anti Slop v3.2.22

Penerapan prinsip [Anti Slop v3.2.22](https://github.com/miqdadbadjuber/anti-slop/tree/v3.2.22)
(core, UI, human, layoutmobile, copywriting) sebagai FILTER KUALITAS ke
aplikasi web Aplikasi Santri, meniru pola dokumen yang sama di Pustaka
Ilmu (`~/workspace/pustaka-ilmu/DESIGN.md`). Anti Slop bukan tema baru:
identitas hijau kop, huruf Plus Jakarta Sans, kartu radius besar, dan
banner gradien dari Panduan Desain Aplikasi Santri DIPERTAHANKAN. Yang
dibuang adalah ornamen berulang tanpa informasi, hierarki kabur, bahasa
pengembang di antarmuka, dan keadaan gagal tanpa jalan keluar.

Tanggal pemeriksaan: 3 Nov 2026. Ruang lingkup: murni tampilan &
aksesibilitas — logika bisnis, lapisan data, peta akses
(`src/lib/akses.ts`), dan alur login TIDAK diubah. Satu-satunya
perubahan perilaku tampilan: pemuatan awal tiap halaman modul kini
fungsi bernama yang juga menjadi target tombol "Coba lagi".

## Yang diubah per kategori

### 1. Slop visual & hierarki
- Beranda mode Supabase: kartu peran yang mengulang label peran dari
  banner (kartu + judul + teks) diganti satu paragraf subjudul berisi
  ringkasan tugas peran — informasi sama, satu lapis kartu berkurang.
- Ornamen geometris banner tetap HANYA di banner (beranda & kepala
  detail santri); tidak ditambahkan ke kartu lain. Gradien latar pada
  `.kartu--aksen-emas` dihapus, cukup garis atas emas.
- Penanda berbentuk lencana tidak lagi dipakai untuk keadaan sesaat:
  penanda "MEMUAT…" dan "DATA BELUM BISA DIMUAT" di halaman Rekap dan
  Detail Santri dihapus — keadaan memuat cukup teks polos, keadaan
  gagal memakai kartu galat. Penanda tahap tetap hanya untuk mode
  contoh (informasi keadaan data yang nyata).
- Chevron kanan pada baris daftar digelapkan dari #b7c4ba (1,81:1)
  menjadi token teks redup agar keterketukan baris terbaca.

### 2. Keadaan memuat / kosong / gagal yang jujur
- Komponen bersama baru `src/components/KartuGalat.tsx`: judul "Data
  belum bisa dimuat", pesan galat apa adanya, dan tombol "Coba lagi"
  yang menjalankan ulang pemuatan data halaman itu (bukan memuat ulang
  seluruh halaman). Dipakai di Kehadiran, Diniyyah, Catatan, Olahraga,
  Admin.
- Daftar Santri, Detail Santri, dan Rekap kini punya tombol "Coba
  lagi" sendiri pada keadaan gagalnya (sebelumnya hanya pesan).
- Daftar Santri membedakan dua keadaan kosong yang sebelumnya
  tercampur: pencarian tanpa hasil ("Tidak ditemukan … Coba kata
  lain") vs belum ada data sama sekali ("Belum ada data santri").
- Olahraga: teks "Belum ada sesi" tidak lagi tampil saat pemuatan
  gagal; yang tampil "Data sesi belum bisa ditampilkan" + kartu galat.

### 3. Aksesibilitas
- Skip link "Lewati ke konten" ditambahkan di `Kerangka.tsx`
  (tersembunyi sampai menerima fokus keyboard), menarget `<main
  id="konten" tabIndex={-1}>` (sidebar & navigasi bawah).
- `aria-current="page"` pada tautan nav aktif: SUDAH ada sebelumnya di
  `NavTautan.tsx` untuk sidebar dan nav bawah — diverifikasi tetap
  tampil di HTML hasil render.
- Fokus keyboard diperkuat: sebelumnya garis emas #F0B000 sendirian
  hanya 1,92:1 di atas putih. Kini `:focus-visible` = garis hijau
  gelap 2px (9,86:1 di putih; 9,10:1 di latar aplikasi) + halo emas
  (5,13:1 di atas hijau gelap) agar terlihat di permukaan terang
  maupun hijau gelap.
- `@media (prefers-reduced-motion: reduce)` ditambahkan: durasi
  transisi/animasi dipaksa ~0 dan smooth-scroll dimatikan. (CSS
  aplikasi saat ini memang hampir tanpa transisi; aturan ini
  pengaman ke depan.)
- Safe area: navigasi bawah sudah memakai
  `padding-bottom: env(safe-area-inset-bottom)`; bilah aksi melekat
  kini `bottom: calc(72px + env(safe-area-inset-bottom))` agar tidak
  tertutup navigasi pada perangkat berponi.
- Target sentuh ≥44px: chip 40→44px, tombol segmen 40→44px,
  `.tombol-kecil` 36→44px, `.tombol-ikon` 40→44px. Pilihan status
  (50px), tombol utama (48/52px), tab pill (44px), dan tautan nav
  (44/58px) sudah memenuhi sebelumnya.

### 4. Kontras (dihitung dengan skrip, bukan diklaim)
Rumus WCAG: luminansi relatif sRGB, rasio (L1+0,05)/(L2+0,05).

| Pasangan | Sebelum | Sesudah |
| --- | --- | --- |
| Teks redup di latar atas #F2F7F3 | #6B7A70 = 4,17:1 ✗ | #52625B = 5,95:1 ✓ |
| Teks redup di latar bawah #EAF3EC | #6B7A70 = 3,99:1 ✗ | #52625B = 5,69:1 ✓ |
| Teks redup di kartu putih | #6B7A70 = 4,52:1 | #52625B = 6,45:1 ✓ |
| Teks redup di segmen #E7EFE9 | — | 5,50:1 ✓ |
| Teks redup di hijau muda #E6F2EC | — | 5,61:1 ✓ |

Pasangan lain yang dihitung dan sudah lolos tanpa perubahan: teks
utama #12211A di latar 15,40:1; putih di hijau kop 6,53:1 dan di
hijau gelap 9,86:1; sapaan/sub banner (putih opasitas 0,88/0,90 di
#006B4F) 5,43:1 & 5,61:1; teks penanda tahap 5,58:1; pesan galat
6,91:1; pesan sukses 8,62:1; teks pil status di putih 5,54–8,46:1;
lencana status 4,89–7,17:1. Token yang diubah hanya `--teks-redup`:
#6B7A70 → #52625B di `globals.css`.

### 5. Copywriting
- Subjudul setiap halaman dipangkas menjadi satu kalimat polos yang
  menyebut isi halaman. Yang paling berubah:
  - Rekap: daftar nama view database (`rekap_kehadiran_pekanan`, dst.)
    dihapus dari antarmuka — itu bahasa pengembang, bukan informasi
    pengguna. Menjadi "Rekap kehadiran per pekan dan per semester,
    beserta grafik perkembangan hifzh."
  - Hifzh: daftar 10 kolom formulir di subjudul dihapus; menjadi
    "Setoran hafalan (BC, BR, TS, LM) dan tes semester per juz sesuai
    Buku Hafalan, dengan nilai L/U otomatis." Istilah resmi dari PDF
    (BC/BR/TS/LM, RG/KK/KB, L/U) tidak diubah.
  - Kehadiran, Catatan, Olahraga, Admin: kalimat "Masuk sebagai …"
    di subjudul dihapus — nama & peran pengguna sudah tampil di
    kerangka (kepala/sidebar) pada halaman yang sama.
  - Diniyyah: daftar slot kegiatan dipindah dari subjudul ke catatan
    kaki kecil di bawahnya (informasi jadwal, bukan ringkasan
    halaman).
  - Beranda contoh: tiga kalimat penjelasan scaffold menjadi satu
    kalimat.
- Pola label tombol simpan disamakan: "Simpan <objek>" — "Simpan
  Setoran" → "Simpan setoran" (menyamakan huruf dengan "Simpan
  kehadiran", "Simpan catatan", "Simpan nilai harian", dst.). Label
  buat ("Tambah santri", "Buat semester", "Tautkan") tidak diubah
  karena memang aksi membuat, bukan menyimpan.
- Halaman Login tidak diubah: sudah satu aksi utama, pesan galat
  jujur berbahasa Indonesia, tanpa teks basa-basi.

### 6. Responsif (pemeriksaan statis atas sumber & CSS ter-bundle)
- Semua tabel (5 buah: ringkasan diniyyah di modul & detail, ujian
  hifzh, 2 tabel rekap) kini dibungkus kelas bersama `.tabel-bungkus`
  (gulir horizontal), menyatukan gaya `overflowX: "auto"` sebaris yang
  sebelumnya tersebar; konstanta gaya pembungkus setempat dihapus.
- Lebar tetap >320px pada sumber hanya `minWidth` tabel di dalam
  pembungkus gulir itu; tidak ada lebar tetap lain yang meluber.
  Kolom konten `max-width: 960px`, formulir `max-width: 420px`,
  login `max-width: 400px` — semua menyusut mengikuti layar.
- Konten punya `padding-bottom: 96px` (HP) agar bilah aksi melekat
  dan navigasi bawah tidak menutupi isi terakhir.

## Pemeriksaan yang benar-benar dijalankan
- `npm run typecheck` — lulus.
- `npm run build` (Next) — lulus, 12 rute.
- `npx opennextjs-cloudflare build` — lulus ("OpenNext build complete").
- Uji asap mode contoh (build tanpa env, `.env.local` disisihkan lalu
  dipulihkan utuh dan terverifikasi git-ignored): 11 rute 200 — `/`,
  `/login`, `/santri`, `/santri/<id contoh>`, `/kehadiran`, `/hifzh`,
  `/diniyyah`, `/catatan`, `/rekap`, `/olahraga`, `/admin`.
- Bukti teks pada HTML SSR mode contoh: tautan "Lewati ke konten"
  dengan `href="#konten"` dan `<main id="konten">` tampil;
  `aria-current="page"` tampil pada tautan Beranda aktif; subjudul
  baru Daftar Santri tampil; nama view database tidak lagi ada di
  HTML Rekap (0 kemunculan).
- Bukti pada CSS ter-bundle: `--teks-redup:#52625b` ada, nilai lama
  #6B7A70 hilang (0 kemunculan), blok `prefers-reduced-motion` dan
  kelas `.lewati-konten` ada.
- Uji asap mode Supabase (build dengan env asli): `/login` 200 dengan
  logo login & skip link, tanpa penanda mode contoh.
- Kontras dihitung dengan skrip Node (tabel di atas), bukan perkiraan
  visual.

## Keterbatasan (jujur)
- Tidak ada uji browser sungguhan dari putaran ini: lebar
  320/375/768, reflow teks 200%, dan navigasi keyboard ujung-ke-ujung
  diverifikasi secara statis (sumber + CSS ter-bundle + HTML SSR),
  bukan dengan perangkat/browser nyata. Pemeriksaan visual pasca-
  deploy menjadi verifikasi induk bersama sisa uji Tahap 4.
- Tombol "Coba lagi" dibuktikan dari kode dan build; alur klik saat
  koneksi gagal sungguhan belum dijalankan di browser.
- Kisi tiga kolom pada formulir hifzh (RG/KK/KB) menyempit pada layar
  320px tetapi tidak meluber keluar halaman (kolom fr mengikuti lebar
  wadah); kenyamanan isinya pada lebar itu belum diuji visual.
- Campuran opasitas banner dihitung dari warna gradien tengah
  (#006B4F); pada ujung gradien paling terang/tergelap rasio bergeser
  sedikit, tetap di atas 4,5:1 untuk teks banner beropasitas ≥0,88.
