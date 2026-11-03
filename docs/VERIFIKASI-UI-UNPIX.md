# Verifikasi UI — Arah UNPIX Mobile (Navigasi 5 Slot, Fast Menu, Tanpa Gulir Horizontal)

Rombak UI mengikuti referensi UNPIX Mobile yang dipilih user (3 Nov 2026):
struktur ditiru (pita warna + lembar putih melengkung, menu ikon lingkaran
bergaya Fast Menu, navigasi bawah 5 tombol dengan tombol tengah menonjol),
warna tetap hijau kop pondok. Dokumen ini mencatat pemeriksaan yang
BENAR-BENAR dijalankan beserta keterbatasannya, meniru pola
`docs/VERIFIKASI-UI-ANTISLOP.md`.

## Yang diubah

- **Navigasi bawah (`src/components/NavBawah.tsx`, baru)** — tepat 5 slot:
  Beranda, Santri, tengah menonjol, Menu, Akun. Slot tengah = lingkaran
  gradien hijau 54px terangkat (−30px) berisi aksi inti peran:
  admin/pengajar hifzh/pengajar diniyyah → Kehadiran; musyrif → Catatan;
  wali → detail anak pertama dari `ambilDaftarSantri()` (untuk wali daftar
  itu hanya anaknya sendiri karena RLS; belum termuat/gagal → `/santri`).
  Pemeriksaan sesi meniru `NavTautan` (periksa ulang tiap navigasi &
  peristiwa auth, bandingkan id sesi): selama profil belum termuat atau
  tidak ada sesi, hanya Beranda & Santri yang menjadi tautan, tiga slot
  lain dirender hampa — tidak ada tautan modul yang berkedip tampil.
  Sidebar desktop tidak berubah (daftar modul penuh dari `NavTautan`).
- **`/menu` (baru)** — kisi Fast Menu: ikon lingkaran tint 56px + label +
  keterangan satu baris per modul, tersaring peran. Metadata modul
  dipindah ke `src/lib/modul.ts` (`DAFTAR_MODUL`) dan kini dipakai bersama
  beranda & menu. Modul `menu` dan `akun` ditambahkan ke peta akses
  `src/lib/akses.ts` sebagai modul semua peran login.
- **`/akun` (baru)** — kartu profil (avatar inisial besar, nama, peran,
  surel), penjelasan hak akses (`RINGKASAN_PERAN`), tombol Keluar memakai
  `keluarDariSesi()` baru di `src/lib/sesi.ts` (mekanisme signOut yang
  sama dengan kerangka). Ringkasan profil di sidebar kini tautan ke
  `/akun`; tombol Keluar sidebar pindah ke halaman ini. Penjaga sesi di
  `InfoPengguna` tidak diubah.
- **Beranda (mode Supabase)** — banner menjadi `.pita` gradien selebar
  tepi konten; isi di `.lembar` putih radius 24px yang menimpanya: kisi
  Fast Menu modul per peran (menggantikan daftar baris) + kartu ringkasan
  dari fungsi data yang ada (jumlah santri/anak dari `ambilDaftarSantri`,
  jumlah sesi dari `ambilDaftarSesi`, semester berjalan dari
  `ambilSemesterAdmin` + `statusSemester`; kegagalan baca per peran
  dilewati tanpa mengarang data).
- **Login** — hero gradien berornamen (pola banner) berisi logo, judul,
  sapaan "Assalamu'alaikum, selamat datang", dan ilustrasi
  `public/ilustrasi-login.png` (1400×781; dioptimalkan dari 956.785 byte
  menjadi 123.738 byte via kuantisasi palet PNG + dithering, nama berkas
  sama, kualitas tampil terverifikasi visual dari berkas hasilnya);
  formulir masuk — logika TIDAK diubah — berada di `.login-lembar` putih
  melengkung yang menimpa hero.
- **Kepala HP** — menjadi pita gradien hijau kop (teks putih; kontras
  putih di hijau kop 6,53:1 sudah terhitung pada verifikasi Anti Slop).
