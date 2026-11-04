# Verifikasi Revisi Simpel & Pengaturan (4 Nov 2026)

Permintaan user (4 Nov 2026, 6 tangkapan layar + teks):

1. **Image 1 (login):** hapus logo & tulisannya; teks, ukuran teks,
   tombol, gaya dibuat SIMPEL seperti aplikasi mobile profesional
   (referensi image 2 "Argumind" & image 3 "Insightlancer"); login
   PC memakai gaya image 4 ("ninth": panel belah gradien + form).
2. **Image 5 (Olahraga):** rapikan teks & shapes, lebih nyaman
   dibaca.
3. **Image 6 (beranda):** profil pengguna dikecilkan di pojok kiri
   atas; teks nama/peran kecil; tanggal ringkas; latar biru besar
   di atas halaman lain diperbaiki/dihapus; tombol Menu DIHAPUS
   diganti Akun; di Akun ada banyak pengaturan (mode malam/siang,
   atur sandi, dll.); beranda ditambah kartu/banner agar tidak
   kosong; "jangan kaku".

## Yang dikerjakan

### Login & halaman auth
- `login/page.tsx`: hero logo/judul/sapaan/ilustrasi DIHAPUS di HP.
  Tampil polos: judul "Masuk" 24px, sub sapaan + baris pondok KECIL
  (ketok 3 Nov dipertahankan sebagai teks kecil, bukan blok merek),
  kolom berlabel ikon (tetap), tombol Masuk PIL selebar kolom
  (`.tombol-pil`). Logika masuk TIDAK berubah (diff hanya JSX
  presentasi + kelas tombol).
- PC ≥1024px (`.login-split`): panel kiri gradien membulat berisi
  ilustrasi tumpukan buku + judul ajakan + 3 kartu langkah (pola
  image 4); formulir di kanan. Panel `display:none` di HP.
- `/daftar`, `/lupa-sandi`, `/atur-sandi`: hero logo sama-sama
  dihapus → pola polos `.auth-bungkus` + tautan "Kembali masuk" +
  judul + sub. Isi & logika formulir tidak berubah.
- Kelas CSS lama (.login-hero, .logo-login--hero, .tombol-masuk,
  .login-aksen, .login-ilustrasi, .login-lembar) tidak lagi dipakai
  halaman mana pun (masih ada di globals.css sebagai warisan tak
  terpakai; sambutan memakai kelasnya sendiri).

### Kepala aplikasi & halaman dalam
- `.kepala` (Kerangka): pita gradien biru besar DIGANTI bilah
  permukaan polos + garis bawah; avatar 34px, nama 13px, peran 11px
  di kiri atas. Kepala kini tampil juga di beranda (penyembunyian
  khusus beranda audit Fase 3 gugur — pita beranda dirampingkan
  sehingga tidak dobel): Kerangka dirampingkan (state/effect lama
  dibuang).
- Pita beranda: tanpa avatar besar; nama 18px; sub = peran kecil +
  tanggal RINGKAS.
- Tanggal Hijriah DIPERBAIKI akar masalahnya: helper baru
  `src/lib/tanggal.ts` mengambil bagian ANGKA Intl (umalqura) dan
  memetakan nama bulan sendiri — nama bulan `month:"long"` Intl
  terbukti salah di HP user ("25 Mei 1448 SM H"). Helper yang sama
  kini dipakai FormSetoran hifzh (nilai tanggal_hijriah yang
  DISIMPAN ikut benar). Untuk 4 Nov 2026 hasilnya "24 Jumadilawal
  1448 H".
- Image 5 (umum): `judul-halaman` 22→20px, `subjudul` 13.5px/1.55,
  `.catatan-pantauan` 13.5px/1.55. BUG kartu sesi melebar keluar
  layar DIPERBAIKI: `.daftar-tumpuk` kini
  `grid-template-columns: minmax(0, 1fr)` (kolom grid sebelumnya
  membesar mengikuti min-content teks nowrap) + `.baris-daftar`
  width/max-width 100%.

### Beranda tidak kosong lagi
- Kartu ringkasan NYATA dari lapisan data ber-RLS (gagal muat →
  disembunyikan, tidak mengarang): staf/admin = Santri aktif,
  Kehadiran terisi HARI INI (hifzh+diniyyah), Setoran hari ini,
  Catatan hari ini; wali = Anak tertaut, Kehadiran/Setoran/Catatan
  tercatat (total anaknya).
- Strip semester berjalan (nama + tahun ajaran + rentang tanggal,
  dari `ambilSemesterAdmin` + `statusSemester`).
