# Verifikasi Perbaikan Audit UI — Fase 1 (Pengaman Input & Kejelasan)

Tanggal: 3 November 2026 malam. Acuan: `Audit-UI-3Nov-Komplit.md`
(prioritas tinggi 1–5 + temuan login, grafik, kontras status).
Basis kode: commit `7b5ae4c` (revisi biru). Fase ini TIDAK mengubah
skema database maupun RLS, dan TIDAK menyentuh butir yang menunggu
keputusan user (susunan nav per peran usulan audit, peleburan
Rekap+Grafik) — itu wilayah Fase 2.

## A. Kehadiran (`src/app/kehadiran/page.tsx`)

1. **Isi-kosong, bukan timpa.** Tombol "Tandai semua Hadir" diganti
   "Isi yang kosong sebagai Hadir": hanya santri yang statusnya masih
   kosong yang diisi; pilihan Sakit/Izin/Alpa yang sudah dibuat tidak
   berubah. Logika dipindah ke fungsi murni `src/lib/kehadiran-isi.ts`
   (`isiKosongSebagaiHadir`, `timpaSemuaJadiHadir`, `hitungTertimpa`,
   `hitungKosong`) agar bisa diuji langsung. Penimpaan total tetap ada
   sebagai tindakan sekunder terpisah, "Timpa semua jadi Hadir",
   dengan `window.confirm` yang menyebut jumlah status yang akan
   tertimpa (dihitung dari status terpilih selain Hadir).
2. **Label Simpan bercakupan.** Tombol kini berbunyi
   "Simpan N kehadiran · Kelas X" (N = entri yang benar-benar akan
   dikirim) dan di sebelahnya tampil sisa "M belum diisi" (atau
   "Semua santri kelas ini sudah terisi").
3. **Perlindungan perubahan belum disimpan.** Pilihan status menandai
   formulir "kotor"; mengganti tanggal/jenis sesi/slot jadwal dalam
   keadaan kotor memicu `window.confirm` "Ada perubahan belum
   disimpan. Lanjutkan dan buang perubahan?" — ditolak berarti
   konteks tidak berubah (input terkendali tidak jadi berpindah).
   Keadaan kotor dibersihkan setiap pemuatan baris dari basis data
   dan setelah simpan berhasil. Ganti kelas tidak dijaga karena tidak
   memuat ulang pilihan (pilihan terikat per santri lintas kelas).
4. **Data tersimpan baca-saja untuk non-admin.** Baris yang statusnya
   sudah ada di basis data (dari `ambilKehadiran`) tampil sebagai
   lencana status + label "Tersimpan" untuk peran non-admin, beserta
   keterangan "Perubahan status tersimpan hanya lewat revisi admin."
   Baris tersimpan juga TIDAK ikut dikirim ulang saat menyimpan
   (sebelumnya ikut ter-upsert; kebijakan basis data hanya mengizinkan
   ubah lewat revisi, jadi pengiriman ulang berisiko menolak satu
   batch). Admin mempertahankan perilaku lama: tombol aktif + form
   revisi RPC yang sama, tidak dibangun ulang.

## B. Olahraga (`src/app/olahraga/page.tsx`)

- Aksi massal mengikuti pola yang sama: "Isi yang kosong sebagai
  Hadir" atas santri yang sedang tampil (filter kelas), plus "Timpa
  semua jadi Hadir" berkonsfirmasi dengan hitungan atas daftar tampil.
- Kejujuran cakupan simpan: tombol berbunyi "Simpan kehadiran ·
  N terisi" dan keterangan di bawahnya menyatakan eksplisit bahwa
  yang dikirim adalah SEMUA status terisi pada sesi ini — bila filter
  kelas aktif, keterangan menyebut jumlahnya dan bahwa santri di luar
  filter ikut terkirim (filter hanya membatasi tampilan). Perilaku
  kirim tidak diubah (sudah benar), yang diperbaiki labelnya.

## C. Tanpa pilih-otomatis santri/wali

Semua formulir berikut kini mulai dari pilihan kosong dengan opsi
penampung, tombol Simpan nonaktif sampai pilihan sadar dibuat, dan
identitas terpilih (nama + kelas) tampil dekat tombol Simpan:

- Hifzh `FormSetoran`: pola lama `?? daftarSantri[0]` dihapus;
  penampung "Pilih santri…". Setelah pengguna memilih dan menyimpan,
  pilihan dipertahankan untuk setoran berikutnya pada anak yang sama
  (pilihan sadar, bukan otomatis).
- Hifzh `BagianUjian`: pola pilih-otomatis yang sama ditemukan di
  form tes semester pada halaman yang sama dan diperbaiki dengan pola
  identik (penampung, tabel juz menunggu pilihan, tombol nonaktif,
  identitas dekat tombol). Ini perluasan yang disengaja dalam kelas
  risiko yang sama di halaman yang sama.