- **Tanpa gulir horizontal (syarat keras)** — `.tabel-bungkus` tidak lagi
  `overflow-x: auto`: tabel selalu 100% wadah dan sel membungkus.
  `minWidth` tabel dihapus (Rekap 560, Hifzh 520, Diniyyah 520, detail
  santri 520), font sel menjadi 13px, padding sel 7px 6px, kepala kolom
  Rekap/Hifzh tidak lagi `nowrap`, bilah persen Rekap kehilangan
  `minWidth: 64`. `.tab-pil` kini `flex-wrap: wrap` (bukan gulir).
  `overflow-x: clip` pada html/body hanya jaring pengaman terakhir
  (clip, bukan hidden, agar sticky tetap bekerja).

## Pemeriksaan yang dijalankan

- `npm run typecheck` — lulus.
- `npm run build` — lulus, 14 rute (termasuk `/menu` dan `/akun`).
- `npx opennextjs-cloudflare build` — lulus ("OpenNext build complete"),
  dijalankan dengan env Supabase asli terisi.
- **Uji asap mode contoh** (build tanpa env; `.env.local` disisihkan lalu
  dipulihkan utuh dan terverifikasi tidak ikut commit): 12 rute 200
  (`/`, `/santri`, `/kehadiran`, `/hifzh`, `/diniyyah`, `/catatan`,
  `/rekap`, `/olahraga`, `/admin`, `/menu`, `/akun`, `/login`).
  Bukti teks HTML SSR beranda: tepat 5 elemen `nav-slot`, 1
  `nav-tengah-lingkaran`, label Beranda/Santri/Kehadiran/Menu/Akun
  (slot tengah mode contoh = Kehadiran). HTML `/menu` memuat
  `kisi-menu`, keterangan modul ("Daftar santri per kelas."), dan semua
  modul termasuk Panel Admin (mode contoh menampilkan semua). HTML
  `/akun` memuat kartu "Mode contoh". HTML `/login` memuat `login-hero`,
  rujukan `ilustrasi-login.png`, dan `login-lembar`; berkas ilustrasi
  terlayani 200 sebesar 123.738 byte.
- **Uji asap mode Supabase lokal** (build dengan env asli): `/`, `/login`,
  `/menu`, `/akun` 200. Bukti HTML SSR beranda: 5 slot nav dengan hanya
  2 tautan (`<a class="nav-slot"` = Beranda & Santri) dan 3
  `nav-slot--hampa` — pola anti-kedip sebelum profil termuat utuh.
- **Audit statis gulir horizontal**: `grep overflow-x|overflowX` di
  `src/` hanya menyisakan `overflow-x: clip` pada html/body di
  globals.css; `grep minWidth` hanya menyisakan nilai 0 (pencegah
  luapan flex) dan komentar; tidak ada lebar tetap ≥100vw maupun
  `gridTemplateColumns` piksel tetap di halaman.

## Keterbatasan (jujur)

- Belum ada uji browser sungguhan: slot tengah untuk tiap peran login
  asli (terutama tautan anak pertama wali), klik kisi Fast Menu,
  tampilan lingkaran terangkat di perangkat berponi, dan ketiadaan
  gulir horizontal pada perangkat nyata diverifikasi secara statis
  (sumber + HTML SSR + build), bukan di perangkat — menjadi verifikasi
  induk pasca-deploy, bersama sisa verifikasi Anti Slop.
- Tabel Rekap berkepala 8 kolom pada layar 320px muat secara lebar
  (sel membungkus), tetapi kepadatan tampilannya belum diuji visual.
- Kisi Fast Menu beranda memakai label saja; keterangan per modul hanya
  tampil di halaman `/menu` (keputusan ringkas untuk beranda).
- Beranda mode contoh mempertahankan banner + kartu peran lama (pita &
  lembar diterapkan pada beranda mode Supabase dan login); perilaku
  mode contoh tidak diubah.