- Banner motivasi kecil (hadis HR. Bukhari tentang mempelajari &
  mengajarkan Al-Qur'an).

### Navigasi & Akun
- NavBawah: slot terakhir semua peran staf/admin kini **Akun**
  (wali tidak berubah — memang Akun). `/menu` → redirect 307 ke
  `/akun` (pola sama seperti /grafik→/laporan).
- Akun: bagian baru **Pengaturan tampilan** — Mode Terang/Gelap
  (ikon matahari/bulan, segmen) & Ukuran teks Kecil/Standar/Besar.
  Preferensi per perangkat di localStorage (`lib/tampilan.ts`),
  diterapkan lewat `data-tema`/`data-teks` di <html>; skrip sebaris
  di layout menerapkannya sebelum gambar pertama (tanpa kedipan;
  bawaan mengikuti setelan sistem). Mode gelap memetakan ulang
  token permukaan/teks/garis + penyesuaian komponen berwarna keras
  (segmen, catatan pantauan, kolom terkunci, lencana ikon, pesan,
  penanda tahap, tombol keluar/sekunder).
- Akun: bagian **Lainnya** — tautan "Lihat perkenalan aplikasi"
  (/sambutan) + keterangan aplikasi & pondok. Ubah kata sandi &
  Keluar tetap.
- Ikon baru di Ikon.tsx: `matahari`, `pengaturan` (pengaturan
  disiapkan untuk pemakaian berikutnya; mode memakai matahari/
  bulan yang sudah ada).

## Hasil uji (lokal)
- `npm run typecheck` — lulus bersih.
- `npm run build` — lulus. `npm run build:cf` — lulus.
- Uji asap server build: GET /login 200 memuat `login-split`,
  `auth-judul`, `login-panel`, "Masukkan alamat surel"; TIDAK
  memuat `logo-login--hero`. GET /menu → 307 ke /akun. GET / 200.
  CSS terbit memuat penanda `data-tema=gelap` (18×), `--skala-teks`,
  `tombol-pil`, `login-langkah`, `baris-atur`, `kartu-semester`,
  `banner-motivasi`.
- Push GitHub: lokal 032ccc5 → remote main 302ba143 (4 Nov ±09:20
  WIB, kartu persetujuan user disetujui). Deploy terkonfirmasi dari
  penanda: /login memuat `login-split`, `logo-login--hero` hilang.

## Verifikasi live (4 Nov 2026, 09:28–09:30 WIB, akun uji.hifzh)

1. **/login LOLOS** — tanpa logo/judul hero; judul "Masuk", sub
   sapaan + baris pondok kecil, kolom + placeholder benar, tombol
   Masuk; viewport PC menampilkan panel gradien kiri (ilustrasi
   tumpukan buku + 3 langkah bernomor persis teks kode).
2. **Masuk akun uji BERHASIL** (email diketik manual terakhir,
   sandi via layanan login tersimpan) → beranda Ust. Uji Hifzh.
3. **Beranda LOLOS** — pita persis "Pengajar Hifzh · Rab, 4 Nov
   2026 · 24 Jumadilawal 1448 H" (Hijriah BENAR, tanpa "Mei"/"SM");
   4 kartu Ringkasan hari ini tampil (Santri aktif 2; Kehadiran/
   Setoran/Catatan hari ini 0 — memang belum ada input tanggal 4
   Nov); kisi Modul 6 untuk pengajar hifzh; strip "Semester Uji
   Gasal · 2026/2027 — Rab, 1 Jul 2026 – Kam, 31 Des 2026 · Sedang
   berjalan"; banner motivasi HR. Bukhari tampil. Slot nav bawah
   terakhir "Akun": terverifikasi di level bundel JS terbit
   (label:"Akun" ada 2×, label:"Menu" TIDAK ada) + sidebar PC tanpa
   label Menu; belum dilihat pada viewport HP secara visual.
4. **/olahraga LOLOS** — kartu sesi "Uji Olahraga Sore" tampil
   UTUH di dalam kartu induk, tidak melebar keluar layar.
5. **/akun LOLOS** — Pengaturan tampilan (Terang/Gelap, Kecil/
   Standar/Besar) + Lainnya ("Lihat perkenalan aplikasi") tampil;
   klik Gelap mengubah halaman jadi gelap, klik Terang memulihkan;
   preferensi akhir ditinggal Terang + Standar; sandi tidak diubah,
   Keluar tidak diklik.

Status paket revisi: SELESAI & LIVE.