- Catatan: baris `setSantriId(data[0].id)` di pemuatan awal dihapus;
  penampung "Pilih santri…".
- Diniyyah: pilih-otomatis santri pertama dihapus; penampung
  "Pilih santri…"; kedua tombol simpan sudah nonaktif tanpa santri
  dan kini juga menampilkan identitas terpilih di dekatnya.
- Panel Admin, form tautan wali: wali DAN santri tidak lagi
  dipramuat ke entri pertama; penampung "Pilih wali…" / "Pilih
  santri…"; tombol "Tautkan" nonaktif sampai keduanya dipilih dan
  pasangan terpilih ditampilkan ("Pasangan yang akan ditautkan:
  Wali → Santri · Kelas").

Mode contoh tetap berfungsi: daftar contoh tetap tampil sebagai opsi
dan dapat dipilih manual; tidak ada lagi yang terpilih sendiri.

## D. Diniyyah — reset konteks

Effect khusus pada perubahan santri atau mapel mengosongkan nilai
yang sedang diketik pada form harian DAN ujian (serta pesan hasil
sebelumnya), sehingga angka untuk anak/mapel sebelumnya tidak terbawa
ke konteks baru.

## E. Detail santri — riwayat hifzh per santri

- Fungsi baru `ambilSetoranSantri(santriId, batas)` di
  `src/lib/data/hifzh.ts`: mode Supabase memakai kueri
  `.eq("santri_id", …)` terurut terbaru dengan `.limit(batas)`;
  mode contoh menyaring gudang contoh per santri.
- Halaman detail tidak lagi memanggil `ambilSetoranTerakhir(50)`
  lintas santri + saring + potong 10. Riwayat dimuat mandiri dengan
  batas state (bawaan 50); tombol "Muat lebih banyak setoran" muncul
  bila jumlah yang tampil mencapai batas, menaikkan batas
  50 → 100 → 200.

## F. Grafik (`src/app/grafik/page.tsx`)

1. **Donat per semester terpilih.** Dropdown semester (dari
   `ambilSemester()`; label nama + tahun ajaran). Bawaan = semester
   yang rentangnya memuat tanggal hari ini (cadangan: pilihan
   pertama). Komposisi hanya menjumlahkan baris rekap pada semester
   terpilih. Untuk mendukung ini, `SemesterRef` di
   `lib/data/diniyyah.ts` diperluas dengan `tanggalMulai` /
   `tanggalSelesai` opsional dan `ambilSemester()` kini ikut memilih
   kedua kolom itu (tanpa mengubah skema); semester contoh diberi
   rentang fiktif selaras dengan contoh rekap (gasal
   2026-07-01–2026-12-31). Bila daftar semester resmi kosong, opsi
   diturunkan dari baris rekap yang ada. Di bawah setiap judul grafik
   ada label "Cakupan: …" (nama semester untuk donat; "semua data
   yang dapat Anda akses" untuk lainnya).
2. **Galat ≠ kosong.** Setiap grafik kini dimuat mandiri dengan
   keadaan galatnya sendiri: kegagalan menampilkan `KartuGalat`
   "Gagal memuat data grafik …" + tombol "Coba lagi" yang memuat
   ulang grafik itu saja (diniyyah & olahraga yang sebelumnya
   ditelan menjadi daftar kosong kini termasuk). "Belum ada data"
   hanya tampil bila pemuatan berhasil dan hasilnya memang kosong.
3. **Label grafik pertama diperjelas.** Judul tetap "Kehadiran per
   pekan"; sublabel diganti: "Jumlah catatan hadir per pekan (satu
   santri dapat terhitung di beberapa sesi)."

## G. Kontras status terpilih (`globals.css`)

Rasio dihitung dengan rumus luminansi relatif WCAG 2.x (teks putih
di atas latar terpilih, kecuali Sakit):

| Status | Sebelum | Sesudah | Rasio sesudah |
|---|---|---|---|
| Hadir | `#1e9e6a` / putih — 3,41:1 | `#0e7a35` / putih | **5,45:1** |
| Sakit | `#e8a100` / putih — 2,20:1 | `#e8a100` / teks gelap `#4a3500` | **5,29:1** |
| Izin | `#1d6fb8` / putih — 5,23:1 | tidak diubah | 5,23:1 |
| Alpa | `#d9534f` / putih — 3,96:1 | `#b3261e` / putih | **6,54:1** |

Implementasi: variabel `--status-hadir` dan `--status-alpa`
digelapkan (ikut dipakai lencana & donat Grafik, tetap konsisten);
khusus `.pil-status--sakit[aria-pressed="true"]` diberi warna teks
gelap karena latar kuning tidak pernah lulus dengan teks putih.

## H. Login (`src/app/login/page.tsx`, `Kerangka`, `InfoPengguna`, `lib/sesi.ts`)

1. **Tanpa kerangka.** `Kerangka` kini komponen klien yang memeriksa
   pathname: pada `/login` children dirender telanjang — HTML SSR
   /login tidak memuat `.kerangka`, `.sidebar`, `.kepala`, maupun
   `.nav-bawah` (terverifikasi di bawah). Bantalan halaman yang dulu
   dari `.konten` dipindah ke `.login-bungkus`.
2. **Tampilkan/sembunyikan kata sandi.** Tombol ikon mata di dalam
   kolom sandi (ikon "mata"/"mata-silang" baru di `Ikon.tsx`),
   `aria-label` "Tampilkan kata sandi"/"Sembunyikan kata sandi",
   target sentuh 44px.
3. **Kalimat bantuan singkat.** Penjelasan panjang tentang peran di
   bawah formulir diganti satu kalimat: "Gunakan akun yang diberikan
   admin."
4. **Profil belum disiapkan.** Helper baru `adaSesiAktif()` di
   `lib/sesi.ts` membedakan "tidak ada sesi" dari "sesi ada, profil
   tidak ada". Tiga jalur menampilkan pesan khusus yang sama —
   "Akun berhasil masuk, tetapi akses belum disiapkan. Hubungi
   admin." — di halaman login: (a) tepat setelah `signInWithPassword`
   berhasil tetapi `ambilProfilLogin()` null (pengguna tidak jadi
   diteruskan ke beranda); (b) halaman login dibuka dengan sesi
   yatim; (c) penjaga kerangka (`InfoPengguna`) mendeteksi sesi
   yatim di halaman lain, menyetel penanda sessionStorage
   `aplikasi-santri:profil-belum-disiapkan`, mengarahkan ke /login,
   dan login menampilkan pesannya sekali lalu menghapus penanda.
   Sebaliknya, /login yang dibuka dengan sesi + profil lengkap
   diteruskan ke beranda oleh pemeriksaan halaman login sendiri
   (penjaga lama di kerangka tidak lagi terpasang di /login).

## Bukti uji

- `npm run typecheck` — lulus.
- `npm run build` — lulus (15 rute, termasuk `/grafik` dan
  `/santri/[id]` dinamis).
- `npx opennextjs-cloudflare build` — lulus ("OpenNext build
  complete").
- **Uji logika murni** (`src/lib/kehadiran-isi.ts`, ditranspilasi
  esbuild lalu dijalankan node dengan `node:assert`): isi-kosong
  tidak mengubah status terpilih (sakit/izin utuh) dan tidak
  memutasi input; id di luar daftar tidak disentuh;
  `hitungTertimpa` menghitung tepat status terpilih selain hadir
  (2 dari contoh campuran; 0 untuk kosong/semua-hadir);
  `hitungKosong` dan `timpaSemuaJadiHadir` sesuai harapan —
  SEMUA LULUS.
- **Mode contoh lokal** (build tanpa env Supabase, `next start`):
  `/`, `/login`, `/kehadiran`, `/hifzh`, `/diniyyah`, `/catatan`,
  `/olahraga`, `/grafik`, `/admin`, `/santri`,
  `/santri/d0000000-0000-4000-8000-000000000001` — semua 200.
  HTML `/login`: kemunculan `nav-bawah` = 0, `class="sidebar"` = 0,
  `class="kepala"` = 0, `class="kerangka"` = 0; `login-hero`,
  `tombol-mata`, dan kalimat "Gunakan akun yang diberikan admin."
  masing-masing ada. HTML `/` tetap memuat kerangka + nav-bawah.
- Kontras: rasio pada tabel G dihitung dengan skrip Python
  (luminansi relatif WCAG) atas nilai warna final di CSS.

## Batas jujur

- Perilaku interaktif (dialog konfirmasi, penanda kotor, lencana
  baca-saja non-admin, filter semester donat dengan data asli, alur
  profil-belum-disiapkan) terverifikasi lewat typecheck, build, uji
  logika murni, dan pembacaan kode — belum diuji klik-per-klik di
  browser perangkat nyata maupun dengan akun tiap peran di produksi;
  mode contoh memakai profil contoh admin sehingga jalur non-admin
  (lencana baca-saja) hanya terverifikasi dari kode, bukan tampilan.
- Tombol "Muat lebih banyak" detail santri tidak akan muncul di mode
  contoh karena setoran contoh per santri hanya 1 baris (di bawah
  batas 50) — itu perilaku yang benar, bukan kerusakan.
- `window.confirm` dipakai sesuai arahan tugas; dialog bawaan
  peramban tampilannya mengikuti peramban masing-masing.
- FormSetoran & BagianUjian mempertahankan pilihan santri setelah
  simpan berhasil (untuk isian berurutan pada anak yang sama);
  yang dihapus adalah pemilihan otomatis SEBELUM pengguna memilih.
