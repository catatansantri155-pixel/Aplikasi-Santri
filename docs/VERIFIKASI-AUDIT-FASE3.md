# Verifikasi Audit UI — Fase 3 (Perapian Halaman Kerja)

Tanggal: 3 November 2026 · Di atas commit Fase 2 (`d76f46d`) · Aplikasi: `apps/web`
(Next 16 + React 19 + Supabase + OpenNext/Cloudflare Workers).

Pola tab yang dipakai di seluruh Fase 3: tab tersimpan di query URL
(`?tab=`), dibaca komponen server lewat `searchParams`, diteruskan sebagai
prop ke komponen klien — persis pola halaman Laporan pada Fase 2. Tab berupa
tautan `<Link>` di dalam `.tab-pil` dengan `role="tab"`, `aria-selected`,
`aria-current`, `aria-controls`, dan isi dibungkus `role="tabpanel"`.

## Hasil build (semua wajib, semua lulus pada kode final)

| Perintah | Hasil |
|---|---|
| `npm run typecheck` | Lulus (`tsc --noEmit`, tanpa galat) |
| `npm run build` | Lulus; `/hifzh`, `/diniyyah`, `/admin` kini ƒ (dinamis, karena `searchParams`) |
| `npx opennextjs-cloudflare build` | Lulus ("OpenNext build complete", worker tersimpan) |

## Uji mode contoh lokal (server dev, env Supabase dikosongkan)

Semua rute berikut menjawab **200** dan memuat label tab/bagian yang benar
pada HTML hasil render server:

| Rute | Bukti label |
|---|---|
| `/hifzh?tab=ujian` | "Tes Semester" ada; "Form Setoran"/"Simpan setoran" tidak ada |
| `/hifzh` | "Form Setoran" ada; bagian lain tidak ikut tampil |
| `/hifzh?tab=riwayat` | "Setoran Terakhir" saja yang tampil |
| `/diniyyah` | Ringkasan `<details>` "Konfigurasi akademik belum final" + "Form nilai harian" |
| `/diniyyah?tab=ringkasan` | Kepala tabel "Ujian gasal", "Rata-rata gabungan", "per mapel" ada; "Simpan nilai harian" tidak ada |
| `/admin` | "Tambah santri" ada di tab Santri; "Buat semester baru"/"Tautan akun wali" tidak ada |
| `/admin?tab=semester` | "Kelola semester" + "Buat semester baru" ada; "Tambah santri" tidak ada |
| `/admin?tab=wali` | "Tautan akun wali" + "Tambah tautan" ada |
| `/catatan` | "Tulis catatan", "Pelapor:", "Riwayat catatan", filter "Semua santri"/"Semua kategori" |
| `/olahraga` | `<h2>Buat sesi baru</h2>` (byte 8268) muncul SEBELUM `<h2>Sesi olahraga</h2>` (byte 8893) |
| `/santri` | Chip filter kelas ter-render (`role="group"` aria-label "Filter kelas", chip "Semua") |
| `/laporan` | Tab "Ringkasan visual"/"Rincian tabel" utuh; kelas `.kisi-grafik` ada pada HTML tab visual |
| `/` (mode Supabase, tanpa sesi) | Elemen `<header>` tetap ter-render (1) — tautan "Masuk" tidak hilang (lihat catatan butir 7a) |

## Per butir

1. **Hifzh** — `page.tsx` menjadi komponen server pembaca `?tab=`;
   isi lama pindah utuh ke `IsiHifzh.tsx` dengan tab Setoran · Riwayat ·
   Ujian. Di `BagianUjian.tsx`: juz yang diketik dicocokkan ke baris yang
   sudah ada untuk santri terpilih; bila ada, muncul pemberitahuan
   `aria-live` berisi nilai lama (halaman, RG, KK, KB, hasil) dan label
   tombol menjadi "Perbarui Juz \<n\>"; pesan sukses juga memakai kata
   "diperbarui". Bila belum ada, tetap "Tambah Baris Juz".
2. **Diniyyah** — pola sama (`IsiDiniyyah.tsx`, tab Harian · Ujian ·
   Ringkasan; pemilih santri/mapel tetap terlihat di semua tab).
   (a) Blok "Yang belum final" menjadi `<details class="rincian">` dengan
   `<summary>` "Konfigurasi akademik belum final"; gaya `.rincian`
   ditambah di `globals.css` (kartu kecil, target sentuh summary ≥44px).
   (c) Semester awal form ujian = semester yang rentang tanggalnya memuat
   hari ini, cadangan semester pertama. (d) Form harian dan ujian
   menampilkan "Nilai saat ini: X — …" bila nilai untuk kombinasi
   terpilih sudah ada, dengan label tombol "Perbarui nilai".
3. **Admin** — pola sama (`IsiAdmin.tsx`, tab Santri · Semester · Wali).
   Form "Tambah santri" kini di kepala tab Santri (sebelum daftar) dan
   "Buat semester baru" di kepala tab Semester. `tanganiAturStatus`
   meminta `window.confirm` saat menonaktifkan, menyebut nama santri dan
   akibatnya ("… akan dinonaktifkan dan hilang dari daftar modul lain");
   pengaktifan kembali tanpa konfirmasi. Pelepas tautan wali: chip ✕
   diganti baris santri + tombol teks "Lepas" (`.tombol-kecil`, tinggi
   minimum `var(--tinggi-sentuh)`), dan `tanganiLepasTautan` meminta
   konfirmasi yang menyebut pasangan wali–santri sebelum menghapus.
4. **Catatan** — kolom terkunci "Nama pelapor" dihapus dari formulir;
   sebagai gantinya teks info kecil "Pelapor: \<nama\> — tercatat
   otomatis dari akun yang masuk" tepat di atas tombol Simpan (pagar
   `pelaporSiap` dan peringatan profil kosong tidak berubah). Bagian
   dipisah jelas: "Tulis catatan" dan "Riwayat catatan". Riwayat
   mendapat filter klien santri + kategori + tanggal atas catatan yang
   sudah termuat, teks "Menampilkan N dari M catatan terbaru", dan
   tombol "Kosongkan filter". Pesan hasil simpan dipisah status:
   sukses memakai `.pesan-sukses` (hijau, `role="status"`), gagal
   memakai `.pesan-galat` (merah, `role="alert"`).
5. **Olahraga** — seksi "Buat sesi baru" dipindah ke atas daftar sesi
   (teks keadaan kosong diperbarui "di atas"). Daftar sesi selalu diurut
   tanggal terbaru dulu di tingkat halaman, tampil 10 pertama, tombol
   "Muat lebih banyak (N sesi lagi)" menambah +10.
6. **Daftar Santri** — chip filter kelas Semua · Kelas 1 · Kelas 2 ·
   Kelas 3 (`.grup-chip`/`.chip`, `aria-pressed`) yang digabung dengan
   pencarian nama yang sudah ada; teks "Menampilkan N santri."; keadaan
   tanpa hasil (karena pencarian/filter) memuat tombol "Hapus pencarian"
   yang membersihkan keduanya. Peran dibaca dari profil login (mode
   Supabase): untuk wali judul menjadi "Anak Saya" dan keadaan kosong
   tanpa penyaring menjelaskan akun belum ditautkan ke santri mana pun.
7. **Kerangka/header** — (a) Header mobile di beranda disembunyikan
   HANYA setelah profil login terkonfirmasi ada (lihat penyimpangan
   sadar di bawah). (b) `.info-pengguna-kepala` mendapat `min-width: 0`,
   nama pengguna `overflow: hidden; text-overflow: ellipsis`.
   (c) Sidebar desktop: `.nav-samping` kini `flex: 1; overflow-y: auto`
   dan blok identitas `flex-shrink: 0` — navigasi bergulir sendiri,
   identitas tetap terlihat. (d) `@media (max-width: 767px)`: semua
   input/select/textarea di `.konten` dan input login `font-size: 16px
   !important` (mencegah zoom otomatis Safari; `!important` disengaja
   agar gaya sebaris ikut tertimpa). (e) Enam kartu grafik di tab visual
   `/laporan` dibungkus `.kisi-grafik`: 2 kolom pada ≥1024px.

## Penyimpangan sadar & batas jujur

- **Butir 7a disesuaikan demi keamanan pintu masuk.** Implementasi
  harfiah "sembunyikan header di beranda pada mode Supabase" terbukti
  menghilangkan satu-satunya tautan "Masuk" bagi pengunjung yang belum
  login (diuji: render mode Supabase tanpa sesi menghasilkan 0 elemen
  `<header>` dan 0 tautan `/login`). Karena itu header beranda hanya
  disembunyikan setelah `ambilProfilLogin()` memastikan ada profil —
  bagi pengguna yang sudah masuk hasilnya persis seperti diminta
  (identitas tidak ganda), bagi yang belum masuk pintu "Masuk" tetap
  ada. Konsekuensi kecil: ada kedip singkat header sebelum profil
  terkonfirmasi pada kunjungan beranda pengguna yang sudah masuk.
- **Uji render server tidak mencakup keadaan setelah data klien
  termuat.** Sebagian bukti bersifat struktural/kode: tombol "Lepas"
  pada tab Wali, teks "Menampilkan N santri", label "Perbarui Juz
  \<n\>"/"Perbarui nilai", dan tombol "Muat lebih banyak" muncul setelah
  `useEffect` memuat data contoh di peramban; pada HTML render server
  yang terlihat adalah keadaan memuatnya. Logika dan labelnya
  terverifikasi lewat pembacaan kode + `grep`, dan typecheck/build
  lulus; belum ada uji peramban sungguhan (klik tab, konfirmasi
  `window.confirm`, filter catatan) pada fase ini.
- **Konfirmasi memakai `window.confirm`** sesuai bunyi tugas; bukan
  dialog kustom.
- Yang sengaja TIDAK dikerjakan (di luar lingkup): konversi tabel
  Laporan menjadi kartu mobile, ekspor laporan, bagian ringkas peran
  di Beranda. Skema basis data, RLS, dan logika lapisan data tidak
  diubah selain yang disebut di atas.
